// src/ui/WordToken.ts
import Phaser from "phaser";
import { SFX } from "../audio/soundKeys";

export type MarkStyle = "circle" | "cross" | "underline";

export const MARK_COLOR = 0xAA1111;

export interface WordTokenStyleOptions {
  textStyle: Phaser.Types.GameObjects.Text.TextStyle;
  padding?: number; // padding for mark bounds

  // Selected/hover styling (background pill behind text)
  hoverBgAlpha?: number;
  selectedBgAlpha?: number;
  bgRadius?: number;
}

export interface SetMarkedOptions {
  animate?: boolean;   // progressive stroke animation
  playSfx?: boolean;   // snap sound on mark
  durationMs?: number; // stroke duration
}

// If you have a central SFX constant, replace this with an import.
const DEFAULT_SNAP_KEY = "snap";

export class WordToken extends Phaser.GameObjects.Container {
  public readonly word: string;

  private readonly bgGfx: Phaser.GameObjects.Graphics;
  private readonly markGfx: Phaser.GameObjects.Graphics;
  private readonly textObj: Phaser.GameObjects.Text;

  // Dedicated, reliable input object
  private readonly hitZone: Phaser.GameObjects.Zone;

  private readonly opts: Required<Pick<
    WordTokenStyleOptions,
    "padding" | "hoverBgAlpha" | "selectedBgAlpha" | "bgRadius"
  >> & Pick<WordTokenStyleOptions, "textStyle">;

  private markStyle: MarkStyle;

  private marked = false;
  private selected = false;
  private hovered = false;

  // Animation state
  private markProgress = 0; // 0..1
  private markTween?: Phaser.Tweens.Tween;

  // Cached text bounds for local drawing
  private localW = 0;
  private localH = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    word: string,
    markStyle: MarkStyle,
    style: WordTokenStyleOptions
  ) {
    super(scene, x, y);

    this.word = word;
    this.markStyle = markStyle;

    this.opts = {
      textStyle: style.textStyle,
      padding: style.padding ?? 10,
      hoverBgAlpha: style.hoverBgAlpha ?? 0.08,
      selectedBgAlpha: style.selectedBgAlpha ?? 0.14,
      bgRadius: style.bgRadius ?? 10,
    };

    this.bgGfx = scene.add.graphics();
    this.markGfx = scene.add.graphics();
    this.textObj = scene.add.text(0, 0, word, this.opts.textStyle).setOrigin(0, 0);

    // Add visuals first
    this.add([this.bgGfx, this.markGfx, this.textObj]);

    // Measure text and set container size
    this.refreshSize();

    // Create a dedicated hit zone (most reliable input handling)
    this.hitZone = scene.add
      .zone(this.localW / 2, this.localH / 2, this.localW, this.localH)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Put hitZone on top so it always receives pointer events
    this.add(this.hitZone);

    // Hover/Out for background highlight
    this.hitZone.on("pointerover", () => {
      this.hovered = true;
      this.redrawBackground();
    });

    this.hitZone.on("pointerout", () => {
      this.hovered = false;
      this.redrawBackground();
    });

    // Re-emit pointerdown from the WordToken itself, so callers can do:
    // token.on("pointerdown", ...)
    this.hitZone.on("pointerdown", () => {
      this.emit("pointerdown");
    });

    scene.add.existing(this);

    // Initial draws
    this.redrawBackground();
    this.redrawMark();
  }

  /** Call if you ever change the text style/size dynamically */
  public refreshSize() {
    this.localW = this.textObj.width;
    this.localH = this.textObj.height;

    this.setSize(this.localW, this.localH);

    // Keep hit zone in sync if it exists
    // (constructor sets it after first refreshSize)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.hitZone) {
      this.hitZone.setPosition(this.localW / 2, this.localH / 2);
      this.hitZone.setSize(this.localW, this.localH);
    }
  }

  public isMarked() {
    return this.marked;
  }

  public isSelected() {
    return this.selected;
  }

  public setSelected(value: boolean) {
    if (this.selected === value) return;
    this.selected = value;
    this.redrawBackground();
  }

  public setMarkStyle(style: MarkStyle) {
    if (this.markStyle === style) return;
    this.markStyle = style;
    this.redrawMark();
  }

  public toggleMarked(options: SetMarkedOptions = {}) {
    this.setMarked(!this.marked, options);
  }

  public setMarked(value: boolean, options: SetMarkedOptions = {}) {
    const animate = options.animate ?? true;
    const playSfx = options.playSfx ?? true;
    const durationMs = options.durationMs ?? 220;

    if (this.marked === value) return;
    this.marked = value;

    // Stop previous animation if any
    if (this.markTween) {
      this.markTween.stop();
      this.markTween = undefined;
    }

    if (!value) {
      // Unmark instantly (simple + snappy)
      this.markProgress = 0;
      this.redrawMark();
      return;
    }

    // Marking: progressive stroke
    this.markProgress = animate ? 0 : 1;
    this.redrawMark();

    if (playSfx) {
      this.scene.sound.play(SFX.SNAP, { volume: 0.5 });
    }

    if (!animate) {
      this.markProgress = 1;
      this.redrawMark();
      return;
    }

    this.markTween = this.scene.tweens.add({
      targets: this,
      props: {
        markProgress: { value: 1, duration: durationMs, ease: "Sine.easeOut" },
      },
      onUpdate: () => this.redrawMark(),
      onComplete: () => {
        this.markTween = undefined;
        this.markProgress = 1;
        this.redrawMark();
      },
    });
  }

  private redrawBackground() {
    this.bgGfx.clear();

    const alpha =
      (this.selected ? this.opts.selectedBgAlpha : 0) +
      (this.hovered ? this.opts.hoverBgAlpha : 0);

    if (alpha <= 0) return;

    // Subtle dark background with alpha (neutral theme)
    this.bgGfx.fillStyle(0x000000, alpha);

    const pad = 6;
    const r = this.opts.bgRadius;

    this.bgGfx.fillRoundedRect(-pad, -pad, this.localW + pad * 2, this.localH + pad * 2, r);
  }

  private redrawMark() {
    this.markGfx.clear();
    if (!this.marked) return;

    const p = Phaser.Math.Clamp(this.markProgress, 0, 1);
    const pad = this.opts.padding;

    // Reset any scaling from previous draws
    this.markGfx.setScale(1, 1);
    this.markGfx.setPosition(0, 0);

    this.markGfx.lineStyle(4, MARK_COLOR, 1);

    const w = this.localW;
    const h = this.localH;

if (this.markStyle === "circle") {
  const cx = w / 2;
  const cy = h / 2;
  const rx = (w + pad * 2) / 2;
  const ry = (h + pad * 2) / 2;

  const start = -Math.PI / 2;
  const end = start + p * Math.PI * 2;

  const r = Math.max(rx, ry);

  // Reset transforms
  this.markGfx.setScale(1, 1);
  this.markGfx.setPosition(0, 0);

  // Draw a circular arc
  this.markGfx.beginPath();
  this.markGfx.arc(cx, cy, r, start, end, false);
  this.markGfx.strokePath();

  // Scale into ellipse
  const sx = rx / r;
  const sy = ry / r;
  this.markGfx.setScale(sx, sy);

  // Compensate translation so (cx, cy) stays fixed after scaling around (0,0)
  this.markGfx.setPosition((1 - sx) * cx, (1 - sy) * cy);
 }

    if (this.markStyle === "underline") {
      const y = h + 6;
      const x0 = -pad;
      const x1 = x0 + (w + pad * 2) * p;

      this.markGfx.beginPath();
      this.markGfx.moveTo(x0, y);
      this.markGfx.lineTo(x1, y);
      this.markGfx.strokePath();
    }

    if (this.markStyle === "cross") {
      // Single diagonal stroke, drawn progressively
      const x0 = -pad;
      const y0 = h + pad;
      const x1 = w + pad;
      const y1 = -pad;

      const x = Phaser.Math.Linear(x0, x1, p);
      const y = Phaser.Math.Linear(y0, y1, p);

      this.markGfx.beginPath();
      this.markGfx.moveTo(x0, y0);
      this.markGfx.lineTo(x, y);
      this.markGfx.strokePath();
    }
  }
}
