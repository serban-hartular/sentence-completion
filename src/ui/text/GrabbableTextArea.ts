// src/ui/text/GrabbableTextArea.ts
import Phaser from "phaser";
import type { TextAreaOptions, TextJustify } from "./TextArea";

export type GrabbableTextChunk = {
  text: string;
  spaceAfter?: boolean; // default true
};

export type GrabbableTextAreaOptions = TextAreaOptions & {
  onChunkPointerDown?: (
    chunk: GrabbableTextChunk,
    index: number,
    pointer: Phaser.Input.Pointer,
    textObject: Phaser.GameObjects.Text
  ) => void;
};

type LineItem = {
  index: number;
  textObj: Phaser.GameObjects.Text;
  chunk: GrabbableTextChunk;
  widthWithTrailingSpace: number;
};

export class GrabbableTextArea extends Phaser.GameObjects.Container {
  private bg?: Phaser.GameObjects.Rectangle;
  private chunkObjects: Phaser.GameObjects.Text[] = [];
  private areaW: number;
  private areaH: number;
  private padding: number;
  private justify: TextJustify;
  private style: Phaser.Types.GameObjects.Text.TextStyle;
  private onChunkPointerDown?: GrabbableTextAreaOptions["onChunkPointerDown"];

  constructor(
    scene: Phaser.Scene,
    area: { x: number; y: number; w: number; h: number },
    chunks: GrabbableTextChunk[],
    opts: GrabbableTextAreaOptions = {}
  ) {
    super(scene, area.x, area.y);

    this.areaW = area.w;
    this.areaH = area.h;
    this.padding = opts.padding ?? 0;
    this.justify = opts.justify ?? "center";
    this.onChunkPointerDown = opts.onChunkPointerDown;

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

  public setChunks(chunks: GrabbableTextChunk[]) {
    for (const obj of this.chunkObjects) {
      obj.destroy();
    }
    this.chunkObjects = [];

    const scene = this.scene;
    const usableW = Math.max(1, this.areaW - this.padding * 2);

    const spaceProbe = scene.add.text(0, 0, " ", this.style).setVisible(false);
    const spaceW = spaceProbe.width;
    const lineH = spaceProbe.height || this.estimateLineHeight(this.style);
    spaceProbe.destroy();

    const textObjects = chunks.map((chunk, index) => {
      const txt = scene.add.text(
        0,
        0,
        (chunk.text ?? "").replace(/\t/g, "    "),
        this.style
      );

      txt.setOrigin(0, 0);
      txt.setInteractive({ useHandCursor: true });

      txt.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        this.onChunkPointerDown?.(chunk, index, pointer, txt);
      });

      this.add(txt);
      this.chunkObjects.push(txt);
      return txt;
    });

    const lines: LineItem[][] = [];
    let currentLine: LineItem[] = [];
    let currentLineW = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const txt = textObjects[i];
      const trailing = chunk.spaceAfter !== false ? spaceW : 0;
      const tokenW = txt.width + trailing;

      if (currentLine.length > 0 && currentLineW + tokenW > usableW) {
        lines.push(currentLine);
        currentLine = [];
        currentLineW = 0;
      }

      currentLine.push({
        index: i,
        textObj: txt,
        chunk,
        widthWithTrailingSpace: tokenW,
      });
      currentLineW += tokenW;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    let y = this.padding;

    for (const line of lines) {
      const lineW = line.reduce((sum, item) => sum + item.widthWithTrailingSpace, 0);

      let startX = this.padding;
      if (this.justify === "center") {
        startX = this.padding + Math.max(0, (usableW - lineW) / 2);
      } else if (this.justify === "right") {
        startX = this.padding + Math.max(0, usableW - lineW);
      }

      let x = startX;
      for (const item of line) {
        item.textObj.x = x;
        item.textObj.y = y;
        x += item.widthWithTrailingSpace;
      }

      y += lineH;
    }
  }

  private estimateLineHeight(style: Phaser.Types.GameObjects.Text.TextStyle): number {
    const fontSize = style.fontSize;
    if (typeof fontSize === "number") return Math.ceil(fontSize * 1.2);
    if (typeof fontSize === "string") {
      const m = fontSize.match(/(\d+(\.\d+)?)/);
      if (m) return Math.ceil(Number(m[1]) * 1.2);
    }
    return 36;
  }
}
