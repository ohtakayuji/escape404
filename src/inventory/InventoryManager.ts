import { addItem, removeItem, type GameState } from "../core/GameState";
import type { InventoryItemId, ShapeItemId } from "../core/ids";
import { SHAPE_ITEM_IDS } from "../core/ids";
import { ITEMS, type ItemDef } from "./items";

/** 所持アイテムと「選択中アイテム」の管理。 */
export class InventoryManager {
  constructor(private readonly state: GameState) {}

  get items(): ItemDef[] {
    return this.state.inventory.map((id) => ITEMS[id]);
  }

  get selected(): ItemDef | null {
    return this.state.selectedItem ? ITEMS[this.state.selectedItem] : null;
  }

  has(id: InventoryItemId): boolean {
    return this.state.inventory.includes(id);
  }

  /** 追加できた場合のみ true (重複取得を防ぐ)。 */
  add(id: InventoryItemId): boolean {
    const added = addItem(this.state, id);
    // 最初に手に入れた使用可能アイテムは自動で選択しておく
    if (added && this.state.selectedItem === null && ITEMS[id].usable) {
      this.state.selectedItem = id;
    }
    return added;
  }

  remove(id: InventoryItemId): boolean {
    return removeItem(this.state, id);
  }

  select(id: InventoryItemId | null): void {
    if (id !== null && !this.has(id)) return;
    this.state.selectedItem = this.state.selectedItem === id ? null : id;
  }

  /** 所持している形状サンプル (スロットに置いていないもの)。 */
  availableShapes(): ShapeItemId[] {
    return SHAPE_ITEM_IDS.filter((id) => this.has(id));
  }
}
