export const ImageRegistry: Record<string, string> = {}; // imageId -> phaserKey

export function setImages(map: Record<string, string>) {
  for (const k of Object.keys(ImageRegistry)) delete ImageRegistry[k];
  for (const [id, key] of Object.entries(map)) ImageRegistry[id] = key;
}
