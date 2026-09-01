import "./styles/main.css";
import { GameApp } from "./app/GameApp";
import { query } from "./ui/dom";

/**
 * エントリポイント。
 * WebGL が使えない等の起動失敗は、プレイヤーに読める形で伝える。
 */
function showFatal(title: string, body: string): void {
  const screen = document.getElementById("fatal-screen");
  const titleNode = document.getElementById("fatal-title");
  const bodyNode = document.getElementById("fatal-body");
  const start = document.getElementById("start-screen");
  if (start) start.hidden = true;
  if (titleNode) titleNode.textContent = title;
  if (bodyNode) bodyNode.textContent = body;
  if (screen) screen.hidden = false;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

function main(): void {
  if (!hasWebGL()) {
    showFatal(
      "WebGL が使えません",
      "この端末またはブラウザでは 3D 描画を初期化できませんでした。ハードウェアアクセラレーションを有効にするか、最新の Chrome / Edge でお試しください。",
    );
    return;
  }

  const canvas = query<HTMLCanvasElement>("#game-canvas");
  const uiRoot = query<HTMLElement>("#ui-root");
  const startScreen = query<HTMLElement>("#start-screen");

  let app: GameApp;
  try {
    app = new GameApp(canvas, uiRoot, startScreen);
  } catch (error) {
    showFatal(
      "起動できませんでした",
      `3D シーンの初期化に失敗しました。\n${String(error)}`,
    );
    return;
  }

  document.getElementById("btn-start")?.addEventListener("click", () => app.startNewGame());
  document.getElementById("btn-continue")?.addEventListener("click", () => app.continueGame());
  document.getElementById("btn-settings")?.addEventListener("click", () => app.openSettingsFromTitle());

  app.boot();

  // E2E 用ハンドル (答えはバンドルから見える前提の設計なので隠さない)
  (window as unknown as Record<string, unknown>)["__escape404"] = app.testApi();
}

main();
