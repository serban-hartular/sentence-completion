// src/scenes/MarkWordsScene.ts
import Phaser from "phaser";
import { WordToken, type SetMarkedOptions } from "../objects/WordToken";
import { MarkWordsLayoutGenerator } from "../ui/layout/MarkWordsLayoutGenerator";
// If you already have these utilities, use them. Otherwise replace with your own UI.
import { TextArea } from "../ui/text/TextArea";
import { CheckableExerciseScene } from "../ui/CheckableExerciseScene";
import type { MarkWordsSceneData } from "../types/screenData";

export interface MarkWordsAttempt {
  marked: string[];
}

export class MarkWordsScene extends CheckableExerciseScene<MarkWordsAttempt> {
  private task!: MarkWordsSceneData;
  private tokens: WordToken[] = [];

  // For single-select, track current
  private selectedToken?: WordToken;

  constructor() {
    super({ key: "mark_words" });
  }

  create(data: MarkWordsSceneData) {
    console.log(data.allowMultiple)
    this.task = data;

    const W = this.scale.width;
    const H = this.scale.height;

    const PROMPT_AREA = { x: 40, y: 60, w: W - 80, h: 140 };

    new TextArea(this, PROMPT_AREA, data.prompt, {
    style: { fontSize: 28 },
    justify: "center",
    });

    // Layout bounds for words (center + lower area)
    const wordsBounds = new Phaser.Geom.Rectangle(80, 220, W - 160, H - 340);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Arial",
      fontSize: data.layout === "paragraph" ? "30px" : "34px",
      color: "#000000",
    };

    const layout = MarkWordsLayoutGenerator.generate(
      this,
      wordsBounds,
      data.words,
      {
        mode: data.layout,
        textStyle,
        align: "center",
        // paragraph: slightly tighter spacing
        gapX: data.layout === "paragraph" ? 10 : 20,
        gapY: data.layout === "paragraph" ? 18 : 26,
        centerEachLine: data.layout === "paragraph",
      }
    );

    // Create tokens
    this.tokens = layout.placements.map((p) => {
      const token = new WordToken(this, p.x, p.y, p.word, data.markStyle, {
        textStyle,
        padding: 10,
        hoverBgAlpha: 0.08,
        selectedBgAlpha: 0.14,
        bgRadius: 10,
      });

      token.on("pointerdown", () => this.handleTokenClick(token));
      return token;
    });

    // Initial marked words should NOT animate or play sound
    if (data.initialMarked && data.initialMarked.length > 0) {
      const initialSet = new Set(data.initialMarked);
      const opts: SetMarkedOptions = { animate: false, playSfx: false };

      if (data.allowMultiple) {
        for (const t of this.tokens) {
          if (initialSet.has(t.word)) t.setMarked(true, opts);
        }
      } else {
        // pick first matching
        const t = this.tokens.find((x) => initialSet.has(x.word));
        if (t) {
          this.setSingleSelected(t, { animate: false, playSfx: false });
        }
      }
    }

    // // Check button (simple; replace with your existing button component if you have one)
    // const btn = this.add
    //   .text(W / 2, H - 70, "Check", {
    //     fontFamily: "Arial",
    //     fontSize: "36px",
    //     color: "#000000",
    //   })
    //   .setOrigin(0.5)
    //   .setInteractive({ useHandCursor: true });

    // btn.on("pointerdown", () => this.onCheck());

  this.createCheckButton();

    // Optional: warn if layout doesn't fit
    if (!layout.fits) {
      // You may prefer to shrink font or enable scrolling; this is just a dev hint.
      // console.warn("MarkWords layout does not fit bounds.");
    }
  }

  private handleTokenClick(token: WordToken) {
    if (this.task.allowMultiple) {
      token.toggleMarked({ animate: true, playSfx: true, durationMs: 220 });
      // selected state for feedback even in multi mode
      token.setSelected(token.isMarked());
      return;
    }

    // single-select rules:
    // - clicking already-marked token: keep it marked (or toggle off if you want; currently keep)
    // - clicking a new token: clear previous mark silently, mark new with animation+sound
    if (this.selectedToken === token) {
      // keep selected; optionally you could toggle off:
      // token.setMarked(false, { animate: false, playSfx: false });
      return;
    }

    this.setSingleSelected(token, { animate: true, playSfx: true, durationMs: 220 });
  }

  private setSingleSelected(token: WordToken, markOpts: SetMarkedOptions) {
    // Clear old silently (no sound, no animation)
    if (this.selectedToken) {
      this.selectedToken.setMarked(false, { animate: false, playSfx: false });
      this.selectedToken.setSelected(false);
    }

    this.selectedToken = token;

    token.setMarked(true, markOpts);
    token.setSelected(true);
  }

  // // private onCheck() {
  // //   const attempt: MarkWordsAttempt = {
  // //     marked: this.tokens.filter((t) => t.isMarked()).map((t) => t.word),
  // //   };

  // //   let success = false;

  // //   // If task includes correctMarked, compute success as set equality (order-insensitive)
  // //   if (this.task.correctMarked) {
  // //     const a = new Set(attempt.marked);
  // //     const c = new Set(this.task.correctMarked);

  // //     if (a.size === c.size) {
  // //       success = true;
  // //       for (const w of a) {
  // //         if (!c.has(w)) {
  // //           success = false;
  // //           break;
  // //         }
  // //       }
  // //     }
  // //   }

  //   // Route to your ResultScene. Keep payload shape aligned with your existing flow.
  //   // If you compute success on backend only, set success=false here and let backend decide.
  //   this.scene.start("result", {
  //     kind: "mark_words",
  //     attempt,
  //     success,
  //   });
  // }
  protected buildAttempt(): MarkWordsAttempt {
    return { marked: this.tokens.filter(t => t.isMarked()).map(t => t.word) };
  }

  protected computeSuccess(attempt: MarkWordsAttempt): boolean {
    if (!this.task.correctMarked) return false;
    const a = new Set(attempt.marked);
    const c = new Set(this.task.correctMarked);
    if (a.size !== c.size) return false;
    for (const w of a) if (!c.has(w)) return false;
    return true;
  }
}
