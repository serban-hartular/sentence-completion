// src/ui/layout/SimpleGridVocabLayoutGenerator.ts
import type { VocabLayoutGenerator, PictureSlotLayout } from "./VocabLayoutGenerator";

export class SimpleGridVocabLayoutGenerator implements VocabLayoutGenerator {
  generate(params: {
    count: number;
    area: { x: number; y: number; w: number; h: number };
    pictureW: number;
    pictureH: number;
    slotW: number;
    slotH: number;
    columns?: number;
    gapX?: number;
    gapY?: number;
    slotPlacement?: "below" | "right";
    pictureSlotGap?: number;
  }): { fits: boolean; items: PictureSlotLayout[] } {
    const {
      count,
      area,
      pictureW,
      pictureH,
      slotW,
      slotH,
    } = params;

    const slotPlacement = params.slotPlacement ?? "below";
    const pictureSlotGap = params.pictureSlotGap ?? 16;
    const gapX = params.gapX ?? 40;
    const gapY = params.gapY ?? 40;

    // choose columns if not given
    const columns =
      params.columns ??
      (count <= 2 ? 2 : count <= 4 ? 2 : 3);

    const rows = Math.ceil(count / columns);

    const cellW = slotPlacement === "right"
      ? pictureW + pictureSlotGap + slotW
      : Math.max(pictureW, slotW);

    const cellH = slotPlacement === "below"
      ? pictureH + pictureSlotGap + slotH
      : Math.max(pictureH, slotH);

    const totalW = columns * cellW + (columns - 1) * gapX;
    const totalH = rows * cellH + (rows - 1) * gapY;

    const fits = totalW <= area.w && totalH <= area.h;

    const startX = area.x + (area.w - totalW) / 2;
    const startY = area.y + (area.h - totalH) / 2;

    const items: PictureSlotLayout[] = [];

    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / columns);
      const c = i % columns;

      const cellLeft = startX + c * (cellW + gapX);
      const cellTop = startY + r * (cellH + gapY);

      if (slotPlacement === "below") {
        const picCx = cellLeft + cellW / 2;
        const picCy = cellTop + pictureH / 2;

        const slotCx = cellLeft + cellW / 2;
        const slotCy = cellTop + pictureH + pictureSlotGap + slotH / 2;

        items.push({
          picture: { x: picCx, y: picCy, w: pictureW, h: pictureH },
          slot: { x: slotCx, y: slotCy, w: slotW, h: slotH },
        });
      } else {
        const picCx = cellLeft + pictureW / 2;
        const picCy = cellTop + cellH / 2;

        const slotCx = cellLeft + pictureW + pictureSlotGap + slotW / 2;
        const slotCy = cellTop + cellH / 2;

        items.push({
          picture: { x: picCx, y: picCy, w: pictureW, h: pictureH },
          slot: { x: slotCx, y: slotCy, w: slotW, h: slotH },
        });
      }
    }

    return { fits, items };
  }
}
