// src/ui/layout/TwoColumnCategorizeLayoutGenerator.ts
export type CategorizeLayout = {
  headers: Array<{ text: string; x: number; y: number }>;
  slots: Array<{ x: number; y: number; w: number; h: number }>;
  slotToColumn: number[]; // slots[i] belongs to which column
  bankArea: { x: number; y: number; w: number; h: number };
  fits: boolean;
};

export class TwoColumnCategorizeLayoutGenerator {
  generate(args: {
    area: { x: number; y: number; w: number; h: number };
    headers: [string, string];
    slotsPerColumn: [number, number];
    slotW: number;
    slotH: number;
    headerGapY?: number;
    slotGapY?: number;
    sidePaddingX?: number;
    centerGap?: number; // space between columns and bank
  }): CategorizeLayout {
    const {
      area,
      headers,
      slotsPerColumn,
      slotW,
      slotH,
      headerGapY = 40,
      slotGapY = 18,
      sidePaddingX = 10,
      centerGap = 20,
    } = args;

    // Column areas (left + right), bank area in the middle
    // Tuneable ratios; these feel good for your current card sizing.
    const leftColW = Math.floor(area.w * 0.30);
    const rightColW = Math.floor(area.w * 0.30);
    const bankW = area.w - leftColW - rightColW - centerGap * 2;

    const leftX = area.x;
    const bankX = leftX + leftColW + centerGap;
    const rightX = bankX + bankW + centerGap;

    const headerY = area.y;
    const slotsTopY = headerY + headerGapY + 30;

    const headersOut = [
      { text: headers[0], x: leftX + leftColW / 2, y: headerY + 10 },
      { text: headers[1], x: rightX + rightColW / 2, y: headerY + 10 },
    ];

    const slots: Array<{ x: number; y: number; w: number; h: number }> = [];
    const slotToColumn: number[] = [];

    // Helper for vertical stacking
    const stackSlots = (colIndex: 0 | 1, colX: number, colW: number, count: number) => {
      const centerX = colX + colW / 2;

      for (let i = 0; i < count; i++) {
        const y = slotsTopY + i * (slotH + slotGapY);

        slots.push({
          x: centerX,
          y,
          w: slotW,
          h: slotH,
        });
        slotToColumn.push(colIndex);
      }
    };

    stackSlots(0, leftX, leftColW, slotsPerColumn[0]);
    stackSlots(1, rightX, rightColW, slotsPerColumn[1]);

    // Bank area uses remaining vertical space under headers/slots region.
    const maxSlots = Math.max(slotsPerColumn[0], slotsPerColumn[1]);
    const slotsBottomY = slotsTopY + maxSlots * (slotH + slotGapY);

    const bankArea = {
      x: bankX + sidePaddingX,
      y: slotsTopY,
      w: bankW - sidePaddingX * 2,
      h: Math.max(80, Math.min(area.h - headerGapY, slotsBottomY - slotsTopY)),
    };

    // Fit test: do columns fit in available height?
    const neededH =
      headerGapY +
      maxSlots * slotH +
      Math.max(0, maxSlots - 1) * slotGapY;

    const fits = neededH <= area.h;

    return { headers: headersOut, slots, slotToColumn, bankArea, fits };
  }
}
