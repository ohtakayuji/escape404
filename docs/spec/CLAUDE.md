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
