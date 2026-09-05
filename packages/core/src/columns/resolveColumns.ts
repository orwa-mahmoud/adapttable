import type { ColumnModel } from "../columnModel";
import { resolveLocaleTag } from "../utils/localeTag";

/**
 * The data path a column reads for the active locale: the exact locale tag
 * first (`"ar-EG"`), then its primary subtag (`"ar"`), then the key itself.
 *
 * @public
 */
export function localizedColumnPath(
  column: Pick<ColumnModel<unknown>, "key" | "i18n">,
  locale: string | undefined
): string {
  if (!column.i18n || !locale) return column.key;
  const tag = resolveLocaleTag(Object.keys(column.i18n), locale);
  return (tag !== undefined ? column.i18n[tag] : undefined) ?? column.key;
}
