# current.md — ESCAPE 404 現状

最終更新: 2026-09-01

## これは何か

`ESCAPE404_ClaudeCode_Spec.zip`（MASTER_SPEC.md 他 13 ファイル）に基づく、
一人称視点 3D 謎解き脱出ゲーム。ブラウザ単体で START から Ending まで通せる。

- 技術: Vite 7 / TypeScript 5 (strict) / Three.js 0.185 / Vitest / Playwright
- 対象環境: PC の Chrome / Edge（最新）
- 外部アセットなし（テクスチャは Canvas で手続き生成、音は Web Audio 合成）
- サーバー・DB・ネットワーク通信なし。進行は localStorage のみ

## 公開 URL

https://escape404.pages.dev

Cloudflare Pages（Git 連携）で配信している。`main` への push で自動デプロイされる。
ビルド設定は `CLAUDE.md` の「デプロイ」を参照（ビルドコマンドと出力ディレクトリを
手動設定する。プリセットは「なし」）。

## 動かし方

```bash
cd escape404
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build
npm test           # Vitest (49 件)
npm run e2e        # Playwright (18 件、実ブラウザで通しプレイ・視線操作・視点操作の開始)
```

E2E は WebGL が必要なため headless Chromium を SwiftShader で起動する。
Chromium の場所が標準でない環境では `PLAYWRIGHT_CHROMIUM_PATH` を指定する。
ソフトウェア描画では実機より桁違いに遅いので、E2E のタイムアウトは長めに取ってある。

## 実装済み（仕様との対応）

| 仕様 | 状態 |
|---|---|
| FPS 移動 (WASD・マウス視点・Pointer Lock・AABB 衝突) | 済 |
| 視点操作の開始案内 (ロックが外れている間は常設) | 済 |
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

## サイバー区画（見た目の設計）

「無菌の観察室の裏に、稼働音のする配線街がある」という建付け。区画で性格を分け、
主室の謎を読む照明には触れていない（判断は `docs/decisions.md` D-023）。

| 区画 | 見た目 | 点灯 |
|---|---|---|
| 隠し部屋（機械室） | ネオン管 3 本・配電盤 3 台・配線・掲示「稼働中」「観測は継続する」 | 最初から（観察窓から見える＝通路を探す動機） |
| 隠し通路 | 三方枠のネオン管 2 本・床の光の筋 | P5 クリアで点灯（開通の合図） |
| 主室 | 天井のネオン管 2 本による色被り・北東の冷却盤・水たまり | 最初から |

色は意味で決めている: magenta = 稼働中の負荷 / cyan = 冷却と配線 /
violet = 通路の抜け。参考にした画像のような全色使いはしない。

濡れた床は平面反射を使わず、(1) 管の像を加算合成の光の筋として床に置く
(2) 水たまりを金属質の薄い膜として置き環境マップの艶を拾わせる
(3) 床の `envMapIntensity` を上げる、の 3 点で作っている。

データは `src/data/neon.ts`（位置・色・光量）、組み立ては `src/scene/NeonZone.ts`。
管を 1 本足す・色を変えるだけならデータの編集で済む。

## 視点操作 (Pointer Lock) の扱い

Pointer Lock はユーザー操作からしか要求できず、自動では取得できない
（一次情報: https://w3c.github.io/pointerlock/ ）。取れていない状態を放置すると
OS のマウスカーソルが残り、視点が動かない。そのため次の建付けにしている。

- ロックの要求は「ユーザー操作の流れの中」で行う
  - イントロのスキップ操作（クリック / Enter / Space / Esc / スキップボタン）直後
  - イントロを最後まで見た場合はその時点
  - CONTINUE（つづきから）のクリック直後
  - モーダルを閉じた直後（中断メニューの「ゲームに戻る」を含む）
  - 画面のクリック、案内 (`.look-prompt`) のクリック
- 取れなかった場合は常設の案内 `LookPrompt` を画面全体に出す。案内自体が
  `<button>` なので、クリックでもキーボード (Enter / Space) でも開始できる。
  消えるトーストでは気付かれないため、案内は取得できるまで出したままにする。
- 案内を出す条件は `GameApp.canLook()` に集約している
  （ゲーム中 / モーダルなし / 演出中でない / エンディングでない、かつ未ロック）。
- ロック要求は同時に 1 つだけ通す。重ねると Chrome が先の要求を取り消し、
  取得直後に外れて中断メニューが勝手に開く。
- Esc でロックが外れたときは中断メニューを開く（Chrome では Esc の keydown が
  ページに届かないため、解除イベントを中断の入口として使っている）。

## 描画

実機 (PC Chrome) 前提の設定。ソフトウェア描画 (SwiftShader / llvmpipe) を
検出した場合は GTAO・Bloom・影・MSAA を自動で外す (`?gfx=high` / `?gfx=low` で上書き)。

| 項目 | 内容 |
|---|---|
| トーンマッピング | ACES フィルミック (exposure 1.0) |
| アンチエイリアス | MSAA 4x (EffectComposer のレンダーターゲット) |
| 環境光・映り込み | PMREM + RoomEnvironment (environmentIntensity 0.28) |
| ポストプロセス | GTAO (環境遮蔽) → UnrealBloom (強さ 0.42 / しきい値 0.95) → Vignette → OutputPass |
| 照明 | 天井埋め込み灯 = 面光源 4 灯 / 影付き SpotLight 1 灯 / 卓上ランプ / EXIT サイン / 非常灯 / 懐中電灯 (芯 + ハロの 2 灯) / ネオンのこぼれ光 5 灯 (低品質時は無効) |
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
  data/                layout(寸法) / neon(サイバー区画) / puzzles(答え・ヒント)
                       documents(文書) / dialogue(EVE)
  scene/               SceneManager (描画とポストプロセス) / Environment (躯体・設備)
                       NeonZone (サイバー区画の管・掲示・濡れ床)
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
- Playwright 18 件パス
  - 起動・描画・リサイズ (1920x1080 / 1440x900 / 1024x768)・壁抜けなし・
    console エラー 0・アセット 404 なし
  - START から END B までの通しプレイ（キーパッド UI のクリック、懐中電灯での
    壁面文字発見、PC の CHAT/FILES/CAMERA、形状配置のやり直し、隠し通路の通行、
    MASTER KEY、ログ 3/3 で END B）／END A のみ選べる状態／CONTINUE 復帰
  - 視線を合わせて E・F で操作する経路（引き出し・社員カード・メモ・時計・絵画・
    PC・金庫・本・EXIT DOOR・キーパッド・端末・X 印・台座・形状サンプル）
  - 壁や什器の向こう側は操作できないこと（遮蔽判定）
  - 視点操作の開始（イントロ後・イントロ全視聴後・画面クリックでのスキップ・
    案内クリックでロック取得とカーソル消滅・モーダル開閉をまたいだ復帰）
- 主要視点のスクリーンショットを目視確認（`test-results/*.png`。案内の表示も確認）
- サイバー区画の追加後も、P6 の錯視（404 の読み）・額縁 4 枚の図版・壁パネルの
  文字が変わらず読めることをスクリーンショットで確認

未確認:
- 実機 (Windows PC の Chrome) での視点操作の開始。headless Chromium では
  イントロ後にロックを取得できたが、実機で拒否された場合に案内が出る経路は
  ブラウザ実行を伴うため未確認
- 実機 GPU での fps（headless SwiftShader では 1〜2fps。実 GPU 環境での計測は未実施）
- Firefox / Safari での動作
- 実プレイヤー 3 人によるテストプレイ（仕様書 11 の Playtest 項目）
- タッチ端末での操作（初版は対象外。`PC ブラウザ推奨`の案内のみ）
- 描画品質の自動判定は `WEBGL_debug_renderer_info` に依存する。取得できない
  ブラウザでは高品質のままになるため、その場合は `?gfx=low` で下げられる
