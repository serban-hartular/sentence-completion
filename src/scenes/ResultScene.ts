import Phaser from "phaser";
import { fetchNextSentence } from "../api/sentenceApi";
import { SFX } from "../audio/soundKeys";

type ResultData = {
  success: boolean;
  attempt?: string[]; // what the user placed into slots
  done?: boolean;
  message?: string;
};

export class ResultScene extends Phaser.Scene {
  private state!: ResultData;

  constructor() {
    super("result");
  }

  init(data: ResultData) {
    this.state = data;
  }

  create() {
    const { width, height } = this.scale;
    const done = !!this.state.done;

    this.cameras.main.setBackgroundColor(done ? "#d9d9ff" : this.state.success ? "#c9f7d2" : "#ffd3d3");

    const title = done ? "You're done! 🌟" : this.state.success ? "Well done! 🎉" : "Try again! 🙂";
    this.sound.play(done ? SFX.DONE : this.state.success ? SFX.SUCCESS : SFX.TRY_AGAIN, { volume: 0.3 });

    this.add
      .text(width / 2, height / 2 - 40, title, {
        fontFamily: "Arial",
        fontSize: "56px",
        color: "#0b2b46",
      })
      .setOrigin(0.5);

    if (this.state.message) {
      this.add
        .text(width / 2, height / 2 + 10, this.state.message, {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#0b2b46",
        })
        .setOrigin(0.5);
    }

    const btnText = done ? "Play again ▶" : "Next ▶";

    const nextBtn = this.add
      .text(width / 2, height / 2 + 80, btnText, {
        fontFamily: "Arial",
        fontSize: "40px",
        color: "#ffffff",
        backgroundColor: "#2f7dd1",
        padding: { left: 18, right: 18, top: 10, bottom: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    nextBtn.on("pointerdown", async () => {
      nextBtn.disableInteractive();

      try {
        if (done) {
          // If you want "Play again" to return to sequence picker:
          this.scene.start("welcome");
          return;
        }

        // NEW: send attempt + success to server so it can adapt
        const next = await fetchNextSentence({
          attempt: this.state.attempt,
          success: this.state.success,
        });

        if (next.done) {
          this.scene.start("result", { success: true, done: true, message: next.message });
        } else {
          this.scene.start("sentence", next.data);
        }
      } catch {
        this.scene.start("result", { success: false, done: true, message: "Server error" });
      }
    });
  }
}
