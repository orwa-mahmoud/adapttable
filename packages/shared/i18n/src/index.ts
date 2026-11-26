/**
 * `@adapttable/i18n` — locale membership, direction and on-demand labels.
 *
 * Importing this entry adds no label data: `loadLabels` fetches one
 * language's chunk the first time it is asked for. The synchronous catalog of
 * all 20 languages is `@adapttable/i18n/catalog`, and each language alone is
 * `@adapttable/i18n/locales/<tag>`.
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
export { loadLabels } from "./loadLabels";
export { hasLocale, type LocaleKey } from "./localeCatalog";
