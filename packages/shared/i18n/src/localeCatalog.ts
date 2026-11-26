/**
 * Which presets ship, and which one a locale tag selects. Shared by the
 * synchronous presets and the lazy loader, and holding no dictionary, so a
 * caller that only asks whether a language is bundled loads none.
 */
import { normalizeLocaleTag, resolveLocaleTag } from "@adapttable/core/locale";

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
 * The preset an explicit script selects, by `language-script`: Chinese
 * written in Traditional characters reads the Traditional preset whatever
 * region the tag names.
 */
const SCRIPT_PRESETS: Readonly<Record<string, LocaleKey>> = {
  "zh-hant": "zh-TW",
  "zh-hans": "zh",
};

/** The `language-script` of a tag that names a script, lower-cased. */
function languageScript(normalized: string): string | undefined {
  const [language, script] = normalized.split("-");
  return script !== undefined && /^[a-z]{4}$/.test(script)
    ? `${language}-${script}`
    : undefined;
}

/**
 * The preset a locale selects: its exact tag, then the preset its explicit
 * script names, then its primary subtag. Resolution goes through core's
 * shared resolver, the one per-column `i18n` paths use.
 */
export function resolveLocaleKey(locale: string): LocaleKey | undefined {
  const resolved = resolveLocaleTag(LOCALE_KEYS, locale) as
    LocaleKey | undefined;
  const normalized = normalizeLocaleTag(locale);
  if (resolved !== undefined && normalizeLocaleTag(resolved) === normalized) {
    return resolved;
  }
  const script = languageScript(normalized);
  return (
    (script === undefined ? undefined : SCRIPT_PRESETS[script]) ?? resolved
  );
}

/**
 * Whether a locale has a bundled preset.
 *
 * @public
 */
export function hasLocale(locale: string): boolean {
  return resolveLocaleKey(locale) !== undefined;
}
