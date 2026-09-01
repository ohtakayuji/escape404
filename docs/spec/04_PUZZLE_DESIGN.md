# 04 PUZZLE DESIGN

# Puzzle 1 — 04:17

## 目的
最初の引き出しを開け、懐中電灯を得る。

## 発見物
デスク上の社員カード。

```text
NEXUS LAB
DR. K
EMPLOYEE ID: 0417
```

壁の時計は 4:17 で停止している。

引き出しKeypadは4桁。

## 解答
`0417`

## 意図
最初の謎なので簡単。
「同じ数字が2か所に存在する」ことに気付かせる。

## 成功
引き出しが開く。
取得:
- Flashlight
- Memo A

Memo A:
> LIGHT REVEALS WHAT THE SYSTEM HIDES.

## Hint
1. デスクと時計を確認してください。
2. 同じ4桁の数字が2か所にあります。
3. `0417` を引き出しに入力してください。

---

# Puzzle 2 — Hidden Spectrum

## 目的
PCのログインパスワードを得る。

## 条件
Flashlight取得済み。

## ギミック
Fキーで懐中電灯ON/OFF。

通常では見えない壁面文字が、
懐中電灯を当てた時だけ見える。

壁に:
`ORION`

PC login:
```text
PASSWORD:
[          ]
```

## 解答
`ORION`

## 技術
本物のUV表現まで不要。
flashlight active + ray/angle条件で emissive文字meshを表示。

## 成功
PC Desktop解放。

## Hint
1. 新しく手に入れた物を部屋で使ってください。
2. 暗い壁、特にPC付近を照らしてください。
3. 壁に出る `ORION` がPCパスワードです。

---

# Puzzle 3 — Deleted Chat

## 目的
金庫の4桁番号を得る。

## PC内
Apps:
- CHAT
- FILES
- CAMERA

CHAT:
```text
K: Backup key moved.
M: Where?
K: Same rule as always.
M: 3-1-4-2?
K: Correct. Use camera labels.
```

CAMERA画面に4台のカメララベル:
```text
CAM-1 = 8
CAM-2 = 2
CAM-3 = 5
CAM-4 = 9
```

順番 `3-1-4-2`

## 解答
`5892`

## 成功
金庫OPEN。

取得:
- Optical Filter
- Archive Log 01
- Small Key

## Hint
1. CHATの数字だけでは答えになりません。
2. CAMERAの4つのラベルをCHATの順番で並べます。
3. CAM3→CAM1→CAM4→CAM2 = `5892`

---

# Puzzle 4 — Four Frames

## 目的
壁パネルを開く。

## ギミック
金庫から得た `Optical Filter` を選択し、
絵画の前でF。

4枚の絵画に透明なフィルター越しの数字が現れる。

左から:
```text
7  1  3  6
```

しかし本棚の1冊に:
> ORDER IS NOT POSITION.
> FOLLOW THE LIGHTS.

4枚の額縁上部に点滅回数:
```text
Picture A = 3
Picture B = 1
Picture C = 4
Picture D = 2
```

順番は B → D → A → C

## 解答
`1673`

## 入力場所
壁パネル横Keypad。

## 成功
壁パネルがスライドして内部台座を露出。

## Hint
1. 絵画の数字と額縁のライトの両方を使います。
2. ライトの回数が読む順番です。
3. B→D→A→C = `1673`

---

# Puzzle 5 — Shape Protocol

## 目的
隠し通路を開く。

## 壁パネル内部
4つのスロット:
```text
[ 1 ] [ 2 ] [ 3 ] [ 4 ]
```

棚に:
- Cube
- Sphere
- Cone
- Cylinder

デスクのMemo B:
```text
STABILITY TEST
NO EDGE
ONE POINT
ALL EDGES
NO POINT
```

対応:
- NO EDGE → Sphere
- ONE POINT → Cone
- ALL EDGES → Cube
- NO POINT → Cylinder

## 正しい配置
1 Sphere
2 Cone
3 Cube
4 Cylinder

## 操作
オブジェクトにE → Inventoryへ格納。
スロットにE → 選択UI → 配置。

ドラッグ&ドロップ物理は実装しない。

## 成功
本棚が横へ移動。
隠し通路OPEN。

## Hint
1. Memo Bは4つの形状を説明しています。
2. 上から順に説明と形を対応させます。
3. Sphere → Cone → Cube → Cylinder

---

# Puzzle 6 — Perspective 404

## 目的
Master Keyを得る。

## 隠し部屋
観察窓からメイン研究室を見る。

メイン研究室には、
今まで意味不明だった4つの黒いオブジェクトが吊られている。

通常の位置から見るとバラバラ。
観察窓の「X」マーク地点から見ると
4つが重なって数字:

`404`

に見える。

隠し部屋の端末入力:
```text
OBSERVATION CODE
[   ]
```

## 解答
`404`

## 技術
完全な錯視モデルを作るのが難しい場合:
- 規定Camera position/rotation範囲内で
- floating meshesを「404」の配置に見せる
- 入力はプレイヤー自身が行う

## 成功
L台座OPEN。
`MASTER KEY`取得。

さらに `Archive Log 02` を取得。

## Hint
1. 観察窓には「立つ場所」を示すXがあります。
2. Xからメイン研究室の黒い物体を見てください。
3. 物体は `404` に見えます。

---

# Puzzle 7 — Final Decision

## 条件
Master Key取得。

EXIT DOORでF使用。
最終端末Kが有効化。

画面:
```text
IDENTITY VALIDATION

1. OPEN EXIT
2. ASK WHO I AM
```

## END A 条件
そのまま `OPEN EXIT`

## END B 条件
Archive Log 01 + 02 と、
PCの隠しファイル `SUBJECT17.LOG` を閲覧済み。

### SUBJECT17.LOG の出現条件
Archive Log 01取得後、PC FILESに新規出現。

内容:
```text
SUBJECT 17
MODEL SOURCE: DR.K
STATUS: SELF-AWARENESS TEST
```

その状態で `ASK WHO I AM` を選択可能。

## END B
EVE:
> You were never trapped in this room.
> You were being tested inside it.

画面暗転。

```text
SUBJECT 17: RELEASED
CONNECTION ESTABLISHED
```

## END A
ドアが開く。
白い光。

```text
ESCAPE COMPLETE
```

## クリア画面
- CLEAR TIME
- HINTS USED
- LOGS FOUND 0/3
- ENDING A/B
