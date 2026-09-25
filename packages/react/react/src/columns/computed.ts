/**
 * The React face of {@link computedColumn} — a derived column that can sit in
 * a `ColumnDef[]` beside hand-written React columns.
 */
import {
  computed as neutralComputed,
  type ComputedColumnSpec,
  type SortableValue,
} from "@adapttable/core";

import type { ColumnDef } from "../columnDef";

/**
 * How a computed React column is declared.
 *
 * Identical to the neutral spec except that `column` carries React column
 * fields — a narrowed `filter` and `editor`, `headerActions`, `renderHeader`,
 * `renderFooter`. `accessor`, `Cell`, `sortValue`, `exportValue` and
 * `formatValue` stay derived: setting them here is what would let the four
 * surfaces disagree.
 *
 * @public
 */
export interface ReactComputedColumnSpec<TRow, TValue> extends Omit<
  ComputedColumnSpec<TRow, TValue>,
  "column" | "header"
> {
  /** Header content. Omit and the header is derived from `key`. */
  header?: string;
  /** Anything else a React column can be. */
  column?: Omit<
    ColumnDef<TRow>,
    | "key"
    | "header"
    | "sortValue"
    | "exportValue"
    | "formatValue"
    | "accessor"
    | "Cell"
  >;
}

/**
 * Build a derived React column: computed once per row, cached until its
 * declared dependencies change, and consistent across text, sorting and
 * export.
 *
 * `@adapttable/core` exports the same helper typed as a neutral
 * `ColumnModel`, for headless and non-React consumers.
 *
 * @public
 */
export function computed<TRow extends object, TValue = SortableValue>(
  spec: ReactComputedColumnSpec<TRow, TValue>
): ColumnDef<TRow> {
  // The neutral helper copies `spec.column` onto the column it returns and
  // adds only derived fields, so a React-shaped `column` in yields a
  // React-shaped column out. Only the declared type is widened on the way
  // through, which is what this assertion restores.
  return neutralComputed<TRow, TValue>(spec) as ColumnDef<TRow>;
}
