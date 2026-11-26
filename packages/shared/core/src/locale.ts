/**
 * Locale tags — `@adapttable/core/locale`.
 *
 * The one locale-tag resolver every locale-shaped lookup shares, on an entry
 * that loads nothing else: a label package that only needs to pick a
 * language reaches it without the table. Both names are also exported from
 * `@adapttable/core/binding`, from the same source module.
 *
 * @packageDocumentation
 */
export { normalizeLocaleTag, resolveLocaleTag } from "./utils/localeTag";
