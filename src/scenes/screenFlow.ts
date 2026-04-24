import Phaser from "phaser";
import type { NextResponse } from "../api/sentenceApi";
import { setPronunciations } from "../audio/pronunciationRegistry";
import { setImages } from "../images/imageRegistry";
import { getSceneKeyForKind } from "./screenRegistry";

export type ScreenImageManifestValue =
  | string
  | {
      key?: string;
      url?: string;
      path?: string;
    };

export type ScreenResourceManifests = {
  pronunciations?: Record<string, string>;
  images?: Record<string, ScreenImageManifestValue>;
};

export async function startNextScreen(
  scene: Phaser.Scene,
  next: NextResponse
): Promise<void> {
  if (next.done) {
    scene.scene.start("result", {
      success: true,
      done: true,
      message: next.message,
    });
    return;
  }

  if (next.pronunciations) {
    setPronunciations(next.pronunciations);
    await loadPronunciations(scene, next.pronunciations);
  }

  if (next.images) {
    setImages(normalizeImageRegistry(next.images));
    await loadImages(scene, next.images);
  }

  scene.scene.start(getSceneKeyForKind(next.kind), next.data);
}

async function loadPronunciations(
  scene: Phaser.Scene,
  pronunciations: Record<string, string>
): Promise<void> {
  const loader = new Phaser.Loader.LoaderPlugin(scene);
  let queuedAny = false;

  for (const url of Object.values(pronunciations)) {
    const key = url;
    if (!scene.cache.audio.exists(key)) {
      loader.audio(key, url);
      queuedAny = true;
    }
  }

  if (!queuedAny) return;
  await startLoader(loader, "Audio");
}

async function loadImages(
  scene: Phaser.Scene,
  images: Record<string, ScreenImageManifestValue>
): Promise<void> {
  const loader = new Phaser.Loader.LoaderPlugin(scene);
  let queuedAny = false;

  for (const value of Object.values(images)) {
    const url = typeof value === "string" ? value : value.url ?? value.path;

    if (!url) {
      throw new Error("Image manifest entry is missing a url/path.");
    }

    const key = typeof value === "string" ? value : value.key ?? url;

    if (!scene.textures.exists(key)) {
      loader.image(key, url);
      queuedAny = true;
    }
  }

  if (!queuedAny) return;
  await startLoader(loader, "Image");
}

function normalizeImageRegistry(
  images: Record<string, ScreenImageManifestValue>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(images).map(([imageId, value]) => {
      const key =
        typeof value === "string"
          ? value
          : value.key ?? value.url ?? value.path;

      if (!key) {
        throw new Error(`Image manifest entry "${imageId}" is missing a key/url/path.`);
      }

      return [imageId, key];
    })
  );
}

async function startLoader(
  loader: Phaser.Loader.LoaderPlugin,
  resourceLabel: string
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    loader.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    loader.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      reject(new Error(`${resourceLabel} load error: ${file.key ?? "unknown"}`));
    });
    loader.start();
  });
}
