# 07 UI UX

## HUD

### 常時
中央:
Crosshair

右下:
```text
E INTERACT
F USE ITEM
TAB INVENTORY
```
必要時のみ薄く表示。

左下:
選択中アイテム。

### Toast
例:
```text
FLASHLIGHT ACQUIRED
```

表示 2.5秒。

## Start Screen
```text
ESCAPE 404
THE LAST DEVELOPER

[ START ]
[ CONTINUE ]
[ SETTINGS ]
```

Continueはsave存在時のみenable。

## Intro
黒背景。
タイプライター演出。

```text
NEXUS LAB / B4
03:47 AM

SUBJECT 17 ONLINE.
```

Skip可能。

## Inventory
Tab:
半透明overlay。

8 slots程度。

選択:
クリック。
説明表示。

## Keypad
中央モーダル。

```text
┌──────────────┐
│  _ _ _ _     │
│              │
│ 1 2 3        │
│ 4 5 6        │
│ 7 8 9        │
│ C 0 ENTER    │
└──────────────┘
```

キーボード数字入力にも対応。

## PC
フルスクリーン風overlay。

Apps:
- CHAT
- FILES
- CAMERA

実際のOSを再現しすぎない。
謎に必要なUIだけ実装。

## Hint UI
H:
```text
PUZZLE HINT

Hint 1
[SHOW]

Hint 2
[LOCKED]

Hint 3
[LOCKED]
```

Hint 1閲覧後にHint 2開放。
同様に3。

## Accessibility
最低限:
- Mouse sensitivity
- Master volume
- BGM volume
- SFX volume
- Fullscreen
- Crosshair size
- Reduce camera bob
- Motion effects on/off

## Camera Bob
デフォルトはかなり弱くする。
酔い対策のためOFF可能。

## FOV
default 75
settings 65〜90

## 色
無彩色 + 青白い発光。
重要なInteractableだけ微弱なoutline。

常時強い輪郭表示は探索感を壊すので禁止。

## Ending
Clear screen:
```text
ESCAPE COMPLETE

TIME       31:42
HINTS      2
LOGS       3 / 3
ENDING     TRUTH
```
