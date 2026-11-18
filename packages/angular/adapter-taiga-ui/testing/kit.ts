import { batchEditing } from "@adapttable/taiga-ui/batch-editing";
import { bulkActions } from "@adapttable/taiga-ui/bulk-actions";
import { cellNavigation } from "@adapttable/taiga-ui/cell-navigation";
import { cellSpan } from "@adapttable/taiga-ui/cell-span";
import { collapsibleColumnGroups } from "@adapttable/taiga-ui/column-groups";
import { columnMenu } from "@adapttable/taiga-ui/column-menu";
import { columnSelectionCheckbox } from "@adapttable/taiga-ui/column-selection";
import { commandPalette } from "@adapttable/taiga-ui/command-palette";
import { densityChooser } from "@adapttable/taiga-ui/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/taiga-ui/editing";
import { exportCsv, exportPdf, exportXlsx } from "@adapttable/taiga-ui/export";
import { extraRows } from "@adapttable/taiga-ui/extra-rows";
import {
  filters,
  filtersWith,
  filterTypes,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/taiga-ui/filters";
import { findInTable } from "@adapttable/taiga-ui/find-in-table";
import { fullscreen } from "@adapttable/taiga-ui/fullscreen";
import { grouping } from "@adapttable/taiga-ui/grouping";
import { groupingPanel } from "@adapttable/taiga-ui/grouping-panel";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
  headerFilters,
} from "@adapttable/taiga-ui/header-filters";
import { multiSort } from "@adapttable/taiga-ui/multi-sort";
import { nestedTable } from "@adapttable/taiga-ui/nested-table";
import { pinnedSummaryRows } from "@adapttable/taiga-ui/pinned-summary-rows";
import { print } from "@adapttable/taiga-ui/print";
import { resizableColumns } from "@adapttable/taiga-ui/resizable-columns";
import { rowActions } from "@adapttable/taiga-ui/row-actions";
import { rowAppearance } from "@adapttable/taiga-ui/row-appearance";
import { rowDetail } from "@adapttable/taiga-ui/row-detail";
import { rowPinning } from "@adapttable/taiga-ui/row-pinning";
import { rowReorder } from "@adapttable/taiga-ui/row-reorder";
import { savedViews } from "@adapttable/taiga-ui/saved-views";
import { selectionStats } from "@adapttable/taiga-ui/selection-stats";
import { sidePanel } from "@adapttable/taiga-ui/side-panel";
import { statusBar } from "@adapttable/taiga-ui/status-bar";
import { tree } from "@adapttable/taiga-ui/tree";
import { virtualize } from "@adapttable/taiga-ui/virtualize";

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
import { chooseTaigaOption } from "../src/taigaTestHelpers";
import { AdaptStatusBarLive } from "../status-bar";

/** The taiga-ui kit as the shared Angular kit suites exercise it. */
export const kit: AngularKitUnderTest = {
  name: "taiga-ui",
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
  kitSelector: kitPartSelector("taiga"),
  async chooseOption(fixture, control, value) {
    if (!(control instanceof HTMLElement) || !control.matches("[tuiSelect]"))
      return false;
    await chooseTaigaOption(fixture, control, value);
    return true;
  },
};
