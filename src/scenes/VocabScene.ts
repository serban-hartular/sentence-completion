// src/scenes/VocabScene.ts
import Phaser from "phaser";
import { SlotScreen, type SlotSpec } from "../ui/slots/SlotScreen";
import { TextArea } from "../ui/text/TextArea";
import { WordCard } from "../objects/WordCard";
import { randomDistributePoints } from "../ui/layout/randomDistribute";
import { SimpleGridVocabLayoutGenerator } from "../ui/layout/SimpleGridVocabLayoutGenerator";
import { ImageRegistry } from "../images/imageRegistry";
import type { VocabSceneData } from "../types/VocabSceneData";

export class VocabScene extends SlotScreen {
  private dataIn!: VocabSceneData;

  constructor() {
    super("vocab");
  }

  init(data: VocabSceneData) {
    this.dataIn = data;
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#bfe8ff");

    // remove-from-slot if dragged into bank area
    this.configureSlotScreen({
      bottomAreaThresholdY: Math.floor(height * 0.70),
      snapRadius: 75,
    });

    // Prompt
    new TextArea(
      this,
      { x: 30, y: 16, w: width - 60, h: 100 },
      this.dataIn.prompt,
      { justify: "center", backgroundColor: null }
    );

    // Layout area for picture+slot pairs
    const topArea = {
      x: 20,
      y: 130,
      w: width - 20,
      h: Math.floor(height * 0.50),
    };

    // Sizes (tweakable)
    const pictureW = 150;
    const pictureH = 140;
    const slotW = 140;
    const slotH = 70;

    const layoutGen = new SimpleGridVocabLayoutGenerator();
    const layout = layoutGen.generate({
      count: this.dataIn.targets.length,
      area: topArea,
      pictureW,
      pictureH,
      slotW,
      slotH,
      columns: 3, // auto
      gapX: 30,
      gapY: 40,
      slotPlacement: "below",
      pictureSlotGap: 14,
    });

    // Build slots with explicit slot indices (0..slotCount-1)
    // We'll position each target's slot according to layout, but slotIndex comes from server.
    const slotSpecs: SlotSpec[] = Array.from({ length: this.dataIn.slotCount }).map(() => ({
      x: -9999,
      y: -9999,
      w: slotW,
      h: slotH,
    }));

    // Place pictures + assign slot positions from targets
    for (let i = 0; i < this.dataIn.targets.length; i++) {
      const t = this.dataIn.targets[i];
      const item = layout.items[i];
      if (!item) continue;

      // Image
      const texKey = ImageRegistry[t.imageId] ?? t.imageId; // supports either registry or direct key
      const img = this.add.image(item.picture.x, item.picture.y, texKey);
      img.setDisplaySize(item.picture.w, item.picture.h);

      // Optional “connector” line (subtle)
      const g = this.add.graphics();
      g.lineStyle(3, 0x2f7dd1, 0.6);
      g.beginPath();
      g.moveTo(item.picture.x, item.picture.y + item.picture.h / 2);
      g.lineTo(item.slot.x, item.slot.y - item.slot.h / 2);
      g.strokePath();

      // Slot position for this target's slotIndex
      if (t.slotIndex >= 0 && t.slotIndex < slotSpecs.length) {
        slotSpecs[t.slotIndex] = {
          x: item.slot.x,
          y: item.slot.y,
          w: item.slot.w,
          h: item.slot.h,
        };
      }
    }

    // Any slots not positioned (bad data) get stacked offscreen-safe area
    for (let i = 0; i < slotSpecs.length; i++) {
      if (slotSpecs[i].x === -9999) {
        slotSpecs[i].x = width / 2;
        slotSpecs[i].y = topArea.y + topArea.h + 60 + i * (slotH + 10);
      }
    }

    this.buildSlots(slotSpecs);

    // Bank area below
    const bankArea = {
      x: 110,
      y: Math.floor(height * 0.72),
      w: width - 220,
      h: height - Math.floor(height * 0.72) - 90,
    };

    const shuffled = Phaser.Utils.Array.Shuffle([...this.dataIn.bankWords]);

    const pts = randomDistributePoints({
      count: shuffled.length,
      area: bankArea,
      minDist: 120,
      maxTriesPerPoint: 50,
    });

    for (let i = 0; i < shuffled.length; i++) {
      const p = pts.points[i] ?? {
        x: Phaser.Math.Between(bankArea.x, bankArea.x + bankArea.w),
        y: Phaser.Math.Between(bankArea.y, bankArea.y + bankArea.h),
      };

      const card = new WordCard(this, p.x, p.y, shuffled[i], { draggable: true });
      card.homeX = card.x;
      card.homeY = card.y;
      this.cards.push(card);
    }

    // Enable SlotScreen drag logic
    this.enableCardDragging();

    // Check button
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
      const success = this.isCorrect();
      const attempt = this.slots.map((s) => s.occupant?.word ?? "");
      this.scene.start("result", { success, attempt,kind: "vocab", });
    });

    // Optional: show layout warning visually if it doesn't fit
    if (!layout.fits) {
      this.add
        .text(width / 2, 120, "⚠ Layout doesn't fit (reduce targets or sizes)", {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#8a1c1c",
        })
        .setOrigin(0.5);
    }
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
