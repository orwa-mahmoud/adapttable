import { batchEditing } from "@adapttable/ngx-bootstrap/batch-editing";
import { bulkActions } from "@adapttable/ngx-bootstrap/bulk-actions";
import { cellNavigation } from "@adapttable/ngx-bootstrap/cell-navigation";
import { cellSpan } from "@adapttable/ngx-bootstrap/cell-span";
import { collapsibleColumnGroups } from "@adapttable/ngx-bootstrap/column-groups";
import { columnLayoutFamily } from "@adapttable/ngx-bootstrap/column-layout";
import { columnMenu } from "@adapttable/ngx-bootstrap/column-menu";
import { columnSelectionCheckbox } from "@adapttable/ngx-bootstrap/column-selection";
import { commandPalette } from "@adapttable/ngx-bootstrap/command-palette";
import { densityChooser } from "@adapttable/ngx-bootstrap/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  editingFamily,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/ngx-bootstrap/editing";
import {
  exportCsv,
  exportPdf,
  exportXlsx,
} from "@adapttable/ngx-bootstrap/export";
import { extraRows } from "@adapttable/ngx-bootstrap/extra-rows";
import { filteringFamily } from "@adapttable/ngx-bootstrap/filtering";
import {
  filters,
  filtersWith,
  filterTypes,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/ngx-bootstrap/filters";
import { findInTable } from "@adapttable/ngx-bootstrap/find-in-table";
import { fullscreen } from "@adapttable/ngx-bootstrap/fullscreen";
import { grouping } from "@adapttable/ngx-bootstrap/grouping";
import { groupingPanel } from "@adapttable/ngx-bootstrap/grouping-panel";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
  headerFilters,
} from "@adapttable/ngx-bootstrap/header-filters";
import { multiSort } from "@adapttable/ngx-bootstrap/multi-sort";
import { nestedTable } from "@adapttable/ngx-bootstrap/nested-table";
import { pinnedSummaryRows } from "@adapttable/ngx-bootstrap/pinned-summary-rows";
import { print } from "@adapttable/ngx-bootstrap/print";
import { resizableColumns } from "@adapttable/ngx-bootstrap/resizable-columns";
import { rowActions } from "@adapttable/ngx-bootstrap/row-actions";
import { rowAppearance } from "@adapttable/ngx-bootstrap/row-appearance";
import { rowDetail } from "@adapttable/ngx-bootstrap/row-detail";
import { rowPinning } from "@adapttable/ngx-bootstrap/row-pinning";
import { rowReorder } from "@adapttable/ngx-bootstrap/row-reorder";
import { savedViews } from "@adapttable/ngx-bootstrap/saved-views";
import { selectionStats } from "@adapttable/ngx-bootstrap/selection-stats";
import { sidePanel } from "@adapttable/ngx-bootstrap/side-panel";
import { statusBar } from "@adapttable/ngx-bootstrap/status-bar";
import { tree } from "@adapttable/ngx-bootstrap/tree";
import { virtualize } from "@adapttable/ngx-bootstrap/virtualize";

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
import { ngxBootstrapPart } from "../testUtils";

/** The ngx-bootstrap kit as the shared Angular kit suites exercise it. */
export const kit: AngularKitUnderTest = {
  name: "ngx-bootstrap",
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
    AdaptNativeCellEditor,
    AdaptPivotPanel,
    AdaptPrintButton,
    AdaptSavedViewsPanel,
    AdaptSidePanelFrame,
    AdaptStatusBarLive,
    AdaptTableSkeleton,
    pivotTableModel,
  },
  kitSelector: ngxBootstrapPart,
};
