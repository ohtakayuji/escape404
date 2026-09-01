# 06 INTERACTION SPEC

## FPS Controller

### Pointer Lock
ゲーム画面クリックでPointer Lock。

解除:
ESC。

Pointer Lock解除時はPause Menuを表示。

## 移動
- WASD
- Sprintなし
- Jumpなし
- Accelerationあり
- 即時停止ではなく軽い減速

推奨値:
```text
walkSpeed = 3.2 m/s
acceleration = 18
deceleration = 22
mouseSensitivity = 0.002
```

## Collision
Player collider:
capsule相当。

推奨:
radius 0.35m
height 1.75m
eye height 1.62m

今回は段差・階段なし。

## Interaction Ray
Camera centerからraycast。

maxDistance:
2.2m

Interactableにヒット:
```text
[E] 調べる
```

Item usable:
```text
[F] 使用
```

## 優先順位
同一直線上に複数objectがある場合:
最も近いinteractableのみ。

装飾meshはInteraction Layerから除外。

## Crosshair State
通常:
`+`

操作可能:
`○`

使用可能:
`◇`

色だけに依存しない。

## モーダル
Keypad / PC / Memoを開いている間:
- FPS movement disabled
- mouse look disabled
- Pointer Lock解除
- UI操作へ切替

閉じる:
ESC / Close button

閉じた後:
ユーザークリックでPointer Lock再取得。
ブラウザ制約上、自動Pointer Lockは禁止。

## Door
ドアは瞬間移動ではなく、
0.8〜1.2秒の回転アニメーション。

Player colliderと干渉しないよう、
開閉中はinteraction lock。

## Drawer
Translate animation 0.5秒。

## Pick Up
E押下:
- object meshをsceneからhide
- inventoryへ追加
- toast表示
- SFX再生

## Shape Placement
自由物理配置はしない。

スロットをE:
1. Inventory内の対象Shape一覧を表示
2. 選択
3. slot positionへsnap
4. state保存

## Flashlight
FでON/OFF。
selectedItemでなくても、
一度取得後はFをFlashlight toggleに割り当ててもよい。

Optical Filterとの競合を避けるため推奨:
- `L` = Flashlight toggle
- `F` = selected item use

最終採用:
- L: flashlight
- F: selected item
