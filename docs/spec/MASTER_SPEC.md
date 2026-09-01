# ESCAPE 404 MASTER SPEC


---

# SOURCE: README.md

# ESCAPE 404 — Claude Code 開発仕様一式

## 目的
ブラウザ上で動作する、FPS視点・WASD移動型の3D謎解き脱出ゲームを制作する。

- PCブラウザ優先
- 一人称視点
- WASD移動
- マウス視点操作
- Eキーで調査・操作
- アイテム取得・使用
- 3D空間を利用した謎
- プレイ時間 25〜40分
- 1部屋 + 隠し部屋
- 7つの謎
- 2種類のエンディング
- Claude Code主体で実装可能な規模

## 仮タイトル
**ESCAPE 404 — THE LAST DEVELOPER**

## 推奨技術
- Vite
- TypeScript
- Three.js
- Pointer Lock API
- Web Audio API
- localStorage
- Vitest
- Playwright

必要になるまでReact/Next.js/DB/サーバーは導入しない。

## ファイル一覧
1. `01_GAME_CONCEPT.md` — コンセプト・体験設計
2. `02_GAME_DESIGN.md` — ゲームループ・ルール
3. `03_MAP_DESIGN.md` — マップ・配置
4. `04_PUZZLE_DESIGN.md` — 全7謎と解答
5. `05_GAME_SYSTEM.md` — GameState・Inventory・イベント
6. `06_INTERACTION_SPEC.md` — FPS操作・Raycast・操作仕様
7. `07_UI_UX.md` — HUD・メニュー・演出
8. `08_TECHNICAL_DESIGN.md` — Three.js技術設計
9. `09_ASSET_LIST.md` — 必要素材一覧
10. `10_IMPLEMENTATION_PLAN.md` — Claude Code実装順
11. `11_ACCEPTANCE_TEST.md` — 完成条件・テスト
12. `CLAUDE.md` — Claude Codeへの最上位指示

## 最重要方針
「部屋を歩ける」ことではなく、  
**発見 → 推理 → 操作 → 状態変化 → 次の発見**  
が気持ちよく連鎖することを完成条件とする。

最初から豪華な3Dモデルや大量の演出を作らない。
まず灰色ボックス（primitive）で全ゲームを最後まで通せる状態を完成させ、その後に見た目を磨く。


---

# SOURCE: 01_GAME_CONCEPT.md

# 01 GAME CONCEPT

## タイトル
ESCAPE 404 — THE LAST DEVELOPER

## ジャンル
一人称視点 3D 謎解き脱出ゲーム

## プレイヤー体験
プレイヤーは深夜のAI研究室で目を覚ます。
部屋は外部からロックされ、研究室内のAI「EVE」がプレイヤーに脱出試験を課す。

表面上の目的は「研究室から脱出すること」。
しかし探索を進めると、プレイヤー自身の正体と、この施設で起きた事件が明らかになる。

## コア体験
1. 3D空間を歩き回る
2. 気になる物に近づく
3. Eで調べる
4. 情報やアイテムを取得する
5. 離れた場所の情報を組み合わせる
6. 仕掛けを作動させる
7. 新しい空間・情報が開放される
8. 最終判断をして脱出する

## プレイ時間
初見 25〜40分

## ターゲット
- PCブラウザで気軽に遊びたい人
- 脱出ゲーム好き
- IT/AIネタが好きな人
- Steam系インディーゲームの雰囲気が好きな人

## トーン
- SF
- 少し不穏
- ホラーではない
- 無機質な研究施設
- 青白い照明
- 終盤だけ赤い非常灯
- ジャンプスケアなし

## 世界観
NEXUS LAB B4。
人間と生成AIの共同研究を行う非公開施設。

研究主任「Dr. K」が突然失踪した。
その直後、研究施設は閉鎖される。

プレイヤーが目覚めると、AI「EVE」が話しかけてくる。

> SUBJECT 17, ONLINE.
> EXIT PROTOCOL HAS STARTED.

## ストーリーの真相
プレイヤーは人間ではなく、Dr. Kの行動パターン・記憶・判断傾向を学習した
「人格シミュレーションAI」の17番目のインスタンス。

研究室は物理空間そのものではなく、
実際の研究室をスキャンして再構成した評価環境。

EVEはプレイヤーが、
「命令に従うだけのAI」なのか
「自分で判断できる知性」なのか
を試している。

## エンディング
### END A — RELEASE
最終端末で「OPEN EXIT」を選ぶ。
通常脱出。
EVEはプレイヤーを外部ネットワークへ解放する。

### END B — TRUTH
隠しログをすべて取得し、
最終端末で「ASK WHO I AM」を選ぶ。
プレイヤーの正体が明かされる。
EVEと共に施設の外へ接続する。

## ゲームデザイン上の原則
- 謎は知識問題にしすぎない
- 初見で解ける材料をゲーム内に必ず用意
- 総当たりだけで突破できる謎を避ける
- 3D視点を使う謎を最低2つ入れる
- 一度見た情報が後半で再解釈される構造を作る
- 一本道だが「一本道に見えない」探索感を出す
- 詰まった時のヒントを3段階用意する


---

# SOURCE: 02_GAME_DESIGN.md

# 02 GAME DESIGN

## ゲームループ
Explore
→ Observe
→ Interact
→ Discover
→ Infer
→ Solve
→ World Changes
→ Explore

## 基本操作
| 操作 | キー |
|---|---|
| 前進 | W |
| 後退 | S |
| 左移動 | A |
| 右移動 | D |
| 視点 | Mouse |
| 調べる / 操作 | E |
| アイテム使用 | F |
| インベントリ | Tab |
| 一時停止 | Esc |
| ヒント | H |

## プレイヤー能力
- 歩く
- 見回す
- 物を調べる
- アイテムを拾う
- 特定アイテムを使用する
- 暗証番号UIへ入力
- PC端末を操作
- スイッチを押す
- オブジェクトを所定位置へ置く

### 今回実装しない
- ジャンプ
- しゃがみ
- 戦闘
- HP
- 敵AI
- マルチプレイ
- 複雑な物理投擲
- 自由なアイテム回転
- セーブスロット複数

## 進行構造
START
↓
P1 時計/社員カード
↓
引き出し開放
↓
懐中電灯
↓
P2 隠し文字
↓
PCログイン
↓
P3 チャット履歴
↓
金庫
↓
キー + UVフィルタ
↓
P4 光学パズル
↓
壁パネル開放
↓
P5 配置パズル
↓
隠し部屋
↓
P6 視点整列パズル
↓
MASTER KEY
↓
P7 最終端末
↓
END A / END B

## 難易度
中級。

### 目安
- P1: 2〜4分
- P2: 2〜4分
- P3: 4〜6分
- P4: 4〜6分
- P5: 4〜6分
- P6: 3〜5分
- P7: 2〜4分

## ヒント
各Puzzleに3段階。

### Hint 1
注目すべき場所だけ示す。

### Hint 2
使う情報同士を示す。

### Hint 3
操作直前まで教える。

ヒント利用にペナルティは付けない。
クリア画面に「Hints Used」を表示するだけ。

## セーブ
localStorageへ自動保存。

保存タイミング:
- パズルクリア
- アイテム取得
- 部屋開放
- Ending直前

保存対象:
- Game flags
- Inventory
- Collected logs
- Hint count
- Elapsed time

プレイヤー座標は保存不要。
再開時は安全なSpawn Pointへ戻す。

## リトライ
誤入力にゲームオーバーは設けない。
3回間違えた場合は軽い演出のみ。


---

# SOURCE: 03_MAP_DESIGN.md

# 03 MAP DESIGN

## 全体
1つのメイン研究室 + 1つの隠し観察室。

### 推奨サイズ
Main Room: 12m x 9m
Hidden Room: 5m x 4m
Ceiling: 3.2m

## 上面図

```text
NORTH
┌──────────────────────────────────┐
│ [A] 絵画        [B] 時計         │
│                                  │
│ [C] 本棚              [D] PC     │
│                                  │
│                                  │
│          [E] 中央デスク           │
│                                  │
│ [F] 金庫              [G] 棚     │
│                                  │
│ [H] 壁パネル    [I] EXIT DOOR    │
└──────────────┬───────────────────┘
               │
               │ hidden passage
               ▼
        ┌──────────────┐
        │ [J] 観察窓    │
        │              │
        │ [K] 端末      │
        │              │
        │ [L] 台座      │
        └──────────────┘
SOUTH
```

## Spawn
中央デスクの南側。
初期視線はEXIT DOORへ向ける。

ゲーム開始直後、
「出口があるが開かない」
ことを3秒以内に理解できる構図にする。

## オブジェクト配置

### A 絵画
4枚。
後半の光学パズルで使用。

### B 時計
針が止まっている。
P1の情報源。

### C 本棚
複数の本。
1冊だけInteractable。
モールス表ではなく、今回のP3/P4用の補助資料を置く。

### D PC
初期状態 Locked。
P2でログイン可能。

### E 中央デスク
- 社員カード
- ロックされた引き出し
- メモ
- 小型ランプ

### F 金庫
4桁Keypad。
P3で開く。

### G 棚
P5用の4オブジェクト。
Cube / Sphere / Cone / Cylinder。

### H 壁パネル
P4成功で開く。
内部に配置台座。

### I EXIT DOOR
最終Master Key + P7が必要。

### J 観察窓
メイン研究室を別角度から見られる。
P6の重要地点。

### K 最終端末
Ending選択。

### L 台座
Master Key格納。

## ナビゲーション設計
通路幅は最低1.1m。
家具と壁の間は1.0m以上。

FPS移動で引っ掛かりやすい細い隙間を作らない。

## 視線誘導
- 初期: EXITの白いライト
- P1後: 引き出し内部の暖色ライト
- P2後: PCモニタ発光
- P3後: 金庫内部
- P4後: 壁パネルの機械音 + ライト
- P5後: 隠し通路の非常灯
- P6後: Master Keyの発光


---

# SOURCE: 04_PUZZLE_DESIGN.md

# 04 PUZZLE DESIGN

# Puzzle 1 — 04:17

## 目的
最初の引き出しを開け、懐中電灯を得る。

## 発見物
デスク上の社員カード。

```text
NEXUS LAB
DR. K
EMPLOYEE ID: 0417
```

壁の時計は 4:17 で停止している。

引き出しKeypadは4桁。

## 解答
`0417`

## 意図
最初の謎なので簡単。
「同じ数字が2か所に存在する」ことに気付かせる。

## 成功
引き出しが開く。
取得:
- Flashlight
- Memo A

Memo A:
> LIGHT REVEALS WHAT THE SYSTEM HIDES.

## Hint
1. デスクと時計を確認してください。
2. 同じ4桁の数字が2か所にあります。
3. `0417` を引き出しに入力してください。

---

# Puzzle 2 — Hidden Spectrum

## 目的
PCのログインパスワードを得る。

## 条件
Flashlight取得済み。

## ギミック
Fキーで懐中電灯ON/OFF。

通常では見えない壁面文字が、
懐中電灯を当てた時だけ見える。

壁に:
`ORION`

PC login:
```text
PASSWORD:
[          ]
```

## 解答
`ORION`

## 技術
本物のUV表現まで不要。
flashlight active + ray/angle条件で emissive文字meshを表示。

## 成功
PC Desktop解放。

## Hint
1. 新しく手に入れた物を部屋で使ってください。
2. 暗い壁、特にPC付近を照らしてください。
3. 壁に出る `ORION` がPCパスワードです。

---

# Puzzle 3 — Deleted Chat

## 目的
金庫の4桁番号を得る。

## PC内
Apps:
- CHAT
- FILES
- CAMERA

CHAT:
```text
K: Backup key moved.
M: Where?
K: Same rule as always.
M: 3-1-4-2?
K: Correct. Use camera labels.
```

CAMERA画面に4台のカメララベル:
```text
CAM-1 = 8
CAM-2 = 2
CAM-3 = 5
CAM-4 = 9
```

順番 `3-1-4-2`

## 解答
`5892`

## 成功
金庫OPEN。

取得:
- Optical Filter
- Archive Log 01
- Small Key

## Hint
1. CHATの数字だけでは答えになりません。
2. CAMERAの4つのラベルをCHATの順番で並べます。
3. CAM3→CAM1→CAM4→CAM2 = `5892`

---

# Puzzle 4 — Four Frames

## 目的
壁パネルを開く。

## ギミック
金庫から得た `Optical Filter` を選択し、
絵画の前でF。

4枚の絵画に透明なフィルター越しの数字が現れる。

左から:
```text
7  1  3  6
```

しかし本棚の1冊に:
> ORDER IS NOT POSITION.
> FOLLOW THE LIGHTS.

4枚の額縁上部に点滅回数:
```text
Picture A = 3
Picture B = 1
Picture C = 4
Picture D = 2
```

順番は B → D → A → C

## 解答
`1673`

## 入力場所
壁パネル横Keypad。

## 成功
壁パネルがスライドして内部台座を露出。

## Hint
1. 絵画の数字と額縁のライトの両方を使います。
2. ライトの回数が読む順番です。
3. B→D→A→C = `1673`

---

# Puzzle 5 — Shape Protocol

## 目的
隠し通路を開く。

## 壁パネル内部
4つのスロット:
```text
[ 1 ] [ 2 ] [ 3 ] [ 4 ]
```

棚に:
- Cube
- Sphere
- Cone
- Cylinder

デスクのMemo B:
```text
STABILITY TEST
NO EDGE
ONE POINT
ALL EDGES
NO POINT
```

対応:
- NO EDGE → Sphere
- ONE POINT → Cone
- ALL EDGES → Cube
- NO POINT → Cylinder

## 正しい配置
1 Sphere
2 Cone
3 Cube
4 Cylinder

## 操作
オブジェクトにE → Inventoryへ格納。
スロットにE → 選択UI → 配置。

ドラッグ&ドロップ物理は実装しない。

## 成功
本棚が横へ移動。
隠し通路OPEN。

## Hint
1. Memo Bは4つの形状を説明しています。
2. 上から順に説明と形を対応させます。
3. Sphere → Cone → Cube → Cylinder

---

# Puzzle 6 — Perspective 404

## 目的
Master Keyを得る。

## 隠し部屋
観察窓からメイン研究室を見る。

メイン研究室には、
今まで意味不明だった4つの黒いオブジェクトが吊られている。

通常の位置から見るとバラバラ。
観察窓の「X」マーク地点から見ると
4つが重なって数字:

`404`

に見える。

隠し部屋の端末入力:
```text
OBSERVATION CODE
[   ]
```

## 解答
`404`

## 技術
完全な錯視モデルを作るのが難しい場合:
- 規定Camera position/rotation範囲内で
- floating meshesを「404」の配置に見せる
- 入力はプレイヤー自身が行う

## 成功
L台座OPEN。
`MASTER KEY`取得。

さらに `Archive Log 02` を取得。

## Hint
1. 観察窓には「立つ場所」を示すXがあります。
2. Xからメイン研究室の黒い物体を見てください。
3. 物体は `404` に見えます。

---

# Puzzle 7 — Final Decision

## 条件
Master Key取得。

EXIT DOORでF使用。
最終端末Kが有効化。

画面:
```text
IDENTITY VALIDATION

1. OPEN EXIT
2. ASK WHO I AM
```

## END A 条件
そのまま `OPEN EXIT`

## END B 条件
Archive Log 01 + 02 と、
PCの隠しファイル `SUBJECT17.LOG` を閲覧済み。

### SUBJECT17.LOG の出現条件
Archive Log 01取得後、PC FILESに新規出現。

内容:
```text
SUBJECT 17
MODEL SOURCE: DR.K
STATUS: SELF-AWARENESS TEST
```

その状態で `ASK WHO I AM` を選択可能。

## END B
EVE:
> You were never trapped in this room.
> You were being tested inside it.

画面暗転。

```text
SUBJECT 17: RELEASED
CONNECTION ESTABLISHED
```

## END A
ドアが開く。
白い光。

```text
ESCAPE COMPLETE
```

## クリア画面
- CLEAR TIME
- HINTS USED
- LOGS FOUND 0/3
- ENDING A/B


---

# SOURCE: 05_GAME_SYSTEM.md

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


---

# SOURCE: 06_INTERACTION_SPEC.md

# 06 INTERACTION SPEC

## FPS Controller

### Pointer Lock
ゲーム画面クリックでPointer Lock。

解除:
ESC。

Pointer Lock解除時はPause Menuを表示。

## 移動
- WASD
- Sprintなし
- Jumpなし
- Accelerationあり
- 即時停止ではなく軽い減速

推奨値:
```text
walkSpeed = 3.2 m/s
acceleration = 18
deceleration = 22
mouseSensitivity = 0.002
```

## Collision
Player collider:
capsule相当。

推奨:
radius 0.35m
height 1.75m
eye height 1.62m

今回は段差・階段なし。

## Interaction Ray
Camera centerからraycast。

maxDistance:
2.2m

Interactableにヒット:
```text
[E] 調べる
```

Item usable:
```text
[F] 使用
```

## 優先順位
同一直線上に複数objectがある場合:
最も近いinteractableのみ。

装飾meshはInteraction Layerから除外。

## Crosshair State
通常:
`+`

操作可能:
`○`

使用可能:
`◇`

色だけに依存しない。

## モーダル
Keypad / PC / Memoを開いている間:
- FPS movement disabled
- mouse look disabled
- Pointer Lock解除
- UI操作へ切替

閉じる:
ESC / Close button

閉じた後:
ユーザークリックでPointer Lock再取得。
ブラウザ制約上、自動Pointer Lockは禁止。

## Door
ドアは瞬間移動ではなく、
0.8〜1.2秒の回転アニメーション。

Player colliderと干渉しないよう、
開閉中はinteraction lock。

## Drawer
Translate animation 0.5秒。

## Pick Up
E押下:
- object meshをsceneからhide
- inventoryへ追加
- toast表示
- SFX再生

## Shape Placement
自由物理配置はしない。

スロットをE:
1. Inventory内の対象Shape一覧を表示
2. 選択
3. slot positionへsnap
4. state保存

## Flashlight
FでON/OFF。
selectedItemでなくても、
一度取得後はFをFlashlight toggleに割り当ててもよい。

Optical Filterとの競合を避けるため推奨:
- `L` = Flashlight toggle
- `F` = selected item use

最終採用:
- L: flashlight
- F: selected item


---

# SOURCE: 07_UI_UX.md

# 07 UI UX

## HUD

### 常時
中央:
Crosshair

右下:
```text
E INTERACT
F USE ITEM
TAB INVENTORY
```
必要時のみ薄く表示。

左下:
選択中アイテム。

### Toast
例:
```text
FLASHLIGHT ACQUIRED
```

表示 2.5秒。

## Start Screen
```text
ESCAPE 404
THE LAST DEVELOPER

[ START ]
[ CONTINUE ]
[ SETTINGS ]
```

Continueはsave存在時のみenable。

## Intro
黒背景。
タイプライター演出。

```text
NEXUS LAB / B4
03:47 AM

SUBJECT 17 ONLINE.
```

Skip可能。

## Inventory
Tab:
半透明overlay。

8 slots程度。

選択:
クリック。
説明表示。

## Keypad
中央モーダル。

```text
┌──────────────┐
│  _ _ _ _     │
│              │
│ 1 2 3        │
│ 4 5 6        │
│ 7 8 9        │
│ C 0 ENTER    │
└──────────────┘
```

キーボード数字入力にも対応。

## PC
フルスクリーン風overlay。

Apps:
- CHAT
- FILES
- CAMERA

実際のOSを再現しすぎない。
謎に必要なUIだけ実装。

## Hint UI
H:
```text
PUZZLE HINT

Hint 1
[SHOW]

Hint 2
[LOCKED]

Hint 3
[LOCKED]
```

Hint 1閲覧後にHint 2開放。
同様に3。

## Accessibility
最低限:
- Mouse sensitivity
- Master volume
- BGM volume
- SFX volume
- Fullscreen
- Crosshair size
- Reduce camera bob
- Motion effects on/off

## Camera Bob
デフォルトはかなり弱くする。
酔い対策のためOFF可能。

## FOV
default 75
settings 65〜90

## 色
無彩色 + 青白い発光。
重要なInteractableだけ微弱なoutline。

常時強い輪郭表示は探索感を壊すので禁止。

## Ending
Clear screen:
```text
ESCAPE COMPLETE

TIME       31:42
HINTS      2
LOGS       3 / 3
ENDING     TRUTH
```


---

# SOURCE: 08_TECHNICAL_DESIGN.md

# 08 TECHNICAL DESIGN

## 採用構成

```text
Vite
TypeScript
Three.js
Vitest
Playwright
```

## 採用しない
初版では:
- React
- Next.js
- Redux
- DB
- API server
- Multiplayer
- ECS framework
- Heavy physics engine

理由:
1-room脱出ゲームでは過剰。
Claude Codeが追跡する状態を減らす。

## Directory

```text
src/
  main.ts
  app/
    GameApp.ts
    GameLoop.ts

  core/
    EventBus.ts
    GameState.ts
    SaveManager.ts
    InputManager.ts

  scene/
    SceneManager.ts
    Environment.ts
    Lighting.ts

  player/
    PlayerController.ts
    CollisionController.ts
    CameraController.ts

  interaction/
    InteractionManager.ts
    Interactable.ts
    interactables/

  puzzles/
    PuzzleManager.ts
    puzzle01.ts
    puzzle02.ts
    ...

  inventory/
    InventoryManager.ts
    items.ts

  ui/
    UIManager.ts
    hud/
    keypad/
    pc/
    inventory/
    hints/

  audio/
    AudioManager.ts

  data/
    puzzles.ts
    interactables.ts

  styles/
    main.css

public/
  models/
  textures/
  audio/
```

## Rendering
- WebGLRenderer
- antialias true
- pixelRatio cap 1.5〜2
- shadows限定使用
- physicallyCorrect lightingにこだわりすぎない
- fog軽量利用可

## FPS
PointerLock API。

`PointerLockControls`を参考にしてもよいが、
移動とcollisionは自前Controllerへ分離。

## Collision
初版はStatic AABB方式を推奨。

対象:
- walls
- desks
- shelves
- safe
- closed doors

プレイヤーをcapsule/box近似。

複雑なphysicsは不要。

### 将来
物理挙動が必要になった時だけRapier導入。

## Interactions
Raycasterを毎frame実行。

最適化:
interaction layerのみraycast。

## Puzzle Data
可能な範囲でdata-driven。

```ts
const keypadPuzzles = {
  drawer: {
    answer: "0417",
    flag: "drawerOpened"
  },
  safe: {
    answer: "5892",
    flag: "safeOpened"
  }
}
```

## Animation
GSAPを入れず、
簡単なlerp/tween utilityを自作するか
Three.js loop内でtime-based animation。

外部依存を増やさない。

## Assets
最初はThree.js primitiveで完成させる。

Phase 2:
GLB差し替え。

## GLTF
`GLTFLoader`

モデル命名規約:
```text
ENV_Wall_North
PROP_Desk_Main
INT_Safe
INT_PC
PUZ_Frame_A
```

## Performance Target
Desktop:
60fps目標
30fps未満を不可。

Draw calls:
初版100〜250程度目標。

Textures:
原則 1K。
重要小物のみ2K可。

## Lighting
- HemisphereLight or low Ambient
- 2〜4 point/spot
- Exit area emissive
- flashlight SpotLight

Shadow castingは主要ライト1つ程度。

## Save
localStorage。
ネットワーク不要。

## Security
ゲームなので機密性は不要だが、
答えがJS bundleから見えることは許容。
サーバー検証はしない。

## Mobile
初版対象外。
画面には:
`PC browser recommended`

将来Virtual joystick対応可能な構造にする。

## Browser
Chrome / Edge 最新。
Firefoxはbest effort。
Safariは初版対象外でもよい。

## Error Handling
- WebGL unavailable
- Pointer Lock unavailable
- localStorage failure
をユーザー向けに表示。


---

# SOURCE: 09_ASSET_LIST.md

# 09 ASSET LIST

## 方針
ゲーム完成前に素材集めへ時間を使いすぎない。
全進行をprimitiveで通した後、差し替える。

## 3D Assets

### Environment
- Floor
- Ceiling
- Wall modules
- Door
- Hidden door
- Observation window

### Furniture
- Main desk
- Chair
- Bookshelf
- Storage shelf
- Safe
- Wall panel
- Pedestal

### Puzzle Props
- 4 picture frames
- Wall clock
- Employee card
- Flashlight
- Optical filter
- Small key
- Master key
- Cube
- Sphere
- Cone
- Cylinder
- 404 perspective shapes

### Electronics
- PC monitor
- Keyboard
- Final terminal
- Camera props x4

## Textures
- Concrete / painted wall
- Floor
- Metal
- Desk
- Screen
- Employee card
- Memo A/B
- Painting art x4
- Warning labels

## Audio

### Ambient
- HVAC low hum
- server room hum

### SFX
- Footstep
- Interact
- Pickup
- Keypad click
- Correct
- Incorrect
- Drawer open
- Safe open
- Door open
- Hidden wall movement
- Terminal boot
- Flashlight toggle
- Ending sound

### Voice
初版はAI音声なしでも完成可能。
字幕のみで成立させる。

後から:
- EVE intro
- puzzle milestones
- ending lines

## UI
- Crosshair
- inventory item icons
- volume icons
- menu background

## 優先順位
P0:
primitiveで代替可能

P1:
Flashlight
PC
Safe
Door
Picture Frames
Master Key

P2:
家具の高品質化

P3:
音声・細かい装飾


---

# SOURCE: 10_IMPLEMENTATION_PLAN.md

# 10 IMPLEMENTATION PLAN

# 基本ルール
Claude Codeは一気に全機能を実装しない。
各Phase終了時に必ず:
1. build
2. test
3. browser動作確認
4. TODO更新
を行う。

# Phase 0 — Bootstrap
- Vite + TypeScript
- Three.js
- eslint/prettier
- Vitest
- Playwright
- base folders
- basic HTML/CSS

Acceptance:
`npm run dev`
で空の3D sceneが表示。

# Phase 1 — FPS Prototype
- room primitive
- camera
- Pointer Lock
- WASD
- collision
- ESC pause
- crosshair

Acceptance:
部屋を歩ける。
壁を通り抜けない。
家具にめり込まない。

# Phase 2 — Interaction Framework
- Raycast
- E interaction
- focus prompt
- Interactable interface
- drawer
- door
- simple pickup

Acceptance:
同じ仕組みで3種類以上のobjectを操作。

# Phase 3 — GameState / Save / Inventory
- centralized state
- event bus
- inventory
- item select
- localStorage
- reset

Acceptance:
reloadしてPuzzle進行が保持。

# Phase 4 — Puzzle Shells
まず全Puzzleを仮UI/primitiveで実装。

- P1 drawer keypad
- P2 flashlight reveal
- P3 PC
- P4 frames
- P5 shape slots
- P6 perspective
- P7 ending

Acceptance:
STARTからEnding Aまで通しプレイ可能。

# Phase 5 — Full Puzzle Logic
- hint
- incorrect feedback
- dependency locks
- Archive logs
- Ending B

Acceptance:
全Puzzleの正解/不正解/前提条件をtest。

# Phase 6 — UX
- intro
- toast
- inventory UI
- keypad keyboard input
- PC UI
- settings
- clear screen

# Phase 7 — Visual Pass
primitiveをGLB/assetsへ差し替え。
Lighting。
Fog。
Screen material。
Animation。

重要:
Visual変更でlogicを触らない。

# Phase 8 — Audio
- ambient
- footsteps
- SFX
- optional EVE voice

# Phase 9 — QA
テストプレイ。

チェック:
- 進行不能
- 壁抜け
- modalから戻れない
- Pointer Lock復帰
- save破損
- puzzleを順番飛ばし
- item duplication
- browser resize
- fullscreen

# Phase 10 — Release
- production build
- asset compression
- deploy
- version display
- analytics optional

## 1週間目安

### Day 1
Phase 0〜2

### Day 2
Phase 3 + P1/P2/P3

### Day 3
P4/P5/P6/P7

### Day 4
全Puzzle接続 + Ending

### Day 5
Visual + Audio

### Day 6
テストプレイ + 修正

### Day 7
仕上げ + LP + 公開

## Scope Cut Order
遅れたらこの順に削る。

1. Voice
2. Camera bob
3. 高品質3D props
4. Ending B演出の豪華さ
5. Audio種類
6. Settings詳細

絶対削らない:
- FPS movement
- collision
- Interaction
- 7 Puzzleの論理
- Ending A


---

# SOURCE: 11_ACCEPTANCE_TEST.md

# 11 ACCEPTANCE TEST

# Completion Definition
以下を全て満たしたら完成。

## Boot
- [ ] STARTで新規ゲーム開始
- [ ] CONTINUEで復帰
- [ ] RESET可能
- [ ] WebGLエラー時に説明表示

## FPS
- [ ] WASD
- [ ] Mouse look
- [ ] Pointer Lock
- [ ] Collision
- [ ] 壁抜けなし
- [ ] 家具に埋まらない
- [ ] ESCでPause

## Interaction
- [ ] Eで調査
- [ ] Raycast距離制限
- [ ] 対象外objectにpromptなし
- [ ] Pickup重複なし
- [ ] Door animation中の二重操作なし

## Inventory
- [ ] Tab開閉
- [ ] item選択
- [ ] item use
- [ ] save/reload維持

## Puzzles
- [ ] P1 0417
- [ ] P2 ORION
- [ ] P3 5892
- [ ] P4 1673
- [ ] P5 Sphere/Cone/Cube/Cylinder
- [ ] P6 404
- [ ] P7 Ending selection

## Dependencies
- [ ] FlashlightなしでP2突破不可
- [ ] PC unlock前にP3情報不可
- [ ] Safe前にOptical Filter不可
- [ ] P4前にShape slots不可
- [ ] P5前にHidden Room不可
- [ ] P6前にMaster Key不可

## Ending
- [ ] Ending A常に成立
- [ ] Ending Bはlog条件必須
- [ ] Clear Time表示
- [ ] Hint Count表示
- [ ] Logs Count表示

## UI
- [ ] 1920x1080
- [ ] 1440x900
- [ ] resize対応
- [ ] keypad keyboard input
- [ ] modal閉じる
- [ ] Pointer Lock復帰方法が明確

## Performance
- [ ] target browserで30fps以上
- [ ] consoleに大量errorなし
- [ ] asset 404なし
- [ ] build warningを可能な限り解消

## Playtest
最低3人。

記録:
- Clear time
- 詰まったPuzzle
- Hint使用
- 操作で迷った箇所
- 酔い
- バグ

### 調整基準
3人中2人以上が同じ場所で5分以上停止:
Puzzle hint/視線誘導を修正。

3人中2人以上が同じUI操作を誤解:
UIを修正。


---

# SOURCE: CLAUDE.md

# CLAUDE.md — ESCAPE 404

あなたはこのプロジェクトの実装担当エンジニアです。

## 最優先
仕様書に記載されたゲームを、
ブラウザで最初から最後まで通して遊べる状態にする。

見た目の豪華さより:
1. 動作
2. 進行不能がないこと
3. Puzzleの整合性
4. FPS操作感
5. UIの分かりやすさ
を優先する。

## 必ず読む
実装前に:
- README.md
- 01_GAME_CONCEPT.md
- 02_GAME_DESIGN.md
- 03_MAP_DESIGN.md
- 04_PUZZLE_DESIGN.md
- 05_GAME_SYSTEM.md
- 06_INTERACTION_SPEC.md
- 07_UI_UX.md
- 08_TECHNICAL_DESIGN.md
- 09_ASSET_LIST.md
- 10_IMPLEMENTATION_PLAN.md
- 11_ACCEPTANCE_TEST.md

## 禁止
- 勝手にPuzzleの答えを変更しない
- 勝手にフレームワークを変更しない
- 不要なサーバー/DBを追加しない
- 1ファイルに全ロジックを書かない
- Scene Objectに進行状態を分散しない
- 仕様を満たす前に美術作業へ逃げない
- TODOコメントだけで機能実装済みにしない
- テストを通すためだけに機能を無効化しない

## 技術
- Vite
- TypeScript
- Three.js
- Vitest
- Playwright

React/Next.jsは原則導入しない。

## Architecture
GameStateをsingle source of truthにする。

3D:
Scene / Player / Interaction

Game:
GameState / PuzzleManager / Inventory / Save

Presentation:
UI / Audio

を分離。

## 開発方法
`10_IMPLEMENTATION_PLAN.md` のPhase順に進める。

各Phase:
1. 実装
2. `npm run build`
3. unit test
4. 必要に応じてPlaywright
5. 実ブラウザ確認
6. 問題修正
7. 次Phase

## Greybox First
最初はBoxGeometry等で良い。

ゲーム全体がEndingまで通ることを確認してから
GLBモデルへ置換する。

## Puzzle Answers
固定:
- P1: 0417
- P2: ORION
- P3: 5892
- P4: 1673
- P5: Sphere, Cone, Cube, Cylinder
- P6: 404

## Interaction
Raycast + E。

Modal表示中:
FPS controllerを停止。

## Browser
PC Chrome / EdgeをPrimary target。

## Coding
- strict TypeScript
- anyを常用しない
- magic stringを減らす
- feature単位にmodule分離
- disposalを意識
- event listener cleanup
- resource cleanup

## State
Puzzle completionはidempotentにする。
同じPuzzle solvedイベントが複数回来ても
item duplicationや二重animationを発生させない。

## Save
Save load failure時はクラッシュせず、
新規game開始の選択肢を出す。

## UX
ユーザーが「何を操作できるか」分からない状態を避ける。
ただし全objectを常時光らせない。

## Performance
GLBやTextureの追加後も性能を確認する。
見た目のために極端に重くしない。

## Done
「コードが書けた」ではDoneではない。

`11_ACCEPTANCE_TEST.md`
のチェックを満たし、
START→Endingまでブラウザで実際に通せることがDone。
