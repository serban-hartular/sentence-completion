// src/scenes/SortedListsScene.ts
import Phaser from "phaser";
import { type SlotSpec } from "../ui/SlotScreen";
import { TextArea } from "../ui/text/TextArea";
import { WordCard } from "../objects/WordCard";
import { randomDistributePoints } from "../ui/layout/randomDistribute";
import {
  CategorizeScene,
  type CategorizeSceneData,
} from "./CategorizeScene";
import { RowCategorizeLayoutGenerator } from "../ui/layout/RowCategorizeLayoutGenerator";

export class SortedListsScene extends CategorizeScene {
  protected declare dataIn: CategorizeSceneData;
  protected declare slotToColumn: number[];

  constructor(sceneKey: string = "sorted-lists") {
    super(sceneKey);
    }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#bfe8ff");

    this.configureSlotScreen({
      bottomAreaThresholdY: Math.floor(height * 0.72),
      snapRadius: 75,
    });

    new TextArea(
      this,
      { x: 30, y: 16, w: width - 60, h: 100 },
      this.dataIn.prompt,
      { justify: "center", backgroundColor: null }
    );

    const headers = this.dataIn.headers;
    const slotsPerRow = this.dataIn.slotsPerColumn;

    const mainArea = {
      x: 10,
      y: 100,
      w: width - 10,
      h: height - 132,
    };

    const slotW = 180;
    const slotH = 70;

    const gen = new RowCategorizeLayoutGenerator();
    const layout = gen.generate({
      area: mainArea,
      headers,
      slotsPerRow,
      slotW,
      slotH,
      headerW: 80,
      headerGapX: 18,
      slotGapX: 12,
      rowGapY: 22,
      bankTopGap: 30,
    });

    this.slotToColumn = layout.slotToRow;

    for (const h of layout.headers) {
      this.add
        .text(h.x, h.y, h.text, {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#0b2b46",
          align: "center",
          wordWrap: { width: 170 },
        })
        .setOrigin(0.5);
    }

    const slotSpecs: SlotSpec[] = layout.slots.map((s) => ({
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
    }));

    this.buildSlots(slotSpecs);

    const pts = randomDistributePoints({
      count: this.dataIn.words.length,
      area: layout.bankArea,
      minDist: 120,
      maxTriesPerPoint: 50,
    });

    for (let i = 0; i < this.dataIn.words.length; i++) {
      const p = pts.points[i] ?? {
        x: Phaser.Math.Between(
          layout.bankArea.x,
          layout.bankArea.x + layout.bankArea.w
        ),
        y: Phaser.Math.Between(
          layout.bankArea.y,
          layout.bankArea.y + layout.bankArea.h
        ),
      };

      const card = new WordCard(
        this,
        p.x,
        p.y,
        this.dataIn.words[i],
        { draggable: true, width: slotW }
      );

      card.homeX = card.x;
      card.homeY = card.y;
      this.cards.push(card);
    }

    this.enableCardDragging();
    this.createCheckButton();

    if (!layout.fits) {
      this.add
        .text(width / 2, 118, "⚠ Layout doesn't fit (reduce rows / slots / sizes)", {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#8a1c1c",
        })
        .setOrigin(0.5);
    }
  }

  protected override getResultPayloadExtras(): Record<string, unknown> {
    return { kind: "sorted-lists" };
  }
}
