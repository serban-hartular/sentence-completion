// src/ui/layout/VocabLayoutGenerator.ts
export type Rect = { x: number; y: number; w: number; h: number };

export type PictureSlotLayout = {
  picture: { x: number; y: number; w: number; h: number }; // center-based
  slot: { x: number; y: number; w: number; h: number };    // center-based
};

export interface VocabLayoutGenerator {
  generate(params: {
    count: number;
    area: Rect;

    pictureW: number;
    pictureH: number;

    slotW: number;
    slotH: number;

    columns?: number;              // default: auto
    gapX?: number;
    gapY?: number;
    slotPlacement?: "below" | "right"; // default: below
    pictureSlotGap?: number;       // gap between picture and its slot
  }): { fits: boolean; items: PictureSlotLayout[] };
}
