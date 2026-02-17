import Phaser from "phaser";
import { fetchNextSentence, fetchSequences, selectSequence, toAbsoluteServerUrl } from "../api/sentenceApi";
import { setPronunciations } from "../audio/pronunciationRegistry";
import { SFX } from "../audio/soundKeys";

export class WelcomeScene extends Phaser.Scene {
  constructor() {
    super("welcome");
  }

  preload() {
    // Core SFX always loaded up-front
    this.load.audio(SFX.SNAP, "assets/sfx/snap.mp3");
    this.load.audio(SFX.PICKUP, "assets/sfx/pickup.mp3");
    this.load.audio(SFX.SUCCESS, "assets/sfx/success.mp3");
    this.load.audio(SFX.TRY_AGAIN, "assets/sfx/try_again.mp3");
    this.load.audio(SFX.DONE, "assets/sfx/success.mp3");

    // Do NOT preload pronunciations here anymore — those come from the server after selecting a sequence.
  }

  async create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#bfe8ff");

    this.add
      .text(width / 2, 70, "Welcome!", {
        fontFamily: "Arial",
        fontSize: "56px",
        color: "#0b2b46",
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(width / 2, 140, "Loading sequences…", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#0b2b46",
      })
      .setOrigin(0.5);

    let sequences: { id: string; name: string }[] = [];

    try {
      const res = await fetchSequences();
      sequences = res.sequences;
    } catch {
      statusText.setText("Server error loading sequences.");
      return;
    }

    if (sequences.length === 0) {
      statusText.setText("No sequences available.");
      return;
    }

    statusText.setText("Choose a sequence:");

    const startY = 200;
    const spacing = 64;

    sequences.forEach((seq, i) => {
      const btn = this.add
        .text(width / 2, startY + i * spacing, seq.name, {
          fontFamily: "Arial",
          fontSize: "34px",
          color: "#ffffff",
          backgroundColor: "#2f7dd1",
          padding: { left: 18, right: 18, top: 10, bottom: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerdown", async () => {
        // disable all buttons
        this.input.enabled = false;
        statusText.setText("Loading…");

        try {
          const sel = await selectSequence(seq.id);
          if (!sel.ok) {
            statusText.setText(sel.error ?? "Selection error");
            this.input.enabled = true;
            return;
          }

          // Update global word -> audioKey dictionary
          setPronunciations(sel.pronunciations);

          // Dynamically load pronunciations returned by server
          for (const key in sel.pronunciations) {
            //const absUrl = toAbsoluteServerUrl(entry.url);
            // avoid double-loading keys if already loaded
            let value = sel.pronunciations[key]
            if (!this.cache.audio.exists(value)) {
              console.log('Loading ' + value)
              this.load.audio(value, value);
            }
          }

          // Start loader only if we actually queued something
          if (this.load.totalToLoad > 0) {
            await new Promise<void>((resolve, reject) => {
              this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
              this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => reject(new Error("Audio load error")));
              this.load.start();
            });
          }

          // Request first sentence (no result payload)
          const next = await fetchNextSentence();

          if (next.done) {
            this.scene.start("result", { success: true, done: true, message: next.message });
          } else {
            this.scene.start("sentence", next.data);
          }
        } catch {
          this.scene.start("result", { success: false, done: true, message: "Server error" });
        }
      });
    });
  }
}
