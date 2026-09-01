import { canAskWhoIAm, logsFound, type GameState } from "../core/GameState";
import { el } from "./dom";

export interface FinalTerminalPanelOptions {
  state: GameState;
  onChoose: (ending: "A" | "B") => void;
}

/** P7。END B は 3 つのログをすべて読んでいる時だけ選べる。 */
export function createFinalTerminalPanel(options: FinalTerminalPanelOptions): HTMLElement {
  const unlocked = canAskWhoIAm(options.state);
  const found = logsFound(options.state);

  const open = el("button", { type: "button", class: "btn btn--primary" }, [
    el("span", { class: "btn__key", text: "1" }),
    el("span", { text: "OPEN EXIT" }),
  ]);
  open.addEventListener("click", () => options.onChoose("A"));

  const ask = el("button", { type: "button", class: "btn", disabled: !unlocked }, [
    el("span", { class: "btn__key", text: "2" }),
    el("span", { text: "ASK WHO I AM" }),
  ]);
  if (unlocked) ask.addEventListener("click", () => options.onChoose("B"));

  return el("div", { class: "menu" }, [
    el("p", { class: "hints__puzzle", text: "IDENTITY VALIDATION" }),
    open,
    ask,
    el("p", {
      class: "hints__note",
      text: unlocked
        ? "ログを 3 つすべて読んだ。EVE に問いを返すことができる。"
        : `ARCHIVE LOG と SUBJECT17.LOG を読むと選択肢が増える (${found} / 3)。`,
    }),
  ]);
}
