import type { GameState } from "../core/GameState";
import {
  CAMERA_LABELS,
  CHAT_LOG,
  CHAT_NOTE,
  PC_FILES,
  getDocument,
} from "../data/documents";
import { el } from "./dom";

type AppId = "chat" | "files" | "camera";

export interface PcPanelOptions {
  state: GameState;
  /** SUBJECT17.LOG などを開いた時に呼ぶ */
  onFileOpen: (fileId: string) => void;
  onAppChange?: (app: AppId) => void;
}

/**
 * PC 端末。OS を再現しすぎず、謎に必要な 3 アプリだけ実装する。
 */
export class PcPanel {
  readonly element: HTMLElement;
  private readonly view: HTMLElement;
  private readonly navButtons = new Map<AppId, HTMLButtonElement>();
  private active: AppId = "chat";

  constructor(private readonly options: PcPanelOptions) {
    this.view = el("div", { class: "pc__view" });

    const nav = el("div", { class: "pc__nav" }, [
      el("p", { class: "pc__nav-label", text: "APPS" }),
    ]);
    const apps: { id: AppId; label: string }[] = [
      { id: "chat", label: "CHAT" },
      { id: "files", label: "FILES" },
      { id: "camera", label: "CAMERA" },
    ];
    for (const app of apps) {
      const badge = this.hasNewFile(app.id)
        ? el("span", { class: "pc__app-badge", text: "NEW" })
        : el("span", { class: "pc__app-badge" });
      const button = el("button", { type: "button", class: "pc__app", "data-app": app.id }, [
        el("span", { text: app.label }),
        badge,
      ]);
      button.addEventListener("click", () => this.show(app.id));
      this.navButtons.set(app.id, button);
      nav.append(button);
    }

    this.element = el("div", { class: "pc" }, [nav, this.view]);
    this.show("chat");
  }

  private hasNewFile(app: AppId): boolean {
    if (app !== "files") return false;
    return PC_FILES.some(
      (file) =>
        file.highlight &&
        (!file.requiresLog || this.options.state.logs[file.requiresLog]) &&
        !this.options.state.readDocuments.includes(file.documentId),
    );
  }

  show(app: AppId): void {
    this.active = app;
    for (const [id, button] of this.navButtons) {
      button.setAttribute("aria-current", id === app ? "true" : "false");
    }
    const builders: Record<AppId, () => HTMLElement> = {
      chat: () => this.buildChat(),
      files: () => this.buildFiles(),
      camera: () => this.buildCamera(),
    };
    this.view.replaceChildren(builders[app]());
    this.options.onAppChange?.(app);
  }

  get activeApp(): AppId {
    return this.active;
  }

  private buildChat(): HTMLElement {
    const rows = CHAT_LOG.map((entry) =>
      el("div", { class: "chat__row", "data-who": entry.who }, [
        el("span", { class: "chat__who", text: `${entry.who}:` }),
        el("span", { class: "chat__text", text: entry.text }),
      ]),
    );
    return el("div", {}, [
      el("h3", { class: "pc__view-title", text: "CHAT — DELETED THREAD (RECOVERED)" }),
      el("div", { class: "chat" }, rows),
      el("p", { class: "chat__note", text: CHAT_NOTE }),
    ]);
  }

  private buildFiles(): HTMLElement {
    const reader = el("pre", { class: "file-view", text: "ファイルを選択してください。" });
    const list = el("ul", { class: "file-list" });

    for (const file of PC_FILES) {
      if (file.requiresLog && !this.options.state.logs[file.requiresLog]) continue;
      const unread = file.highlight && !this.options.state.readDocuments.includes(file.documentId);
      const button = el("button", { type: "button", class: "file", "data-new": unread ? "true" : "false" }, [
        el("span", { text: file.name }),
        el("span", { class: "file__meta", text: unread ? "NEW" : file.meta }),
      ]);
      button.addEventListener("click", () => {
        const doc = getDocument(file.documentId);
        reader.textContent = `${doc.body}\n\n— ${doc.translation}`;
        button.dataset["new"] = "false";
        this.options.onFileOpen(file.id);
      });
      list.append(el("li", {}, [button]));
    }

    return el("div", {}, [
      el("h3", { class: "pc__view-title", text: "FILES — LOCAL" }),
      list,
      reader,
    ]);
  }

  private buildCamera(): HTMLElement {
    const cams = CAMERA_LABELS.map((cam) =>
      el("div", { class: "cam" }, [
        el("span", { class: "cam__label", text: cam.id }),
        el("span", { class: "cam__value", text: String(cam.value) }),
        el("span", { class: "cam__caption", text: cam.place }),
      ]),
    );
    return el("div", {}, [
      el("h3", { class: "pc__view-title", text: "CAMERA — LABEL CHECK" }),
      el("div", { class: "cam-grid" }, cams),
      el("p", { class: "chat__note", text: "各カメラ筐体に貼られたラベル番号を表示している。" }),
    ]);
  }
}
