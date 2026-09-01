import type { GameState } from "../core/GameState";
import type { PuzzleDef } from "../data/puzzles";
import { el } from "./dom";

export interface HintPanelOptions {
  puzzle: PuzzleDef;
  state: GameState;
  onReveal: (level: number) => void;
}

/**
 * ヒントは 3 段階。1 を見ないと 2 は開かない。
 * ペナルティはなく、使った段数だけクリア画面に出る。
 */
export function createHintPanel(options: HintPanelOptions): HTMLElement {
  const used = options.state.hintsUsed[options.puzzle.id] ?? 0;
  const rows = options.puzzle.hints.map((text, index) => {
    const level = index + 1;
    const revealed = used >= level;
    const openable = used === level - 1;

    const children: HTMLElement[] = [
      el("span", { class: "hint__index", text: `HINT ${level}` }),
      el("span", { class: "hint__text", text: revealed ? text : "未開放" }),
    ];
    if (!revealed) {
      const button = el("button", {
        type: "button",
        class: "btn",
        text: openable ? "見る" : "ロック",
        disabled: !openable,
      });
      button.addEventListener("click", () => options.onReveal(level));
      children.push(button);
    } else {
      children.push(el("span", { class: "hint__index", text: "OPEN" }));
    }

    return el("div", { class: "hint", "data-locked": revealed ? "false" : "true" }, children);
  });

  return el("div", { class: "hints" }, [
    el("p", { class: "hints__puzzle", text: options.puzzle.label }),
    ...rows,
    el("p", {
      class: "hints__note",
      text: "ヒントを使ってもクリア条件は変わらない。使った段数だけ記録される。",
    }),
  ]);
}
