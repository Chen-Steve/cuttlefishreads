import type { CSSProperties } from "react";

export type ReaderFontFamily =
  | "default"
  | "literata"
  | "lora"
  | "merriweather"
  | "georgia"
  | "inter"
  | "open-sans"
  | "noto-sans";

export type ReaderBackground =
  | "default"
  | "paper"
  | "sepia"
  | "cream"
  | "mint"
  | "gray"
  | "dusk"
  | "night";

export type ReaderSettings = {
  /** Font size in px. */
  fontSize: number;
  fontFamily: ReaderFontFamily;
  /** Unitless line-height multiplier. */
  lineSpacing: number;
  /** Space between paragraphs in rem. */
  paragraphSpacing: number;
  background: ReaderBackground;
};

export const READER_SETTINGS_STORAGE_KEY = "cf-reader-settings";

export const FONT_SIZE_RANGE = { min: 12, max: 24, step: 1 } as const;
export const LINE_SPACING_RANGE = { min: 1.2, max: 2.4, step: 0.1 } as const;
export const PARAGRAPH_SPACING_RANGE = {
  min: 0.25,
  max: 2.5,
  step: 0.25,
} as const;

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 17,
  fontFamily: "default",
  lineSpacing: 1.8,
  paragraphSpacing: 1.25,
  background: "default",
};

export const FONT_FAMILY_OPTIONS: {
  value: ReaderFontFamily;
  label: string;
  css: string;
}[] = [
  { value: "default", label: "National Park (default)", css: "var(--font-sans)" },
  {
    value: "literata",
    label: "Literata",
    css: "var(--font-literata), Georgia, serif",
  },
  { value: "lora", label: "Lora", css: "var(--font-lora), Georgia, serif" },
  {
    value: "merriweather",
    label: "Merriweather",
    css: "var(--font-merriweather), Georgia, serif",
  },
  {
    value: "georgia",
    label: "Georgia",
    css: 'Georgia, "Times New Roman", serif',
  },
  { value: "inter", label: "Inter", css: "var(--font-inter), system-ui, sans-serif" },
  {
    value: "open-sans",
    label: "Open Sans",
    css: "var(--font-open-sans), system-ui, sans-serif",
  },
  {
    value: "noto-sans",
    label: "Noto Sans",
    css: "var(--font-noto-sans), system-ui, sans-serif",
  },
];

export const BACKGROUND_OPTIONS: {
  value: ReaderBackground;
  label: string;
  swatch: string;
  background: string;
  color: string;
}[] = [
  {
    value: "default",
    label: "Default",
    swatch: "var(--background)",
    background: "transparent",
    color: "color-mix(in srgb, var(--foreground) 90%, transparent)",
  },
  {
    value: "paper",
    label: "Paper",
    swatch: "#ffffff",
    background: "#ffffff",
    color: "#2a2a2a",
  },
  {
    value: "sepia",
    label: "Sepia",
    swatch: "#f4ecd8",
    background: "#f4ecd8",
    color: "#5c4b37",
  },
  {
    value: "cream",
    label: "Cream",
    swatch: "#fbf3e4",
    background: "#fbf3e4",
    color: "#4a4033",
  },
  {
    value: "mint",
    label: "Mint",
    swatch: "#e8f2e8",
    background: "#e8f2e8",
    color: "#31463b",
  },
  {
    value: "gray",
    label: "Gray",
    swatch: "#e3e3e3",
    background: "#e3e3e3",
    color: "#2e2e2e",
  },
  {
    value: "dusk",
    label: "Dusk",
    swatch: "#2b2f3a",
    background: "#2b2f3a",
    color: "#c5cad6",
  },
  {
    value: "night",
    label: "Night",
    swatch: "#121212",
    background: "#121212",
    color: "#c9c9c9",
  },
];

function fontFamilyCss(value: ReaderFontFamily): string {
  return (
    FONT_FAMILY_OPTIONS.find((o) => o.value === value)?.css ??
    "var(--font-sans)"
  );
}

function backgroundOption(value: ReaderBackground) {
  return (
    BACKGROUND_OPTIONS.find((o) => o.value === value) ?? BACKGROUND_OPTIONS[0]
  );
}

export function readerContentStyle(settings: ReaderSettings): CSSProperties {
  const bg = backgroundOption(settings.background);
  return {
    fontSize: `${settings.fontSize}px`,
    fontFamily: fontFamilyCss(settings.fontFamily),
    lineHeight: settings.lineSpacing,
    gap: `${settings.paragraphSpacing}rem`,
    backgroundColor: bg.background,
    color: bg.color,
  };
}

export function clampToRange(
  value: number,
  range: { min: number; max: number; step: number },
): number {
  if (!Number.isFinite(value)) return NaN;
  const clamped = Math.min(range.max, Math.max(range.min, value));
  const steps = Math.round((clamped - range.min) / range.step);
  // Round to the step grid and kill float noise (e.g. 1.7000000000000002).
  return Number((range.min + steps * range.step).toFixed(2));
}

function sanitizeNumber(
  value: unknown,
  range: { min: number; max: number; step: number },
  fallback: number,
): number {
  if (typeof value !== "number") return fallback;
  const clamped = clampToRange(value, range);
  return Number.isNaN(clamped) ? fallback : clamped;
}

/** Sanitize per field so unknown/legacy values degrade to defaults. */
export function parseReaderSettings(raw: string | null): ReaderSettings {
  if (!raw) return DEFAULT_READER_SETTINGS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
  if (!parsed || typeof parsed !== "object") return DEFAULT_READER_SETTINGS;
  const v = parsed as Record<string, unknown>;

  return {
    fontSize: sanitizeNumber(
      v.fontSize,
      FONT_SIZE_RANGE,
      DEFAULT_READER_SETTINGS.fontSize,
    ),
    fontFamily: FONT_FAMILY_OPTIONS.some((o) => o.value === v.fontFamily)
      ? (v.fontFamily as ReaderFontFamily)
      : DEFAULT_READER_SETTINGS.fontFamily,
    lineSpacing: sanitizeNumber(
      v.lineSpacing,
      LINE_SPACING_RANGE,
      DEFAULT_READER_SETTINGS.lineSpacing,
    ),
    paragraphSpacing: sanitizeNumber(
      v.paragraphSpacing,
      PARAGRAPH_SPACING_RANGE,
      DEFAULT_READER_SETTINGS.paragraphSpacing,
    ),
    background: BACKGROUND_OPTIONS.some((o) => o.value === v.background)
      ? (v.background as ReaderBackground)
      : DEFAULT_READER_SETTINGS.background,
  };
}
