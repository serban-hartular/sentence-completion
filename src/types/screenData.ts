import type { MarkStyle } from "../objects/WordToken";
import type { GrabbableTextChunk } from "../ui/text/GrabbableTextArea";
import type { InteractiveTextChunk } from "../ui/text/InteractiveTextArea";
import type { WordsLayoutMode } from "../ui/layout/MarkWordsLayoutGenerator";
import type { MemoryCardContent } from "./MemoryCardContent";

export type { MemoryCardContent, MemoryShapeType } from "./MemoryCardContent";

export type SentenceSceneData = {
  prompt: string;

  /** Same length as slotCount. "" means empty slot; "word" means card placed there initially. */
  slots: string[];

  /** Words that appear as draggable cards at the bottom, randomly placed. */
  bankWords: string[];

  /** Correct sequence of words for validating. Usually same length as slots. */
  correct: string[];

  /** Whether initially placed slot cards are draggable. Default false. */
  initialMovable?: boolean;
};

export type VocabTarget = {
  imageId: string;
  slotIndex: number;
};

export type VocabSceneData = {
  prompt: string;
  slotCount: number;
  targets: VocabTarget[];
  bankWords: string[];
  correct: string[];
  initialMovable?: boolean;
};

export type CategorizeSceneData = {
  prompt: string;
  headers: string[];
  slotsPerColumn: number[];
  words: string[];
  correctColumn: number[];
};

export interface MarkWordsSceneData {
  prompt: string;
  words: string[];
  markStyle: MarkStyle;
  allowMultiple: boolean;
  layout: WordsLayoutMode;
  correctMarked?: string[];
  initialMarked?: string[];
}

export type SortFromTextSceneData = {
  prompt: string;
  sourceText: GrabbableTextChunk[];
  headers: string[];
  slotsPerColumn: number[];
  correctColumnContents: string[][];
};

export type UnderlineFromTextSceneData = {
  prompt: string;
  sourceText: InteractiveTextChunk[];
  correctMarkedWords?: string[];
  initialMarkedWords?: string[];
};

export type MemorySequenceItem = {
  id: string;
  content: MemoryCardContent;
};

export type MemorySequenceItemInput = MemorySequenceItem | MemoryCardContent;

export type MemorySequenceSceneData = {
  prompt: string;
  items: MemorySequenceItemInput[];
  cardSize?: number;
  studyButtonLabel?: string;
};

export type ScreenDataByKind = {
  sentence: SentenceSceneData;
  vocab: VocabSceneData;
  mark_words: MarkWordsSceneData;
  categorize: CategorizeSceneData;
  "sorted-lists": CategorizeSceneData;
  "sort-from-text": SortFromTextSceneData;
  "underline-from-text": UnderlineFromTextSceneData;
  "memory-sequence": MemorySequenceSceneData;
};

export type ScreenDataTypeNameByKind = {
  sentence: "SentenceSceneData";
  vocab: "VocabSceneData";
  mark_words: "MarkWordsSceneData";
  categorize: "CategorizeSceneData";
  "sorted-lists": "CategorizeSceneData";
  "sort-from-text": "SortFromTextSceneData";
  "underline-from-text": "UnderlineFromTextSceneData";
  "memory-sequence": "MemorySequenceSceneData";
};
