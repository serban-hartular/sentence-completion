import Phaser from "phaser";
import { WelcomeScene } from "./scenes/WelcomeScene";
import { SentenceScene } from "./scenes/SentenceScene";
import { ResultScene } from "./scenes/ResultScene";
import { VocabScene } from "./scenes/VocabScene";

const config: Phaser.Types.Core.GameConfig = {
  // ...
  scene: [WelcomeScene, SentenceScene, VocabScene, ResultScene],
};


export function startGame(parent: string | HTMLElement = "app") {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: "#bfe8ff",
    scene: [WelcomeScene, SentenceScene, ResultScene, VocabScene],
    physics: { default: "arcade" },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
}
