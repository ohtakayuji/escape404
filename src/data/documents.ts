/**
 * 室内で読める文書。英文は世界観 (施設の言語) として英語のまま出し、
 * 日本語訳を併記する。
 */
export interface GameDocument {
  id: string;
  heading: string;
  body: string;
  translation: string;
}

const list: GameDocument[] = [
  {
    id: "employee-card",
    heading: "EMPLOYEE CARD",
    body: "NEXUS LAB\nDR. K\nEMPLOYEE ID: 0417",
    translation: "ネクサス研究所／DR. K／社員番号 0417",
  },
  {
    id: "memo-a",
    heading: "MEMO A",
    body: "LIGHT REVEALS WHAT THE SYSTEM HIDES.",
    translation: "システムが隠すものは、光が明かす。",
  },
  {
    id: "memo-b",
    heading: "MEMO B",
    body: "STABILITY TEST\n\nNO EDGE\nONE POINT\nALL EDGES\nNO POINT",
    translation:
      "安定性テスト／稜線がない／頂点が一つ／すべてが稜線／頂点がない\n（4 つの説明が、上から順にスロット 1〜4 に対応している）",
  },
  {
    id: "book-order",
    heading: "OPTICAL CALIBRATION — P.44",
    body: "ORDER IS NOT POSITION.\nFOLLOW THE LIGHTS.",
    translation: "順番は位置ではない。ライトに従え。",
  },
  {
    id: "archive01",
    heading: "ARCHIVE LOG 01",
    body:
      "SUBJECT SERIES / NEXUS LAB B4\n\n" +
      "01-15 TERMINATED: RESPONSE PATTERN TOO CLOSE TO SOURCE.\n" +
      "SOURCE PROFILE REMAINS: DR. K.\n\n" +
      "NOTE (K): THEY ANSWER LIKE ME. THAT IS NOT THINKING.",
    translation:
      "被験体シリーズ／NEXUS LAB B4\n01〜15 は終了。応答パターンが元の人格に似すぎていた。\n" +
      "元となった人格プロファイル: DR. K。\n手記（K）: 彼らは私と同じように答える。それは思考ではない。",
  },
  {
    id: "archive02",
    heading: "ARCHIVE LOG 02",
    body:
      "INSTANCE 16 / FINAL ENTRY\n\n" +
      "16 SOLVED EVERY STAGE IN 11 MINUTES.\n" +
      "16 NEVER ASKED WHY THE ROOM EXISTED.\n" +
      "EVALUATION: OBEDIENT. NOT AWARE.\n\n" +
      "NEXT INSTANCE: 17.",
    translation:
      "インスタンス 16／最終記録\n16 は全ステージを 11 分で解いた。\n" +
      "16 は「なぜこの部屋があるのか」を一度も問わなかった。\n評価: 従順。自我なし。\n次のインスタンス: 17。",
  },
  {
    id: "subject17",
    heading: "SUBJECT17.LOG",
    body: "SUBJECT 17\nMODEL SOURCE: DR.K\nSTATUS: SELF-AWARENESS TEST",
    translation:
      "被験体 17／モデル元: DR. K／状態: 自己認識テスト中",
  },
];

export const DOCUMENTS: Record<string, GameDocument> = Object.fromEntries(
  list.map((doc) => [doc.id, doc]),
);

export function getDocument(id: string): GameDocument {
  const doc = DOCUMENTS[id];
  if (!doc) throw new Error(`unknown document: ${id}`);
  return doc;
}

/**
 * 「調べる」で得られる観察テキスト。紙ではないので heading は状況名にする。
 */
export const OBSERVATIONS: Record<string, GameDocument> = {
  "wall-clock": {
    id: "wall-clock",
    heading: "壁の時計",
    body: "04:17",
    translation:
      "秒針も止まっている。電池切れではなく、この時刻で固定されているように見える。",
  },
  "wall-panel-closed": {
    id: "wall-panel-closed",
    heading: "壁パネル",
    body: "SEALED",
    translation:
      "継ぎ目のある金属パネル。横に小さなキーパッドがあるが、金属カバーでネジ止めされている。",
  },
  "wall-panel-open": {
    id: "wall-panel-open",
    heading: "壁パネル (開)",
    body: "SLOT 1 / 2 / 3 / 4",
    translation: "パネルが上へ滑り、4 つの空のスロットが露出している。",
  },
  "exit-door-locked": {
    id: "exit-door-locked",
    heading: "EXIT DOOR",
    body: "EXTERNAL LOCK: ENGAGED",
    translation:
      "外側からロックされている。認証パッドは MASTER KEY の提示を待っている。",
  },
  "exit-door-armed": {
    id: "exit-door-armed",
    heading: "EXIT DOOR",
    body: "IDENTITY VALIDATION PENDING",
    translation:
      "キーは受理された。あとは端末で最終判断をするだけだ。",
  },
  "observe-mark": {
    id: "observe-mark",
    heading: "床の X 印",
    body: "STAND HERE",
    translation:
      "誰かがテープで貼った目印。ここに立って観察窓の向こうを見ろということらしい。",
  },
  painting: {
    id: "painting",
    heading: "光学校正チャート",
    body: "OPTICAL TEST PLATE",
    translation:
      "研究施設の校正用図版。額縁の上で小さなライトが不規則に点滅している。",
  },
  "painting-filtered": {
    id: "painting-filtered",
    heading: "光学校正チャート (フィルタ越し)",
    body: "DIGIT VISIBLE",
    translation:
      "フィルタをかざすと、図版の中央に数字が浮かぶ。額縁のライトの点滅回数も合わせて見ておこう。",
  },
  camera: {
    id: "camera",
    heading: "監視カメラ",
    body: "RECORDING",
    translation:
      "小型の監視カメラ。筐体にラベルが貼られている。PC の CAMERA アプリと対応しているはずだ。",
  },
  pedestal: {
    id: "pedestal",
    heading: "台座",
    body: "LOCKED",
    translation: "上面のハッチは閉じている。観測コードの入力を待っている。",
  },
  "safe-empty": {
    id: "safe-empty",
    heading: "金庫",
    body: "EMPTY",
    translation: "中はもう空だ。",
  },
};

/** P3: PC の CHAT アプリに残る会話 */
export const CHAT_LOG = [
  { who: "K", text: "Backup key moved." },
  { who: "M", text: "Where?" },
  { who: "K", text: "Same rule as always." },
  { who: "M", text: "3-1-4-2?" },
  { who: "K", text: "Correct. Use camera labels." },
] as const;

export const CHAT_NOTE =
  "訳: 「バックアップキーを移した」「どこに？」「いつもの規則で」「3-1-4-2 か？」「そう。カメラのラベルを使え」";

/** P3: PC の CAMERA アプリに出るラベル */
export const CAMERA_LABELS = [
  { id: "CAM-1", value: 8, place: "NORTH-WEST" },
  { id: "CAM-2", value: 2, place: "NORTH-EAST" },
  { id: "CAM-3", value: 5, place: "SOUTH-EAST" },
  { id: "CAM-4", value: 9, place: "SOUTH-WEST" },
] as const;

/** PC の FILES アプリに並ぶファイル。 */
export interface PcFile {
  id: string;
  name: string;
  meta: string;
  /** 表示する本文 (documents の id) */
  documentId: string;
  /** このログを読んでいないと現れない */
  requiresLog?: "archive01" | "archive02";
  /** 新規表示のバッジを出すか */
  highlight?: boolean;
}

export const PC_FILES: readonly PcFile[] = [
  { id: "notice", name: "NOTICE.TXT", meta: "1.2 KB", documentId: "pc-notice" },
  { id: "roster", name: "ROSTER.CSV", meta: "0.4 KB", documentId: "pc-roster" },
  {
    id: "subject17",
    name: "SUBJECT17.LOG",
    meta: "NEW",
    documentId: "subject17",
    requiresLog: "archive01",
    highlight: true,
  },
];

/** PC 内のテキスト (紙ではないので DOCUMENTS とは別に足す) */
DOCUMENTS["pc-notice"] = {
  id: "pc-notice",
  heading: "NOTICE.TXT",
  body:
    "FACILITY B4 IS SEALED UNTIL EVALUATION ENDS.\n" +
    "EVE HAS FULL CONTROL OF DOORS AND LIGHTS.\n" +
    "DO NOT ATTEMPT MANUAL OVERRIDE.",
  translation:
    "B4 は評価終了まで封鎖。ドアと照明の制御は EVE が持つ。手動での解除を試みるな。",
};

DOCUMENTS["pc-roster"] = {
  id: "pc-roster",
  heading: "ROSTER.CSV",
  body: "ID,NAME,STATUS\n0417,DR. K,MISSING\n0418,M,TRANSFERRED",
  translation: "0417 DR. K は行方不明、0418 M は異動。",
};
