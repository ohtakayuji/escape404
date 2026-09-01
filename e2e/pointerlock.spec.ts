import { expect, test, type Page } from "@playwright/test";
import { api } from "./types";

/**
 * 視点操作 (Pointer Lock) が必ず始められる状態にあることを検証する。
 *
 * 実機で「部屋に入ったのにマウスカーソルが生きていて視点が動かない」不具合が
 * 出た。原因はロックの要求がキャンバスのクリック待ちだけで、案内が数秒で
 * 消えるトーストだったこと。ここでは「ロック済み」か「案内が出ている」の
 * どちらかが常に成り立つことを不変条件として確かめる。
 */
async function lockStatus(page: Page): Promise<{ locked: boolean; prompt: boolean }> {
  return {
    locked: await page.evaluate(() => document.pointerLockElement !== null),
    prompt: await api(page, (a) => a.lookPromptVisible()),
  };
}

/** ロック済みか、案内が出ているか。どちらでもない = マウスが死んでいる。 */
async function expectLookReachable(page: Page): Promise<void> {
  const status = await lockStatus(page);
  expect(
    status.locked || status.prompt,
    `pointer lock=${status.locked} / look prompt=${status.prompt}`,
  ).toBe(true);
}

test.describe("視点操作の開始", () => {
  test("イントロ後にロック済みか案内が出ている", async ({ page }) => {
    await page.goto("/");
    await page.locator("#btn-start").click();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hud")).toBeVisible();
    await expectLookReachable(page);
  });

  test("イントロを最後まで見た場合 (操作なし) でも視点操作へ入れる", async ({ page }) => {
    await page.goto("/");
    await page.locator("#btn-start").click();
    // スキップせずに待つ。この経路が報告された不具合そのもので、以前は
    // ロックの要求もされず案内も消えるため、マウスが効かないまま放置された。
    // (Chromium は直前のクリックを操作実績と見なしてロックを許すことがあり、
    //  許されなければ案内が出る。どちらかであることが要件。)
    await expect(page.locator(".cinematic")).toBeHidden({ timeout: 30_000 });
    await expect(page.locator(".hud")).toBeVisible();
    await expectLookReachable(page);
  });

  test("イントロは画面クリックでもスキップできる", async ({ page }) => {
    await page.goto("/");
    await page.locator("#btn-start").click();
    await expect(page.locator(".cinematic")).toBeVisible();
    await page.locator(".cinematic").click({ position: { x: 20, y: 20 } });
    await expect(page.locator(".cinematic")).toBeHidden();
    await expect(page.locator(".hud")).toBeVisible();
    await expectLookReachable(page);
  });

  test("案内をクリックすると視点操作が始まりカーソルが消える", async ({ page }) => {
    await page.goto("/");
    await page.locator("#btn-start").click();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hud")).toBeVisible();

    if (await api(page, (a) => a.lookPromptVisible())) {
      await page.locator(".look-prompt").click();
    }
    await expect.poll(async () => (await lockStatus(page)).locked).toBe(true);
    expect(await api(page, (a) => a.lookPromptVisible())).toBe(false);
    await expect(page.locator("body")).toHaveAttribute("data-pointer-locked", "true");
  });

  test("モーダルを開くと案内は消え、閉じると視点操作へ戻れる", async ({ page }) => {
    await page.goto("/");
    await page.locator("#btn-start").click();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hud")).toBeVisible();

    await api(page, (a) => a.openPc());
    await expect(page.locator(".modal-layer .device")).toBeVisible();
    expect(await api(page, (a) => a.lookPromptVisible())).toBe(false);

    await page.locator(".device__close").click();
    await expect(page.locator(".modal-layer .device")).toBeHidden();
    await expectLookReachable(page);
  });
});
