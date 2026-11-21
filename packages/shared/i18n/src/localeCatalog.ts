/**
 * Which presets ship, and which one a locale tag selects. Shared by the
 * synchronous presets and the lazy loader, and holding no dictionary, so a
 * caller that only asks whether a language is bundled loads none.
 */
import { resolveLocaleTag } from "@adapttable/core/locale";

/**
 * A key of the bundled presets: a BCP-47 tag, or a primary subtag.
 *
 * @public
 */
export type LocaleKey =
  | "en"
  | "ar"
  | "cs"
  | "de"
  | "es"
  | "fa"
  | "fr"
  | "he"
  | "hi"
  | "id"
  | "it"
  | "ja"
  | "ko"
  | "pl"
  | "pt"
  | "ru"
  | "tr"
  | "ur"
  | "zh"
  | "zh-TW";

/** Every key once: the record type rejects a missing or an unknown one. */
const CATALOG: Readonly<Record<LocaleKey, true>> = {
  en: true,
  ar: true,
  cs: true,
  de: true,
  es: true,
  fa: true,
  fr: true,
  he: true,
  hi: true,
  id: true,
  it: true,
  ja: true,
  ko: true,
  pl: true,
  pt: true,
  ru: true,
  tr: true,
  ur: true,
  zh: true,
  "zh-TW": true,
};

const LOCALE_KEYS = Object.keys(CATALOG) as LocaleKey[];

/**
 * The preset a locale selects: its exact tag, then its primary subtag.
 * Resolution goes through core's shared resolver, the one per-column `i18n`
 * paths use.
 */
export function resolveLocaleKey(locale: string): LocaleKey | undefined {
  return resolveLocaleTag(LOCALE_KEYS, locale) as LocaleKey | undefined;
}

/**
 * Whether a locale has a bundled preset.
 *
 * @public
 */
export function hasLocale(locale: string): boolean {
  return resolveLocaleKey(locale) !== undefined;
}
