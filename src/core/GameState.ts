import type {
  EndingId,
  InventoryItemId,
  LogId,
  PuzzleId,
  ShapeItemId,
} from "./ids";

export const SAVE_VERSION = 1;

export interface GameFlags {
  drawerOpened: boolean;
  /** P2 の壁面文字を懐中電灯で実際に照らして確認したか */
  hiddenTextSeen: boolean;
  flashlightFound: boolean;
  pcUnlocked: boolean;
  safeOpened: boolean;
  wallPanelOpened: boolean;
  hiddenPassageOpened: boolean;
  observationSolved: boolean;
  masterKeyFound: boolean;
  finalTerminalUnlocked: boolean;
}

/** P5 の 4 スロット。index 0 が「1」。 */
export type ShapeSlots = [
  ShapeItemId | null,
  ShapeItemId | null,
  ShapeItemId | null,
  ShapeItemId | null,
];

export interface GameState {
  version: number;
  startedAt: number;
  elapsedSeconds: number;
  flags: GameFlags;
  solvedPuzzles: PuzzleId[];
  inventory: InventoryItemId[];
  selectedItem: InventoryItemId | null;
  shapeSlots: ShapeSlots;
  logs: Record<LogId, boolean>;
  /** 閲覧済みメモ・書類の id (再読可否ではなく既読表示のため) */
  readDocuments: string[];
  hintsUsed: Record<string, number>;
  ending: EndingId | null;
}

export function createInitialState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    startedAt: now,
    elapsedSeconds: 0,
    flags: {
      drawerOpened: false,
      hiddenTextSeen: false,
      flashlightFound: false,
      pcUnlocked: false,
      safeOpened: false,
      wallPanelOpened: false,
      hiddenPassageOpened: false,
      observationSolved: false,
      masterKeyFound: false,
      finalTerminalUnlocked: false,
    },
    solvedPuzzles: [],
    inventory: [],
    selectedItem: null,
    shapeSlots: [null, null, null, null],
    logs: { archive01: false, archive02: false, subject17: false },
    readDocuments: [],
    hintsUsed: {},
    ending: null,
  };
}

/* ------------------------------------------------------------------ */
/* 参照 (純関数。テストしやすいようここに集約する)                     */
/* ------------------------------------------------------------------ */

export function hasItem(state: GameState, id: InventoryItemId): boolean {
  return state.inventory.includes(id);
}

export function isSolved(state: GameState, id: PuzzleId): boolean {
  return state.solvedPuzzles.includes(id);
}

export function logsFound(state: GameState): number {
  return Object.values(state.logs).filter(Boolean).length;
}

/** END B の解放条件: 3 つのログすべてを閲覧済み。 */
export function canAskWhoIAm(state: GameState): boolean {
  return state.logs.archive01 && state.logs.archive02 && state.logs.subject17;
}

export function totalHintsUsed(state: GameState): number {
  return Object.values(state.hintsUsed).reduce((sum, n) => sum + n, 0);
}

/* ------------------------------------------------------------------ */
/* 更新 (すべて冪等。同じイベントが二重に来ても壊れないこと)            */
/* ------------------------------------------------------------------ */

/** アイテム追加。重複追加はしない。追加された場合のみ true。 */
export function addItem(state: GameState, id: InventoryItemId): boolean {
  if (state.inventory.includes(id)) return false;
  state.inventory.push(id);
  return true;
}

export function removeItem(state: GameState, id: InventoryItemId): boolean {
  const index = state.inventory.indexOf(id);
  if (index < 0) return false;
  state.inventory.splice(index, 1);
  if (state.selectedItem === id) state.selectedItem = null;
  return true;
}

/** パズル完了の記録。新規に記録された場合のみ true。 */
export function markSolved(state: GameState, id: PuzzleId): boolean {
  if (state.solvedPuzzles.includes(id)) return false;
  state.solvedPuzzles.push(id);
  return true;
}

export function markDocumentRead(state: GameState, id: string): boolean {
  if (state.readDocuments.includes(id)) return false;
  state.readDocuments.push(id);
  return true;
}

export function useHint(state: GameState, puzzleId: PuzzleId, level: number): void {
  const current = state.hintsUsed[puzzleId] ?? 0;
  state.hintsUsed[puzzleId] = Math.max(current, level);
}
