import type Phaser from "phaser";
import type {
  ScreenDataByKind,
  ScreenDataTypeNameByKind,
} from "../types/screenData";
import { CategorizeScene } from "./CategorizeScene";
import { MarkWordsScene } from "./MarkWordsScene";
import { MemorySequenceScene } from "./MemorySequenceScene";
import { ResultScene } from "./ResultScene";
import { SentenceScene } from "./SentenceScene";
import { SortFromTextScene } from "./SortFromTextScene";
import { SortedListsScene } from "./SortedListsScene";
import { UnderlineFromTextScene } from "./UnderlineFromTextScene";
import { VocabScene } from "./VocabScene";
import { WelcomeScene } from "./WelcomeScene";

export const SCREEN_KIND_VALUES = [
  "sentence",
  "vocab",
  "mark_words",
  "categorize",
  "sorted-lists",
  "sort-from-text",
  "underline-from-text",
  "memory-sequence",
] as const;

export type ScreenKind = (typeof SCREEN_KIND_VALUES)[number];

type PlayableScreenDefinition<K extends ScreenKind> = {
  kind: K;
  sceneKey: string;
  sceneClass: new () => Phaser.Scene;
  dataTypeName: ScreenDataTypeNameByKind[K];
};

function definePlayableScreen<K extends ScreenKind>(
  definition: PlayableScreenDefinition<K>
): PlayableScreenDefinition<K> {
  return definition;
}

export const PLAYABLE_SCREEN_SCENES = [
  definePlayableScreen({
    kind: "sentence",
    sceneKey: "sentence",
    sceneClass: SentenceScene,
    dataTypeName: "SentenceSceneData",
  }),
  definePlayableScreen({
    kind: "vocab",
    sceneKey: "vocab",
    sceneClass: VocabScene,
    dataTypeName: "VocabSceneData",
  }),
  definePlayableScreen({
    kind: "mark_words",
    sceneKey: "mark_words",
    sceneClass: MarkWordsScene,
    dataTypeName: "MarkWordsSceneData",
  }),
  definePlayableScreen({
    kind: "categorize",
    sceneKey: "categorize",
    sceneClass: CategorizeScene,
    dataTypeName: "CategorizeSceneData",
  }),
  definePlayableScreen({
    kind: "sorted-lists",
    sceneKey: "sorted-lists",
    sceneClass: SortedListsScene,
    dataTypeName: "CategorizeSceneData",
  }),
  definePlayableScreen({
    kind: "sort-from-text",
    sceneKey: "sort-from-text",
    sceneClass: SortFromTextScene,
    dataTypeName: "SortFromTextSceneData",
  }),
  definePlayableScreen({
    kind: "underline-from-text",
    sceneKey: "underline-from-text",
    sceneClass: UnderlineFromTextScene,
    dataTypeName: "UnderlineFromTextSceneData",
  }),
  definePlayableScreen({
    kind: "memory-sequence",
    sceneKey: "memory-sequence",
    sceneClass: MemorySequenceScene,
    dataTypeName: "MemorySequenceSceneData",
  }),
] as const;

export const SCREEN_SCENE_KEYS: Record<ScreenKind, string> = Object.fromEntries(
  PLAYABLE_SCREEN_SCENES.map(({ kind, sceneKey }) => [kind, sceneKey])
) as Record<ScreenKind, string>;

export type ScreenInputData<K extends ScreenKind> = ScreenDataByKind[K];

export function getSceneKeyForKind(kind: ScreenKind): string {
  return SCREEN_SCENE_KEYS[kind];
}

export const GAME_SCENES = [
  WelcomeScene,
  ResultScene,
  ...PLAYABLE_SCREEN_SCENES.map(({ sceneClass }) => sceneClass),
];
