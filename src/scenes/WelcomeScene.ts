import Phaser from "phaser";
import { fetchNextSentence, fetchSequences, selectSequence } from "../api/sentenceApi";
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

  /**
   * IMPORTANT:
   * Use a fresh LoaderPlugin for dynamic pronunciation loads.
   * Reusing this.load across scene transitions often causes the "second batch never loads" behavior.
   */
  private async loadPronunciations(pronunciations: Record<string, any>): Promise<void> {
    const loader = new Phaser.Loader.LoaderPlugin(this);

    let queuedAny = false;

    for (const word of Object.keys(pronunciations)) {
      // Your current server format seems to be: pronunciations[word] = "<url>"
      // and you said you intentionally made key identical to url.
      const value = pronunciations[word];

      // If you later switch to { key, url }, this still supports it:
      const audioKey: string = typeof value === "string" ? value : value.key;
      const audioUrl: string =
        typeof value === "string"
          ? value
          : value.url ?? `/assets/pron/${word}.mp3`;

      // Only load if not already present
      if (!this.cache.audio.exists(audioKey)) {
        console.log("Loading", audioKey, "from", audioUrl);
        loader.audio(audioKey, audioUrl);
        queuedAny = true;
      }
    }

    if (!queuedAny) return;

    await new Promise<void>((resolve, reject) => {
      loader.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      loader.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) =>
        reject(new Error(`Audio load error: ${file?.key ?? "unknown"}`))
      );
      loader.start();
    });
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
    } catch (e) {
    console.error("fetchSequences failed:", e);
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
          const sel: any = await selectSequence(seq.id);
          if (!sel.ok) {
            statusText.setText(sel.error ?? "Selection error");
            this.input.enabled = true;
            return;
          }

          // Update global word -> audioKey dictionary
          setPronunciations(sel.pronunciations);

          // Dynamically load pronunciations returned by server
          await this.loadPronunciations(sel.pronunciations);

          console.log("Audio cache keys now:", this.cache.audio.getKeys());

          // Request first sentence (no result payload)
          const next = await fetchNextSentence();

          if (next.done) {
            this.scene.start("result", { success: true, done: true, message: next.message });
          } else {
            this.scene.start("sentence", next.data);
          }
        } catch (e) {
          console.error(e);
          this.scene.start("result", { success: false, done: true, message: "Server error" });
        }
      });
    });
  }
}
