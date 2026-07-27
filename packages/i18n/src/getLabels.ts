import { resolveLocaleTag, type TableLabels } from "@adapttable/core";

import { ar } from "./locales/ar";
import { de } from "./locales/de";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { fa } from "./locales/fa";
import { fr } from "./locales/fr";
import { he } from "./locales/he";
import { hi } from "./locales/hi";
import { it } from "./locales/it";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { pt } from "./locales/pt";
import { ru } from "./locales/ru";
import { tr } from "./locales/tr";
import { ur } from "./locales/ur";
import { zh } from "./locales/zh";
import { zhTW } from "./locales/zh-TW";

/** The bundled locale presets, keyed by BCP-47 tag (or primary subtag). */
export const locales = {
  en,
  ar,
  de,
  es,
  fa,
  fr,
  he,
  hi,
  it,
  ja,
  ko,
  pt,
  ru,
  tr,
  ur,
  zh,
  "zh-TW": zhTW,
} as const;

/** A key of {@link locales}. */
export type LocaleKey = keyof typeof locales;

/**
 * Resolve a BCP-47 tag to a bundled key through core's SHARED locale
 * resolver — the same rules per-column `i18n` paths use. Iterating
 * `Object.keys` (never the `in` operator) keeps prototype names like
 * `"constructor"` from resolving a preset.
 */
function resolveLocaleKey(locale: string): LocaleKey | undefined {
  return resolveLocaleTag(Object.keys(locales), locale) as
    | LocaleKey
    | undefined;
}

/** Whether a locale has a bundled preset. */
export function hasLocale(locale: string): boolean {
  return resolveLocaleKey(locale) !== undefined;
}

/**
 * Resolve the label preset for a locale. Prefers an exact tag match
 * (e.g. `"zh-TW"` → Traditional Chinese) before the primary subtag
 * (e.g. `"ar-EG"` → Arabic). Falls back to English for unknown locales.
 *
 * @param locale - A BCP-47 locale such as `"en"`, `"ar"`, `"zh-TW"`, or `"ar-EG"`.
 * @returns The matching {@link TableLabels} preset, or English.
 */
export function getLabels(locale: string): Required<TableLabels> {
  const key = resolveLocaleKey(locale);
  return key ? locales[key] : en;
}
