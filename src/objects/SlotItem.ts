import Phaser from "phaser";

export abstract class SlotItem extends Phaser.GameObjects.Container {
  homeX: number;
  homeY: number;

  public isDraggable = false;

  protected readonly itemWidth: number;
  protected readonly itemHeight: number;

  private currentSlotIndex: number | null = null;
  private dragTarget?: Phaser.GameObjects.GameObject;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ) {
    super(scene, centerX - width / 2, centerY - height / 2);

    this.itemWidth = width;
    this.itemHeight = height;

    this.homeX = this.x;
    this.homeY = this.y;

    scene.add.existing(this);
  }

  public setSlotIndex(newIndex: number | null) {
    this.currentSlotIndex = newIndex;
  }

  public getSlotIndex(): number | null {
    return this.currentSlotIndex;
  }

  get centerX() {
    return this.x + this.itemWidth / 2;
  }

  get centerY() {
    return this.y + this.itemHeight / 2;
  }

  setCenter(x: number, y: number) {
    this.x = x - this.itemWidth / 2;
    this.y = y - this.itemHeight / 2;
  }

  protected registerDragTarget(target: Phaser.GameObjects.GameObject) {
    this.dragTarget = target;
    target.setData?.("slotItem", this);
  }

  public enableDragging() {
    if (!this.dragTarget) {
      throw new Error("SlotItem requires a drag target before enabling dragging.");
    }

    this.isDraggable = true;
    this.scene.input.setDraggable(this.dragTarget);

    this.dragTarget.on("pointerover", () => this.setScale(1.03));
    this.dragTarget.on("pointerout", () => this.setScale(1.0));
  }

  public clearSlotState() {
    // Subclasses can override to restore their default display state.
  }

  public snapToCenter(x: number, y: number) {
    this.scene.tweens.add({
      targets: this,
      x: x - this.itemWidth / 2,
      y: y - this.itemHeight / 2,
      duration: 120,
      ease: "Back.Out",
    });
  }

  public returnHome() {
    this.currentSlotIndex = null;
    this.clearSlotState();
    this.scene.tweens.add({
      targets: this,
      x: this.homeX,
      y: this.homeY,
      duration: 120,
      ease: "Back.Out",
    });
  }
}
