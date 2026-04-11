import Phaser from "phaser";
import type { TextAreaOptions, TextJustify } from "./TextArea";

export type InteractiveMarkStyle = "circle" | "cross" | "underline";

type BaseChunk = {
  spaceAfter?: boolean;
};

export type PlainTextChunk = BaseChunk & {
  kind: "plain";
  text: string;
};

export type GrabbableTextChunk = BaseChunk & {
  kind: "grabbable";
  text: string;
  value?: string;
};

export type MarkableTextChunk = BaseChunk & {
  kind: "markable";
  text: string;
  marked?: boolean;
  markStyle?: InteractiveMarkStyle;
};

export type SlotTextChunk = BaseChunk & {
  kind: "slot";
  slotId: string;
  text?: string;
  filledText?: string;
  width?: number;
};

export type InteractiveTextChunk =
  | PlainTextChunk
  | GrabbableTextChunk
  | MarkableTextChunk
  | SlotTextChunk;

type ChunkObject =
  | Phaser.GameObjects.Text
  | Phaser.GameObjects.Container;

type ChunkRenderResult = {
  object: ChunkObject;
  width: number;
  height: number;
};

type LineItem = {
  index: number;
  chunk: InteractiveTextChunk;
  object: ChunkObject;
  width: number;
  height: number;
  widthWithTrailingSpace: number;
};

export type InteractiveTextAreaOptions = TextAreaOptions & {
  markColor?: number;
  slotMinWidth?: number;
  slotHeight?: number;
  slotPaddingX?: number;
  slotFillColor?: number;
  slotFillAlpha?: number;
  slotStrokeColor?: number;
  slotStrokeWidth?: number;
  onChunkPointerDown?: (
    chunk: InteractiveTextChunk,
    index: number,
    pointer: Phaser.Input.Pointer,
    target: ChunkObject
  ) => void;
  onGrabbablePointerDown?: (
    chunk: GrabbableTextChunk,
    index: number,
    pointer: Phaser.Input.Pointer,
    target: ChunkObject
  ) => void;
  onMarkablePointerDown?: (
    chunk: MarkableTextChunk,
    index: number,
    pointer: Phaser.Input.Pointer,
    target: ChunkObject
  ) => void;
  onSlotPointerDown?: (
    chunk: SlotTextChunk,
    index: number,
    pointer: Phaser.Input.Pointer,
    target: ChunkObject
  ) => void;
};

const DEFAULT_MARK_COLOR = 0xaa1111;

export class InteractiveTextArea extends Phaser.GameObjects.Container {
  private bg?: Phaser.GameObjects.Rectangle;
  private chunkObjects: ChunkObject[] = [];
  private areaW: number;
  private areaH: number;
  private padding: number;
  private justify: TextJustify;
  private style: Phaser.Types.GameObjects.Text.TextStyle;
  private opts: InteractiveTextAreaOptions;

  constructor(
    scene: Phaser.Scene,
    area: { x: number; y: number; w: number; h: number },
    chunks: InteractiveTextChunk[],
    opts: InteractiveTextAreaOptions = {}
  ) {
    super(scene, area.x, area.y);

    this.areaW = area.w;
    this.areaH = area.h;
    this.padding = opts.padding ?? 0;
    this.justify = opts.justify ?? "center";
    this.opts = opts;

    this.style = {
      fontFamily: "Arial",
      fontSize: "30px",
      color: "#0b2b46",
      align: this.justify,
      ...opts.style,
    };

    if (opts.backgroundColor !== null && opts.backgroundColor !== undefined) {
      this.bg = scene.add.rectangle(
        area.w / 2,
        area.h / 2,
        area.w,
        area.h,
        opts.backgroundColor,
        opts.backgroundAlpha ?? 1
      );
      this.add(this.bg);
    }

    this.setChunks(chunks);
    scene.add.existing(this);
  }

  public setChunks(chunks: InteractiveTextChunk[]) {
    for (const obj of this.chunkObjects) {
      obj.destroy();
    }
    this.chunkObjects = [];

    const scene = this.scene;
    const usableW = Math.max(1, this.areaW - this.padding * 2);

    const spaceProbe = scene.add.text(0, 0, " ", this.style).setVisible(false);
    const spaceW = spaceProbe.width;
    const textLineH = spaceProbe.height || this.estimateLineHeight(this.style);
    spaceProbe.destroy();

    const items = chunks.map((chunk, index) => {
      const rendered = this.createChunkObject(chunk, index, textLineH);
      this.add(rendered.object);
      this.chunkObjects.push(rendered.object);

      const trailing = chunk.spaceAfter !== false ? spaceW : 0;

      return {
        index,
        chunk,
        object: rendered.object,
        width: rendered.width,
        height: rendered.height,
        widthWithTrailingSpace: rendered.width + trailing,
      } satisfies LineItem;
    });

    const lines: LineItem[][] = [];
    let currentLine: LineItem[] = [];
    let currentLineW = 0;

    for (const item of items) {
      if (
        currentLine.length > 0 &&
        currentLineW + item.widthWithTrailingSpace > usableW
      ) {
        lines.push(currentLine);
        currentLine = [];
        currentLineW = 0;
      }

      currentLine.push(item);
      currentLineW += item.widthWithTrailingSpace;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    let y = this.padding;

    for (const line of lines) {
      const lineW = line.reduce((sum, item) => sum + item.widthWithTrailingSpace, 0);
      const lineH = Math.max(textLineH, ...line.map((item) => item.height));

      let startX = this.padding;
      if (this.justify === "center") {
        startX = this.padding + Math.max(0, (usableW - lineW) / 2);
      } else if (this.justify === "right") {
        startX = this.padding + Math.max(0, usableW - lineW);
      }

      let x = startX;
      for (const item of line) {
        item.object.x = x;
        item.object.y = y + Math.max(0, (lineH - item.height) / 2);
        x += item.widthWithTrailingSpace;
      }

      y += lineH;
    }
  }

  private createChunkObject(
    chunk: InteractiveTextChunk,
    index: number,
    textLineH: number
  ): ChunkRenderResult {
    if (chunk.kind === "slot") {
      return this.createSlotChunk(chunk, index, textLineH);
    }

    if (chunk.kind === "markable") {
      return this.createMarkableChunk(chunk, index);
    }

    return this.createTextChunk(chunk, index);
  }

  private createTextChunk(
    chunk: PlainTextChunk | GrabbableTextChunk,
    index: number
  ): ChunkRenderResult {
    const txt = this.scene.add.text(
      0,
      0,
      (chunk.text ?? "").replace(/\t/g, "    "),
      this.style
    );

    txt.setOrigin(0, 0);

    if (chunk.kind === "grabbable") {
      txt.setInteractive({ useHandCursor: true });
      txt.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        this.emitChunkPointerDown(chunk, index, pointer, txt);
      });
    }

    return {
      object: txt,
      width: txt.width,
      height: txt.height,
    };
  }

  private createMarkableChunk(
    chunk: MarkableTextChunk,
    index: number
  ): ChunkRenderResult {
    const container = this.scene.add.container(0, 0);
    const bgGfx = this.scene.add.graphics();
    const markGfx = this.scene.add.graphics();
    const textObj = this.scene.add
      .text(0, 0, (chunk.text ?? "").replace(/\t/g, "    "), this.style)
      .setOrigin(0, 0);

    const width = textObj.width;
    const height = textObj.height;
    const pad = 8;
    const radius = 10;

    bgGfx.fillStyle(0x000000, 0.05);
    bgGfx.fillRoundedRect(-pad / 2, -pad / 2, width + pad, height + pad, radius);

    container.add([bgGfx, markGfx, textObj]);
    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.emitChunkPointerDown(chunk, index, pointer, container);
    });

    if (chunk.marked) {
      this.drawMark(markGfx, width, height, chunk.markStyle ?? "underline");
    }

    return {
      object: container,
      width,
      height,
    };
  }

  private createSlotChunk(
    chunk: SlotTextChunk,
    index: number,
    textLineH: number
  ): ChunkRenderResult {
    const container = this.scene.add.container(0, 0);
    const box = this.scene.add.graphics();

    const displayText = (chunk.filledText ?? chunk.text ?? "").replace(/\t/g, "    ");
    const textObj = this.scene.add
      .text(0, 0, displayText, this.style)
      .setOrigin(0, 0);

    const slotPaddingX = this.opts.slotPaddingX ?? 12;
    const slotMinWidth = this.opts.slotMinWidth ?? 90;
    const slotHeight = this.opts.slotHeight ?? Math.max(textLineH + 10, 36);
    const width = Math.max(slotMinWidth, chunk.width ?? textObj.width + slotPaddingX * 2);
    const height = Math.max(slotHeight, textObj.height + 10);

    box.lineStyle(this.opts.slotStrokeWidth ?? 2, this.opts.slotStrokeColor ?? 0x6aa9ff, 1);
    box.fillStyle(this.opts.slotFillColor ?? 0xffffff, this.opts.slotFillAlpha ?? 0.55);
    box.fillRoundedRect(0, 0, width, height, 12);
    box.strokeRoundedRect(0, 0, width, height, 12);

    textObj.x = Math.max(slotPaddingX, (width - textObj.width) / 2);
    textObj.y = Math.max(0, (height - textObj.height) / 2);

    container.add([box, textObj]);
    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.emitChunkPointerDown(chunk, index, pointer, container);
    });

    return {
      object: container,
      width,
      height,
    };
  }

  private emitChunkPointerDown(
    chunk: InteractiveTextChunk,
    index: number,
    pointer: Phaser.Input.Pointer,
    target: ChunkObject
  ) {
    this.opts.onChunkPointerDown?.(chunk, index, pointer, target);

    if (chunk.kind === "grabbable") {
      this.opts.onGrabbablePointerDown?.(chunk, index, pointer, target);
    } else if (chunk.kind === "markable") {
      this.opts.onMarkablePointerDown?.(chunk, index, pointer, target);
    } else if (chunk.kind === "slot") {
      this.opts.onSlotPointerDown?.(chunk, index, pointer, target);
    }
  }

  private drawMark(
    gfx: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    style: InteractiveMarkStyle
  ) {
    const pad = 8;
    const color = this.opts.markColor ?? DEFAULT_MARK_COLOR;

    gfx.clear();
    gfx.lineStyle(4, color, 1);

    if (style === "underline") {
      const y = height + 4;
      gfx.beginPath();
      gfx.moveTo(-pad / 2, y);
      gfx.lineTo(width + pad / 2, y);
      gfx.strokePath();
      return;
    }

    if (style === "cross") {
      gfx.beginPath();
      gfx.moveTo(-pad / 2, height + pad / 2);
      gfx.lineTo(width + pad / 2, -pad / 2);
      gfx.strokePath();
      return;
    }

    const cx = width / 2;
    const cy = height / 2;
    const rx = (width + pad * 2) / 2;
    const ry = (height + pad * 2) / 2;
    const r = Math.max(rx, ry);

    gfx.beginPath();
    gfx.arc(cx, cy, r, -Math.PI / 2, (Math.PI * 3) / 2, false);
    gfx.strokePath();

    const sx = rx / r;
    const sy = ry / r;
    gfx.setScale(sx, sy);
    gfx.setPosition((1 - sx) * cx, (1 - sy) * cy);
  }

  private estimateLineHeight(style: Phaser.Types.GameObjects.Text.TextStyle): number {
    const fontSize = style.fontSize;
    if (typeof fontSize === "number") return Math.ceil(fontSize * 1.2);
    if (typeof fontSize === "string") {
      const match = fontSize.match(/(\d+(\.\d+)?)/);
      if (match) return Math.ceil(Number(match[1]) * 1.2);
    }
    return 36;
  }
}
