export type MemoryShapeType =
  | "square"
  | "circle"
  | "triangle"
  | "ellipse"
  | "diamond";

export type MemoryCardContent =
  | {
      type: "image";
      imageId: string;
    }
  | {
      type: "shape";
      shape: MemoryShapeType;
      color?: number | string;
    };
