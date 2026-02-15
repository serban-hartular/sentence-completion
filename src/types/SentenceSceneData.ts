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
