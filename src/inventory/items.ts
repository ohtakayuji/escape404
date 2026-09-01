import type { InventoryItemId, ShapeItemId } from "../core/ids";

export interface ItemDef {
  id: InventoryItemId;
  name: string;
  description: string;
  /** インベントリに出す記号 (アイコン画像を持たない代わり) */
  glyph: string;
  /** F キーで使えるか */
  usable: boolean;
  /** 使い方の短い説明 */
  usage?: string;
  consumable: boolean;
}

const list: ItemDef[] = [
  {
    id: "flashlight",
    name: "FLASHLIGHT",
    description:
      "研究室支給の小型ライト。室内灯では見えないものが照らし出せる。",
    glyph: "⌁",
    usable: true,
    usage: "L キーで点灯／消灯",
    consumable: false,
  },
  {
    id: "optical-filter",
    name: "OPTICAL FILTER",
    description:
      "薄い偏光フィルタ。かざした先の塗膜に隠れた印刷が読める。",
    glyph: "◇",
    usable: true,
    usage: "対象の前で F キー",
    consumable: false,
  },
  {
    id: "small-key",
    name: "SMALL KEY",
    description: "小さな六角キー。金属カバーのネジを外せる。",
    glyph: "⚿",
    usable: true,
    usage: "カバーの前で F キー",
    consumable: false,
  },
  {
    id: "sphere",
    name: "SPHERE",
    description: "検査用の樹脂サンプル。稜線も頂点もない。",
    glyph: "●",
    usable: true,
    usage: "スロットに置く",
    consumable: false,
  },
  {
    id: "cone",
    name: "CONE",
    description: "検査用の樹脂サンプル。頂点が一つある。",
    glyph: "▲",
    usable: true,
    usage: "スロットに置く",
    consumable: false,
  },
  {
    id: "cube",
    name: "CUBE",
    description: "検査用の樹脂サンプル。すべての面が稜線で囲まれている。",
    glyph: "■",
    usable: true,
    usage: "スロットに置く",
    consumable: false,
  },
  {
    id: "cylinder",
    name: "CYLINDER",
    description: "検査用の樹脂サンプル。稜線はあるが頂点がない。",
    glyph: "▮",
    usable: true,
    usage: "スロットに置く",
    consumable: false,
  },
  {
    id: "master-key",
    name: "MASTER KEY",
    description: "施設の最上位権限キー。EXIT DOOR の認証に使う。",
    glyph: "✚",
    usable: true,
    usage: "EXIT DOOR の前で F キー",
    consumable: false,
  },
];

export const ITEMS: Record<InventoryItemId, ItemDef> = Object.fromEntries(
  list.map((item) => [item.id, item]),
) as Record<InventoryItemId, ItemDef>;

export const SHAPE_LABELS: Record<ShapeItemId, string> = {
  sphere: "SPHERE",
  cone: "CONE",
  cube: "CUBE",
  cylinder: "CYLINDER",
};

export function getItem(id: InventoryItemId): ItemDef {
  return ITEMS[id];
}
