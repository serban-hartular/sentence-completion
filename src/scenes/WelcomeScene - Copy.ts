import Phaser from "phaser";
import { fetchNextSentence } from "../api/sentenceApi";

import { SFX } from "../audio/soundKeys";

export class WelcomeScene extends Phaser.Scene {
  constructor() {
    super("welcome");
  }
  
  preload() {
    this.load.audio(SFX.SNAP, "assets/sfx/snap.mp3");
    this.load.audio(SFX.PICKUP, "assets/sfx/pickup.mp3");
    this.load.audio(SFX.SUCCESS, "assets/sfx/success.mp3");
    this.load.audio(SFX.TRY_AGAIN, "assets/sfx/try_again.mp3");
    this.load.audio(SFX.DONE, "assets/sfx/success.mp3");

    // pronunciations example:
    this.load.audio("pron_apple", "assets/pron/apple.wav");
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#bfe8ff");

    this.add.text(width / 2, height / 2 - 40, "Welcome!", {
      fontFamily: "Arial",
      fontSize: "56px",
      color: "#0b2b46",
    }).setOrigin(0.5);

    const start = this.add.text(width / 2, height / 2 + 50, "Start ▶", {
      fontFamily: "Arial",
      fontSize: "40px",
      color: "#ffffff",
      backgroundColor: "#2f7dd1",
      padding: { left: 18, right: 18, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    start.on("pointerdown", async () => {
      start.disableInteractive();

      try {
        const next = await fetchNextSentence();
        if (next.done) {
          this.scene.start("result", { success: true, done: true });
        } else {
          this.scene.start("sentence", next.data);
        }
      } catch {
        // minimal fallback
        this.scene.start("result", { success: false, done: true, message: "Server error" });
      }
    });
  }
}
