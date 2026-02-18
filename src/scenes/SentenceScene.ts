// src/scenes/SentenceScene.ts
import Phaser from "phaser";
import type { SentenceSceneData } from "../types/SentenceSceneData";
import { WordCard } from "../objects/WordCard";
import { SentenceScreenLook } from "../ui/SentenceScreenLook";

import { SlotScreen, type SlotSpec } from "../ui/slots/SlotScreen";
import { TextArea } from "../ui/text/TextArea";
import { SimpleRowSlotLayoutGenerator } from "../ui/layout/SimpleRowSlotLayoutGenerator";
import { randomDistributePoints } from "../ui/layout/randomDistribute";

export class SentenceScene extends SlotScreen {
  private dataIn!: SentenceSceneData;
  private look: SentenceScreenLook = new SentenceScreenLook();

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

    this.cameras.main.setBackgroundColor(this.look.backgroundColor);
    this.look.extraDrawings(this);

    // Configure SlotScreen “remove if dragged into bottom”
    this.configureSlotScreen({
      bottomAreaThresholdY: Math.floor(height * 0.62),
      snapRadius: 70,
    });

    // --- Parse rows from dataIn.slots (supports "\n") ---
    const rows: string[][] = [[]];
    for (const item of this.dataIn.slots) {
      if (item === "\n") {
        if (rows[rows.length - 1].length > 0) rows.push([]);
        continue;
      }
      rows[rows.length - 1].push(item);
    }
    if (rows.length > 1 && rows[rows.length - 1].length === 0) rows.pop();

    const slotsPerRow = rows.map((r) => r.length);

    // --- Prompt via TextArea ---
    const promptY = rows.length > 1 ? 12 : 22;

    new TextArea(
      this,
      { x: 30, y: promptY, w: width - 60, h: 100 },
      this.dataIn.prompt,
      {
        style: this.look.promptTextStyle,
        justify: "center",
        backgroundColor: null,
      }
    );

    // --- Slot layout generator ---
    const slotGen = new SimpleRowSlotLayoutGenerator();

    // slot area: keep similar “middle-ish” placement as before
    const slotArea = {
      x: 40,
      y: Math.floor(height * 0.28),
      w: width - 80,
      h: Math.floor(height * 0.30),
    };

    const cardW = 110; // was 150-40 in your outline
    const cardH = 70;

    const layout = slotGen.generate({
      slotsPerRow,
      cardW,
      cardH,
      area: slotArea,
      justify: [], // defaults to center
      gapX: 20,
      gapY: 25,
    });

    // If it doesn't fit, we still place them (so you can see the issue)
    // but you could also fallback to smaller sizes here.
    const slotCenters = layout.slots;

    // --- Build SlotSpecs with callbacks + initial words ---
    const specs: SlotSpec[] = [];
    let flatIndex = 0;

    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const initialWord = rows[r][c];
        const pos = slotCenters[flatIndex];

        const slotIndexForCallback = flatIndex;

        specs.push({
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h: pos.h,
          initialWord,
          callbacks: {
            // Example: first slot capitalizes display word
            onPlace: (card) => {
              if (slotIndexForCallback === 0) {
                const s = card.word;
                card.setDisplayWord(s.charAt(0).toUpperCase() + s.slice(1));
              }
            },
            onRemove: (card) => {
              if (slotIndexForCallback === 0) {
                card.resetDisplayWord();
              }
            },
          },
        });

        flatIndex++;
      }
    }

    this.buildSlots(specs);

    // --- Create initial cards already in slots ---
    for (let i = 0; i < this.slots.length; i++) {
      const w = (this.slots[i] as any).initialWord as string | undefined;
      if (!w) continue;

      const card = new WordCard(this, this.slots[i].x, this.slots[i].y, w, {
        draggable: this.dataIn.initialMovable ?? false,
      });

      card.homeX = card.x;
      card.homeY = card.y;

      this.cards.push(card);
      this.placeCardInSlot(card, i);
    }

    // --- Bank words distributed below last slot row ---
    const bottomTop = Math.max(Math.floor(height * 0.65), this.lastSlotRowY + 120);

    const area = { x: 110, y: bottomTop + 40, w: width - 220, h: height - (bottomTop + 120) };

    const shuffled = Phaser.Utils.Array.Shuffle([...this.dataIn.bankWords]);

    const pts = randomDistributePoints({
      count: shuffled.length,
      area,
      minDist: 120,
      maxTriesPerPoint: 40,
    });

    for (let i = 0; i < shuffled.length; i++) {
      const p = pts.points[i] ?? {
        x: Phaser.Math.Between(area.x, area.x + area.w),
        y: Phaser.Math.Between(area.y, area.y + area.h),
      };

      const card = new WordCard(this, p.x, p.y, shuffled[i], { draggable: true });
      card.homeX = card.x;
      card.homeY = card.y;
      this.cards.push(card);
    }

    // --- Enable drag logic from SlotScreen ---
    this.enableCardDragging();

    // --- Check button unchanged ---
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
      const attempt = this.slots.map((s) => s.occupant?.word ?? "");
      this.scene.start("result", { success: ok, attempt });
    });
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
