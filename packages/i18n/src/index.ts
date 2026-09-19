/**
 * `@adapttable/i18n` — locale presets and RTL helpers for AdaptTable.
 *
 * Bundles ready label sets for 17 languages (English, Arabic, German,
 * Spanish, Persian, French, Hebrew, Hindi, Italian, Japanese, Korean,
 * Portuguese, Russian, Turkish, Urdu, Simplified Chinese, Traditional
 * Chinese) plus direction utilities, so consumers get multilingual +
 * right-to-left support without wiring an i18n library. The core stays
 * i18n-agnostic; this package is purely optional.
 *
 * @packageDocumentation
 */

export {
  type Direction,
  getDirection,
  isRtlLocale,
  primarySubtag,
  RTL_LANGUAGES,
} from "./direction";
export { getLabels, hasLocale, type LocaleKey, locales } from "./getLabels";
export { ar } from "./locales/ar";
export { de } from "./locales/de";
export { en } from "./locales/en";
export { es } from "./locales/es";
export { fa } from "./locales/fa";
export { fr } from "./locales/fr";
export { he } from "./locales/he";
export { hi } from "./locales/hi";
export { it } from "./locales/it";
export { ja } from "./locales/ja";
export { ko } from "./locales/ko";
export { pl } from "./locales/pl";
export { pt } from "./locales/pt";
export { ru } from "./locales/ru";
export { tr } from "./locales/tr";
export { ur } from "./locales/ur";
export { zh } from "./locales/zh";
export { zhTW } from "./locales/zh-TW";
