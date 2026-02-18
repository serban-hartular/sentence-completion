// src/ui/layout/SimpleRowSlotLayoutGenerator.ts
import type { SlotLayoutGenerator, SlotLayoutResult, RowJustify } from "./SlotLayoutGenerator";

export class SimpleRowSlotLayoutGenerator implements SlotLayoutGenerator {
  generate(params: {
    slotsPerRow: number[];
    cardW: number;
    cardH: number;
    area: { x: number; y: number; w: number; h: number };
    justify?: RowJustify[];
    gapX?: number;
    gapY?: number;
  }): SlotLayoutResult {
    const { slotsPerRow, cardW, cardH, area } = params;
    const gapX = params.gapX ?? 20;
    const gapY = params.gapY ?? 30;

    const justify: RowJustify[] = slotsPerRow.map(
      (_n, i) => params.justify?.[i] ?? "center"
    );

    const rows = slotsPerRow.length;
    if (rows === 0) return { fits: true, slots: [] };

    const rowWidths = slotsPerRow.map((n) => (n <= 0 ? 0 : n * cardW + (n - 1) * gapX));
    const totalH = rows * cardH + (rows - 1) * gapY;

    const maxRowW = Math.max(...rowWidths, 0);

    const fits = maxRowW <= area.w && totalH <= area.h;

    const slots: { x: number; y: number; w: number; h: number }[] = [];

    // Vertically center the whole block in the area
    const startY = area.y + (area.h - totalH) / 2 + cardH / 2;

    for (let r = 0; r < rows; r++) {
      const n = slotsPerRow[r];
      if (n <= 0) continue;

      const rowW = rowWidths[r];

      let startXCenter: number;
      const j = justify[r];

      if (j === "left") {
        startXCenter = area.x + cardW / 2;
      } else if (j === "right") {
        startXCenter = area.x + area.w - rowW + cardW / 2;
      } else {
        // center
        startXCenter = area.x + (area.w - rowW) / 2 + cardW / 2;
      }

      const y = startY + r * (cardH + gapY);

      for (let c = 0; c < n; c++) {
        const x = startXCenter + c * (cardW + gapX);
        slots.push({ x, y, w: cardW, h: cardH });
      }
    }

    return { fits, slots };
  }
}
