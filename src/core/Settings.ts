export interface Settings {
  mouseSensitivity: number; // 0.4 - 2.0 の倍率
  fov: number; // 65 - 90
  crosshairSize: number; // px
  cameraBob: boolean;
  motionEffects: boolean;
  masterVolume: number; // 0 - 1
  bgmVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export const SETTINGS_KEY = "escape404-settings-v1";

export const DEFAULT_SETTINGS: Settings = {
  mouseSensitivity: 1,
  fov: 75,
  crosshairSize: 16,
  cameraBob: true,
  motionEffects: true,
  masterVolume: 0.7,
  bgmVolume: 0.5,
  sfxVolume: 0.8,
  muted: false,
};

const RANGES: Record<string, [number, number]> = {
  mouseSensitivity: [0.4, 2],
  fov: [65, 90],
  crosshairSize: [10, 32],
  masterVolume: [0, 1],
  bgmVolume: [0, 1],
  sfxVolume: [0, 1],
};

export function normalizeSettings(raw: unknown): Settings {
  const next: Settings = { ...DEFAULT_SETTINGS };
  if (typeof raw !== "object" || raw === null) return next;
  const data = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = data[key];
    const range = RANGES[key];
    if (range && typeof value === "number" && Number.isFinite(value)) {
      (next[key] as number) = Math.min(range[1], Math.max(range[0], value));
    } else if (!range && typeof value === "boolean") {
      (next[key] as boolean) = value;
    }
  }
  return next;
}

export function loadSettings(): Settings {
  try {
    const text = globalThis.localStorage?.getItem(SETTINGS_KEY);
    return text ? normalizeSettings(JSON.parse(text)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* 保存できなくてもプレイは継続できる */
  }
}
