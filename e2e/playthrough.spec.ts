import { expect, test, type Page } from "@playwright/test";
import { api } from "./types";

async function startGame(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("#btn-start").click();
  await page.keyboard.press("Enter");
  await expect(page.locator(".hud")).toBeVisible();
}

/** キーパッド UI を実際にクリックして解答する */
async function enterOnKeypad(page: Page, digits: string): Promise<void> {
  for (const digit of digits) {
    await page.locator(`.keypad__key[data-action="${digit}"]`).click();
  }
}

test.describe("通しプレイ", () => {
  test("START から END B まで到達できる", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await startGame(page);

    /* --- P1: 引き出しのキーパッドを UI から操作する --- */
    await api(page, (a) => a.openKeypad("p1-drawer"));
    await expect(page.locator(".keypad")).toBeVisible();
    await enterOnKeypad(page, "1234");
    await expect(page.locator(".keypad")).toHaveAttribute("data-state", "wrong");
    await enterOnKeypad(page, "0417");
    await expect(page.locator(".keypad")).toHaveAttribute("data-state", "ok");
    await expect(page.locator(".modal-layer")).toBeHidden({ timeout: 4000 });

    let state = await api(page, (a) => a.getState());
    expect(state.flags.drawerOpened).toBe(true);
    expect(state.inventory).toContain("flashlight");
    await page.screenshot({ path: "test-results/10-after-p1.png" });

    /* --- P2: 懐中電灯で壁面文字を照らして発見する --- */
    expect(state.flags.hiddenTextSeen).toBe(false);
    await api(page, (a) => {
      a.teleport(4.3, -0.4, -Math.PI / 2);
      a.setFlashlight(true);
    });
    // 壁面文字は「照らし続けて浮かび上がる」演出なので、
    // ソフトウェア描画の環境ではフレーム進行が遅く時間がかかる
    await expect
      .poll(async () => (await api(page, (a) => a.getState())).flags.hiddenTextSeen, {
        timeout: 30000,
      })
      .toBe(true);
    await page.screenshot({ path: "test-results/11-orion-wall.png" });

    expect(await api(page, (a) => a.submit("p2-login", "ORION"))).toBe("solved");

    /* --- P3: PC の CHAT / CAMERA を見て金庫を開ける --- */
    await api(page, (a) => a.openPc());
    await expect(page.locator(".chat")).toBeVisible();
    await page.locator('.pc__app[data-app="camera"]').click();
    await expect(page.locator(".cam")).toHaveCount(4);
    await expect(page.locator(".cam__value").first()).toHaveText("8");
    await page.screenshot({ path: "test-results/12-pc-camera.png" });
    await page.keyboard.press("Escape");
    await expect(page.locator(".modal-layer")).toBeHidden();

    await api(page, (a) => a.openKeypad("p3-safe"));
    await enterOnKeypad(page, "5892");
    await expect(page.locator(".keypad")).toHaveAttribute("data-state", "ok");
    await expect(page.locator(".modal-layer")).toBeHidden({ timeout: 4000 });

    state = await api(page, (a) => a.getState());
    expect(state.inventory).toEqual(expect.arrayContaining(["optical-filter", "small-key"]));

    /* --- ログを読み、PC に SUBJECT17.LOG を出す --- */
    await api(page, (a) => a.readLog("archive01"));
    await api(page, (a) => a.openPc());
    await page.locator('.pc__app[data-app="files"]').click();
    await expect(page.locator(".file", { hasText: "SUBJECT17.LOG" })).toBeVisible();
    await page.locator(".file", { hasText: "SUBJECT17.LOG" }).click();
    await expect(page.locator(".file-view")).toContainText("SELF-AWARENESS TEST");
    await page.keyboard.press("Escape");
    state = await api(page, (a) => a.getState());
    expect(state.logs.subject17).toBe(true);

    /* --- P4: フィルタで数字を出して壁パネルを開ける --- */
    await api(page, (a) => {
      a.revealFilterDigits();
      a.teleport(-2.4, -2.6, Math.PI);
    });
    await page.screenshot({ path: "test-results/13-paintings.png" });
    await api(page, (a) => a.openKeypad("p4-frames"));
    await enterOnKeypad(page, "1673");
    await expect(page.locator(".keypad")).toHaveAttribute("data-state", "ok");
    await expect(page.locator(".modal-layer")).toBeHidden({ timeout: 4000 });
    state = await api(page, (a) => a.getState());
    expect(state.flags.wallPanelOpened).toBe(true);
    await api(page, (a) => a.teleport(-1.5, 3.2, 0));
    await page.waitForTimeout(1400);
    await page.screenshot({ path: "test-results/14-wall-panel.png" });

    /* --- P5: 4 つの形状を拾って順番に置く --- */
    await api(page, (a) => {
      for (const id of ["sphere", "cone", "cube", "cylinder"]) a.pickShape(id);
    });
    state = await api(page, (a) => a.getState());
    expect(state.inventory).toEqual(
      expect.arrayContaining(["sphere", "cone", "cube", "cylinder"]),
    );

    // 誤った並びでは通らない
    await api(page, (a) => {
      a.placeShape(0, "cube");
      a.placeShape(1, "cone");
      a.placeShape(2, "sphere");
      a.placeShape(3, "cylinder");
    });
    state = await api(page, (a) => a.getState());
    expect(state.flags.hiddenPassageOpened).toBe(false);

    // スロットから取り出して正しい並びに置き直す
    await api(page, (a) => {
      for (let i = 0; i < 4; i += 1) a.clearSlot(i);
      a.placeShape(0, "sphere");
      a.placeShape(1, "cone");
      a.placeShape(2, "cube");
      a.placeShape(3, "cylinder");
    });
    state = await api(page, (a) => a.getState());
    expect(state.flags.hiddenPassageOpened).toBe(true);
    expect(state.shapeSlots).toEqual(["sphere", "cone", "cube", "cylinder"]);

    /* --- 隠し通路を歩いて通れる --- */
    const walked = await api(page, (a) => {
      a.teleport(-5.0, 1.5);
      return a.walk(-3.5, 0, 200);
    });
    expect(walked.x).toBeLessThan(-6.3);

    /* --- P6: X 印に立つと 404 が重なって見える --- */
    await api(page, (a) => a.teleport(-8.0, -0.6, -Math.PI / 2));
    await page.waitForTimeout(600);
    await page.screenshot({ path: "test-results/15-perspective-404.png" });
    await api(page, (a) => a.teleport(-8.0, 1.4, -Math.PI / 2));
    await page.waitForTimeout(400);
    await page.screenshot({ path: "test-results/16-perspective-off.png" });

    expect(await api(page, (a) => a.submit("p6-perspective", "404"))).toBe("solved");
    state = await api(page, (a) => a.getState());
    expect(state.inventory).toContain("master-key");

    await api(page, (a) => a.readLog("archive02"));

    /* --- P7: MASTER KEY を使って最終端末で ASK WHO I AM --- */
    expect(await api(page, (a) => a.useMasterKey())).toBe(true);
    state = await api(page, (a) => a.getState());
    expect(state.flags.finalTerminalUnlocked).toBe(true);

    await api(page, (a) => a.openFinalTerminal());
    const ask = page.locator(".menu .btn", { hasText: "ASK WHO I AM" });
    await expect(ask).toBeEnabled();
    await ask.click();

    await expect(page.locator(".report")).toBeVisible({ timeout: 8000 });
    await expect(page.locator(".report")).toHaveAttribute("data-ending", "B");
    await expect(page.locator(".report__val").nth(2)).toHaveText("3 / 3");
    await page.screenshot({ path: "test-results/17-ending-b.png" });

    expect(errors, `page errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("ログを読まない場合 END A のみ選べる", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await startGame(page);
    await api(page, (a) => {
      a.submit("p1-drawer", "0417");
      a.setFlashlight(true);
      a.teleport(4.3, -0.4, -Math.PI / 2);
    });
    await expect
      .poll(async () => (await api(page, (a) => a.getState())).flags.hiddenTextSeen, {
        timeout: 30000,
      })
      .toBe(true);

    await api(page, (a) => {
      a.submit("p2-login", "ORION");
      a.submit("p3-safe", "5892");
      a.submit("p4-frames", "1673");
      a.submit("p5-shapes", ["sphere", "cone", "cube", "cylinder"]);
      a.submit("p6-perspective", "404");
      a.useMasterKey();
      a.openFinalTerminal();
    });

    await expect(page.locator(".menu .btn", { hasText: "ASK WHO I AM" })).toBeDisabled();
    await page.locator(".menu .btn", { hasText: "OPEN EXIT" }).click();
    await expect(page.locator(".report")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".report")).toHaveAttribute("data-ending", "A");
    await page.screenshot({ path: "test-results/18-ending-a.png" });
    expect(errors, `page errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("進行が保存され、CONTINUE で復帰する", async ({ page }) => {
    await startGame(page);
    await api(page, (a) => a.submit("p1-drawer", "0417"));

    await page.reload();
    await expect(page.locator("#btn-continue")).toBeEnabled();
    await page.locator("#btn-continue").click();
    await expect(page.locator(".hud")).toBeVisible();

    const state = await api(page, (a) => a.getState());
    expect(state.flags.drawerOpened).toBe(true);
    expect(state.inventory).toContain("flashlight");
    expect(state.solvedPuzzles).toContain("p1-drawer");
  });
});
