import Phaser from "phaser";

/**
 * Controls the visual look of the SentenceScene.
 * Defaults match the current in-scene styling.
 *
 * Pass an instance via Scene data:
 *   this.scene.start("sentence", { ...sentenceData, look: new SentenceScreenLook() })
 */
export class SentenceScreenLook {
  /** Canvas / camera background color */
  backgroundColor: string = "#bfe8ff";

  /** Prompt text styling (top of the screen) */
  promptTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: "Arial",
    fontSize: "34px",
    color: "#0b2b46",
  };

  /**
   * Extra decorative drawings.
   * Default draws the current "three circles cloud" decoration.
   *
   * Override in subclasses to add custom art.
   */
  extraDrawings(scene: Phaser.Scene): void {
    scene.add.circle(120, 90, 40, 0xffffff, 0.6);
    scene.add.circle(170, 80, 55, 0xffffff, 0.6);
    scene.add.circle(220, 95, 40, 0xffffff, 0.6);
  }
}
