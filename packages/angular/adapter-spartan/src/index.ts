/**
 * `@adapttable/spartan` — the Angular table drawn with Spartan Brain and Helm
 * with an owned Helm layer over `@adapttable/angular`.
 *
 * Feature factories live on secondary entries (`bulk-actions`, `filters`,
 * …); import them from those paths or from `@adapttable/spartan/features`.
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
  AdaptNativeCellEditor,
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

/** @internal Package-owned Helm primitives shared by secondary entries. */
export {
  HlmButton as ɵHlmButton,
  HlmCheckbox as ɵHlmCheckbox,
  HlmInput as ɵHlmInput,
  HlmNativeOption as ɵHlmNativeOption,
  HlmNativeSelect as ɵHlmNativeSelect,
  SpartanSelection as ɵSpartanSelection,
} from "./helm/controls";

/** @internal Native pane naming shared by secondary entries. */
export { HlmPopoverLabel as ɵHlmPopoverLabel } from "./helm/popover";
