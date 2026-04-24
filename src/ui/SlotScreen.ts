// src/ui/slots/SlotScreen.ts
import Phaser from "phaser";
import { SlotItem } from "../objects/SlotItem";
import { SFX } from "../audio/soundKeys";

export type SlotCallbacks<TCard extends SlotItem = SlotItem> = {
  onPlace?: (card: TCard, slotIndex: number) => void;
  onRemove?: (card: TCard, slotIndex: number) => void;
};

export type SlotSpec<TCard extends SlotItem = SlotItem> = {
  x: number; // center
  y: number; // center
  w: number;
  h: number;
  initialWord?: string; // optional (SentenceScene uses this)
  callbacks?: SlotCallbacks<TCard>;
};

type SlotRuntime<TCard extends SlotItem> = SlotSpec<TCard> & {
  occupant: TCard | null;
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

import { CheckableExerciseScene } from "../ui/CheckableExerciseScene";

export abstract class SlotScreen<TCard extends SlotItem = SlotItem> extends CheckableExerciseScene<any> {
  protected slots: SlotRuntime<TCard>[] = [];
  protected cards: TCard[] = [];

  protected snapRadius = 70;
  protected bottomAreaThresholdY: number | null = null;

  // Used by derived screens to position “bank area below slots”
  protected lastSlotRowY: number = 0;

  protected configureSlotScreen(cfg: SlotScreenConfig = {}) {
    this.snapRadius = cfg.snapRadius ?? this.snapRadius;
    this.bottomAreaThresholdY = cfg.bottomAreaThresholdY ?? this.bottomAreaThresholdY;
  }

  protected buildSlots(specs: SlotSpec<TCard>[], cfg: SlotScreenConfig = {}) {
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
      const card = (go as Phaser.GameObjects.GameObject).getData?.("slotItem") as TCard | undefined;
      if (!card) return;

      this.children.bringToTop(card);
      card.setScale(1.06);

      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      (card as any).__dragOffX = card.centerX - wp.x;
      (card as any).__dragOffY = card.centerY - wp.y;

      this.sound.play(SFX.PICKUP, { volume: 0.3 });
    });

    this.input.on("drag", (pointer: Phaser.Input.Pointer, go: any) => {
      const card = (go as Phaser.GameObjects.GameObject).getData?.("slotItem") as TCard | undefined;
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
      const card = (go as Phaser.GameObjects.GameObject).getData?.("slotItem") as TCard | undefined;
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

  protected removeFromSlot(card: TCard) {
    const idx = card.getSlotIndex();
    if (idx === null) return;

    const slot = this.slots[idx];
    if (slot.occupant === card) slot.occupant = null;

    // callbacks before we clear index (so callback knows which slot)
    slot.callbacks?.onRemove?.(card, idx);

    card.setSlotIndex(null);
    card.clearSlotState();
  }

  protected trySnapOrSwap(card: TCard) {
    const prevIndex = card.getSlotIndex();

    // Detach from previous slot (runtime bookkeeping + callback)
    if (prevIndex !== null) {
      const prev = this.slots[prevIndex];
      if (prev.occupant === card) prev.occupant = null;
      prev.callbacks?.onRemove?.(card, prevIndex);
      card.setSlotIndex(null);
      card.clearSlotState();
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
    other.clearSlotState();
    other.returnHome();
  }

  protected placeCardInSlot(card: TCard, slotIndex: number, opts: { playSfx?: boolean } = {}) {
    const { playSfx = true } = opts;
    const slot = this.slots[slotIndex];

    slot.occupant = card;
    card.setSlotIndex(slotIndex);
    card.snapToCenter(slot.x, slot.y);

    if(playSfx) {
      this.sound.play(SFX.SNAP, { volume: 0.5 });
    }
    
    slot.callbacks?.onPlace?.(card, slotIndex);
  }
}
