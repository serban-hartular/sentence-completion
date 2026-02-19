// src/objects/WordCard.ts
import Phaser from "phaser";
import { PronunciationRegistry } from "../audio/pronunciationRegistry";

export type WordCardOptions = {
  width?: number;
  height?: number;
  draggable?: boolean;
};

export class WordCard extends Phaser.GameObjects.Container {
  readonly word: string;

  homeX: number;
  homeY: number;

  private currentSlotIndex: number | null = null;

  readonly cardWidth: number;
  readonly cardHeight: number;

  readonly hit: Phaser.GameObjects.Rectangle;
  public label: Phaser.GameObjects.Text;

  private displayWord: string;

  /** True iff this card is intended to be draggable by the player. */
  public isDraggable: boolean = false;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    word: string,
    opts: WordCardOptions = {}
  ) {
    const w = opts.width ?? 100;
    const h = opts.height ?? 60;

    super(scene, centerX - w / 2, centerY - h / 2);

    this.word = word;
    this.displayWord = word;

    this.cardWidth = w;
    this.cardHeight = h;

    this.hit = scene.add
      .rectangle(w / 2, h / 2, w, h, 0xffffff, 1)
      .setStrokeStyle(4, 0x6aa9ff, 1);
    (this.hit as any).setRadius?.(18);

    this.label = scene.add
      .text(w / 2, h / 2, word, {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#1b1b1b",
      })
      .setOrigin(0.5);

    this.add([this.hit, this.label]);

    this.homeX = this.x;
    this.homeY = this.y;

    if (word.length > 6) {
      this.fitLongWordText(w);
    }

    this.hit.setInteractive({ useHandCursor: true });
    this.hit.setData("card", this);

    scene.add.existing(this);

    if (opts.draggable) this.enableDragging();

    this.hit.on("pointerdown", () => {
      const key = PronunciationRegistry[this.word];
      if (key) this.scene.sound.play(key, { volume: 0.8 });
    });
  }

  // --- Slot index tracking (no UI behavior here) ---
  public setSlotIndex(newIndex: number | null) {
    this.currentSlotIndex = newIndex;
  }
  public getSlotIndex(): number | null {
    return this.currentSlotIndex;
  }

  // --- Display helpers (slots can call these) ---
  public setDisplayWord(text: string) {
    this.displayWord = text;
    this.label.setText(text);
    if (text.length > 6) this.fitLongWordText(this.cardWidth);
    else {
      this.label.setScale(1);
      this.label.setFontSize(28);
    }
  }

  public resetDisplayWord() {
    this.setDisplayWord(this.word);
  }

  get centerX() {
    return this.x + this.cardWidth / 2;
  }
  get centerY() {
    return this.y + this.cardHeight / 2;
  }

  setCenter(x: number, y: number) {
    this.x = x - this.cardWidth / 2;
    this.y = y - this.cardHeight / 2;
  }

  private fitLongWordText(cardWidth: number) {
    const padding = 18;
    const maxW = cardWidth - padding * 2;

    const len = this.displayWord.length;
    const base = 28;
    const reduced = Math.max(16, base - (len - 5) * 2);
    this.label.setFontSize(reduced);

    this.label.setScale(1);
    this.label.setText(this.displayWord);

    const w = this.label.width;
    if (w > maxW) {
      const scale = maxW / w;
      this.label.setScale(scale);
    }
  }

  enableDragging() {
    this.isDraggable = true;
    this.scene.input.setDraggable(this.hit);

    this.hit.on("pointerover", () => this.setScale(1.03));
    this.hit.on("pointerout", () => this.setScale(1.0));
  }

  snapToCenter(x: number, y: number) {
    this.scene.tweens.add({
      targets: this,
      x: x - this.cardWidth / 2,
      y: y - this.cardHeight / 2,
      duration: 120,
      ease: "Back.Out",
    });
  }

  returnHome() {
    this.currentSlotIndex = null;
    this.resetDisplayWord();
    this.scene.tweens.add({
      targets: this,
      x: this.homeX,
      y: this.homeY,
      duration: 120,
      ease: "Back.Out",
    });
  }
}
