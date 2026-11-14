import { batchEditing } from "@adapttable/ng-bootstrap/batch-editing";
import { bulkActions } from "@adapttable/ng-bootstrap/bulk-actions";
import { cellNavigation } from "@adapttable/ng-bootstrap/cell-navigation";
import { cellSpan } from "@adapttable/ng-bootstrap/cell-span";
import { collapsibleColumnGroups } from "@adapttable/ng-bootstrap/column-groups";
import { columnMenu } from "@adapttable/ng-bootstrap/column-menu";
import { columnSelectionCheckbox } from "@adapttable/ng-bootstrap/column-selection";
import { commandPalette } from "@adapttable/ng-bootstrap/command-palette";
import { densityChooser } from "@adapttable/ng-bootstrap/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/ng-bootstrap/editing";
import {
  exportCsv,
  exportPdf,
  exportXlsx,
} from "@adapttable/ng-bootstrap/export";
import { extraRows } from "@adapttable/ng-bootstrap/extra-rows";
import { filters, filterTypes } from "@adapttable/ng-bootstrap/filters";
import { findInTable } from "@adapttable/ng-bootstrap/find-in-table";
import { fullscreen } from "@adapttable/ng-bootstrap/fullscreen";
import { grouping } from "@adapttable/ng-bootstrap/grouping";
import { groupingPanel } from "@adapttable/ng-bootstrap/grouping-panel";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
  headerFilters,
} from "@adapttable/ng-bootstrap/header-filters";
import { multiSort } from "@adapttable/ng-bootstrap/multi-sort";
import { nestedTable } from "@adapttable/ng-bootstrap/nested-table";
import { pinnedSummaryRows } from "@adapttable/ng-bootstrap/pinned-summary-rows";
import { print } from "@adapttable/ng-bootstrap/print";
import { resizableColumns } from "@adapttable/ng-bootstrap/resizable-columns";
import { rowActions } from "@adapttable/ng-bootstrap/row-actions";
import { rowAppearance } from "@adapttable/ng-bootstrap/row-appearance";
import { rowDetail } from "@adapttable/ng-bootstrap/row-detail";
import { rowPinning } from "@adapttable/ng-bootstrap/row-pinning";
import { rowReorder } from "@adapttable/ng-bootstrap/row-reorder";
import { savedViews } from "@adapttable/ng-bootstrap/saved-views";
import { selectionStats } from "@adapttable/ng-bootstrap/selection-stats";
import { sidePanel } from "@adapttable/ng-bootstrap/side-panel";
import { statusBar } from "@adapttable/ng-bootstrap/status-bar";
import { tree } from "@adapttable/ng-bootstrap/tree";
import { virtualize } from "@adapttable/ng-bootstrap/virtualize";

import type { AngularKitUnderTest } from "../../angular/test/kit/kit";
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
import { ngBootstrapPart } from "../testUtils";

/** The ng-bootstrap kit as the shared Angular kit suites exercise it. */
export const kit: AngularKitUnderTest = {
  name: "ng-bootstrap",
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
  kitSelector: ngBootstrapPart,
};
