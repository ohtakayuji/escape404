import { expect, test, type Page } from "@playwright/test";
import { api } from "./types";

/**
 * 「視線を合わせて E」の経路を通すテスト。
 * 通しプレイのテストは UI を直接開いていたため、
 * Raycast がそのオブジェクトに当たるかは検証されていなかった。
 *
 * 立ち位置と俯角は実測値。什器の当たり判定に埋まらない位置から、
 * 各オブジェクトの maxDistance 以内に収まるよう選んである。
 */
const LOOK_NORTH = 0;
const LOOK_SOUTH = Math.PI;
const LOOK_EAST = -Math.PI / 2;
const LOOK_WEST = Math.PI / 2;

interface Spot {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

async function startGame(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("#btn-start").click();
  await page.keyboard.press("Enter");
  await expect(page.locator(".hud")).toBeVisible();
}

/** 指定位置・向きへ移動し、フォーカスが期待値になるまで待つ */
async function aimAt(page: Page, spot: Spot, expectedId: string | null): Promise<void> {
  await api(page, (a, args) => a.teleport(args.x, args.z, args.yaw, args.pitch), spot);
  await expect
    .poll(async () => (await api(page, (a) => a.focus()))?.id ?? null, { timeout: 15000 })
    .toBe(expectedId);
}

test.describe("視線での操作", () => {
  test("引き出しを見て E でキーパッドが開き、0417 で解ける", async ({ page }) => {
    await startGame(page);
    await aimAt(page, { x: 0.62, z: 1.85, yaw: LOOK_NORTH, pitch: -0.74 }, "drawer");

    await expect(page.locator(".focus-prompt")).toHaveAttribute("data-visible", "true");
    await expect(page.locator(".focus-prompt__label")).toHaveText("ロックされた引き出し");
    await expect(page.locator(".keycap").first()).toContainText("E");

    await api(page, (a) => a.pressInteract());
    await expect(page.locator(".keypad")).toBeVisible();
    for (const digit of "0417") {
      await page.locator(`.keypad__key[data-action="${digit}"]`).click();
    }
    await expect(page.locator(".keypad")).toHaveAttribute("data-state", "ok");

    const state = await api(page, (a) => a.getState());
    expect(state.flags.drawerOpened).toBe(true);
    expect(state.inventory).toContain("flashlight");
  });

  test("室内の主要な対象を視線で拾える", async ({ page }) => {
    await startGame(page);

    const spots: { id: string; label: string; spot: Spot }[] = [
      { id: "employee-card", label: "社員カード", spot: { x: -1.9, z: 0.16, yaw: LOOK_EAST, pitch: -0.63 } },
      { id: "memo-b", label: "MEMO B", spot: { x: 1.9, z: -0.24, yaw: LOOK_WEST, pitch: -0.58 } },
      { id: "wall-clock", label: "止まった時計", spot: { x: 4.0, z: -3.2, yaw: LOOK_NORTH, pitch: 0.43 } },
      { id: "painting-B", label: "光学校正チャート B", spot: { x: -3.0, z: -3.2, yaw: LOOK_NORTH, pitch: 0.08 } },
      { id: "pc", label: "ロックされた PC", spot: { x: 4.4, z: -2.0, yaw: LOOK_EAST, pitch: -0.44 } },
      { id: "safe", label: "金庫", spot: { x: -4.6, z: 3.1, yaw: LOOK_SOUTH, pitch: -1.04 } },
      { id: "book-order", label: "OPTICAL CALIBRATION", spot: { x: -4.9, z: 1.136, yaw: LOOK_WEST, pitch: -0.96 } },
      { id: "exit-door", label: "EXIT DOOR", spot: { x: 1.5, z: 3.2, yaw: LOOK_SOUTH, pitch: -0.1 } },
      { id: "wall-panel-keypad", label: "金属カバー付きキーパッド", spot: { x: -0.4, z: 3.4, yaw: LOOK_SOUTH, pitch: -0.25 } },
      { id: "terminal", label: "観察端末 — CODE", spot: { x: -8.6, z: 0, yaw: LOOK_WEST, pitch: -0.57 } },
      { id: "observe-mark", label: "床の X 印", spot: { x: -8.0, z: 0.9, yaw: LOOK_NORTH, pitch: -0.95 } },
      { id: "pedestal", label: "台座", spot: { x: -8.0, z: 0.75, yaw: LOOK_SOUTH, pitch: -0.6 } },
    ];

    for (const entry of spots) {
      await aimAt(page, entry.spot, entry.id);
      const focus = await api(page, (a) => a.focus());
      expect(focus?.label, `${entry.id} のラベル`).toBe(entry.label);
    }
  });

  test("壁や什器の向こう側にあるものは操作できない", async ({ page }) => {
    await startGame(page);

    // 部屋の外 (北壁の向こう) から絵画を見る
    await aimAt(page, { x: -3.0, z: -6.0, yaw: LOOK_SOUTH, pitch: 0 }, null);

    // 隠し部屋側から本棚の背板越しに本を見る
    await aimAt(page, { x: -6.6, z: 1.136, yaw: LOOK_EAST, pitch: -0.5 }, null);

    // 同じ本を部屋側から見れば操作できる (遮蔽判定が過剰でないことの確認)
    await aimAt(page, { x: -4.9, z: 1.136, yaw: LOOK_WEST, pitch: -0.96 }, "book-order");
  });

  test("形状サンプルは E で拾えて、拾った後はフォーカスしない", async ({ page }) => {
    await startGame(page);
    await aimAt(page, { x: 3.82, z: 3.4, yaw: LOOK_SOUTH, pitch: -0.29 }, "shape-sphere");

    await api(page, (a) => a.pressInteract());
    await expect
      .poll(async () => (await api(page, (a) => a.getState())).inventory, { timeout: 10000 })
      .toContain("sphere");

    await expect
      .poll(async () => (await api(page, (a) => a.focus()))?.id ?? null, { timeout: 15000 })
      .toBe(null);
  });

  test("MASTER KEY を選んで EXIT DOOR で F を押すと最終端末が有効になる", async ({ page }) => {
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
      a.setFlashlight(false);
      a.submit("p2-login", "ORION");
      a.submit("p3-safe", "5892");
      a.submit("p4-frames", "1673");
      a.submit("p5-shapes", ["sphere", "cone", "cube", "cylinder"]);
      a.submit("p6-perspective", "404");
      a.selectItem("master-key");
    });

    await aimAt(page, { x: 1.5, z: 3.2, yaw: LOOK_SOUTH, pitch: -0.1 }, "exit-door");
    // 選択中アイテムが使える相手なら、照準が ◇ になり F の案内が出る
    await expect(page.locator(".crosshair")).toHaveAttribute("data-state", "use");
    await expect(page.locator(".focus-prompt__keys")).toContainText("F 使う");

    await api(page, (a) => a.pressUseItem());
    await expect
      .poll(async () => (await api(page, (a) => a.getState())).flags.finalTerminalUnlocked, {
        timeout: 10000,
      })
      .toBe(true);
  });
});
