import Phaser from "phaser";
import { ImageCard } from "../objects/ImageCard";
import { randomDistributePoints } from "../ui/layout/randomDistribute";
import { SlotScreen, type SlotSpec } from "../ui/SlotScreen";
import { SimpleRowSlotLayoutGenerator } from "../ui/layout/SimpleRowSlotLayoutGenerator";
import { TextArea } from "../ui/text/TextArea";
import type {
  MemorySequenceItem,
  MemorySequenceItemInput,
  MemorySequenceSceneData,
} from "../types/screenData";

type ScenePhase = "study" | "play";

export class MemorySequenceScene extends SlotScreen<ImageCard> {
  private dataIn!: MemorySequenceSceneData;
  private normalizedItems: MemorySequenceItem[] = [];
  private phase: ScenePhase = "study";
  private studyButton?: Phaser.GameObjects.Text;

  constructor() {
    super("memory-sequence");
  }

  init(data: MemorySequenceSceneData) {
    this.phase = "study";
    this.studyButton = undefined;
    this.cards = [];
    this.dataIn = data;
    this.normalizedItems = data.items.map((item, index) =>
      this.normalizeItem(item, index)
    );
  }

  create() {
    const { width, height } = this.scale;

    this.cards = [];

    this.cameras.main.setBackgroundColor("#bfe8ff");

    this.configureSlotScreen({
      bottomAreaThresholdY: Math.floor(height * 0.68),
      snapRadius: 80,
    });

    new TextArea(
      this,
      { x: 30, y: 16, w: width - 60, h: 84 },
      this.dataIn.prompt,
      { justify: "center", backgroundColor: null }
    );

    const itemCount = this.normalizedItems.length;
    const cardSize = this.resolveCardSize(itemCount, width);

    const slotArea = {
      x: 32,
      y: 112,
      w: width - 64,
      h: Math.floor(height * 0.28),
    };

    const layout = new SimpleRowSlotLayoutGenerator().generate({
      slotsPerRow: [itemCount],
      cardW: cardSize,
      cardH: cardSize,
      area: slotArea,
      gapX: itemCount <= 4 ? 24 : 16,
      gapY: 18,
    });

    const slotSpecs: SlotSpec<ImageCard>[] = layout.slots.map((slot) => ({
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
      callbacks: {
        onPlace: () => this.refreshCheckEnabled(),
        onRemove: () => this.refreshCheckEnabled(),
      },
    }));

    this.buildSlots(slotSpecs, {
      slotOutline: {
        fillAlpha: 0.18,
        strokeThickness: 4,
      },
    });

    for (let i = 0; i < this.normalizedItems.length; i++) {
      const item = this.normalizedItems[i];
      const slot = this.slots[i];
      if (!item || !slot) continue;

      const card = new ImageCard(this, slot.x, slot.y, item.content, {
        itemId: item.id,
        width: cardSize,
        height: cardSize,
      });

      card.homeX = card.x;
      card.homeY = card.y;
      this.cards.push(card);
      this.placeCardInSlot(card, i, { playSfx: false });
    }

    this.enableCardDragging();
    this.createStudyButton();
    this.createCheckButton();
    this.refreshCheckEnabled();

    if (!layout.fits) {
      this.add
        .text(width / 2, 108, "Layout warning: reduce the number of cards or card size", {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#8a1c1c",
        })
        .setOrigin(0.5);
    }
  }

  protected override canCheck(): boolean {
    return this.phase === "play" && this.slots.every((slot) => !!slot.occupant);
  }

  protected buildAttempt(): string[] {
    return this.slots.map((slot) => slot.occupant?.itemId ?? "");
  }

  protected computeSuccess(attempt: string[]): boolean {
    const correct = this.normalizedItems.map((item) => item.id);
    if (attempt.length !== correct.length) return false;

    for (let i = 0; i < correct.length; i++) {
      if (attempt[i] !== correct[i]) return false;
    }

    return true;
  }

  private createStudyButton() {
    const { width, height } = this.scale;

    this.studyButton = this.add
      .text(width / 2, height * 0.53, this.dataIn.studyButtonLabel ?? "I memorized them", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#2f7dd1",
        padding: { left: 18, right: 18, top: 10, bottom: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.studyButton.on("pointerdown", () => {
      if (this.phase !== "study") return;
      this.startPlayPhase();
    });
  }

  private startPlayPhase() {
    const { width, height } = this.scale;

    this.phase = "play";
    this.studyButton?.destroy();
    this.studyButton = undefined;

    for (const slot of this.slots) {
      if (!slot.occupant) continue;

      slot.occupant.setSlotIndex(null);
      slot.occupant.clearSlotState();
      slot.occupant = null;
    }

    const bankTop = Math.max(Math.floor(height * 0.72), this.lastSlotRowY + 110);
    const bankArea = {
      x: 90,
      y: bankTop,
      w: width - 180,
      h: Math.max(90, height - bankTop - 70),
    };

    const points = randomDistributePoints({
      count: this.cards.length,
      area: bankArea,
      minDist: this.resolveScatterSpacing(),
      maxTriesPerPoint: 60,
    });

    const shuffledPoints = Phaser.Utils.Array.Shuffle([...points.points]);

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const point = shuffledPoints[i] ?? {
        x: Phaser.Math.Between(bankArea.x, bankArea.x + bankArea.w),
        y: Phaser.Math.Between(bankArea.y, bankArea.y + bankArea.h),
      };

      card.homeX = point.x - card.cardWidth / 2;
      card.homeY = point.y - card.cardHeight / 2;
      card.enableDragging();
      card.snapToCenter(point.x, point.y);
    }

    this.refreshCheckEnabled();
  }

  private resolveCardSize(itemCount: number, sceneWidth: number): number {
    if (this.dataIn.cardSize) return this.dataIn.cardSize;

    const availableW = sceneWidth - 64;
    const gap = itemCount <= 4 ? 24 : 16;
    const computed = Math.floor((availableW - Math.max(0, itemCount - 1) * gap) / Math.max(1, itemCount));

    return Phaser.Math.Clamp(computed, 92, 120);
  }

  private resolveScatterSpacing(): number {
    const firstCard = this.cards[0];
    if (!firstCard) return 110;
    return Math.max(90, Math.floor(firstCard.cardWidth * 0.78));
  }

  private normalizeItem(item: MemorySequenceItemInput, index: number): MemorySequenceItem {
    if ("content" in item) {
      return item;
    }

    return {
      id: `item-${index}`,
      content: item,
    };
  }
}
