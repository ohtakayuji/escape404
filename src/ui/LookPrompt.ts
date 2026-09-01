import { el } from "./dom";

/** 案内に併記する操作。データとして持ち、マークアップから切り離す。 */
const KEY_HINTS: [string, string][] = [
  ["Mouse", "視点"],
  ["W A S D", "移動"],
  ["E", "調べる"],
  ["Esc", "中断"],
];

/**
 * ポインタロックが外れている間だけ出す「クリックして視点操作」の案内。
 *
 * Pointer Lock はユーザー操作 (クリック / キー) からしか要求できず、
 * 自動では取得できない (一次情報: https://w3c.github.io/pointerlock/ )。
 * そのため案内そのものをボタンにして、必ずユーザー操作を通すようにする。
 * トーストのように消える通知では気付かれず、マウスが効かないまま放置される。
 */
export class LookPrompt {
  private readonly root: HTMLButtonElement;

  constructor(parent: HTMLElement, onActivate: () => void) {
    this.root = el(
      "button",
      {
        type: "button",
        class: "look-prompt",
        hidden: true,
        "aria-label": "クリックして視点操作を開始する",
      },
      [
        el("span", { class: "look-prompt__card" }, [
          el("span", { class: "look-prompt__eyebrow", text: "VIEW CONTROL / 視点操作" }),
          el("span", { class: "look-prompt__title", text: "クリックして視点操作を開始" }),
          el("span", {
            class: "look-prompt__lede",
            text: "マウスカーソルが消え、マウスを動かすと周囲を見回せるようになる。",
          }),
          el(
            "span",
            { class: "look-prompt__keys" },
            KEY_HINTS.map(([key, label]) =>
              el("span", { class: "look-prompt__key" }, [
                el("kbd", { class: "look-prompt__kbd", text: key }),
                el("span", { class: "look-prompt__label", text: label }),
              ]),
            ),
          ),
          el("span", {
            class: "look-prompt__hint",
            text: "Esc を押すと視点操作を解除して中断メニューを開く",
          }),
        ]),
      ],
    );
    this.root.addEventListener("click", onActivate);
    parent.append(this.root);
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  setVisible(visible: boolean): void {
    if (visible === this.visible) return;
    this.root.hidden = !visible;
    // 表示直後は Enter / Space でも開始できるようフォーカスを当てる
    if (visible) this.root.focus({ preventScroll: true });
  }
}
