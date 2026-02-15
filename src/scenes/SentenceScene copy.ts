import Phaser from "phaser";
import type { SentenceSceneData } from "../types/SentenceSceneData";
import { WordCard } from "../objects/WordCard";

type Slot = {
  x: number;
  y: number;
  initialWord: string; // "" or initial word
  occupant: WordCard | null; // card currently snapped here
  outline: Phaser.GameObjects.Rectangle;
};

export class SentenceScene extends Phaser.Scene {
  private dataIn!: SentenceSceneData;

  private slots: Slot[] = [];
  private cards: WordCard[] = [];

  private readonly SNAP_RADIUS = 70;
  private slotY = 0;

  constructor() {
    super("sentence");
  }

  init(data: SentenceSceneData) {
    this.dataIn = {
      ...data,
      initialMovable: data.initialMovable ?? false,
    };
  }

  create() {
    const { width, height } = this.scale;

    // Soft background + clouds
    this.cameras.main.setBackgroundColor("#bfe8ff");
    this.add.circle(120, 90, 40, 0xffffff, 0.6);
    this.add.circle(170, 80, 55, 0xffffff, 0.6);
    this.add.circle(220, 95, 40, 0xffffff, 0.6);

    // Prompt (top)
    this.add
      .text(width / 2, 36, this.dataIn.prompt, {
        fontFamily: "Arial",
        fontSize: "34px",
        color: "#0b2b46",
      })
      .setOrigin(0.5);

    // Slot row positions (center)
    const slotCount = this.dataIn.slots.length;
    const slotY = Math.floor(height * 0.45);
    this.slotY = slotY;

    const slotSpacing = 170;
    const totalW = (slotCount - 1) * slotSpacing;
    const startX = width / 2 - totalW / 2;

    this.slots = this.dataIn.slots.map((word, i) => {
      const x = startX + i * slotSpacing;
      const outline = this.add
        .rectangle(x, slotY, 150, 70, 0xffffff, 0.25)
        .setStrokeStyle(5, 0x2f7dd1, 1);
      (outline as any).setRadius?.(18);

      return { x, y: slotY, initialWord: word, occupant: null, outline };
    });

    // Create initial cards already in slots
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

    // Bottom bank cards: randomly placed, but not overlapping too badly
    this.spawnBottomCards(this.dataIn.bankWords);

    // Drag handling (we drag the card's hit-rect, and move the container)
    this.input.on("dragstart", (pointer: Phaser.Input.Pointer, go: any) => {
      const card = (go as Phaser.GameObjects.GameObject).getData?.("card") as WordCard | undefined;
      if (!card) return;

      this.children.bringToTop(card);
      card.setScale(1.06);

      // Use camera space conversion (robust with Scale.FIT / transforms)
      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

      // Store grab offset so the card doesn't "jump" when dragging begins.
      (card as any).__dragOffX = card.centerX - wp.x;
      (card as any).__dragOffY = card.centerY - wp.y;
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

      // Simple remove-from-slot: if a slotted card is released in the bottom area,
      // it is removed from the slot and stays where released.
      const bottomAreaThreshold = Math.floor(height * 0.62);
      if (card.currentSlotIndex !== null && card.centerY > bottomAreaThreshold) {
        this.removeFromSlot(card);
        return;
      }

      this.trySnapOrSwap(card);
    });

    // Example “Check” button
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
      this.scene.start("result", { success: ok });
    });

    // // Helpful hint text for kids
    // this.add
    //   .text(18, height - 24, "Tip: drag words into the boxes. Drag down to remove.", {
    //     fontFamily: "Arial",
    //     fontSize: "18px",
    //     color: "#0b2b46",
    //   })
    //   .setOrigin(0, 1);
  }

  private spawnBottomCards(words: string[]) {
    const { width, height } = this.scale;
    const bottomTop = Math.max(Math.floor(height * 0.65), this.slotY + 120);

    // Simple scatter with retries
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

    // If card was occupying a slot and moved away, free that slot first
    if (prevIndex !== null) {
      const prev = this.slots[prevIndex];
      if (prev.occupant === card) prev.occupant = null;
      card.currentSlotIndex = null;
    }

    // Find nearest slot
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

    // Not close enough → just leave it where it was released (no snap-back).
    if (bestDist > this.SNAP_RADIUS) {
      return;
    }

    const target = this.slots[bestIndex];

    // SNAP or SWAP
    if (!target.occupant) {
      card.snapToCenter(target.x, target.y);
      target.occupant = card;
      card.currentSlotIndex = bestIndex;
      return;
    }

    // Swap behavior:
    const other = target.occupant;

    // Place card into target
    target.occupant = card;
    card.currentSlotIndex = bestIndex;
    card.snapToCenter(target.x, target.y);

    // Move other
    if (prevIndex !== null) {
      const prevSlot = this.slots[prevIndex];
      if (!prevSlot.occupant) {
        prevSlot.occupant = other;
        other.currentSlotIndex = prevIndex;
        other.snapToCenter(prevSlot.x, prevSlot.y);
        return;
      }
    }

    // No previous slot to swap into → remove occupant from slot and send home
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
