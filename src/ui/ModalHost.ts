import { el } from "./dom";

export interface ModalOptions {
  id: string;
  title: string;
  body: HTMLElement;
  width?: "narrow" | "default" | "wide";
  /** 閉じた時に呼ばれる (ESC / 閉じるボタン / 別モーダルへの切替) */
  onClose?: () => void;
  /** フォーカスを当てる要素 */
  autofocus?: HTMLElement;
}

/**
 * モーダルは常に 1 枚。開いている間 FPS 操作は止める (UIManager 側で制御)。
 */
export class ModalHost {
  private readonly layer: HTMLElement;
  private current: ModalOptions | null = null;

  constructor(parent: HTMLElement) {
    this.layer = el("div", { class: "modal-layer", hidden: true, role: "dialog", "aria-modal": "true" });
    parent.append(this.layer);
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  get currentId(): string | null {
    return this.current?.id ?? null;
  }

  open(options: ModalOptions): void {
    if (this.current) this.close();
    this.current = options;

    const widthClass =
      options.width === "wide" ? " device--wide" : options.width === "narrow" ? " device--narrow" : "";
    const close = el("button", { type: "button", class: "device__close", text: "ESC 閉じる" });
    close.addEventListener("click", () => this.close());

    const device = el("div", { class: `device${widthClass}` }, [
      el("div", { class: "device__bar" }, [
        el("h2", { class: "device__title", text: options.title }),
        close,
      ]),
      el("div", { class: "device__body" }, [options.body]),
    ]);

    this.layer.replaceChildren(device);
    this.layer.hidden = false;
    (options.autofocus ?? close).focus();
  }

  close(): void {
    if (!this.current) return;
    const { onClose } = this.current;
    this.current = null;
    this.layer.hidden = true;
    this.layer.replaceChildren();
    onClose?.();
  }

  /** 開いているモーダルの中身だけ差し替える (PC のアプリ切替など)。 */
  replaceBody(body: HTMLElement): void {
    const host = this.layer.querySelector(".device__body");
    if (host) host.replaceChildren(body);
  }
}
