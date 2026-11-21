import { batchEditing } from "@adapttable/angular-material/batch-editing";
import { bulkActions } from "@adapttable/angular-material/bulk-actions";
import { cellNavigation } from "@adapttable/angular-material/cell-navigation";
import { cellSpan } from "@adapttable/angular-material/cell-span";
import { collapsibleColumnGroups } from "@adapttable/angular-material/column-groups";
import { columnLayoutFamily } from "@adapttable/angular-material/column-layout";
import { columnMenu } from "@adapttable/angular-material/column-menu";
import { columnSelectionCheckbox } from "@adapttable/angular-material/column-selection";
import { commandPalette } from "@adapttable/angular-material/command-palette";
import { densityChooser } from "@adapttable/angular-material/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  editingFamily,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/angular-material/editing";
import {
  exportCsv,
  exportPdf,
  exportXlsx,
} from "@adapttable/angular-material/export";
import { extraRows } from "@adapttable/angular-material/extra-rows";
import { filteringFamily } from "@adapttable/angular-material/filtering";
import {
  filters,
  filtersWith,
  filterTypes,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/angular-material/filters";
import { findInTable } from "@adapttable/angular-material/find-in-table";
import { fullscreen } from "@adapttable/angular-material/fullscreen";
import { grouping } from "@adapttable/angular-material/grouping";
import { groupingPanel } from "@adapttable/angular-material/grouping-panel";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
  headerFilters,
} from "@adapttable/angular-material/header-filters";
import { multiSort } from "@adapttable/angular-material/multi-sort";
import { nestedTable } from "@adapttable/angular-material/nested-table";
import { pinnedSummaryRows } from "@adapttable/angular-material/pinned-summary-rows";
import { print } from "@adapttable/angular-material/print";
import { resizableColumns } from "@adapttable/angular-material/resizable-columns";
import { rowActions } from "@adapttable/angular-material/row-actions";
import { rowAppearance } from "@adapttable/angular-material/row-appearance";
import { rowDetail } from "@adapttable/angular-material/row-detail";
import { rowPinning } from "@adapttable/angular-material/row-pinning";
import { rowReorder } from "@adapttable/angular-material/row-reorder";
import { savedViews } from "@adapttable/angular-material/saved-views";
import { selectionStats } from "@adapttable/angular-material/selection-stats";
import { sidePanel } from "@adapttable/angular-material/side-panel";
import { statusBar } from "@adapttable/angular-material/status-bar";
import { tree } from "@adapttable/angular-material/tree";
import { virtualize } from "@adapttable/angular-material/virtualize";

import type { AngularKitUnderTest } from "../../angular/test/kit/kit";
import { AdaptCommandPaletteButton } from "../command-palette/palette";
import { pivotTableModel } from "../pivot/pivotTableModel";
import { AdaptSidePanelFrame } from "../side-panel/panel";
import { AdaptAutoFilterForm } from "../src/components/autoFilterForm";
import {
  AdaptCheckboxCellEditor,
  AdaptEditableCell,
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
import { kitSelector } from "../testUtils";

/** The material kit as the shared Angular kit suites exercise it. */
export const kit: AngularKitUnderTest = {
  name: "angular-material",
  Table: AdaptDataTable,
  features: {
    editingFamily,
    filteringFamily,
    columnLayoutFamily,
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
    AdaptPivotPanel,
    AdaptPrintButton,
    AdaptSavedViewsPanel,
    AdaptSidePanelFrame,
    AdaptStatusBarLive,
    AdaptTableSkeleton,
    pivotTableModel,
  },
  kitSelector,
};
