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
