# 05 GAME SYSTEM

## 設計原則
ゲーム進行状態は3Dオブジェクトの内部に分散させない。
`GameState` を唯一の正とする。

## GameState例

```ts
export interface GameState {
  version: number;
  startedAt: number;
  elapsedSeconds: number;

  flags: {
    drawerOpened: boolean;
    flashlightFound: boolean;
    pcUnlocked: boolean;
    safeOpened: boolean;
    wallPanelOpened: boolean;
    hiddenPassageOpened: boolean;
    observationSolved: boolean;
    masterKeyFound: boolean;
    finalTerminalUnlocked: boolean;
  };

  solvedPuzzles: string[];
  inventory: InventoryItemId[];
  selectedItem: InventoryItemId | null;

  logs: {
    archive01: boolean;
    archive02: boolean;
    subject17: boolean;
  };

  hintsUsed: Record<string, number>;
  ending: "A" | "B" | null;
}
```

## Event Bus
システム間の直接参照を減らす。

Events:
- `interaction:focus`
- `interaction:blur`
- `interaction:use`
- `item:acquired`
- `item:selected`
- `puzzle:solved`
- `door:open`
- `ui:modal-open`
- `ui:modal-close`
- `audio:play`
- `save:request`

## Inventory
Item:
```ts
type InventoryItemId =
  | "flashlight"
  | "optical-filter"
  | "small-key"
  | "sphere"
  | "cone"
  | "cube"
  | "cylinder"
  | "master-key";
```

各アイテム:
- id
- name
- description
- icon
- usable
- consumable

原則consumable=false。

## Puzzle Interface

```ts
interface Puzzle {
  id: string;
  isSolved(state: GameState): boolean;
  canAttempt(state: GameState): boolean;
  submit(answer: unknown, state: GameState): PuzzleResult;
}
```

Puzzleの答えをscene objectへ直接書かない。
`PuzzleManager`に集約。

## Interaction Target

```ts
interface Interactable {
  id: string;
  label: string;
  maxDistance: number;
  enabled(state: GameState): boolean;
  interact(ctx: InteractionContext): void;
}
```

## Persistence
Key:
`escape404-save-v1`

JSON serialization。

### セーブ互換性
versionを必ず保存。
将来構造変更時にmigration可能にする。

## Reset
Settings画面:
`RESET GAME`

確認ダイアログ必須。

## Timer
リアルタイム制限は設けない。
経過時間だけ計測。

## Audio State
- masterVolume
- bgmVolume
- sfxVolume
- muted

localStorageに別保存。
