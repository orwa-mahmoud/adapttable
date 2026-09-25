import type { ColumnMetadata } from "../columnModel";
import { humanizeKey } from "../utils/humanizeKey";

/**
 * Default header caption: the explicit string header, else a humanized key.
 *
 * @public
 */
export function columnHeaderLabel<TRow>(column: ColumnMetadata<TRow>): string {
  if (typeof column.header === "string") return column.header;
  return humanizeKey(column.key);
}
