// src/layout/MarkWordsLayoutGenerator.ts
import Phaser from "phaser";

export type WordsLayoutMode = "row" | "paragraph";

export interface MarkWordsLayoutOptions {
  mode: WordsLayoutMode;

  // Typography / measurement
  textStyle: Phaser.Types.GameObjects.Text.TextStyle;

  // Spacing
  gapX?: number;       // space between tokens
  gapY?: number;       // line spacing
  lineHeight?: number; // if you want to override token height for vertical spacing

  // Alignment inside bounds
  align?: "left" | "center" | "right";

  // If true, try to center each line (only meaningful for paragraph-like layout)
  centerEachLine?: boolean;
}

export interface TokenPlacement {
  word: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarkWordsLayoutResult {
  placements: TokenPlacement[];
  fits: boolean;
  usedBounds: Phaser.Geom.Rectangle;
}

/**
 * Wrap-layout generator for words inside a rectangular area.
 * Uses Phaser Text measurement by creating a temporary Text object.
 */
export class MarkWordsLayoutGenerator {
  static generate(
    scene: Phaser.Scene,
    bounds: Phaser.Geom.Rectangle,
    words: string[],
    opts: MarkWordsLayoutOptions
  ): MarkWordsLayoutResult {
    const mode = opts.mode;

    // Defaults tuned for readability
    const gapX = opts.gapX ?? (mode === "paragraph" ? 10 : 30);
    const gapY = opts.gapY ?? (mode === "paragraph" ? 18 : 26);
    const align = opts.align ?? "center";
    const centerEachLine = opts.centerEachLine ?? (mode === "paragraph");

    // Measure all words
    const measurements = words.map((w) => this.measure(scene, w, opts.textStyle));
    const placements: TokenPlacement[] = [];

    // Greedy word-wrap lines
    type Line = { items: TokenPlacement[]; width: number; height: number };
    const lines: Line[] = [];

    let current: Line = { items: [], width: 0, height: 0 };

    const maxW = bounds.width;

    const flushLine = () => {
      if (current.items.length > 0) {
        lines.push(current);
        current = { items: [], width: 0, height: 0 };
      }
    };

    for (let i = 0; i < words.length; i++) {
      const { width, height } = measurements[i];
      const word = words[i];

      const itemW = width;
      const itemH = height;

      const nextW =
        current.items.length === 0 ? itemW : current.width + gapX + itemW;

      if (nextW > maxW && current.items.length > 0) {
        flushLine();
      }

      const placeW =
        current.items.length === 0 ? itemW : current.width + gapX + itemW;

      const token: TokenPlacement = { word, x: 0, y: 0, width: itemW, height: itemH };

      current.items.push(token);
      current.width = placeW;
      current.height = Math.max(current.height, itemH);
    }

    flushLine();

    // Vertical placement
    const lineHeights = lines.map((l) => opts.lineHeight ?? l.height);
    const totalH =
      lineHeights.reduce((a, b) => a + b, 0) + Math.max(0, lines.length - 1) * gapY;

    const fits = totalH <= bounds.height;

    // Start Y (top aligned, but you can change this later if you want vertical centering)
    let y = bounds.y + (fits ? Math.max(0, (bounds.height - totalH) / 2) : 0);

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const lh = lineHeights[li];

      // Compute x start based on alignment
      let xStart = bounds.x;

      if (align === "center") {
        xStart = bounds.x + (bounds.width - line.width) / 2;
      } else if (align === "right") {
        xStart = bounds.right - line.width;
      }

      // If requested, center each line even if align is left/right (paragraph feel)
      if (centerEachLine) {
        xStart = bounds.x + (bounds.width - line.width) / 2;
      }

      let x = xStart;

      for (const item of line.items) {
        item.x = x;
        // baseline top-left layout
        item.y = y + (lh - item.height) / 2;
        placements.push(item);

        x += item.width + gapX;
      }

      y += lh + gapY;
    }

    // Used bounds estimate
    const used = new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.width, Math.min(bounds.height, totalH));

    return { placements, fits, usedBounds: used };
  }

  private static measure(
    scene: Phaser.Scene,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
  ): { width: number; height: number } {
    const tmp = scene.add.text(0, 0, text, style).setVisible(false);
    const width = tmp.width;
    const height = tmp.height;
    tmp.destroy();
    return { width, height };
  }
}
