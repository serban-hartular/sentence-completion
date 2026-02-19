// src/ui/slots/SlotScreen.ts
import Phaser from "phaser";
import { WordCard } from "../../objects/WordCard";
import { SFX } from "../../audio/soundKeys";

export type SlotCallbacks = {
  onPlace?: (card: WordCard, slotIndex: number) => void;
  onRemove?: (card: WordCard, slotIndex: number) => void;
};

export type SlotSpec = {
  x: number; // center
  y: number; // center
  w: number;
  h: number;
  initialWord?: string; // optional (SentenceScene uses this)
  callbacks?: SlotCallbacks;
};

type SlotRuntime = SlotSpec & {
  occupant: WordCard | null;
  outline: Phaser.GameObjects.Rectangle;
};

export type SlotScreenConfig = {
  snapRadius?: number;
  bottomAreaThresholdY?: number; // if card in slot and dragged below -> remove
  slotOutline?: {
    fill?: number;
    fillAlpha?: number;
    stroke?: number;
    strokeThickness?: number;
    radius?: number;
  };
};

export class SlotScreen extends Phaser.Scene {
  protected slots: SlotRuntime[] = [];
  protected cards: WordCard[] = [];

  protected snapRadius = 70;
  protected bottomAreaThresholdY: number | null = null;

  // Used by derived screens to position “bank area below slots”
  protected lastSlotRowY: number = 0;

  protected configureSlotScreen(cfg: SlotScreenConfig = {}) {
    this.snapRadius = cfg.snapRadius ?? this.snapRadius;
    this.bottomAreaThresholdY = cfg.bottomAreaThresholdY ?? this.bottomAreaThresholdY;
  }

  protected buildSlots(specs: SlotSpec[], cfg: SlotScreenConfig = {}) {
    const outlineCfg = {
      fill: 0xffffff,
      fillAlpha: 0.25,
      stroke: 0x2f7dd1,
      strokeThickness: 5,
      radius: 18,
      ...(cfg.slotOutline ?? {}),
    };

    this.slots = specs.map((s) => {
      const outline = this.add
        .rectangle(s.x, s.y, s.w, s.h, outlineCfg.fill, outlineCfg.fillAlpha)
        .setStrokeStyle(outlineCfg.strokeThickness, outlineCfg.stroke, 1);

      (outline as any).setRadius?.(outlineCfg.radius);

      return {
        ...s,
        occupant: null,
        outline,
      };
    });

    // best-effort: track last row Y for “spawn bank below”
    this.lastSlotRowY = specs.reduce((m, s) => Math.max(m, s.y), 0);
  }

  protected enableCardDragging() {
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

    this.input.on("dragend", () => {
      // handled per-object via dragend signature below
    });

    this.input.on("dragend", (_p: any, go: any) => {
      const card = (go as Phaser.GameObjects.GameObject).getData?.("card") as WordCard | undefined;
      if (!card) return;

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
    });
  }

  protected removeFromSlot(card: WordCard) {
    const idx = card.getSlotIndex();
    if (idx === null) return;

    const slot = this.slots[idx];
    if (slot.occupant === card) slot.occupant = null;

    // callbacks before we clear index (so callback knows which slot)
    slot.callbacks?.onRemove?.(card, idx);

    card.setSlotIndex(null);
    card.resetDisplayWord();
  }

  protected trySnapOrSwap(card: WordCard) {
    const prevIndex = card.getSlotIndex();

    // Detach from previous slot (runtime bookkeeping + callback)
    if (prevIndex !== null) {
      const prev = this.slots[prevIndex];
      if (prev.occupant === card) prev.occupant = null;
      prev.callbacks?.onRemove?.(card, prevIndex);
      card.setSlotIndex(null);
      card.resetDisplayWord();
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

    if (bestDist > this.snapRadius) {
      // If card was dragged out of a slot and dropped nowhere, put it back.
      if (prevIndex !== null) this.placeCardInSlot(card, prevIndex);
      return;
    }

    const target = this.slots[bestIndex];

    // Empty target: simple snap
    if (!target.occupant) {
      this.placeCardInSlot(card, bestIndex);
      return;
    }

    // Occupied: if occupant is immovable/locked, reject the drop.
    // If dragged from a slot, restore it to that slot; otherwise leave it where dropped.
    const other = target.occupant;
    if (!other.isDraggable) {
      if (prevIndex !== null) this.placeCardInSlot(card, prevIndex);
      return;
    }

    // Occupied and movable: swap behavior
    this.placeCardInSlot(card, bestIndex);

    // Put the other card into previous slot if available, else return home
    if (prevIndex !== null) {
      const prev = this.slots[prevIndex];
      if (!prev.occupant) {
        this.placeCardInSlot(other, prevIndex);
        return;
      }
    }

    // Otherwise kick it out
    other.setSlotIndex(null);
    other.resetDisplayWord();
    other.returnHome();
  }

  protected placeCardInSlot(card: WordCard, slotIndex: number) {
    const slot = this.slots[slotIndex];

    slot.occupant = card;
    card.setSlotIndex(slotIndex);
    card.snapToCenter(slot.x, slot.y);

    this.sound.play(SFX.SNAP, { volume: 0.5 });

    slot.callbacks?.onPlace?.(card, slotIndex);
  }
}
