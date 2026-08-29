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
// The panels are native markup, so the preset's classes are the only
// difference: the saved-views panel honors the `views*` keys and comes
// pre-wired below, the same way `DataTable` does. The pivot panel has no keys
// in the class map yet, so unstyled's is still the whole implementation.
export { SavedViewsPanel, type SavedViewsPanelProps } from "./SavedViewsPanel";
export { PivotPanel } from "@adapttable/unstyled";
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
  type CustomCellEditorCtrl,
  type CustomCellEditorRender,
  type EditConflict,
  type EditConflictChoice,
  type EditConflictHandler,
  type EditConflictPolicy,
  type EditConflictState,
  type EditEvent,
  type EditEventHandler,
  type EditLifecycle,
  type EditUnit,
  type ExportCsvOptions,
  FILTER_TYPES,
  type TableQuery,
  type UseServerDataOptions,
  type UseTableDataOptions,
} from "@adapttable/core";
export { type DataModeProps } from "@adapttable/core/adapter";
