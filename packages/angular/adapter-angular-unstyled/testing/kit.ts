import { batchEditing } from "@adapttable/angular-unstyled/batch-editing";
import { bulkActions } from "@adapttable/angular-unstyled/bulk-actions";
import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";
import { cellSpan } from "@adapttable/angular-unstyled/cell-span";
import { collapsibleColumnGroups } from "@adapttable/angular-unstyled/column-groups";
import { columnMenu } from "@adapttable/angular-unstyled/column-menu";
import { columnSelectionCheckbox } from "@adapttable/angular-unstyled/column-selection";
import { commandPalette } from "@adapttable/angular-unstyled/command-palette";
import { densityChooser } from "@adapttable/angular-unstyled/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/angular-unstyled/editing";
import {
  exportCsv,
  exportPdf,
  exportXlsx,
} from "@adapttable/angular-unstyled/export";
import { extraRows } from "@adapttable/angular-unstyled/extra-rows";
import {
  filters,
  filtersWith,
  filterTypes,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/angular-unstyled/filters";
import { findInTable } from "@adapttable/angular-unstyled/find-in-table";
import { fullscreen } from "@adapttable/angular-unstyled/fullscreen";
import { grouping } from "@adapttable/angular-unstyled/grouping";
import { groupingPanel } from "@adapttable/angular-unstyled/grouping-panel";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
  headerFilters,
} from "@adapttable/angular-unstyled/header-filters";
import { multiSort } from "@adapttable/angular-unstyled/multi-sort";
import { nestedTable } from "@adapttable/angular-unstyled/nested-table";
import { pinnedSummaryRows } from "@adapttable/angular-unstyled/pinned-summary-rows";
import { print } from "@adapttable/angular-unstyled/print";
import { resizableColumns } from "@adapttable/angular-unstyled/resizable-columns";
import { rowActions } from "@adapttable/angular-unstyled/row-actions";
import { rowAppearance } from "@adapttable/angular-unstyled/row-appearance";
import { rowDetail } from "@adapttable/angular-unstyled/row-detail";
import { rowPinning } from "@adapttable/angular-unstyled/row-pinning";
import { rowReorder } from "@adapttable/angular-unstyled/row-reorder";
import { savedViews } from "@adapttable/angular-unstyled/saved-views";
import { selectionStats } from "@adapttable/angular-unstyled/selection-stats";
import { sidePanel } from "@adapttable/angular-unstyled/side-panel";
import { statusBar } from "@adapttable/angular-unstyled/status-bar";
import { tree } from "@adapttable/angular-unstyled/tree";
import { virtualize } from "@adapttable/angular-unstyled/virtualize";

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

/** The angular-unstyled kit as the shared Angular kit suites exercise it. */
export const kit: AngularKitUnderTest = {
  name: "angular-unstyled",
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
