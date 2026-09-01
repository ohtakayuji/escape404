# ESCAPE 404 — THE LAST DEVELOPER

一人称視点の 3D 謎解き脱出ゲーム。ブラウザだけで動く（サーバー・DB なし、外部アセットなし）。
対象は PC の Chrome / Edge。

```bash
npm install
npm run dev      # http://localhost:5173
```

配信は Cloudflare Pages（Git 連携）。`main` への push で自動デプロイされる。
ビルド設定は `CLAUDE.md` の「デプロイ」を参照。

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` | 型チェック + 本番ビルド |
| `npm test` | Vitest 49 件（Puzzle 判定・セーブ・当たり判定・P6 の幾何） |
| `npm run e2e` | Playwright 13 件（起動・通しプレイ・視線操作・スクリーンショット） |

操作: `WASD` 移動 / マウス 視点 / `E` 調べる / `F` アイテム使用 /
`L` 懐中電灯 / `Tab` 持ち物 / `H` ヒント / `Esc` 中断

仕様と実装の対応・設計判断は `docs/current.md` と `docs/decisions.md` にある。
