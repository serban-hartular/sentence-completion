// src/ui/layout/SlotLayoutGenerator.ts
export type RowJustify = "left" | "center" | "right";

export type Rect = { x: number; y: number; w: number; h: number }; // x,y are top-left

export type SlotLayoutResult = {
  fits: boolean;
  // each slot: center coordinates + size
  slots: { x: number; y: number; w: number; h: number }[];
};

export interface SlotLayoutGenerator {
  generate(params: {
    slotsPerRow: number[];
    cardW: number;
    cardH: number;
    area: Rect;
    justify?: RowJustify[]; // per row
    gapX?: number;
    gapY?: number;
  }): SlotLayoutResult;
}
