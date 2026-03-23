// src/ui/layout/RowCategorizeLayoutGenerator.ts
export type RowCategorizeLayout = {
  headers: Array<{ text: string; x: number; y: number }>;
  slots: Array<{ x: number; y: number; w: number; h: number }>;
  slotToRow: number[]; // slots[i] belongs to which row
  bankArea: { x: number; y: number; w: number; h: number };
  fits: boolean;
};

export class RowCategorizeLayoutGenerator {
  generate(args: {
    area: { x: number; y: number; w: number; h: number };
    headers: string[];
    slotsPerRow: number[];
    slotW: number;
    slotH: number;
    headerW?: number;
    headerGapX?: number;
    slotGapX?: number;
    rowGapY?: number;
    rowInnerGapY?: number; // gap from row header to row slots
    bankTopGap?: number;
    sidePaddingX?: number;
    bankHeight?: number;
  }): RowCategorizeLayout {
    const {
      area,
      headers,
      slotsPerRow,
      slotW,
      slotH,
      headerW = 180,
      headerGapX = 18,
      slotGapX = 14,
      rowGapY = 28,
      rowInnerGapY = 0,
      bankTopGap = 28,
      sidePaddingX = 8,
      bankHeight = 80,
    } = args;

    const rowCount = Math.min(headers.length, slotsPerRow.length);

    const headersOut: Array<{ text: string; x: number; y: number }> = [];
    const slots: Array<{ x: number; y: number; w: number; h: number }> = [];
    const slotToRow: number[] = [];

    const contentLeft = area.x + sidePaddingX;
    const contentRight = area.x + area.w - sidePaddingX;

    const headerCenterX = contentLeft + headerW / 2;
    const slotsLeftX = contentLeft + headerW + headerGapX;
    const slotsRightX = contentRight;
    const slotsAvailableW = Math.max(0, slotsRightX - slotsLeftX);

    let currentY = area.y;
    let maxUsedBottom = area.y;

    for (let row = 0; row < rowCount; row++) {
      const count = Math.max(0, slotsPerRow[row] ?? 0);

      const rowTopY = currentY;
      const headerY = rowTopY + slotH / 2;
      const slotsY = rowTopY + rowInnerGapY + slotH / 2;

      headersOut.push({
        text: headers[row],
        x: headerCenterX,
        y: headerY,
      });

      const rowSlotsW =
        count > 0 ? count * slotW + Math.max(0, count - 1) * slotGapX : 0;

      const startX = slotsLeftX + slotW / 2; //rowSlotsW / 2;

      for (let i = 0; i < count; i++) {
        const x = startX + i * (slotW + slotGapX);
        slots.push({
          x,
          y: slotsY,
          w: slotW,
          h: slotH,
        });
        slotToRow.push(row);
      }

      maxUsedBottom = Math.max(maxUsedBottom, rowTopY + slotH);
      currentY += slotH + rowGapY;
    }

    const bankArea = {
      x: contentLeft,
      y: maxUsedBottom + bankTopGap,
      w: contentRight - contentLeft,
      h: Math.max(bankHeight, area.y + area.h - (maxUsedBottom + bankTopGap)),
    };

    const widestRowW =
      Math.max(0, ...slotsPerRow.map((count) =>
        count > 0 ? count * slotW + Math.max(0, count - 1) * slotGapX : 0
      ));

    const fitsHorizontally = headerW + headerGapX + widestRowW <= area.w - sidePaddingX * 2;

    const neededH =
      rowCount > 0
        ? rowCount * slotH + Math.max(0, rowCount - 1) * rowGapY + bankTopGap + bankHeight
        : bankTopGap + bankHeight;

    const fitsVertically = neededH <= area.h;

    return {
      headers: headersOut,
      slots,
      slotToRow,
      bankArea,
      fits: fitsHorizontally && fitsVertically,
    };
  }
}
