import type { GameState } from "../core/GameState";
import type { ShapeItemId } from "../core/ids";
import { SHAPE_LABELS, getItem } from "../inventory/items";
import { el } from "./dom";

export interface ShapePanelOptions {
  slotIndex: number;
  state: GameState;
  available: ShapeItemId[];
  onPlace: (shape: ShapeItemId) => void;
  onClear: () => void;
}

/**
 * スロットへの配置 UI。
 * 物理でのドラッグ配置はせず、持っている形状から選ぶ方式 (仕様通り)。
 */
export function createShapePanel(options: ShapePanelOptions): HTMLElement {
  const placed = options.state.shapeSlots[options.slotIndex];
  const children: HTMLElement[] = [
    el("p", { class: "hints__puzzle", text: `SLOT ${options.slotIndex + 1}` }),
  ];

  if (placed) {
    children.push(
      el("p", { class: "inventory__desc", text: `${SHAPE_LABELS[placed]} が置かれている。` }),
    );
    const remove = el("button", { type: "button", class: "btn btn--danger", text: "取り出す" });
    remove.addEventListener("click", () => options.onClear());
    children.push(remove);
    return el("div", { class: "inventory" }, children);
  }

  if (options.available.length === 0) {
    children.push(
      el("p", {
        class: "inventory__desc",
        text: "置ける形状サンプルを持っていない。棚を確認する。",
      }),
    );
    return el("div", { class: "inventory" }, children);
  }

  const grid = el("div", { class: "inventory__grid" });
  for (const shape of options.available) {
    const item = getItem(shape);
    const button = el("button", { type: "button", class: "slot", "data-filled": "true" }, [
      el("span", { class: "slot__glyph", text: item.glyph }),
      el("span", { text: item.name }),
    ]);
    button.addEventListener("click", () => options.onPlace(shape));
    grid.append(button);
  }
  children.push(grid);
  return el("div", { class: "inventory" }, children);
}
