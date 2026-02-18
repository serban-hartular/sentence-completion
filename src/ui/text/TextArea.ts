// src/ui/text/TextArea.ts
import Phaser from "phaser";

export type TextJustify = "left" | "center" | "right";

export type TextAreaOptions = {
  style?: Phaser.Types.GameObjects.Text.TextStyle;
  justify?: TextJustify;
  backgroundColor?: number | null; // null/undefined => transparent
  backgroundAlpha?: number;
  padding?: number;
};

export class TextArea extends Phaser.GameObjects.Container {
  private bg?: Phaser.GameObjects.Rectangle;
  private textObj: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    area: { x: number; y: number; w: number; h: number }, // top-left + size
    text: string,
    opts: TextAreaOptions = {}
  ) {
    super(scene, area.x, area.y);

    const justify = opts.justify ?? "center";
    const padding = opts.padding ?? 0;

    const processed = text.replace(/\t/g, "    ");

    const align = justify; // Phaser accepts "left"|"center"|"right"
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Arial",
      fontSize: "30px",
      color: "#0b2b46",
      align,
      wordWrap: {
        width: Math.max(1, area.w - padding * 2),
        useAdvancedWrap: true,
      },
      ...opts.style,
    };

    if (opts.backgroundColor !== null && opts.backgroundColor !== undefined) {
      this.bg = scene.add
        .rectangle(area.w / 2, area.h / 2, area.w, area.h, opts.backgroundColor, opts.backgroundAlpha ?? 1);
      this.add(this.bg);
    }

    this.textObj = scene.add.text(padding, padding, processed, style);

    // Position text within the area according to justification
    if (justify === "left") {
      this.textObj.setOrigin(0, 0);
      this.textObj.x = padding;
    } else if (justify === "right") {
      this.textObj.setOrigin(1, 0);
      this.textObj.x = area.w - padding;
    } else {
      this.textObj.setOrigin(0.5, 0);
      this.textObj.x = area.w / 2;
    }

    this.textObj.y = padding;

    this.add(this.textObj);
    scene.add.existing(this);
  }

  setText(text: string) {
    this.textObj.setText(text.replace(/\t/g, "    "));
  }
}
