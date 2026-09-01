import { expect, test } from "@playwright/test";
import { api } from "./types";

test.describe("起動", () => {
  test("タイトル画面が出て、3D シーンが描画される", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));

    await page.goto("/");
    await expect(page.locator("#start-screen")).toBeVisible();
    await expect(page.locator(".start__title")).toContainText("ESCAPE");
    await expect(page.locator("#btn-start")).toBeEnabled();
    await expect(page.locator("#btn-continue")).toBeDisabled();
    await expect(page.locator("#fatal-screen")).toBeHidden();
    await page.screenshot({ path: "test-results/01-title.png", fullPage: false });

    // WebGL が実際に描画されているか (three.js の描画統計で確認する)
    await page.locator("#btn-start").click();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hud")).toBeVisible();
    await page.waitForTimeout(900);

    const stats = await api(page, (a) => a.renderStats());
    expect(stats.frame).toBeGreaterThan(10);
    expect(stats.calls).toBeGreaterThan(20);
    expect(stats.triangles).toBeGreaterThan(500);
    await page.screenshot({ path: "test-results/02-room.png" });

    expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("リサイズしても HUD とキャンバスが崩れない", async ({ page }) => {
    await page.goto("/");
    await page.locator("#btn-start").click();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hud")).toBeVisible();

    for (const size of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(200);
      const box = await page.locator("#game-canvas").boundingBox();
      expect(box?.width).toBeCloseTo(size.width, 0);
      expect(box?.height).toBeCloseTo(size.height, 0);
    }
    await page.screenshot({ path: "test-results/03-resize-1024.png" });
  });

  test("壁を通り抜けない", async ({ page }) => {
    await page.goto("/");
    await page.locator("#btn-start").click();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hud")).toBeVisible();

    const north = await api(page, (a) => {
      a.teleport(0, 0.9);
      return a.walk(0, -20, 400);
    });
    expect(north.z).toBeGreaterThan(-4.5);

    const east = await api(page, (a) => {
      a.teleport(0, 2.4);
      return a.walk(20, 0, 400);
    });
    expect(east.x).toBeLessThan(6);
  });
});
