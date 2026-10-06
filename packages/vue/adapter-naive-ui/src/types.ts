import type {
  DataTableClassNames as SharedDataTableClassNames,
  DataTableProps as SharedDataTableProps,
} from "@adapttable/vue/adapter";

/** Naive UI keeps its decorative drawer mask outside its public attribute API. */
export interface DataTableClassNames extends Omit<
  SharedDataTableClassNames,
  "filtersBackdrop"
> {
  readonly filtersBackdrop?: never;
}

/** Query and feature state remain owned by the shared Vue binding. */
export interface DataTableProps<TRow> extends SharedDataTableProps<TRow> {
  readonly classNames?: DataTableClassNames;
}
export type { DataTableSlots } from "@adapttable/vue/adapter";
