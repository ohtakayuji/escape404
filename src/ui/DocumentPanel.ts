import type { GameDocument } from "../data/documents";
import { el } from "./dom";

/** メモ・ログ・観察テキストの表示。英文と日本語訳を併記する。 */
export function createDocumentPanel(document: GameDocument): HTMLElement {
  return el("div", { class: "paper" }, [
    el("p", { class: "paper__heading", text: document.heading }),
    el("p", { class: "paper__body", text: document.body }),
    el("p", { class: "paper__translation", text: document.translation }),
  ]);
}
