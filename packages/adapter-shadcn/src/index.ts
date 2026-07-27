/**
 * `@adapttable/shadcn` — AdaptTable pre-styled with shadcn/ui.
 *
 * Re-exports the full `@adapttable/unstyled` surface (the headless engine,
 * source builders, hooks, and types) so this is a complete one-stop import; the
 * local `DataTable` below shadows the unstyled one with the shadcn preset baked
 * in.
 */
export { shadcnClassNames } from "./classNames";
export { DataTable } from "./DataTable";
export * from "@adapttable/unstyled";

/* Completed public surface (v2): every type a consumer's own code
   needs — CSV options, column layout, cell editors, tier props —
   without ever depending on @adapttable/core directly. */
export {
  type BaseDataTableProps,
  type BulkActionContext,
  type CellEditor,
  type ChipLabelResolver,
  type ColumnFilter,
  type ColumnLayoutState,
  type DataModeProps,
  type ExportCsvOptions,
  FILTER_TYPES,
  type TableQuery,
  type UseServerDataOptions,
  type UseTableDataOptions,
} from "@adapttable/core";
