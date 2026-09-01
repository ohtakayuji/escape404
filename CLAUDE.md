@.claude/rules/common.md

# ESCAPE 404 — THE LAST DEVELOPER

一人称視点の 3D 謎解き脱出ゲーム。ブラウザ単体で動く（サーバー・DB・外部アセットなし）。
対象環境は PC の Chrome / Edge。

## ブランチ運用ルール（恒久・必須）

**このリポジトリでの作業・コミット・プッシュはすべて `main` ブランチで行うこと。**
別ブランチを切らず、作業が終わったら直接 `main` にコミットして push する。

## デプロイ（恒久・必須）

**このリポジトリは Cloudflare Pages の Git 連携で配信する。`main` への push で自動デプロイされる。**
ビルド設定は以下で固定（変更する場合は `docs/decisions.md` に記録する）。

| 項目 | 値 |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |
| Node バージョン | `.node-version`（22） |

配信ルートは `dist`。**配信ルートに置きたい静的ファイルは `public/` に入れる**
（Vite が `dist` 直下へコピーする）。`public/robots.txt` がこれに該当する。

## クローラー全拒否ルール（必須）

1. すべての HTML の `<head>` に以下を必ず含める:

   ```html
   <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex, nocache">
   <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
   ```

2. `public/robots.txt` に以下を置く（配信ルートに出る）:

   ```
   User-agent: *
   Disallow: /
   ```

## この企画固有のルール（必須）

- **Puzzle の答えを勝手に変更しない。** 固定: P1 `0417` / P2 `ORION` / P3 `5892` /
  P4 `1673` / P5 Sphere → Cone → Cube → Cylinder / P6 `404`
- **`GameState` を唯一の正とする。** 進行状態を 3D オブジェクト側に分散させない
- **判定は `PuzzleManager` に集約する。** Scene / UI 側に答えを書かない
- **見た目の変更でロジックを触らない。** 逆も同じ
- **データ（寸法・答え・文章）は `src/data/` に置く。** コード中に数値や文章を散らさない
- 変更したら `npm run build`（型チェック込み）・`npm test`・必要なら `npm run e2e` を通す

## 引き継ぎ資料

`docs/current.md`（最新の確定状態）・`docs/decisions.md`（追記専用の決定台帳）・
`docs/log.md`（追記専用の変更ログ）。**decisions.md と log.md の既存行は編集・削除しない。**
セッション開始時は `current.md` と `decisions.md` を必ず読む。
元の仕様書一式は `docs/spec/` にある。

## 利用スキル

`.claude/skills/` に `frontend-design` と `web-games` をコミット済み。
フロントエンド制作時は `frontend-design`、ゲーム制作時は `web-games` を必ず参照する。
