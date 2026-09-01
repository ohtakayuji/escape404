import { logsFound, totalHintsUsed, useHint, type GameState } from "../core/GameState";
import type { EndingId, InventoryItemId } from "../core/ids";
import { LOG_IDS } from "../core/ids";
import type { Settings } from "../core/Settings";
import { EVE, type Line } from "../data/dialogue";
import { PC_FILES, type GameDocument } from "../data/documents";
import { PUZZLES } from "../data/puzzles";
import type { InventoryManager } from "../inventory/InventoryManager";
import type { PuzzleManager, PuzzleResult } from "../puzzles/PuzzleManager";
import type {
  AudioFacade,
  KeypadOptions,
  ProgressionFacade,
  TextEntryOptions,
  UIFacade,
} from "../interaction/Interactable";
import { Cinematic, type EndingStats } from "./Cinematic";
import { createDocumentPanel } from "./DocumentPanel";
import { createFinalTerminalPanel } from "./FinalTerminalPanel";
import { createHintPanel } from "./HintPanel";
import { createInventoryPanel } from "./InventoryPanel";
import { KeypadPanel, type SubmitOutcome } from "./KeypadPanel";
import { createConfirmPanel, createPauseMenu, createSettingsPanel } from "./MenuPanel";
import { ModalHost } from "./ModalHost";
import { PcPanel } from "./PcPanel";
import { createShapePanel } from "./ShapePanel";
import { TextEntryPanel } from "./TextEntryPanel";
import { Hud } from "./Hud";
import { el } from "./dom";

export interface UIManagerDeps {
  root: HTMLElement;
  state: GameState;
  puzzles: PuzzleManager;
  inventory: InventoryManager;
  audio: AudioFacade;
  progression: ProgressionFacade;
  getSettings: () => Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
  onModalChange: (open: boolean) => void;
  onReset: () => void;
  onTitle: () => void;
  onRestart: () => void;}

/**
 * 画面 UI の統括。3D 側とゲーム進行のことは知らず、
 * 「何を表示するか」と「押されたら誰に渡すか」だけを持つ。
 */
export class UIManager implements UIFacade {
  readonly hud: Hud;
  readonly cinematic: Cinematic;
  private readonly modal: ModalHost;

  constructor(private readonly deps: UIManagerDeps) {
    this.hud = new Hud(deps.root, PUZZLES.length);
    this.modal = new ModalHost(deps.root);
    this.cinematic = new Cinematic(deps.root);
  }

  /* -------------------------------------------------------------- */
  /* 状態                                                           */
  /* -------------------------------------------------------------- */

  get isModalOpen(): boolean {
    return this.modal.isOpen;
  }

  get modalId(): string | null {
    return this.modal.currentId;
  }

  closeModal(): void {
    this.modal.close();
    this.deps.onModalChange(false);
  }

  toast(text: string, tone: "info" | "warn" = "info"): void {
    this.hud.toast(text, tone);
  }

  speak(line: Line): void {
    this.hud.speak(line);
  }

  refreshHud(): void {
    this.hud.setSelectedItem(this.deps.inventory.selected);
    this.hud.setProgress(this.deps.state.solvedPuzzles.length);
    this.hud.setCrosshairSize(this.deps.getSettings().crosshairSize);
  }

  /* -------------------------------------------------------------- */
  /* パズル系モーダル                                                */
  /* -------------------------------------------------------------- */

  openKeypad(options: KeypadOptions): void {
    const panel = new KeypadPanel({
      digits: options.digits,
      caption: options.caption,
      onDigit: () => this.deps.audio.play("keypad"),
      onSubmit: (value) => this.handleSubmit(options.puzzleId, value),
    });
    this.show(`keypad:${options.puzzleId}`, options.title, panel.element, {
      onClose: () => panel.destroy(),
      width: "narrow",
    });
  }

  openTextEntry(options: TextEntryOptions): void {
    const panel = new TextEntryPanel({
      caption: options.caption,
      maxLength: options.maxLength,
      onSubmit: (value) => this.handleSubmit(options.puzzleId, value),
    });
    this.show(`text:${options.puzzleId}`, options.title, panel.element, {
      autofocus: panel.input,
      width: "narrow",
    });
  }

  private handleSubmit(puzzleId: KeypadOptions["puzzleId"], value: string): SubmitOutcome {
    const result = this.deps.puzzles.submit(puzzleId, value);
    return this.applySubmitResult(result);
  }

  private applySubmitResult(result: PuzzleResult): SubmitOutcome {
    if (result.status === "locked") {
      this.deps.audio.play("denied");
      this.toast(result.reason, "warn");
      return "locked";
    }
    if (result.status === "wrong") {
      this.deps.audio.play("incorrect");
      this.speak(result.attempts >= 3 ? EVE.wrongAgain! : EVE.wrong!);
      return "wrong";
    }
    if (result.status === "already") {
      this.closeModal();
      return "ok";
    }
    this.deps.audio.play("correct");
    this.deps.progression.applyPuzzleResult(result);
    window.setTimeout(() => {
      if (this.modal.currentId?.includes(result.puzzle.id)) this.closeModal();
    }, 700);
    return "ok";
  }

  openDocument(document: GameDocument): void {
    this.show(`document:${document.id}`, document.heading, createDocumentPanel(document));
  }

  openPc(): void {
    const panel = new PcPanel({
      state: this.deps.state,
      onFileOpen: (fileId) => {
        const file = PC_FILES.find((entry) => entry.id === fileId);
        if (!file) return;
        this.deps.audio.play("interact");
        if (file.documentId === "subject17") {
          this.deps.progression.readLog("subject17");
        }
        this.deps.state.readDocuments.includes(file.documentId) ||
          this.deps.state.readDocuments.push(file.documentId);
        this.deps.progression.requestSave();
      },
      onAppChange: () => this.deps.audio.play("keypad"),
    });
    this.show("pc", "NEXUS OS", panel.element, { width: "wide" });
  }

  openShapePlacement(slotIndex: number): void {
    const rebuild = () => {
      const panel = createShapePanel({
        slotIndex,
        state: this.deps.state,
        available: this.deps.inventory.availableShapes(),
        onPlace: (shape) => {
          this.deps.progression.placeShape(slotIndex, shape);
          this.closeModal();
        },
        onClear: () => {
          this.deps.progression.clearSlot(slotIndex);
          this.closeModal();
        },
      });
      return panel;
    };
    this.show(`slot:${slotIndex}`, `SLOT ${slotIndex + 1}`, rebuild(), { width: "narrow" });
  }

  openFinalTerminal(): void {
    const panel = createFinalTerminalPanel({
      state: this.deps.state,
      onChoose: (ending: EndingId) => {
        this.closeModal();
        this.deps.progression.chooseEnding(ending);
      },
    });
    this.show("final", "IDENTITY VALIDATION", panel, { width: "narrow" });
  }

  /* -------------------------------------------------------------- */
  /* メタ UI                                                        */
  /* -------------------------------------------------------------- */

  toggleInventory(): void {
    if (this.modal.currentId === "inventory") {
      this.closeModal();
      return;
    }
    this.openInventory();
  }

  openInventory(): void {
    const panel = createInventoryPanel({
      state: this.deps.state,
      onSelect: (id: InventoryItemId) => {
        this.deps.inventory.select(id);
        this.deps.audio.play("keypad");
        this.refreshHud();
      },
    });
    this.show("inventory", "INVENTORY", panel);
  }

  openHints(): void {
    const puzzle = this.deps.puzzles.currentPuzzle();
    const render = () => {
      const panel = createHintPanel({
        puzzle,
        state: this.deps.state,
        onReveal: (level) => {
          useHint(this.deps.state, puzzle.id, level);
          this.deps.progression.requestSave();
          this.modal.replaceBody(render());
        },
      });
      return panel;
    };
    this.show("hints", "PUZZLE HINT", render());
  }

  openPause(): void {
    if (this.modalId === "pause") return;
    const panel = createPauseMenu({
      onResume: () => this.closeModal(),
      onSettings: () => this.openSettings(),
      onHints: () => this.openHints(),
      onReset: () => this.openResetConfirm(),
      onTitle: () => {
        this.closeModal();
        this.deps.onTitle();
      },
    });
    this.show("pause", "PAUSED", panel, { width: "narrow" });
  }

  openSettings(): void {
    const panel = createSettingsPanel({
      settings: this.deps.getSettings(),
      onChange: (patch) => this.deps.onSettingsChange(patch),
    });
    this.show("settings", "SETTINGS", panel);
  }

  private openResetConfirm(): void {
    const panel = createConfirmPanel({
      message:
        "進行状況をすべて消して最初から始める。取得したアイテム・解いた謎・経過時間は戻らない。",
      confirmLabel: "消して最初から",
      onConfirm: () => {
        this.closeModal();
        this.deps.onReset();
      },
      onCancel: () => this.openPause(),
    });
    this.show("reset", "RESET GAME", panel, { width: "narrow" });
  }

  /** WebGL やセーブの失敗をプレイヤーへ伝える。 */
  showNotice(title: string, body: string): void {
    this.show("notice", title, el("p", { class: "inventory__desc", text: body }), {
      width: "narrow",
    });
  }

  /* -------------------------------------------------------------- */
  /* エンディング                                                    */
  /* -------------------------------------------------------------- */

  showEnding(ending: EndingId): void {
    const stats: EndingStats = {
      ending,
      elapsedSeconds: this.deps.state.elapsedSeconds,
      hintsUsed: totalHintsUsed(this.deps.state),
      logsFound: logsFound(this.deps.state),
      logsTotal: LOG_IDS.length,
    };
    this.hud.setVisible(false);
    this.cinematic.showEnding(stats, {
      onTitle: () => {
        this.cinematic.stop();
        this.deps.onTitle();
      },
      onRestart: () => {
        this.cinematic.stop();
        this.deps.onRestart();
      },
    });
  }

  private show(
    id: string,
    title: string,
    body: HTMLElement,
    options: { width?: "narrow" | "default" | "wide"; autofocus?: HTMLElement; onClose?: () => void } = {},
  ): void {
    this.modal.open({
      id,
      title,
      body,
      width: options.width,
      autofocus: options.autofocus,
      onClose: () => {
        options.onClose?.();
        if (!this.modal.isOpen) this.deps.onModalChange(false);
      },
    });
    this.deps.onModalChange(true);
  }

  update(dt: number): void {
    this.hud.update(dt);
  }
}
