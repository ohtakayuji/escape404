import { expect, test } from "@playwright/test";
import { api } from "./types";

/**
 * 見た目の確認用。アサートは軽くし、スクリーンショットを残すことを目的にする。
 * (SwiftShader の headless 描画なので実機より暗く粗い)
 */
test.describe("視覚確認", () => {
  test("主要な視点のスクリーンショットを残す", async ({ page }) => {
    await page.goto("/?gfx=high");
    await page.locator("#btn-start").click();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hud")).toBeVisible();

    const shots: [string, number, number, number][] = [
      ["20-spawn", 1.2, 1.8, Math.PI],
      ["21-desk", 0.2, 1.9, Math.PI + 0.1],
      ["22-paintings", -2.6, -2.4, 0],
      ["23-pc", 4.2, -2.0, -Math.PI / 2],
      ["24-safe-shelf", 2.0, 2.6, Math.PI - 0.9],
      ["25-bookshelf", -4.2, 1.5, Math.PI / 2],
    ];
    for (const [name, x, z, yaw] of shots) {
      await api(page, (a, args) => a.teleport(args.x, args.z, args.yaw), { x, z, yaw });
      await page.waitForTimeout(450);
      await page.screenshot({ path: `test-results/${name}.png` });
    }

    // P6: X 印から見た 404 と、ずれた位置から見た崩れ方
    await api(page, (a) => {
      a.submit("p1-drawer", "0417");
      a.teleport(-8.0, -0.6, -Math.PI / 2);
    });
    await page.waitForTimeout(3200);
    await page.screenshot({ path: "test-results/26-glyph-aligned.png" });

    await api(page, (a) => a.teleport(-8.0, 0.35, -Math.PI / 2));
    await page.waitForTimeout(900);
    await page.screenshot({ path: "test-results/27-glyph-broken.png" });

    // メイン研究室から見た吊りオブジェクト (意味不明に見えること)
    await api(page, (a) => a.teleport(-1.0, 2.6, Math.PI + 0.35));
    await page.waitForTimeout(900);
    await page.screenshot({ path: "test-results/28-glyph-from-room.png" });
  });

  test("進行後の見た目 (パネル開放・非常灯・脱出)", async ({ page }) => {
    await page.goto("/?gfx=high");
    await page.locator("#btn-start").click();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hud")).toBeVisible();

    // 壁パネル: 開く前
    await api(page, (a) => a.teleport(-1.5, 3.1, Math.PI));
    await page.waitForTimeout(450);
    await page.screenshot({ path: "test-results/29-panel-closed.png" });

    // 前提を満たして P4 まで進める
    await api(page, (a) => {
      a.submit("p1-drawer", "0417");
      a.setFlashlight(true);
      a.teleport(4.3, -0.4, -Math.PI / 2);
    });
    await expect
      .poll(async () => (await api(page, (a) => a.getState())).flags.hiddenTextSeen, {
        timeout: 45000,
      })
      .toBe(true);
    await api(page, (a) => {
      a.submit("p2-login", "ORION");
      a.submit("p3-safe", "5892");
      a.revealFilterDigits();
      a.submit("p4-frames", "1673");
      a.teleport(-1.5, 3.1, Math.PI);
      a.setFlashlight(false);
    });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: "test-results/30-panel-open.png" });

    // 形状サンプルを 4 つ置いた状態
    await api(page, (a) => {
      const order = ["sphere", "cone", "cube", "cylinder"];
      order.forEach((id) => a.pickShape(id));
      order.forEach((id, index) => a.placeShape(index, id));
    });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: "test-results/31-slots-filled.png" });

    // 隠し部屋 (非常灯)
    await api(page, (a) => a.teleport(-6.7, 1.5, Math.PI / 2));
    await page.waitForTimeout(900);
    await page.screenshot({ path: "test-results/32-hidden-room.png" });

    // 脱出 (END A のドア開放)
    await api(page, (a) => {
      a.submit("p6-perspective", "404");
      a.useMasterKey();
      a.teleport(1.4, 2.8, Math.PI);
    });
    await page.waitForTimeout(900);
    await api(page, (a) => a.chooseEnding("A"));
    await page.waitForTimeout(1400);
    await page.screenshot({ path: "test-results/33-exit-open.png" });
  });
});
