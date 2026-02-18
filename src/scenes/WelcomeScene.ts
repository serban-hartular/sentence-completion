// src/scenes/WelcomeScene.ts
import Phaser from "phaser";
import {
  fetchNextSentence,
  fetchSequences,
  selectSequence,
} from "../api/sentenceApi";
import { setPronunciations } from "../audio/pronunciationRegistry";
import { setImages } from "../images/imageRegistry";
import { SFX } from "../audio/soundKeys";

type ScreenKind = "sentence" | "vocab";

export class WelcomeScene extends Phaser.Scene {
  constructor() {
    super("welcome");
  }

  preload() {
    // Core SFX loaded up-front (unchanged)
    this.load.audio(SFX.SNAP, "assets/sfx/snap.mp3");
    this.load.audio(SFX.PICKUP, "assets/sfx/pickup.mp3");
    this.load.audio(SFX.SUCCESS, "assets/sfx/success.mp3");
    this.load.audio(SFX.TRY_AGAIN, "assets/sfx/try_again.mp3");
    this.load.audio(SFX.DONE, "assets/sfx/success.mp3");
  }

  /**
   * Pronunciations map: word -> urlPath
   * Example: { suis: "/assets/pron/fr/suis.m4a" }
   *
   * IMPORTANT:
   * - key MUST be identical to url
   * - url is used as-is (same-origin), no rewriting to backend origin
   */
  private async loadPronunciations(pronunciations: Record<string, string>): Promise<void> {
    const loader = new Phaser.Loader.LoaderPlugin(this);

    let queuedAny = false;

    for (const word of Object.keys(pronunciations)) {
      const url = pronunciations[word]; // e.g. "/assets/pron/fr/suis.m4a"
      const key = url;                  // key identical to url

      if (!this.cache.audio.exists(key)) {
        console.log("Loading audio", key);
        loader.audio(key, url);
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

  /**
   * Images map can be:
   *   imageId -> "/assets/images/thing.png"
   * or
   *   imageId -> { key, url }
   *
   * For consistency with your audio rule, you *can* also make key===url,
   * but this supports both forms.
   *
   * IMPORTANT: image URLs are used as-is (same-origin), no rewriting.
   */
  private async loadImages(images: Record<string, any>): Promise<void> {
    const loader = new Phaser.Loader.LoaderPlugin(this);

    let queuedAny = false;

    for (const imageId of Object.keys(images)) {
      const value = images[imageId];

      const url: string =
        typeof value === "string"
          ? value
          : value.url ?? value.path;

      // If your rule is "key identical to url", you can use key=url here too.
      const key: string =
        typeof value === "string"
          ? value
          : value.key ?? url;

      if (!this.textures.exists(key)) {
        console.log("Loading image", key);
        loader.image(key, url);
        queuedAny = true;
      }
    }

    if (!queuedAny) return;

    await new Promise<void>((resolve, reject) => {
      loader.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      loader.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) =>
        reject(new Error(`Image load error: ${file?.key ?? "unknown"}`))
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

    let sequences: { id: string; name: string; kind?: ScreenKind }[] = [];

    try {
      const res = await fetchSequences();
      sequences = res.sequences as any;
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
        this.input.enabled = false;
        statusText.setText("Loading…");

        try {
          const sel: any = await selectSequence(seq.id);
          if (!sel.ok) {
            statusText.setText(sel.error ?? "Selection error");
            this.input.enabled = true;
            return;
          }

          // Store manifests in registries
          if (sel.pronunciations) setPronunciations(sel.pronunciations);
          if (sel.images) setImages(sel.images);

          // Dynamically load assets (same-origin URLs/paths; keys identical to URLs for audio)
          if (sel.pronunciations) await this.loadPronunciations(sel.pronunciations);
          if (sel.images) await this.loadImages(sel.images);

          const next: any = await fetchNextSentence();

          if (next.done) {
            this.scene.start("result", {
              success: true,
              done: true,
              message: next.message,
            });
            return;
          }

          const kind: ScreenKind = (next.kind ?? seq.kind ?? "sentence") as ScreenKind;
          const sceneKey = kind === "vocab" ? "vocab" : "sentence";

          this.scene.start(sceneKey, next.data);
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
