/**
 * How a kit paints a cell a patch just changed.
 *
 * `useChangedCellFlash` lives on `@adapttable/core/stream` so a table that
 * never patches never downloads a timer. The host passes `isCellFlashing`
 * in; these helpers turn that answer into the attribute kits already spread
 * the way they spread `data-dirty`, and into the memo digest memoized rows
 * compare — the function itself stays referentially stable while the marks
 * move.
 */

/**
 * Empty string when marked, so a renderer can set `data-flash` or omit it.
 *
 * @param isCellFlashing - The host's reader, or nothing.
 * @param rowId - The row's stable id.
 * @param columnKey - The column whose cell might be marked.
 *
 * @internal
 */
export function cellFlashAttr(
  isCellFlashing: ((rowId: string, columnKey: string) => boolean) | undefined,
  rowId: string,
  columnKey: string
): "" | undefined {
  return isCellFlashing?.(rowId, columnKey) ? "" : undefined;
}

/**
 * Flashing keys for one row, joined. Memoized rows compare this rather than
 * the `isCellFlashing` function, which does not change identity when a mark
 * is added or dropped.
 *
 * @param isCellFlashing - The host's reader, or nothing.
 * @param rowId - The row's stable id.
 * @param columns - The columns that row paints.
 *
 * @internal
 */
export function rowFlashSignature(
  isCellFlashing: ((rowId: string, columnKey: string) => boolean) | undefined,
  rowId: string,
  columns: readonly { readonly key: string }[]
): string {
  if (!isCellFlashing) return "";
  const keys: string[] = [];
  for (const column of columns) {
    if (isCellFlashing(rowId, column.key)) keys.push(column.key);
  }
  return keys.join(",");
}
