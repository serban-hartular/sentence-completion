// src/types/VocabSceneData.ts
export type VocabTarget = {
  imageId: string;    // used to look up texture key via ImageRegistry
  slotIndex: number;  // which slot this picture corresponds to
};

export type VocabSceneData = {
  prompt: string;

  // slots are conceptually “answers”; targets attach images to specific slot indices
  slotCount: number;
  targets: VocabTarget[];

  bankWords: string[];
  correct: string[]; // length === slotCount, correct[i] is correct word for slot i

  initialMovable?: boolean;
};
