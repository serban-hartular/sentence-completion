// src/ui/layout/randomDistribute.ts
import Phaser from "phaser";

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export function randomDistributePoints(params: {
  count: number;
  area: Rect;
  minDist?: number;
  maxTriesPerPoint?: number;
  rng?: () => number; // optional deterministic RNG
}): { points: Point[]; fits: boolean } {
  const { count, area } = params;
  const minDist = params.minDist ?? 120;
  const maxTries = params.maxTriesPerPoint ?? 40;
  const rng = params.rng ?? (() => Math.random());

  const points: Point[] = [];

  const randBetween = (a: number, b: number) => a + (b - a) * rng();

  for (let i = 0; i < count; i++) {
    let placed = false;

    for (let t = 0; t < maxTries; t++) {
      const x = randBetween(area.x, area.x + area.w);
      const y = randBetween(area.y, area.y + area.h);

      const ok = points.every(
        (p) => Phaser.Math.Distance.Between(p.x, p.y, x, y) >= minDist
      );
      if (ok) {
        points.push({ x, y });
        placed = true;
        break;
      }
    }

    if (!placed) {
      // still return what we have; caller can accept or reduce minDist
      return { points, fits: false };
    }
  }

  return { points, fits: true };
}
