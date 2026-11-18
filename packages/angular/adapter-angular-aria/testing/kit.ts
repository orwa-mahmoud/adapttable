import { batchEditing } from "@adapttable/angular-aria/batch-editing";
import { bulkActions } from "@adapttable/angular-aria/bulk-actions";
import { cellNavigation } from "@adapttable/angular-aria/cell-navigation";
import { cellSpan } from "@adapttable/angular-aria/cell-span";
import { collapsibleColumnGroups } from "@adapttable/angular-aria/column-groups";
import { columnMenu } from "@adapttable/angular-aria/column-menu";
import { columnSelectionCheckbox } from "@adapttable/angular-aria/column-selection";
import { commandPalette } from "@adapttable/angular-aria/command-palette";
import { densityChooser } from "@adapttable/angular-aria/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/angular-aria/editing";
import {
  exportCsv,
  exportPdf,
  exportXlsx,
} from "@adapttable/angular-aria/export";
import { extraRows } from "@adapttable/angular-aria/extra-rows";
import {
  filters,
  filtersWith,
  filterTypes,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/angular-aria/filters";
import { findInTable } from "@adapttable/angular-aria/find-in-table";
import { fullscreen } from "@adapttable/angular-aria/fullscreen";
import { grouping } from "@adapttable/angular-aria/grouping";
import { groupingPanel } from "@adapttable/angular-aria/grouping-panel";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
  headerFilters,
} from "@adapttable/angular-aria/header-filters";
import { multiSort } from "@adapttable/angular-aria/multi-sort";
import { nestedTable } from "@adapttable/angular-aria/nested-table";
import { pinnedSummaryRows } from "@adapttable/angular-aria/pinned-summary-rows";
import { print } from "@adapttable/angular-aria/print";
import { resizableColumns } from "@adapttable/angular-aria/resizable-columns";
import { rowActions } from "@adapttable/angular-aria/row-actions";
import { rowAppearance } from "@adapttable/angular-aria/row-appearance";
import { rowDetail } from "@adapttable/angular-aria/row-detail";
import { rowPinning } from "@adapttable/angular-aria/row-pinning";
import { rowReorder } from "@adapttable/angular-aria/row-reorder";
import { savedViews } from "@adapttable/angular-aria/saved-views";
import { selectionStats } from "@adapttable/angular-aria/selection-stats";
import { sidePanel } from "@adapttable/angular-aria/side-panel";
import { statusBar } from "@adapttable/angular-aria/status-bar";
import { tree } from "@adapttable/angular-aria/tree";
import { virtualize } from "@adapttable/angular-aria/virtualize";

import {
  type AngularKitUnderTest,
  partSelector,
} from "../../angular/test/kit/kit";
import { AdaptCommandPaletteButton } from "../command-palette/palette";
import { pivotTableModel } from "../pivot/pivotTableModel";
import { AdaptSidePanelFrame } from "../side-panel/panel";
import { AdaptAutoFilterForm } from "../src/components/autoFilterForm";
import {
  AdaptCheckboxCellEditor,
  AdaptEditableCell,
  AdaptNativeCellEditor,
} from "../src/components/editableCell";
import { AdaptFilterPopover } from "../src/components/filterPopover";
import { AdaptGroupingPanel } from "../src/components/groupingPanel";
import { AdaptPivotPanel } from "../src/components/pivotPanel";
import { AdaptSavedViewsPanel } from "../src/components/savedViewsPanel";
import { AdaptTableSkeleton } from "../src/components/tableSkeleton";
import {
  AdaptExportButton,
  AdaptPrintButton,
} from "../src/components/toolbarExtras";
import { AdaptDataTable } from "../src/dataTable";
import { AdaptStatusBarLive } from "../status-bar";

/** The angular-aria kit as the shared Angular kit suites exercise it. */
export const kit: AngularKitUnderTest = {
  name: "angular-aria",
  Table: AdaptDataTable,
  features: {
    commandPalette,
    dirtyIndicators,
    filterTypes,
    selectionStats,
    sidePanel,
    statusBar,
    bulkActions,
    cellSpan,
    collapsibleColumnGroups,
    columnSelectionCheckbox,
    densityChooser,
    exportCsv,
    exportPdf,
    exportXlsx,
    extraRows,
    findInTable,
    fullscreen,
    groupingPanel,
    AdaptFilterHeaderControl,
    AdaptFilterHeaderRow,
    headerFilters,
    multiSort,
    pinnedSummaryRows,
    print,
    resizableColumns,
    rowAppearance,
    rowReorder,
    savedViews,
    tree,
    batchEditing,
    cellNavigation,
    columnMenu,
    editHistory,
    editing,
    filters,
    filtersWith,
    textFilterWidget,
    rangeFilterWidget,
    grouping,
    nestedTable,
    rowActions,
    rowDetail,
    rowEditing,
    rowPinning,
    undoRedoButtons,
    virtualize,
  },
  components: {
    AdaptAutoFilterForm,
    AdaptCheckboxCellEditor,
    AdaptCommandPaletteButton,
    AdaptEditableCell,
    AdaptExportButton,
    AdaptFilterPopover,
    AdaptGroupingPanel,
    AdaptNativeCellEditor,
    AdaptPivotPanel,
    AdaptPrintButton,
    AdaptSavedViewsPanel,
    AdaptSidePanelFrame,
    AdaptStatusBarLive,
    AdaptTableSkeleton,
    pivotTableModel,
  },
  kitSelector: partSelector,
};
