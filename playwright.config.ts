import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/**
 * WebGL が必須なので、headless Chromium を SwiftShader (ソフトウェア描画) で
 * 起動する。CI 用イメージなどで Chromium が別の場所にある場合は
 * PLAYWRIGHT_CHROMIUM_PATH で指定できる。
 */
const CANDIDATES = [
  process.env["PLAYWRIGHT_CHROMIUM_PATH"],
  "/opt/pw-browsers/chromium",
].filter((path): path is string => Boolean(path));

const executablePath = CANDIDATES.find((path) => existsSync(path));

export default defineConfig({
  testDir: "./e2e",
  // SwiftShader (ソフトウェア描画) は実機 GPU より桁違いに遅いので長めに取る
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--enable-unsafe-swiftshader",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--disable-lcd-text",
      ],
    },
  },
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
