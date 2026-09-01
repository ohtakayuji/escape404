# current.md — ESCAPE 404 現状

最終更新: 2026-09-01

## これは何か

`ESCAPE404_ClaudeCode_Spec.zip`（MASTER_SPEC.md 他 13 ファイル）に基づく、
一人称視点 3D 謎解き脱出ゲーム。ブラウザ単体で START から Ending まで通せる。

- 技術: Vite 7 / TypeScript 5 (strict) / Three.js 0.185 / Vitest / Playwright
- 対象環境: PC の Chrome / Edge（最新）
- 外部アセットなし（テクスチャは Canvas で手続き生成、音は Web Audio 合成）
- サーバー・DB・ネットワーク通信なし。進行は localStorage のみ

## 動かし方

```bash
cd escape404
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build
npm test           # Vitest (49 件)
npm run e2e        # Playwright (13 件、実ブラウザで通しプレイと視線操作)
```

E2E は WebGL が必要なため headless Chromium を SwiftShader で起動する。
Chromium の場所が標準でない環境では `PLAYWRIGHT_CHROMIUM_PATH` を指定する。
ソフトウェア描画では実機より桁違いに遅いので、E2E のタイムアウトは長めに取ってある。

## 実装済み（仕様との対応）

| 仕様 | 状態 |
|---|---|
| FPS 移動 (WASD・マウス視点・Pointer Lock・AABB 衝突) | 済 |
| Raycast + E 調査 / F アイテム使用 / L 懐中電灯 | 済 |
| GameState 単一正・EventBus・localStorage 自動保存 | 済 |
| P1 `0417` 引き出し | 済 |
| P2 `ORION` 壁面文字 → PC ログイン | 済 |
| P3 `5892` CHAT + CAMERA → 金庫 | 済 |
| P4 `1673` フィルタ + 点滅順 → 壁パネル | 済 |
| P5 Sphere / Cone / Cube / Cylinder → 隠し通路 | 済 |
| P6 `404` アナモルフィック視点整列 → MASTER KEY | 済 |
| P7 OPEN EXIT / ASK WHO I AM → END A / END B | 済 |
| ヒント 3 段階・誤答演出・依存ロック | 済 |
| Intro タイプライター・トースト・字幕・クリア画面 | 済 |
| インベントリ・設定（感度/FOV/照準/音量/揺れ/演出） | 済 |
| WebGL 不可・localStorage 不可・セーブ破損の案内 | 済 |
| レスポンシブ（タイトル・設定・モーダルはモバイルまで） | 済 |
| クローラー全拒否 meta / robots.txt | 済 |

## 描画

実機 (PC Chrome) 前提の設定。ソフトウェア描画 (SwiftShader / llvmpipe) を
検出した場合は GTAO・Bloom・影・MSAA を自動で外す (`?gfx=high` / `?gfx=low` で上書き)。

| 項目 | 内容 |
|---|---|
| トーンマッピング | ACES フィルミック (exposure 1.0) |
| アンチエイリアス | MSAA 4x (EffectComposer のレンダーターゲット) |
| 環境光・映り込み | PMREM + RoomEnvironment (environmentIntensity 0.28) |
| ポストプロセス | GTAO (環境遮蔽) → UnrealBloom → Vignette → OutputPass |
| 照明 | 天井埋め込み灯 = 面光源 4 灯 / 影付き SpotLight 1 灯 / 卓上ランプ / EXIT サイン / 非常灯 / 懐中電灯 (芯 + ハロの 2 灯) |
| マテリアル | albedo + normal + roughness を Canvas から生成 (高さマップから Sobel で法線) |
| その他 | 埃の粒 (Points)、床の艶、フォグ |

材質は研磨コンクリートの床 (1m 目地)、塗装コンクリートの壁、天井パネル、
ヘアライン金属、塗装金属、樹脂、キーボード、ルーバー、網入りガラス。

## 構成

```
src/
  main.ts              起動と致命的エラー表示
  app/GameApp.ts       各システムの組み立てとゲームループ
  app/Progression.ts   「謎が解けた」を世界の変化へ翻訳する層
  core/                EventBus / GameState / SaveManager / Settings / Input / tween / ids
  data/                layout(寸法) / puzzles(答え・ヒント) / documents(文書) / dialogue(EVE)
  scene/               SceneManager (描画とポストプロセス) / Environment (躯体・設備)
                       furniture (什器の造形) / MeshFactory / Lighting / Glyph404
                       pbr (手続き的 PBR マップ) / textures (文字・図版) / materials
  player/              PlayerController / CollisionWorld
  interaction/         InteractionManager / registry / Interactable(型)
  puzzles/             PuzzleManager（全判定の集約）
  inventory/           InventoryManager / items
  ui/                  UIManager + 各パネル（Hud / Keypad / PC / Hint など）
  audio/AudioManager   Web Audio による合成音
tests/                 Vitest（純ロジック：Puzzle / Save / 当たり / P6 幾何）
e2e/                   Playwright（起動・通しプレイ・視覚確認）
```

データ（寸法・答え・文章）はすべて `src/data/` にあり、コードに散らしていない。
3D オブジェクト側は答えを知らず、判定は `PuzzleManager` に集約している。

## P6 の錯視について

隠し部屋の床の X 印（`OBSERVE_MARK`）を視点として、基準面に描いた「404」の
各板を各グループの奥行きへ射影して配置している（`src/data/layout.ts` の
`GLYPH_RECTS` と `src/scene/Glyph404.ts`）。錯視は本物で、立ち位置がずれると崩れる。
`tests/glyph.test.ts` が「観測点から見ると基準グリフと一致する」「1.5m ずれると崩れる」
「板は頭上にあり天井を突き抜けない」「観察窓の枠内に収まる」を数値で検証している。

黒い板を影絵として読ませるため、東側の天井と東壁上端を面光源にしている
（観察窓から見上げる仰角 4〜12 度に入る面）。

## 検証済み / 未確認

検証済み（このリポジトリで実行して確認）:
- `npm run build` 成功。警告なし。app 436KB (gzip 160KB) + three 530KB (gzip 133KB)
- Vitest 49 件パス（Puzzle 判定・依存ロック・冪等性・セーブ移行・当たり判定と
  到達可能性・P6 の錯視幾何）
- Playwright 13 件パス
  - 起動・描画・リサイズ (1920x1080 / 1440x900 / 1024x768)・壁抜けなし・
    console エラー 0・アセット 404 なし
  - START から END B までの通しプレイ（キーパッド UI のクリック、懐中電灯での
    壁面文字発見、PC の CHAT/FILES/CAMERA、形状配置のやり直し、隠し通路の通行、
    MASTER KEY、ログ 3/3 で END B）／END A のみ選べる状態／CONTINUE 復帰
  - 視線を合わせて E・F で操作する経路（引き出し・社員カード・メモ・時計・絵画・
    PC・金庫・本・EXIT DOOR・キーパッド・端末・X 印・台座・形状サンプル）
  - 壁や什器の向こう側は操作できないこと（遮蔽判定）
- 主要視点のスクリーンショットを目視確認（`test-results/*.png`）

未確認:
- 実機 GPU での fps（headless SwiftShader では 1〜2fps。実 GPU 環境での計測は未実施）
- Firefox / Safari での動作
- 実プレイヤー 3 人によるテストプレイ（仕様書 11 の Playtest 項目）
- タッチ端末での操作（初版は対象外。`PC ブラウザ推奨`の案内のみ）
- 描画品質の自動判定は `WEBGL_debug_renderer_info` に依存する。取得できない
  ブラウザでは高品質のままになるため、その場合は `?gfx=low` で下げられる
