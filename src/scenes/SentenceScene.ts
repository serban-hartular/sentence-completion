import Phaser from "phaser";
import type { SentenceSceneData } from "../types/SentenceSceneData";
import { WordCard } from "../objects/WordCard";
import { SentenceScreenLook } from "../ui/SentenceScreenLook";
import { SFX } from "../audio/soundKeys";


type Slot = {
  x: number;
  y: number;
  initialWord: string; // "" or initial word
  occupant: WordCard | null; // card currently snapped here
  outline: Phaser.GameObjects.Rectangle;
};

export class SentenceScene extends Phaser.Scene {
  private dataIn!: SentenceSceneData;
  private look: SentenceScreenLook = new SentenceScreenLook();

  private slots: Slot[] = [];
  private cards: WordCard[] = [];

  private readonly SNAP_RADIUS = 70;
  private slotY = 0; // used to keep bottom cards below the LAST slot row

  constructor() {
    super("sentence");
  }

  init(data: SentenceSceneData & { look?: SentenceScreenLook }) {
    const { look, ...rest } = data as SentenceSceneData & { look?: SentenceScreenLook };
    this.look = look ?? new SentenceScreenLook();

    this.dataIn = {
      ...rest,
      initialMovable: rest.initialMovable ?? false,
    };
  }

  create() {
    const { width, height } = this.scale;

    // Background + extra drawings (e.g., clouds)
    this.cameras.main.setBackgroundColor(this.look.backgroundColor);
    this.look.extraDrawings(this);

    // ---- Slot layout supports newline markers ----
    // dataIn.slots may contain "\n" entries to indicate a new row.
    // We build rows of actual slots; "\n" is not a slot.
    const rows: string[][] = [[]];
    for (const item of this.dataIn.slots) {
      if (item === "\n") {
        // start a new row (avoid creating empty trailing rows if multiple newlines are provided)
        if (rows[rows.length - 1].length > 0) rows.push([]);
        continue;
      }
      rows[rows.length - 1].push(item);
    }
    // If input ended with "\n", rows might end empty; remove it.
    if (rows.length > 1 && rows[rows.length - 1].length === 0) rows.pop();

    const rowCount = rows.length;

    // Move prompt higher if there is more than one row
    const promptY = rowCount > 1 ? 22 : 36;

    // Prompt (top)
    this.add.text(width / 2, promptY, this.dataIn.prompt, this.look.promptTextStyle).setOrigin(0.5);

    // Slot row positions (center-ish)
    // Preserve existing single-row positioning.
    const slotSpacing = 170;
    const rowSpacing = 95;

    // Base Y matches previous single-row slotY.
    const baseSlotY = Math.floor(height * 0.45);

    // If multiple rows, shift the block slightly upward so it fits comfortably under the higher title.
    // Keep overall feel similar; center the rows around ~baseSlotY.
    const firstRowY =
      rowCount === 1 ? baseSlotY : baseSlotY - Math.floor(((rowCount - 1) * rowSpacing) / 2) - 10;

    // Build Slot objects in row-major order, matching original slot index semantics (excluding "\n")
    this.slots = [];
    let slotIndex = 0;

    for (let r = 0; r < rowCount; r++) {
      const row = rows[r];
      const y = firstRowY + r * rowSpacing;

      const totalW = (row.length - 1) * slotSpacing;
      const startX = width / 2 - totalW / 2;

      for (let c = 0; c < row.length; c++) {
        const initialWord = row[c];
        const x = startX + c * slotSpacing;

        const outline = this.add
          .rectangle(x, y, 150, 70, 0xffffff, 0.25)
          .setStrokeStyle(5, 0x2f7dd1, 1);
        (outline as any).setRadius?.(18);

        this.slots.push({ x, y, initialWord, occupant: null, outline });
        slotIndex++;
      }

      // keep slotY pointing at the LAST row so bottom cards always spawn below all rows
      this.slotY = y;
    }

    // Create initial cards already in slots (same behavior as before)
    for (let i = 0; i < this.slots.length; i++) {
      const w = this.slots[i].initialWord;
      if (!w) continue;

      const card = new WordCard(this, this.slots[i].x, this.slots[i].y, w, {
        draggable: this.dataIn.initialMovable ?? false,
      });

      card.currentSlotIndex = i;

      // Home is the slot position (top-left)
      card.homeX = card.x;
      card.homeY = card.y;

      this.slots[i].occupant = card;
      this.cards.push(card);
    }

    // Bottom bank cards: randomly placed, but always below the slot rows
    this.spawnBottomCards(this.dataIn.bankWords);

    // Drag handling (we drag the card's hit-rect, and move the container)
    this.input.on("dragstart", (pointer: Phaser.Input.Pointer, go: any) => {
      const card = (go as Phaser.GameObjects.GameObject).getData?.("card") as WordCard | undefined;
      if (!card) return;

      this.children.bringToTop(card);
      card.setScale(1.06);

      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      (card as any).__dragOffX = card.centerX - wp.x;
      (card as any).__dragOffY = card.centerY - wp.y;
      this.sound.play(SFX.PICKUP, { volume: 0.3 });
    });

    this.input.on("drag", (pointer: Phaser.Input.Pointer, go: any) => {
      const card = (go as Phaser.GameObjects.GameObject).getData?.("card") as WordCard | undefined;
      if (!card) return;

      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const offX = (card as any).__dragOffX ?? 0;
      const offY = (card as any).__dragOffY ?? 0;

      card.setCenter(wp.x + offX, wp.y + offY);
    });

    this.input.on("dragend", (_p: any, go: any) => {
      const card = (go as Phaser.GameObjects.GameObject).getData?.("card") as WordCard | undefined;
      if (!card) return;

      card.setScale(1.0);

      const bottomAreaThreshold = Math.floor(height * 0.62);
      if (card.currentSlotIndex !== null && card.centerY > bottomAreaThreshold) {
        this.removeFromSlot(card);
        return;
      }

      this.trySnapOrSwap(card);
    });

    // Example “Check” button (unchanged)
    const check = this.add
      .text(width - 110, height - 40, "Check ✅", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#0b2b46",
        backgroundColor: "#ffffff",
        padding: { left: 14, right: 14, top: 8, bottom: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    check.on("pointerdown", () => {
      const ok = this.isCorrect();
      const attempt = this.slots.map(s => s.occupant?.word ?? "");
      this.scene.start("result", { success: ok, attempt });
      //this.scene.start("result", { success: ok });
    });
  }

  private spawnBottomCards(words: string[]) {
    const { width, height } = this.scale;

    // Always below ALL rows (slotY is last row Y)
    const bottomTop = Math.max(Math.floor(height * 0.65), this.slotY + 120);

    const placed: { x: number; y: number }[] = [];
    const minDist = 120;

    for (const w of Phaser.Utils.Array.Shuffle([...words])) {
      let x = 0,
        y = 0;
      let tries = 0;

      do {
        x = Phaser.Math.Between(110, width - 110);
        y = Phaser.Math.Between(bottomTop + 40, height - 80);
        if (y < this.slotY + 110) y = this.slotY + 110;
        tries++;
      } while (tries < 40 && placed.some((p) => Phaser.Math.Distance.Between(p.x, p.y, x, y) < minDist));

      placed.push({ x, y });

      const card = new WordCard(this, x, y, w, { draggable: true });
      card.homeX = card.x;
      card.homeY = card.y;
      this.cards.push(card);
    }
  }

  private removeFromSlot(card: WordCard) {
    if (card.currentSlotIndex === null) return;
    const slot = this.slots[card.currentSlotIndex];
    if (slot.occupant === card) slot.occupant = null;
    card.currentSlotIndex = null;
  }

  private trySnapOrSwap(card: WordCard) {
    const prevIndex = card.currentSlotIndex;

    if (prevIndex !== null) {
      const prev = this.slots[prevIndex];
      if (prev.occupant === card) prev.occupant = null;
      card.currentSlotIndex = null;
    }

    let bestIndex = -1;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const d = Phaser.Math.Distance.Between(card.centerX, card.centerY, s.x, s.y);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    }

    if (bestDist > this.SNAP_RADIUS) return;

    const target = this.slots[bestIndex];

    if (!target.occupant) {
      card.snapToCenter(target.x, target.y);
      this.sound.play(SFX.SNAP, { volume: 0.5 });
      target.occupant = card;
      card.currentSlotIndex = bestIndex;
      return;
    }

    const other = target.occupant;

    target.occupant = card;
    card.currentSlotIndex = bestIndex;
    card.snapToCenter(target.x, target.y);
    this.sound.play(SFX.SNAP, { volume: 0.5 });

    if (prevIndex !== null) {
      const prevSlot = this.slots[prevIndex];
      if (!prevSlot.occupant) {
        prevSlot.occupant = other;
        other.currentSlotIndex = prevIndex;
        other.snapToCenter(prevSlot.x, prevSlot.y);
        this.sound.play(SFX.SNAP, { volume: 0.5 });
        return;
      }
    }

    other.currentSlotIndex = null;
    other.returnHome();
  }

  private isCorrect(): boolean {
    const current = this.slots.map((s) => s.occupant?.word ?? "");
    if (current.length !== this.dataIn.correct.length) return false;

    for (let i = 0; i < current.length; i++) {
      if (current[i] !== this.dataIn.correct[i]) return false;
    }
    return true;
  }
}
