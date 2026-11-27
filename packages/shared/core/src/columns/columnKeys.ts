/**
 * Column key checks every binding runs on the columns a table declares.
 */
import { devWarn } from "../utils/devWarn";

/**
 * Warn in development about each column key declared more than once.
 * Sorting, selection and column layout target columns by key, so a repeated
 * key breaks them without an error.
 *
 * @param columns - The table's resolved columns.
 *
 * @public
 */
export function warnDuplicateColumnKeys(
  columns: readonly { readonly key: string }[]
): void {
  const seen = new Set<string>();
  for (const { key } of columns) {
    if (seen.has(key)) {
      devWarn(
        `duplicate column key "${key}" — column keys must be unique; sorting, selection, and column layout all target keys.`
      );
    }
    seen.add(key);
  }
}
