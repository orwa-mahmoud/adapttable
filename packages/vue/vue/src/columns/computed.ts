/** The Vue face of core's cached derived-column helper. */
import {
  computed as neutralComputed,
  type ComputedColumnSpec,
  type SortableValue,
} from "@adapttable/core";

import type { ColumnDef } from "../columnDef";
export type { ComputedColumnSpec, SortableValue } from "@adapttable/core";
export interface VueComputedColumnSpec<TRow, TValue> extends Omit<
  ComputedColumnSpec<TRow, TValue>,
  "column"
> {
  readonly column?: Omit<
    ColumnDef<TRow, TValue>,
    | "key"
    | "header"
    | "sortValue"
    | "exportValue"
    | "formatValue"
    | "accessor"
    | "cell"
  >;
}
/** One neutral memo drives value, display, sort and export. @public */
export function computed<TRow extends object, TValue = SortableValue>(
  spec: VueComputedColumnSpec<TRow, TValue>
): ColumnDef<TRow, TValue> {
  const column = neutralComputed<TRow, TValue>({
    key: spec.key,
    header: spec.header,
    deps: spec.deps,
    value: spec.value,
    format: spec.format,
  });
  return {
    ...column,
    ...spec.column,
    accessor: (row) => column.exportValue?.(row) as TValue,
  };
}
export type { ColumnDef } from "../columnDef";
