import type { ColumnDef, SortByOption } from "../types";

/**
 * Build sort-by select options from sortable columns. On mobile the card
 * layout has no clickable headers, so a "Sort by" select is the only sort
 * affordance — adapters fall back to these when the caller passes no explicit
 * `sortByOptions`.
 *
 * A column contributes an option when it is `sortable` and has a string label
 * (its `header`, else `mobileLabel`). Columns with non-string headers and no
 * `mobileLabel` are skipped — there's nothing to show in the select.
 *
 * @typeParam TRow - The row type.
 * @param columns - The columns to derive from (already layout-filtered).
 * @returns One option per labellable sortable column, in column order.
 *
 * @public
 */
export function deriveSortByOptions<TRow>(
  columns: readonly ColumnDef<TRow>[]
): SortByOption[] {
  const options: SortByOption[] = [];
  for (const column of columns) {
    if (!column.sortable) continue;
    let label: string | undefined;
    if (typeof column.header === "string") label = column.header;
    else if (typeof column.mobileLabel === "string") label = column.mobileLabel;
    if (label !== undefined) options.push({ value: column.key, label });
  }
  return options;
}
