import Phaser from "phaser";
import { ImageRegistry } from "../images/imageRegistry";
import { SlotItem } from "./SlotItem";
import type { MemoryCardContent, MemoryShapeType } from "../types/MemoryCardContent";

export type ImageCardOptions = {
  itemId?: string;
  width?: number;
  height?: number;
  draggable?: boolean;
  backgroundColor?: number;
  borderColor?: number;
  borderThickness?: number;
  contentPadding?: number;
};

const DEFAULT_CARD_SIZE = 120;

export class ImageCard extends SlotItem {
  readonly itemId?: string;
  readonly content: MemoryCardContent;
  readonly cardWidth: number;
  readonly cardHeight: number;

  readonly hit: Phaser.GameObjects.Rectangle;

  private readonly contentPadding: number;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    content: MemoryCardContent,
    opts: ImageCardOptions = {}
  ) {
    const w = opts.width ?? DEFAULT_CARD_SIZE;
    const h = opts.height ?? DEFAULT_CARD_SIZE;

    super(scene, centerX, centerY, w, h);

    this.itemId = opts.itemId;
    this.content = content;
    this.cardWidth = w;
    this.cardHeight = h;
    this.contentPadding = opts.contentPadding ?? 14;

    this.hit = scene.add
      .rectangle(
        w / 2,
        h / 2,
        w,
        h,
        opts.backgroundColor ?? 0xffffff,
        1
      )
      .setStrokeStyle(opts.borderThickness ?? 4, opts.borderColor ?? 0x6aa9ff, 1);
    (this.hit as any).setRadius?.(18);

    this.add(this.hit);
    this.addContent();

    this.hit.setInteractive({ useHandCursor: true });
    this.registerDragTarget(this.hit);

    if (opts.draggable) this.enableDragging();
  }

  private addContent() {
    if (this.content.type === "image") {
      this.addImageContent(this.content.imageId);
      return;
    }

    this.addShapeContent(this.content.shape, this.content.color);
  }

  private addImageContent(imageId: string) {
    const texKey = ImageRegistry[imageId] ?? imageId;
    const image = this.scene.add.image(this.cardWidth / 2, this.cardHeight / 2, texKey);

    const maxW = this.cardWidth - this.contentPadding * 2;
    const maxH = this.cardHeight - this.contentPadding * 2;
    const scale = Math.min(maxW / image.width, maxH / image.height);

    image.setScale(scale);
    this.add(image);
  }

  private addShapeContent(shape: MemoryShapeType, color: number | string | undefined) {
    const g = this.scene.add.graphics();
    const fillColor = typeof color === "string"
      ? Phaser.Display.Color.HexStringToColor(color).color
      : (color ?? 0xff8a3d);

    const strokeColor = 0x1f4f82;
    const contentW = this.cardWidth - this.contentPadding * 2;
    const contentH = this.cardHeight - this.contentPadding * 2;
    const cx = this.cardWidth / 2;
    const cy = this.cardHeight / 2;

    g.fillStyle(fillColor, 1);
    g.lineStyle(3, strokeColor, 0.95);

    switch (shape) {
      case "circle":
        g.fillCircle(cx, cy, Math.min(contentW, contentH) / 2);
        g.strokeCircle(cx, cy, Math.min(contentW, contentH) / 2);
        break;
      case "ellipse":
        g.fillEllipse(cx, cy, contentW, contentH * 0.72);
        g.strokeEllipse(cx, cy, contentW, contentH * 0.72);
        break;
      case "triangle":
        g.beginPath();
        g.moveTo(cx, cy - contentH / 2);
        g.lineTo(cx - contentW / 2, cy + contentH / 2);
        g.lineTo(cx + contentW / 2, cy + contentH / 2);
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      case "diamond":
        g.beginPath();
        g.moveTo(cx, cy - contentH / 2);
        g.lineTo(cx - contentW / 2, cy);
        g.lineTo(cx, cy + contentH / 2);
        g.lineTo(cx + contentW / 2, cy);
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      case "square":
      default:
        g.fillRoundedRect(
          cx - contentW / 2,
          cy - contentH / 2,
          contentW,
          contentH,
          12
        );
        g.strokeRoundedRect(
          cx - contentW / 2,
          cy - contentH / 2,
          contentW,
          contentH,
          12
        );
        break;
    }

    this.add(g);
  }
}
