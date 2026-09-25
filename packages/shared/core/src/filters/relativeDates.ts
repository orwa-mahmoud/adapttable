/**
 * Relative date tokens. The URL and Saved Views store the token, never a
 * resolved calendar day — "last 7 days" stays the last 7 days tomorrow.
 * {@link resolveRelativeRange} is the only place a token becomes a window.
 */

const DAY_MS = 86_400_000;
const END_OF_DAY_MS = DAY_MS - 1;

/**
 * Named windows that need no extra number.
 *
 * @public
 */
export const RELATIVE_NAMED = [
  "today",
  "yesterday",
  "tomorrow",
  "thisWeek",
  "thisMonth",
  "previousMonth",
] as const;

/**
 * A stored relative-date token (`last:7`, `today`, …).
 *
 * @public
 */
export type RelativeDateToken =
  (typeof RELATIVE_NAMED)[number] | `last:${number}` | `next:${number}`;

/**
 * Inclusive local-time window a token resolves to.
 *
 * @public
 */
export interface RelativeDateRange {
  /** Start of the range, inclusive, in epoch milliseconds. */
  startMs: number;
  /** End of the range, exclusive, in epoch milliseconds. */
  endMs: number;
}

const NAMED = new Set<string>(RELATIVE_NAMED);

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfDay(day: Date): number {
  return day.getTime() + END_OF_DAY_MS;
}

function addDays(day: Date, days: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);
}

/** Monday 00:00 of the week that contains `now` (ISO week). */
function startOfIsoWeek(now: Date): Date {
  const day = startOfDay(now);
  const weekday = day.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(day, mondayOffset);
}

/**
 * Parse a stored token. Unknown strings (including ISO dates) return
 * `undefined` so a historical absolute bound is never treated as relative.
 *
 * @public
 */
export function parseRelativeToken(
  raw: string | undefined
): RelativeDateToken | undefined {
  if (raw == null || raw === "") return undefined;
  if (NAMED.has(raw)) return raw as RelativeDateToken;
  const counted = /^(last|next):(\d+)$/.exec(raw);
  if (!counted) return undefined;
  const n = Number(counted[2]);
  if (!Number.isInteger(n) || n < 1) return undefined;
  return `${counted[1] as "last" | "next"}:${n}`;
}

/**
 * True when `raw` is a relative token, not an absolute date.
 *
 * @public
 */
export function isRelativeDateToken(raw: string | undefined): boolean {
  return parseRelativeToken(raw) !== undefined;
}

function namedRange(
  token: (typeof RELATIVE_NAMED)[number],
  now: Date
): RelativeDateRange {
  const today = startOfDay(now);
  if (token === "today") {
    return { startMs: today.getTime(), endMs: endOfDay(today) };
  }
  if (token === "yesterday") {
    const day = addDays(today, -1);
    return { startMs: day.getTime(), endMs: endOfDay(day) };
  }
  if (token === "tomorrow") {
    const day = addDays(today, 1);
    return { startMs: day.getTime(), endMs: endOfDay(day) };
  }
  if (token === "thisWeek") {
    const start = startOfIsoWeek(now);
    return { startMs: start.getTime(), endMs: endOfDay(addDays(start, 6)) };
  }
  if (token === "thisMonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startMs: start.getTime(), endMs: endOfDay(end) };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { startMs: start.getTime(), endMs: endOfDay(end) };
}

/**
 * Resolve a token against `now` (defaults to the current instant). The
 * frontend predicate and the server query path must both call this so a
 * shared link and a live table agree.
 *
 * @public
 */
export function resolveRelativeRange(
  raw: string | undefined,
  now: number | Date = Date.now()
): RelativeDateRange | undefined {
  const token = parseRelativeToken(raw);
  if (!token) return undefined;
  const instant = now instanceof Date ? now : new Date(now);
  if (token.startsWith("last:")) {
    const n = Number(token.slice(5));
    const today = startOfDay(instant);
    const start = addDays(today, -(n - 1));
    return { startMs: start.getTime(), endMs: endOfDay(today) };
  }
  if (token.startsWith("next:")) {
    const n = Number(token.slice(5));
    const today = startOfDay(instant);
    const end = addDays(today, n - 1);
    return { startMs: today.getTime(), endMs: endOfDay(end) };
  }
  return namedRange(token as (typeof RELATIVE_NAMED)[number], instant);
}

/**
 * Build a counted token (`last:7`). `n` below 1 becomes 1.
 *
 * @public
 */
export function countedRelativeToken(
  kind: "last" | "next",
  n: number
): RelativeDateToken {
  const count = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  return `${kind}:${count}`;
}

const NAMED_LABEL_KEYS = {
  today: "relToday",
  yesterday: "relYesterday",
  tomorrow: "relTomorrow",
  thisWeek: "relThisWeek",
  thisMonth: "relThisMonth",
  previousMonth: "relPreviousMonth",
} as const;

/**
 * Named window or a counted last/next kind (the N lives beside the select).
 *
 * @public
 */
export type RelativePreset = (typeof RELATIVE_NAMED)[number] | "last" | "next";

/**
 * Presets offered by the relative-date widget, in display order.
 *
 * @public
 */
export const RELATIVE_PRESETS: readonly RelativePreset[] = [
  ...RELATIVE_NAMED,
  "last",
  "next",
];

/**
 * `TableLabels` key for each relative preset.
 *
 * @public
 */
export const RELATIVE_PRESET_LABEL_KEYS = {
  /** Today, midnight to midnight. */
  today: "relToday",
  /** The day before today. */
  yesterday: "relYesterday",
  /** The day after today. */
  tomorrow: "relTomorrow",
  /** The current week. */
  thisWeek: "relThisWeek",
  /** The current calendar month. */
  thisMonth: "relThisMonth",
  /** The month before this one. */
  previousMonth: "relPreviousMonth",
  /** The last N days, weeks or months up to now. */
  last: "relLastN",
  /** The next N days, weeks or months from now. */
  next: "relNextN",
} as const;

/**
 * Split a stored token into the widget's preset + N (N defaults to 7).
 *
 * @public
 */
export function splitRelativeToken(raw: string): {
  preset: RelativePreset;
  n: number;
} {
  const token = parseRelativeToken(raw);
  if (token?.startsWith("last:")) {
    return { preset: "last", n: Number(token.slice(5)) };
  }
  if (token?.startsWith("next:")) {
    return { preset: "next", n: Number(token.slice(5)) };
  }
  if (token && NAMED.has(token)) {
    return { preset: token as (typeof RELATIVE_NAMED)[number], n: 7 };
  }
  return { preset: "today", n: 7 };
}

/**
 * Join a widget preset + N back into the stored token.
 *
 * @public
 */
export function joinRelativeToken(
  preset: RelativePreset,
  n: number
): RelativeDateToken {
  if (preset === "last" || preset === "next") {
    return countedRelativeToken(preset, n);
  }
  return preset;
}

/**
 * Chip / select wording for a stored token.
 *
 * @public
 */
export function relativeTokenLabel(
  raw: string,
  labels: {
    relToday: string;
    relYesterday: string;
    relTomorrow: string;
    relThisWeek: string;
    relThisMonth: string;
    relPreviousMonth: string;
    relLastN: string;
    relNextN: string;
  }
): string {
  const token = parseRelativeToken(raw);
  if (!token) return raw;
  if (token.startsWith("last:")) {
    return labels.relLastN.replace(/\bN\b/, token.slice(5));
  }
  if (token.startsWith("next:")) {
    return labels.relNextN.replace(/\bN\b/, token.slice(5));
  }
  return labels[NAMED_LABEL_KEYS[token as keyof typeof NAMED_LABEL_KEYS]];
}
