/**
 * Text direction.
 *
 * @public
 */
export type Direction = "ltr" | "rtl";

/**
 * Base language codes whose MODERN standard orthography is right-to-left.
 * Matched against the primary subtag of a BCP-47 locale (`"ar-EG"` →
 * `"ar"`). Deliberately script-based and independent of which label
 * presets ship: a Pashto table renders RTL (with English labels until a
 * `ps` preset exists) because its content is RTL either way. Languages
 * written predominantly in Latin script today (e.g. Hausa) are NOT
 * listed — forcing RTL would mirror the whole table wrongly.
 *
 * @public
 */
export const RTL_LANGUAGES = [
  "aii", // Assyrian Neo-Aramaic
  "ar", // Arabic
  "azb", // South Azerbaijani
  "ckb", // Sorani Kurdish
  "dv", // Divehi
  "fa", // Persian
  "he", // Hebrew
  "ks", // Kashmiri
  "pnb", // Western Punjabi (Shahmukhi)
  "ps", // Pashto
  "sd", // Sindhi
  "syr", // Syriac
  "ug", // Uyghur
  "ur", // Urdu
  "yi", // Yiddish
] as const;

/**
 * The primary language subtag of a BCP-47 locale, lower-cased.
 *
 * @public
 */
export function primarySubtag(locale: string): string {
  return locale.toLowerCase().split(/[-_]/, 1).join("");
}

/**
 * ISO 15924 scripts written right-to-left, lower-cased.
 */
const RTL_SCRIPTS: ReadonlySet<string> = new Set([
  "adlm", // Adlam
  "arab", // Arabic
  "hebr", // Hebrew
  "mand", // Mandaic
  "mend", // Mende Kikakui
  "nkoo", // N'Ko
  "rohg", // Hanifi Rohingya
  "samr", // Samaritan
  "syrc", // Syriac
  "thaa", // Thaana
  "yezi", // Yezidi
]);

/** The script subtag a locale names, lower-cased, if it names one. */
function scriptSubtag(locale: string): string | undefined {
  const script = locale.toLowerCase().split(/[-_]/)[1];
  return script !== undefined && /^[a-z]{4}$/.test(script) ? script : undefined;
}

/**
 * Whether a locale is written right-to-left. A tag that names a script is
 * read by its script (`"az-Arab"` is RTL, `"ar-Latn"` is not); one that
 * names none is read by its language.
 *
 * @param locale - A BCP-47 locale such as `"ar"`, `"ar-EG"`, or `"he-IL"`.
 * @returns `true` for RTL locales.
 *
 * @public
 */
export function isRtlLocale(locale: string): boolean {
  const script = scriptSubtag(locale);
  if (script !== undefined) return RTL_SCRIPTS.has(script);
  return (RTL_LANGUAGES as readonly string[]).includes(primarySubtag(locale));
}

/**
 * Resolve the text direction for a locale.
 *
 * @param locale - A BCP-47 locale.
 * @returns `"rtl"` for RTL locales, otherwise `"ltr"`.
 *
 * @public
 */
export function getDirection(locale: string): Direction {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}
