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
