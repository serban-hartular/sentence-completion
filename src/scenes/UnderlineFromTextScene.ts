import Phaser from "phaser";
import { TextArea } from "../ui/text/TextArea";
import {
  InteractiveTextArea,
  type InteractiveTextChunk,
  type MarkableTextChunk,
} from "../ui/text/InteractiveTextArea";
import { CheckableExerciseScene } from "../ui/CheckableExerciseScene";

export type UnderlineFromTextSceneData = {
  prompt: string;
  sourceText: InteractiveTextChunk[];
  correctMarkedWords?: string[];
  initialMarkedWords?: string[];
};

export type UnderlineFromTextAttempt = {
  marked: string[];
};

export class UnderlineFromTextScene extends CheckableExerciseScene<UnderlineFromTextAttempt> {
  private task!: UnderlineFromTextSceneData;
  private chunks: InteractiveTextChunk[] = [];
  private textArea?: InteractiveTextArea;

  protected exerciseKind = "underline-from-text";

  constructor() {
    super({ key: "underline-from-text" });
  }

  init(data: UnderlineFromTextSceneData) {
    this.task = data;
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#bfe8ff");

    new TextArea(
      this,
      { x: 30, y: 16, w: width - 60, h: 70 },
      this.task.prompt,
      { justify: "left", backgroundColor: null }
    );

    this.chunks = this.applyInitialMarks(this.task.sourceText, this.task.initialMarkedWords);

    this.textArea = new InteractiveTextArea(
      this,
      { x: 40, y: 100, w: width - 80, h: height - 150 },
      this.chunks,
      {
        justify: "left",
        padding: 6,
        backgroundColor: null,
        style: {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#0b2b46",
          fontStyle: "Italic",
        },
        onMarkablePointerDown: (_chunk, index) => {
          this.toggleChunk(index);
        },
      }
    );

    this.createCheckButton();
    this.refreshCheckEnabled();
  }

  protected override canCheck(): boolean {
    return this.getMarkedWords().length > 0;
  }

  protected buildAttempt(): UnderlineFromTextAttempt {
    return { marked: this.getMarkedWords() };
  }

  protected computeSuccess(attempt: UnderlineFromTextAttempt): boolean {
    if (!this.task.correctMarkedWords) return false;

    const actual = new Set(attempt.marked);
    const expected = new Set(this.task.correctMarkedWords);

    if (actual.size !== expected.size) return false;
    for (const word of actual) {
      if (!expected.has(word)) return false;
    }
    return true;
  }

  protected getResultPayloadExtras(): Record<string, unknown> {
    return { kind: this.exerciseKind };
  }

  private toggleChunk(index: number) {
    const chunk = this.chunks[index];
    if (!chunk || chunk.kind !== "markable") return;

    this.chunks = this.chunks.map((item, itemIndex) => {
      if (itemIndex !== index || item.kind !== "markable") return item;

      return {
        ...item,
        marked: !item.marked,
        markStyle: item.markStyle ?? "underline",
      };
    });

    this.textArea?.setChunks(this.chunks);
    this.refreshCheckEnabled();
  }

  private getMarkedWords(): string[] {
    return this.chunks.flatMap((chunk) =>
      chunk.kind === "markable" && chunk.marked ? [chunk.text] : []
    );
  }

  private applyInitialMarks(
    chunks: InteractiveTextChunk[],
    initialMarkedWords?: string[]
  ): InteractiveTextChunk[] {
    const initialSet = new Set(initialMarkedWords ?? []);

    return chunks.map((chunk) => {
      if (chunk.kind !== "markable") return { ...chunk };

      const markableChunk: MarkableTextChunk = {
        ...chunk,
        marked: chunk.marked ?? initialSet.has(chunk.text),
        markStyle: chunk.markStyle ?? "underline",
      };

      return markableChunk;
    });
  }
}
