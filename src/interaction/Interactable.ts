import type { GameState } from "../core/GameState";
import type { InventoryItemId, LogId, PuzzleId, ShapeItemId } from "../core/ids";
import type { GameDocument } from "../data/documents";
import type { Line } from "../data/dialogue";
import type { InventoryManager } from "../inventory/InventoryManager";
import type { PuzzleManager, PuzzleResult } from "../puzzles/PuzzleManager";

export type SfxName =
  | "footstep"
  | "interact"
  | "denied"
  | "pickup"
  | "keypad"
  | "correct"
  | "incorrect"
  | "drawer"
  | "safe"
  | "door"
  | "wall"
  | "terminal"
  | "flashlight"
  | "ending";

export interface KeypadOptions {
  puzzleId: PuzzleId;
  title: string;
  digits: number;
  caption?: string;
}

export interface TextEntryOptions {
  puzzleId: PuzzleId;
  title: string;
  caption?: string;
  maxLength: number;
}

/**
 * UI / 音 / 進行 への窓口。
 * Interactable が具体クラスに依存しないよう、必要な操作だけを型で切り出す。
 */
export interface UIFacade {
  openKeypad(options: KeypadOptions): void;
  openTextEntry(options: TextEntryOptions): void;
  openDocument(document: GameDocument): void;
  openPc(): void;
  openShapePlacement(slotIndex: number): void;
  openFinalTerminal(): void;
  toast(text: string, tone?: "info" | "warn"): void;
  speak(line: Line): void;
}

export interface AudioFacade {
  play(name: SfxName): void;
}

export interface ProgressionFacade {
  applyPuzzleResult(result: PuzzleResult): void;
  pickUpShape(id: ShapeItemId): void;
  placeShape(slotIndex: number, shape: ShapeItemId): void;
  clearSlot(slotIndex: number): void;
  readLog(id: LogId): void;
  /** Optical Filter を使って絵画の数字を表示する */
  revealFilterDigits(): void;
  useItemOnExitDoor(): boolean;
  chooseEnding(ending: "A" | "B"): void;
  requestSave(): void;
}

export interface GameContext {
  state: GameState;
  puzzles: PuzzleManager;
  inventory: InventoryManager;
  ui: UIFacade;
  audio: AudioFacade;
  progression: ProgressionFacade;
}

export interface Interactable {
  id: string;
  /** 注視時に出す文字。状態で変わるので関数。 */
  label(context: GameContext): string;
  /** E キーの説明 (既定は「調べる」) */
  verb?(context: GameContext): string;
  maxDistance?: number;
  /** false の間は注視プロンプトも出さない */
  enabled(state: GameState): boolean;
  interact(context: GameContext): void;
  /** F キーで選択中アイテムを使えるか */
  acceptsItem?(item: InventoryItemId, context: GameContext): boolean;
  useItem?(item: InventoryItemId, context: GameContext): void;
}
