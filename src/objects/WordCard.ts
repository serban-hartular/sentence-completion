// src/objects/WordCard.ts
import Phaser from "phaser";
import { PronunciationRegistry } from "../audio/pronunciationRegistry";
import { SlotItem } from "./SlotItem";

export type WordCardOptions = {
  width?: number;
  height?: number;
  draggable?: boolean;
  numCharsShrink? : number;
};

export class WordCard extends SlotItem {
  readonly word: string;

  private numCharsShrink : number;

  readonly cardWidth: number;
  readonly cardHeight: number;

  readonly hit: Phaser.GameObjects.Rectangle;
  public label: Phaser.GameObjects.Text;

  private displayWord: string;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    word: string,
    opts: WordCardOptions = {}
  ) {
    const w = opts.width ?? 100;
    const h = opts.height ?? 60;

    super(scene, centerX, centerY, w, h);

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

      this.numCharsShrink = opts.numCharsShrink ?? 6;

    this.add([this.hit, this.label]);

    if (word.length > this.numCharsShrink) {
      this.fitLongWordText(w);
    }

    this.hit.setInteractive({ useHandCursor: true });
    this.registerDragTarget(this.hit);

    if (opts.draggable) this.enableDragging();

    this.hit.on("pointerdown", () => {
      const key = PronunciationRegistry[this.word];
      if (key) this.scene.sound.play(key, { volume: 0.8 });
    });
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

  private fitLongWordText(cardWidth: number) {
    const padding = 4;
    const maxW = cardWidth - padding * 2;

    const len = this.displayWord.length;
    const base = 28;
    const reduced = Math.max(16, base - (len - this.numCharsShrink) * 2);
    this.label.setFontSize(reduced);

    this.label.setScale(1);
    this.label.setText(this.displayWord);

    const w = this.label.width;
    if (w > maxW) {
      const scale = maxW / w;
      this.label.setScale(scale);
    }
  }

  public override clearSlotState() {
    this.resetDisplayWord();
  }
}
