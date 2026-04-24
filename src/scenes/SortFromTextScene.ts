import Phaser from "phaser";
import { SlotScreen, type SlotSpec } from "../ui/SlotScreen";
import { TextArea } from "../ui/text/TextArea";
import {
  GrabbableTextArea,
  type GrabbableTextChunk,
} from "../ui/text/GrabbableTextArea";
import { WordCard } from "../objects/WordCard";
import { RowCategorizeLayoutGenerator } from "../ui/layout/RowCategorizeLayoutGenerator";
import type { SortFromTextSceneData } from "../types/screenData";

export type SortFromTextAttempt = string[][];

export class SortFromTextScene extends SlotScreen<WordCard> {
  protected dataIn!: SortFromTextSceneData;

  private slotToRow: number[] = [];

  private spawnedCardWidth = 180;
  private spawnedCardHeight = 70;
  private defaultRemoveIfReleased = true;

  private manualDragCard: WordCard | null = null;
  private manualDragPointerId: number | null = null;

  constructor() {
    super("sort-from-text");
  }

  init(data: SortFromTextSceneData) {
    this.dataIn = data;
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#bfe8ff");

    this.configureSlotScreen({
      snapRadius: 75,
      bottomAreaThresholdY: Math.floor(height * 0.78),
    });

    new TextArea(
      this,
      { x: 30, y: 16, w: width - 60, h: 70 },
      this.dataIn.prompt,
      { justify: "left", backgroundColor: null }
    );

    new GrabbableTextArea(
      this,
      { x: 40, y: 100, w: width - 80, h: 165 },
      this.dataIn.sourceText,
      {
        justify: "left",
        padding: 6,
        backgroundColor: null,
        style: {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#0b2b46",
          fontStyle: "Italic",
        },
        onChunkPointerDown: (chunk, _index, pointer) => {
          this.spawnCardFromChunk(chunk, pointer, this.defaultRemoveIfReleased);
        },
      }
    );

    const gen = new RowCategorizeLayoutGenerator();
    const layout = gen.generate({
      area: {
        x: 40,
        y: 210,
        w: width - 40,
        h: height - 100,
      },
      headers: this.dataIn.headers,
      slotsPerRow: this.dataIn.slotsPerColumn,
      slotW: this.spawnedCardWidth,
      slotH: this.spawnedCardHeight,
      headerW: 100,
      headerGapX: 35,
      slotGapX: 12,
      rowGapY: 22,
      bankTopGap: 20,
      bankHeight: 0,
    });

    this.slotToRow = layout.slotToRow;
    this.bottomAreaThresholdY = layout.bankArea.y - 10;

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

    const slotSpecs: SlotSpec<WordCard>[] = layout.slots.map((s) => ({
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
    }));

    this.buildSlots(slotSpecs);
    this.enableCardDragging();
    this.createCheckButton();

    if (!layout.fits) {
      this.add
        .text(width / 2, 265, "⚠ Layout doesn't fit (reduce rows / slots / sizes)", {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#8a1c1c",
        })
        .setOrigin(0.5);
    }

    this.input.on("pointermove", this.handleManualPointerMove, this);
    this.input.on("pointerup", this.handleManualPointerUp, this);
  }

  shutdown() {
    this.input.off("pointermove", this.handleManualPointerMove, this);
    this.input.off("pointerup", this.handleManualPointerUp, this);
  }

  protected buildAttempt(): SortFromTextAttempt {
    const out: string[][] = this.dataIn.headers.map(() => []);

    for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex++) {
      const row = this.slotToRow[slotIndex];
      const card = this.slots[slotIndex]?.occupant;

      if (row === undefined || !card) continue;
      out[row].push(card.word);
    }

    return out;
  }

  protected computeSuccess(attempt: SortFromTextAttempt): boolean {
    if (attempt.length !== this.dataIn.correctColumnContents.length) {
      return false;
    }

    for (let row = 0; row < attempt.length; row++) {
      const got = attempt[row] ?? [];
      const expected = this.dataIn.correctColumnContents[row] ?? [];

      if (!this.isSame(got, expected)) {
        return false;
      }
    }

    return true;
  }

  protected override removeFromSlot(card: WordCard) {
    super.removeFromSlot(card);

    if (this.shouldRemoveIfReleased(card)) {
      this.destroyCard(card);
    }
  }

protected override trySnapOrSwap(card: WordCard) {
  const prevIndex = card.getSlotIndex();

  if (prevIndex !== null) {
    const prev = this.slots[prevIndex];
    if (prev.occupant === card) prev.occupant = null;
    prev.callbacks?.onRemove?.(card, prevIndex);
    card.setSlotIndex(null);
    card.clearSlotState();
  }

  let bestIndex = -1;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < this.slots.length; i++) {
    const s = this.slots[i];
    const d = Phaser.Math.Distance.Between(
      card.centerX,
      card.centerY,
      s.x,
      s.y
    );

    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }

  // Released outside all slots
  if (bestDist > this.snapRadius) {
    if (this.shouldRemoveIfReleased(card)) {
      this.destroyCard(card);
    } else {
      // leave it loose where it was released
      card.homeX = card.x;
      card.homeY = card.y;
    }
    return;
  }

  const target = this.slots[bestIndex];

  if (!target.occupant) {
    this.placeCardInSlot(card, bestIndex);
    return;
  }

  const other = target.occupant;
  if (!other.isDraggable) {
    // target blocked; apply loose/delete behavior instead of snapping back
    if (this.shouldRemoveIfReleased(card)) {
      this.destroyCard(card);
    } else {
      card.homeX = card.x;
      card.homeY = card.y;
    }
    return;
  }

  this.placeCardInSlot(card, bestIndex);

  if (prevIndex !== null) {
    const prev = this.slots[prevIndex];
    if (!prev.occupant) {
      this.placeCardInSlot(other, prevIndex);
      return;
    }
  }

  other.setSlotIndex(null);
  other.clearSlotState();

  if (this.shouldRemoveIfReleased(other)) {
    this.destroyCard(other);
  } else {
    other.returnHome();
  }
}

  private spawnCardFromChunk(
    chunk: GrabbableTextChunk,
    pointer: Phaser.Input.Pointer,
    removeIfReleased: boolean
  ) {
    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    const card = new WordCard(this, wp.x, wp.y, chunk.text, {
      draggable: true,
      width: this.spawnedCardWidth,
      height: this.spawnedCardHeight,
    });

    card.homeX = card.x;
    card.homeY = card.y;

    (card as any).__removeIfReleased = removeIfReleased;

    this.cards.push(card);
    this.children.bringToTop(card);
    card.setScale(1.06);

    this.manualDragCard = card;
    this.manualDragPointerId = pointer.id;
  }

  private handleManualPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.manualDragCard) return;
    if (this.manualDragPointerId !== null && pointer.id !== this.manualDragPointerId) {
      return;
    }

    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.manualDragCard.setCenter(wp.x, wp.y);
  }

  private handleManualPointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.manualDragCard) return;
    if (this.manualDragPointerId !== null && pointer.id !== this.manualDragPointerId) {
      return;
    }

    const card = this.manualDragCard;
    this.manualDragCard = null;
    this.manualDragPointerId = null;

    card.setScale(1.0);

    if (
      this.bottomAreaThresholdY !== null &&
      card.getSlotIndex() !== null &&
      card.centerY > this.bottomAreaThresholdY
    ) {
      this.removeFromSlot(card);
      return;
    }

    this.trySnapOrSwap(card);
  }

  private shouldRemoveIfReleased(card: WordCard): boolean {
    return Boolean((card as any).__removeIfReleased);
  }

  private destroyCard(card: WordCard) {
    const idx = card.getSlotIndex();
    if (idx !== null) {
      const slot = this.slots[idx];
      if (slot?.occupant === card) {
        slot.occupant = null;
      }
      card.setSlotIndex(null);
    }

    const listIndex = this.cards.indexOf(card);
    if (listIndex >= 0) {
      this.cards.splice(listIndex, 1);
    }

    card.destroy();
  }

  private isSame(a: string[], b: string[]): boolean {
    let set_a = new Set<string>(), set_b = new Set<string>()
    
    for (const x of a) {
        set_a.add(x.toLocaleLowerCase())
    }
    for (const x of b) {
        set_b.add(x.toLocaleLowerCase())
    }
    if (set_a.size !== set_b.size) return false;

    for (const val of set_a) {
        if (!set_a.has(val)) return false;
    }
    return true;
  }
}
