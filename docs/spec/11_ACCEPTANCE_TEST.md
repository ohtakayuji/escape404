# 11 ACCEPTANCE TEST

# Completion Definition
以下を全て満たしたら完成。

## Boot
- [ ] STARTで新規ゲーム開始
- [ ] CONTINUEで復帰
- [ ] RESET可能
- [ ] WebGLエラー時に説明表示

## FPS
- [ ] WASD
- [ ] Mouse look
- [ ] Pointer Lock
- [ ] Collision
- [ ] 壁抜けなし
- [ ] 家具に埋まらない
- [ ] ESCでPause

## Interaction
- [ ] Eで調査
- [ ] Raycast距離制限
- [ ] 対象外objectにpromptなし
- [ ] Pickup重複なし
- [ ] Door animation中の二重操作なし

## Inventory
- [ ] Tab開閉
- [ ] item選択
- [ ] item use
- [ ] save/reload維持

## Puzzles
- [ ] P1 0417
- [ ] P2 ORION
- [ ] P3 5892
- [ ] P4 1673
- [ ] P5 Sphere/Cone/Cube/Cylinder
- [ ] P6 404
- [ ] P7 Ending selection

## Dependencies
- [ ] FlashlightなしでP2突破不可
- [ ] PC unlock前にP3情報不可
- [ ] Safe前にOptical Filter不可
- [ ] P4前にShape slots不可
- [ ] P5前にHidden Room不可
- [ ] P6前にMaster Key不可

## Ending
- [ ] Ending A常に成立
- [ ] Ending Bはlog条件必須
- [ ] Clear Time表示
- [ ] Hint Count表示
- [ ] Logs Count表示

## UI
- [ ] 1920x1080
- [ ] 1440x900
- [ ] resize対応
- [ ] keypad keyboard input
- [ ] modal閉じる
- [ ] Pointer Lock復帰方法が明確

## Performance
- [ ] target browserで30fps以上
- [ ] consoleに大量errorなし
- [ ] asset 404なし
- [ ] build warningを可能な限り解消

## Playtest
最低3人。

記録:
- Clear time
- 詰まったPuzzle
- Hint使用
- 操作で迷った箇所
- 酔い
- バグ

### 調整基準
3人中2人以上が同じ場所で5分以上停止:
Puzzle hint/視線誘導を修正。

3人中2人以上が同じUI操作を誤解:
UIを修正。
