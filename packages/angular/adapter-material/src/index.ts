/**
 * `@adapttable/angular-material` — the Angular table drawn with Material controls
 * over `@adapttable/angular`, with host-owned Material theming.
 *
 * Feature factories live on secondary entries (`bulk-actions`, `filters`,
 * …); import them from those paths or from `@adapttable/angular-material/features`.
 *
 * @packageDocumentation
 */
export { AdaptFilterChips } from "./components/activeFilterChips";
export { AdaptAutoFilterForm } from "./components/autoFilterForm";
export { AdaptBulkBar } from "./components/bulkActionBar";
export {
  AdaptColumnGroupButton,
  AdaptColumnGroupToggle,
} from "./components/columnGroupToggle";
export { AdaptColumnHeaderRename } from "./components/columnHeaderRename";
export { AdaptColumnMenu } from "./components/columnMenu";
export {
  AdaptColumnSelectBox,
  AdaptColumnSelectCheckbox,
} from "./components/columnSelectCheckbox";
export { AdaptDesktopTable } from "./components/desktopTable";
export {
  AdaptCheckboxCellEditor,
  AdaptEditableCell,
  AdaptMaterialCellEditor,
} from "./components/editableCell";
export { AdaptErrorState } from "./components/errorState";
export { AdaptExpandToggle } from "./components/expandToggle";
export {
  AdaptFillHandle,
  AdaptFillHandleControl,
} from "./components/fillHandle";
export { AdaptFilterDrawer, AdaptFiltersForm } from "./components/filterPanel";
export { AdaptFilterPopover } from "./components/filterPopover";
export {
  AdaptGroupHeaderCard,
  AdaptGroupHeaderRow,
  AdaptGroupMore,
} from "./components/groupHeader";
export { AdaptGroupingPanel } from "./components/groupingPanel";
export { AdaptMaterialDialog } from "./components/materialDialog";
export { AdaptMaterialPopover } from "./components/materialPopover";
export { type MenuPopover, menuPopover } from "./components/menuPopover";
export { AdaptMobileCards } from "./components/mobileCards";
export { AdaptPaginationFooter } from "./components/paginationFooter";
export { AdaptPivotPanel } from "./components/pivotPanel";
export { AdaptPivotRowHeader } from "./components/pivotRowHeader";
export { AdaptSavedViewsMenu } from "./components/savedViewsMenu";
export { AdaptSavedViewsPanel } from "./components/savedViewsPanel";
export { AdaptTableRegion } from "./components/tableRegion";
export { AdaptTableSkeleton } from "./components/tableSkeleton";
export {
  AdaptDensityButton,
  AdaptExportButton,
  AdaptFullscreenButton,
  AdaptPrintButton,
  AdaptUndoRedoButtons,
} from "./components/toolbarExtras";
export {
  AdaptTreeButton,
  AdaptTreeCell,
  AdaptTreeToggle,
  type TreeCellSlotProps,
} from "./components/treeControls";
export {
  AdaptDataTable,
  type BodyCellView,
  type BodyRow,
  type BodySlot,
  type RowActionsCell,
  type TableView,
} from "./dataTable";
export type { FiltersMode, FiltersView } from "./tableFilters";
export type { DataTableClassNames } from "./types";
