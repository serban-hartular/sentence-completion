// src/scenes/WelcomeScene.ts
import Phaser from "phaser";
import {
  fetchNextSentence,
  fetchSequences,
  selectSequence,
  type SelectResponse,
} from "../api/sentenceApi";
import { SFX } from "../audio/soundKeys";
import { startNextScreen } from "./screenFlow";

export class WelcomeScene extends Phaser.Scene {
  constructor() {
    super("welcome");
  }

  preload() {
    // Core SFX loaded up-front (unchanged)
    this.load.audio(SFX.SNAP, "/sfx/snap.mp3");
    this.load.audio(SFX.PICKUP, "/sfx/pickup.mp3");
    this.load.audio(SFX.SUCCESS, "/sfx/success.mp3");
    this.load.audio(SFX.TRY_AGAIN, "/sfx/try_again.mp3");
    this.load.audio(SFX.DONE, "/sfx/success.mp3");
  }

  async create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#bfe8ff");

    this.add
      .text(width / 2, 50, "Bine ați venit!", {
        fontFamily: "Arial",
        fontSize: "56px",
        color: "#0b2b46",
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(width / 2, 120, "Se încarcă...", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#0b2b46",
      })
      .setOrigin(0.5);

    let sequences: Awaited<ReturnType<typeof fetchSequences>>["sequences"] = [];

    try {
      const res = await fetchSequences();
      sequences = res.sequences;
    } catch (e) {
      console.error("fetchSequences failed:", e);
      statusText.setText("Server error loading sequences.");
      return;
    }

    if (sequences.length === 0) {
      statusText.setText("No sequences available.");
      return;
    }

    statusText.setText("Alegeți o secvență:");

    const startY = 170;
    const spacing = 64;

    sequences.forEach((seq, i) => {
      const btn = this.add
        .text(width / 2, startY + i * spacing, seq.name, {
          fontFamily: "Arial",
          fontSize: "34px",
          color: "#ffffff",
          backgroundColor: seq.color, //"#2f7dd1",
          padding: { left: 18, right: 18, top: 10, bottom: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerdown", async () => {
        this.input.enabled = false;
        statusText.setText("Loading…");

        try {
          const sel: SelectResponse = await selectSequence(seq.id);
          if (!sel.ok) {
            statusText.setText(sel.error ?? "Selection error");
            this.input.enabled = true;
            return;
          }

          const next = await fetchNextSentence();
          await startNextScreen(this, next);
        } catch (e) {
          console.error(e);
          this.scene.start("result", {
            success: false,
            done: true,
            message: "Server error",
          });
        }
      });
    });
  }
}
