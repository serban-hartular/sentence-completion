import Phaser from "phaser";
import {
  InteractiveTextArea,
  type GrabbableTextChunk as InteractiveGrabbableTextChunk,
  type InteractiveTextChunk,
  type InteractiveTextAreaOptions,
} from "./InteractiveTextArea";

export type GrabbableTextChunk = {
  text: string;
  spaceAfter?: boolean; // default true
};

export type GrabbableTextAreaOptions = Omit<
  InteractiveTextAreaOptions,
  "onChunkPointerDown" | "onGrabbablePointerDown"
> & {
  onChunkPointerDown?: (
    chunk: GrabbableTextChunk,
    index: number,
    pointer: Phaser.Input.Pointer,
    textObject: Phaser.GameObjects.Text
  ) => void;
};

export class GrabbableTextArea extends InteractiveTextArea {
  private originalChunks: GrabbableTextChunk[] = [];

  constructor(
    scene: Phaser.Scene,
    area: { x: number; y: number; w: number; h: number },
    chunks: GrabbableTextChunk[],
    opts: GrabbableTextAreaOptions = {}
  ) {
    const { onChunkPointerDown, ...restOpts } = opts;

    super(scene, area, GrabbableTextArea.mapChunks(chunks), {
      ...restOpts,
      onGrabbablePointerDown: (_interactiveChunk, index, pointer, target) => {
        const originalChunk = this.originalChunks[index];
        if (!originalChunk) return;
        if (!(target instanceof Phaser.GameObjects.Text)) return;
        onChunkPointerDown?.(originalChunk, index, pointer, target);
      },
    });

    this.originalChunks = [...chunks];
  }

  public override setChunks(chunks: InteractiveTextChunk[] | GrabbableTextChunk[]) {
    if (GrabbableTextArea.isLegacyChunkArray(chunks)) {
      this.originalChunks = [...chunks];
      super.setChunks(GrabbableTextArea.mapChunks(chunks));
      return;
    }

    super.setChunks(chunks);
  }

  private static mapChunks(
    chunks: GrabbableTextChunk[]
  ): InteractiveGrabbableTextChunk[] {
    return chunks.map((chunk) => ({
      kind: "grabbable",
      text: chunk.text,
      spaceAfter: chunk.spaceAfter,
    }));
  }

  private static isLegacyChunkArray(
    chunks: InteractiveTextChunk[] | GrabbableTextChunk[]
  ): chunks is GrabbableTextChunk[] {
    return chunks.every((chunk) => !("kind" in chunk));
  }
}
