/**
 * Global map: word -> audio key (already loaded into Phaser).
 * WordCard can consult this and play the key if present.
 */
export const PronunciationRegistry: Record<string, string> = {};

export function setPronunciations(map: Record<string, { key: string }>) {
  // Replace existing contents
  for (const k of Object.keys(PronunciationRegistry)) delete PronunciationRegistry[k];
  for (const [word, entry] of Object.entries(map)) {
    PronunciationRegistry[word] = entry.key;
  }
}
