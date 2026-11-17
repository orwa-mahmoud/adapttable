import { batchEditing } from "@adapttable/spartan/batch-editing";
import { bulkActions } from "@adapttable/spartan/bulk-actions";
import { cellNavigation } from "@adapttable/spartan/cell-navigation";
import { cellSpan } from "@adapttable/spartan/cell-span";
import { collapsibleColumnGroups } from "@adapttable/spartan/column-groups";
import { columnMenu } from "@adapttable/spartan/column-menu";
import { columnSelectionCheckbox } from "@adapttable/spartan/column-selection";
import { commandPalette } from "@adapttable/spartan/command-palette";
import { densityChooser } from "@adapttable/spartan/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/spartan/editing";
import { exportCsv, exportPdf, exportXlsx } from "@adapttable/spartan/export";
import { extraRows } from "@adapttable/spartan/extra-rows";
import { filters, filterTypes } from "@adapttable/spartan/filters";
import { findInTable } from "@adapttable/spartan/find-in-table";
import { fullscreen } from "@adapttable/spartan/fullscreen";
import { grouping } from "@adapttable/spartan/grouping";
import { groupingPanel } from "@adapttable/spartan/grouping-panel";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
  headerFilters,
} from "@adapttable/spartan/header-filters";
import { multiSort } from "@adapttable/spartan/multi-sort";
import { nestedTable } from "@adapttable/spartan/nested-table";
import { pinnedSummaryRows } from "@adapttable/spartan/pinned-summary-rows";
import { print } from "@adapttable/spartan/print";
import { resizableColumns } from "@adapttable/spartan/resizable-columns";
import { rowActions } from "@adapttable/spartan/row-actions";
import { rowAppearance } from "@adapttable/spartan/row-appearance";
import { rowDetail } from "@adapttable/spartan/row-detail";
import { rowPinning } from "@adapttable/spartan/row-pinning";
import { rowReorder } from "@adapttable/spartan/row-reorder";
import { savedViews } from "@adapttable/spartan/saved-views";
import { selectionStats } from "@adapttable/spartan/selection-stats";
import { sidePanel } from "@adapttable/spartan/side-panel";
import { statusBar } from "@adapttable/spartan/status-bar";
import { tree } from "@adapttable/spartan/tree";
import { virtualize } from "@adapttable/spartan/virtualize";

import {
  type AngularKitUnderTest,
  kitPartSelector,
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

/** The spartan kit as the shared Angular kit suites exercise it. */
export const kit: AngularKitUnderTest = {
  name: "spartan",
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
  kitSelector: kitPartSelector("spartan"),
};
