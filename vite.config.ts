import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    /*
     * three.js 本体だけで 500KB 超になるため、既定のしきい値では常に警告が出る。
     * 分割済みのチャンク構成に合わせて上限を上げておく。
     */
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        /*
         * three.js を別チャンクにしておくと、ゲーム側のコードを更新しても
         * ブラウザキャッシュに残ったライブラリを使い回せる。
         */
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
