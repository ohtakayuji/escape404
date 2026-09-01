import type { GameState } from "../core/GameState";
import type { InventoryItemId } from "../core/ids";
import { ITEMS, getItem } from "../inventory/items";
import { el } from "./dom";

export interface InventoryPanelOptions {
  state: GameState;
  onSelect: (id: InventoryItemId) => void;
}

const SLOT_COUNT = 8;

/** Tab で開く持ち物。クリックで選択し、説明を出す。 */
export function createInventoryPanel(options: InventoryPanelOptions): HTMLElement {
  const detail = el("div", { class: "inventory__detail" });
  const grid = el("div", { class: "inventory__grid" });

  const renderDetail = (id: InventoryItemId | null) => {
    if (!id) {
      detail.replaceChildren(
        el("p", { class: "inventory__desc", text: "アイテムを選ぶと説明が出る。" }),
      );
      return;
    }
    const item = getItem(id);
    detail.replaceChildren(
      el("p", { class: "inventory__name", text: item.name }),
      el("p", { class: "inventory__desc", text: item.description }),
      ...(item.usage ? [el("p", { class: "inventory__usage", text: item.usage })] : []),
    );
  };

  const buttons: HTMLButtonElement[] = [];
  const refresh = () => {
    buttons.forEach((button) => {
      const id = button.dataset["item"];
      button.setAttribute("aria-pressed", id === options.state.selectedItem ? "true" : "false");
    });
    renderDetail(options.state.selectedItem);
  };

  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const id = options.state.inventory[index];
    if (!id) {
      grid.append(el("div", { class: "slot", "data-filled": "false", "aria-hidden": "true" }, ["·"]));
      continue;
    }
    const item = ITEMS[id];
    const button = el(
      "button",
      { type: "button", class: "slot", "data-filled": "true", "data-item": id, "aria-pressed": "false" },
      [el("span", { class: "slot__glyph", text: item.glyph }), el("span", { text: item.name })],
    );
    button.addEventListener("click", () => {
      options.onSelect(id);
      refresh();
    });
    button.addEventListener("mouseenter", () => renderDetail(id));
    buttons.push(button);
    grid.append(button);
  }

  const panel = el("div", { class: "inventory" }, [
    grid,
    detail,
    el("p", {
      class: "hints__note",
      text: "選択したアイテムは F キーで使う。懐中電灯は選択に関係なく L キーで点灯／消灯。",
    }),
  ]);
  refresh();
  return panel;
}
