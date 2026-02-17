import Phaser from "phaser";
import { PRONUNCIATION_AUDIO } from "../audio/pronunciations";
import { PronunciationRegistry } from "../audio/pronunciationRegistry";

export type WordCardOptions = {
  width?: number;
  height?: number;
  draggable?: boolean;
};

export class WordCard extends Phaser.GameObjects.Container {
  readonly word: string;

  // “Home” position (top-left of the container)
  homeX: number;
  homeY: number;

  // Slot tracking
  private currentSlotIndex: number | null = null;

  public setSlotIndex(newIndex : number | null) {
    this.currentSlotIndex = newIndex
    if(newIndex == 0) {
      let str = this.word
      this.label.setText(str.charAt(0).toUpperCase() + str.slice(1))
    } else {
      this.label.setText(this.word)
    }
  }

  public getSlotIndex() : number | null {
    return this.currentSlotIndex;
  }

  readonly cardWidth: number;
  readonly cardHeight: number;

  /** The actual interactive + draggable object (rect), for reliable hit testing */
  readonly hit: Phaser.GameObjects.Rectangle;

  public label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    word: string,
    opts: WordCardOptions = {}
  ) {
    const w = opts.width ?? 100; //140;
    const h = opts.height ?? 60; //64;

    // Container positioned by TOP-LEFT (reliable)
    super(scene, centerX - w / 2, centerY - h / 2);

    this.word = word;
    this.cardWidth = w;
    this.cardHeight = h;

    // Background rectangle (world hit-testing is very reliable on shape objects)
    this.hit = scene.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 1).setStrokeStyle(4, 0x6aa9ff, 1);
    (this.hit as any).setRadius?.(18);

    this.label = scene.add.text(w / 2, h / 2, word, {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#1b1b1b",
    }).setOrigin(0.5);

    this.add([this.hit, this.label]);

    this.homeX = this.x;
    this.homeY = this.y;

    // Auto-layout ONLY for words longer than six letters:
    if (word.length > 6) {
      this.fitLongWordText(w);
    }

    // Make BG the sole interactive object (avoid container input quirks with scaling)
    this.hit.setInteractive({ useHandCursor: true });
    this.hit.setData("card", this);

    scene.add.existing(this);

    if (opts.draggable) this.enableDragging();

        this.hit.on("pointerdown", () => {
    // on click
    const key = PronunciationRegistry[this.word];
    if (key) {
          this.scene.sound.play(key, { volume: 0.8 });
        }
    });

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
    // Keep card width constant (no hinting via slot/card size).
    const padding = 18;
    const maxW = cardWidth - padding * 2;

    const len = this.word.length;
    const base = 28;
    const reduced = Math.max(16, base - (len - 5) * 2);
    this.label.setFontSize(reduced);

    this.label.setScale(1);
    this.label.setText(this.word);

    const w = this.label.width;
    if (w > maxW) {
      const scale = maxW / w;
      this.label.setScale(scale);
    }
  }

  enableDragging() {
    // drag the rect; move the container in drag handler
    this.scene.input.setDraggable(this.hit);

    // Hover feedback on the rect (not the container)
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
    this.scene.tweens.add({
      targets: this,
      x: this.homeX,
      y: this.homeY,
      duration: 120,
      ease: "Back.Out",
    });
  }
}
