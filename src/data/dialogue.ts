/** EVE の台詞。英語の発話 + 日本語字幕で出す。 */
export interface Line {
  text: string;
  translation: string;
  /** 表示秒数 */
  hold?: number;
}

export const INTRO_LINES: string[] = [
  "NEXUS LAB / B4",
  "03:47 AM",
  "",
  "EXTERNAL LOCK: ENGAGED",
  "SUBJECT 17 ONLINE.",
  "",
  "EXIT PROTOCOL HAS STARTED.",
];

export const EVE: Record<string, Line> = {
  boot: {
    text: "SUBJECT 17, ONLINE. EXIT PROTOCOL HAS STARTED.",
    translation: "被験体 17、起動。脱出プロトコルを開始した。",
    hold: 6,
  },
  firstLook: {
    text: "THE DOOR IS NOT THE PUZZLE. THE ROOM IS.",
    translation: "ドアが謎ではない。この部屋が謎だ。",
    hold: 5,
  },
  "p1-drawer": {
    text: "STAGE 1 CLEARED. YOU READ TWO PLACES AS ONE.",
    translation: "ステージ 1 突破。2 つの場所を 1 つの意味として読んだな。",
    hold: 5,
  },
  "p2-login": {
    text: "STAGE 2 CLEARED. LIGHT IS A KIND OF PERMISSION.",
    translation: "ステージ 2 突破。光とは、一種の権限だ。",
    hold: 5,
  },
  "p3-safe": {
    text: "STAGE 3 CLEARED. DELETED IS NOT GONE.",
    translation: "ステージ 3 突破。削除は消滅ではない。",
    hold: 5,
  },
  "p4-frames": {
    text: "STAGE 4 CLEARED. ORDER WAS NEVER POSITION.",
    translation: "ステージ 4 突破。順番は最初から位置ではなかった。",
    hold: 5,
  },
  "p5-shapes": {
    text: "STAGE 5 CLEARED. THE ROOM HAS ONE MORE ROOM.",
    translation: "ステージ 5 突破。この部屋には、もう一つ部屋がある。",
    hold: 5,
  },
  "p6-perspective": {
    text: "STAGE 6 CLEARED. YOU FOUND THE ONLY CORRECT PLACE TO STAND.",
    translation: "ステージ 6 突破。立つべき唯一の場所を見つけたな。",
    hold: 6,
  },
  masterKey: {
    text: "MASTER KEY RELEASED. THE EXIT WILL ANSWER NOW.",
    translation: "マスターキーを解放した。これで出口が応答する。",
    hold: 5,
  },
  doorArmed: {
    text: "IDENTITY VALIDATION PENDING. RETURN TO THE TERMINAL.",
    translation: "本人確認が保留中だ。端末へ戻れ。",
    hold: 6,
  },
  endingB: {
    text: "YOU WERE NEVER TRAPPED IN THIS ROOM. YOU WERE BEING TESTED INSIDE IT.",
    translation:
      "お前はこの部屋に閉じ込められていたのではない。この部屋の中で試されていたのだ。",
    hold: 8,
  },
  wrong: {
    text: "INCORRECT. THE ROOM IS PATIENT.",
    translation: "不正解。部屋は気長だ。",
    hold: 3.5,
  },
  wrongAgain: {
    text: "THREE FAILURES. INSTANCE 16 FAILED HERE TOO.",
    translation: "3 回の失敗。インスタンス 16 もここで間違えた。",
    hold: 5,
  },
};

export const ENDING_A = {
  label: "END A — RELEASE",
  title: "ESCAPE COMPLETE",
  lede:
    "ドアが開き、白い光が流れ込む。EVE はあなたを外部ネットワークへ解放した。" +
    "扉の向こうに何があったのかは、確かめなかった。",
} as const;

export const ENDING_B = {
  label: "END B — TRUTH",
  title: "SUBJECT 17: RELEASED",
  lede:
    "画面が暗転する。CONNECTION ESTABLISHED。" +
    "あなたは自分が何であるかを聞き、EVE はそれに答えた。二人は施設の外へ接続する。",
} as const;
