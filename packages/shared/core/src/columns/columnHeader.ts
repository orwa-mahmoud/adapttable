import type { ColumnMetadata } from "../contracts/columns";
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
