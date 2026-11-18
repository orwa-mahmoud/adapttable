import { batchEditing } from "@adapttable/angular-cdk/batch-editing";
import { bulkActions } from "@adapttable/angular-cdk/bulk-actions";
import { cellNavigation } from "@adapttable/angular-cdk/cell-navigation";
import { cellSpan } from "@adapttable/angular-cdk/cell-span";
import { collapsibleColumnGroups } from "@adapttable/angular-cdk/column-groups";
import { columnMenu } from "@adapttable/angular-cdk/column-menu";
import { columnSelectionCheckbox } from "@adapttable/angular-cdk/column-selection";
import { commandPalette } from "@adapttable/angular-cdk/command-palette";
import { densityChooser } from "@adapttable/angular-cdk/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/angular-cdk/editing";
import {
  exportCsv,
  exportPdf,
  exportXlsx,
} from "@adapttable/angular-cdk/export";
import { extraRows } from "@adapttable/angular-cdk/extra-rows";
import {
  filters,
  filtersWith,
  filterTypes,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/angular-cdk/filters";
import { findInTable } from "@adapttable/angular-cdk/find-in-table";
import { fullscreen } from "@adapttable/angular-cdk/fullscreen";
import { grouping } from "@adapttable/angular-cdk/grouping";
import { groupingPanel } from "@adapttable/angular-cdk/grouping-panel";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
  headerFilters,
} from "@adapttable/angular-cdk/header-filters";
import { multiSort } from "@adapttable/angular-cdk/multi-sort";
import { nestedTable } from "@adapttable/angular-cdk/nested-table";
import { pinnedSummaryRows } from "@adapttable/angular-cdk/pinned-summary-rows";
import { print } from "@adapttable/angular-cdk/print";
import { resizableColumns } from "@adapttable/angular-cdk/resizable-columns";
import { rowActions } from "@adapttable/angular-cdk/row-actions";
import { rowAppearance } from "@adapttable/angular-cdk/row-appearance";
import { rowDetail } from "@adapttable/angular-cdk/row-detail";
import { rowPinning } from "@adapttable/angular-cdk/row-pinning";
import { rowReorder } from "@adapttable/angular-cdk/row-reorder";
import { savedViews } from "@adapttable/angular-cdk/saved-views";
import { selectionStats } from "@adapttable/angular-cdk/selection-stats";
import { sidePanel } from "@adapttable/angular-cdk/side-panel";
import { statusBar } from "@adapttable/angular-cdk/status-bar";
import { tree } from "@adapttable/angular-cdk/tree";
import { virtualize } from "@adapttable/angular-cdk/virtualize";

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

/** The angular-cdk kit as the shared Angular kit suites exercise it. */
export const kit: AngularKitUnderTest = {
  name: "angular-cdk",
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
