// src/scenes/base/CheckableExerciseScene.ts
import Phaser from "phaser";

export abstract class CheckableExerciseScene<TAttempt> extends Phaser.Scene {
  /**
   * Phaser scene key for your Result scene.
   * In your SentenceScene it is "result".
   */
  protected resultSceneKey = "result";

  /** Label + styling hook if you ever want variants */
  protected checkLabel = "Check ✅";

  private checkText?: Phaser.GameObjects.Text;

  /** Derived scenes must implement these */
  protected abstract buildAttempt(): TAttempt;
  protected abstract computeSuccess(attempt: TAttempt): boolean;

  /**
   * Optional: disable "Check" until something is selected/placed, etc.
   * Default is enabled.
   */
  protected canCheck(): boolean {
    return true;
  }

  /**
   * Optional: add extra fields for ResultScene.
   */
  protected getResultPayloadExtras(_attempt: TAttempt, _success: boolean): Record<string, unknown> {
    return {};
  }

  /** Call this from create() after your UI is laid out */
  protected createCheckButton() {
    const width = this.scale.width;
    const height = this.scale.height;

    const check = this.add
      .text(width - 110, height - 40, this.checkLabel, {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#0b2b46",
        backgroundColor: "#ffffff",
        padding: { left: 14, right: 14, top: 8, bottom: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    check.on("pointerdown", () => {
      if (!this.canCheck()) return;

      const attempt = this.buildAttempt();
      const success = this.computeSuccess(attempt);

      this.scene.start(this.resultSceneKey, {
        success,
        attempt,
        ...this.getResultPayloadExtras(attempt, success),
      });
    });

    this.checkText = check;
    this.refreshCheckEnabled();
  }

  /** Call whenever state changes in a way that affects canCheck() */
  protected refreshCheckEnabled() {
    if (!this.checkText) return;
    const enabled = this.canCheck();

    this.checkText.setAlpha(enabled ? 1 : 0.5);
    // keep interactive always on; the guard above prevents action
    // (or you can disable input: this.checkText.disableInteractive())
  }
}
