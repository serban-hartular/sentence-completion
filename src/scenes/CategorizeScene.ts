// src/scenes/CategorizeScene.ts
import Phaser from "phaser";
import { SlotScreen, type SlotSpec } from "../ui/SlotScreen";
import { TextArea } from "../ui/text/TextArea";
import { WordCard } from "../objects/WordCard";
import { randomDistributePoints } from "../ui/layout/randomDistribute";
import { TwoColumnCategorizeLayoutGenerator } from "../ui/layout/TwoColumnCategorizeLayoutGenerator";

export type CategorizeSceneData = {
  prompt: string;
  headers: string[];          // length 2
  slotsPerColumn: number[];   // length 2
  words: string[];            // unique
  correctColumn: number[];    // same length as words, values 0 or 1
};

// attempt: for each word in data.words -> 0/1 if placed, else -1
export type CategorizeAttempt = number[];

export class CategorizeScene extends SlotScreen {
  private dataIn!: CategorizeSceneData;
  private slotToColumn: number[] = [];

  constructor() {
    super("categorize");
  }

  init(data: CategorizeSceneData) {
    this.dataIn = data;
  }

  create() {
    const { width, height } = this.scale;

    // Background (match your house style as desired)
    this.cameras.main.setBackgroundColor("#bfe8ff");

    this.configureSlotScreen({
      bottomAreaThresholdY: Math.floor(height * 0.72),
      snapRadius: 75,
    });

    // Prompt
    new TextArea(
      this,
      { x: 30, y: 16, w: width - 60, h: 100 },
      this.dataIn.prompt,
      { justify: "center", backgroundColor: null }
    );

    // Validate shape (light guard; assumes backend correctness)
    const headers = this.dataIn.headers as [string, string];
    const slotsPerColumn = this.dataIn.slotsPerColumn as [number, number];

    // Layout area below prompt
    const mainArea = {
      x: 30,
      y: 80,
      w: width - 60,
      h: height - 120, // leaves room for check button/footer
    };

    const slotW = 180;
    const slotH = 70;

    const gen = new TwoColumnCategorizeLayoutGenerator();
    const layout = gen.generate({
      area: mainArea,
      headers,
      slotsPerColumn,
      slotW,
      slotH,
      headerGapY: 44,
      slotGapY: 10,
      centerGap: 22,
    });

    this.slotToColumn = layout.slotToColumn;

    // Headers
    for (const h of layout.headers) {
      this.add
        .text(h.x, h.y, h.text, {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#0b2b46",
        })
        .setOrigin(0.5);
    }

    // Slots
    const slotSpecs: SlotSpec[] = layout.slots.map((s) => ({
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
    }));

    this.buildSlots(slotSpecs);

    // Word cards in the middle bank area (random pile)
    const pts = randomDistributePoints({
      count: this.dataIn.words.length,
      area: layout.bankArea,
      minDist: 120,
      maxTriesPerPoint: 50,
    });

    for (let i = 0; i < this.dataIn.words.length; i++) {
      const p = pts.points[i] ?? {
        x: Phaser.Math.Between(layout.bankArea.x, layout.bankArea.x + layout.bankArea.w),
        y: Phaser.Math.Between(layout.bankArea.y, layout.bankArea.y + layout.bankArea.h),
      };

      const card = new WordCard(this, p.x, p.y, this.dataIn.words[i],
        { draggable: true, width: slotW });
      card.homeX = card.x;
      card.homeY = card.y;
      this.cards.push(card);
    }

    this.enableCardDragging();
    this.createCheckButton();

    // Optional dev warning
    if (!layout.fits) {
      this.add
        .text(width / 2, 118, "⚠ Layout doesn't fit (reduce slots or sizes)", {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#8a1c1c",
        })
        .setOrigin(0.5);
    }
  }

  /**
   * Attempt is aligned with dataIn.words:
   * 0/1 if in a slot, -1 if unplaced.
   */
  protected buildAttempt(): CategorizeAttempt {
    const cardByWord = new Map<string, WordCard>();
    for (const c of this.cards) cardByWord.set(c.word, c);

    return this.dataIn.words.map((w) => {
      const card = cardByWord.get(w);
      if (!card) return -1;

      const slotIndex = card.getSlotIndex() ?? -1;
      if (slotIndex < 0) return -1;

      return this.slotToColumn[slotIndex] ?? -1;
    });
  }

  /**
   * You said: user may check early, but it must FAIL unless
   * every word is found in its required column.
   */
  protected computeSuccess(attempt: CategorizeAttempt): boolean {
    console.log(attempt)
    if (attempt.length !== this.dataIn.correctColumn.length) return false;

    for (let i = 0; i < attempt.length; i++) {
      if (attempt[i] !== this.dataIn.correctColumn[i]) return false;
    }

    return true;
  }

  protected override getResultPayloadExtras(): Record<string, unknown> {
    return { kind: "categorize" };
  }
}
