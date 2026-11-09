/** Internal value resolution shared by exports, clipboard and selection stats. */

import type { ColumnMetadata } from "../contracts/columns";
import { getPath } from "../utils/path";
import { defaultCsvValue } from "./csv";

/**
 * A column's own `exportValue` wins, because it exists precisely to say the
 * file should carry something other than the screen. Without one, the default
 * display-value resolution stands.
 */
export function exportCellValue<TRow>(
  row: TRow,
  column: ColumnMetadata<TRow>
): unknown {
  if (column.exportValue) return column.exportValue(row);
  const value = defaultCsvValue(row, column);
  if (value !== "") return value;
  const path = getPath(row, column.key);
  return path instanceof Date && !Number.isNaN(path.getTime()) ? path : value;
}
