import { batchEditing } from "@adapttable/ng-zorro/batch-editing";
import { bulkActions } from "@adapttable/ng-zorro/bulk-actions";
import { cellNavigation } from "@adapttable/ng-zorro/cell-navigation";
import { cellSpan } from "@adapttable/ng-zorro/cell-span";
import { collapsibleColumnGroups } from "@adapttable/ng-zorro/column-groups";
import { columnLayoutFamily } from "@adapttable/ng-zorro/column-layout";
import { columnMenu } from "@adapttable/ng-zorro/column-menu";
import { columnSelectionCheckbox } from "@adapttable/ng-zorro/column-selection";
import { commandPalette } from "@adapttable/ng-zorro/command-palette";
import { densityChooser } from "@adapttable/ng-zorro/density";
import {
  dirtyIndicators,
  editHistory,
  editing,
  editingFamily,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/ng-zorro/editing";
import { exportCsv, exportPdf, exportXlsx } from "@adapttable/ng-zorro/export";
import { extraRows } from "@adapttable/ng-zorro/extra-rows";
import { filteringFamily } from "@adapttable/ng-zorro/filtering";
import {
  filters,
  filtersWith,
  filterTypes,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/ng-zorro/filters";
import { findInTable } from "@adapttable/ng-zorro/find-in-table";
import { fullscreen } from "@adapttable/ng-zorro/fullscreen";
import { grouping } from "@adapttable/ng-zorro/grouping";
import { groupingPanel } from "@adapttable/ng-zorro/grouping-panel";
import {
  AdaptFilterHeaderControl,
  AdaptFilterHeaderRow,
  headerFilters,
} from "@adapttable/ng-zorro/header-filters";
import { multiSort } from "@adapttable/ng-zorro/multi-sort";
import { nestedTable } from "@adapttable/ng-zorro/nested-table";
import { pinnedSummaryRows } from "@adapttable/ng-zorro/pinned-summary-rows";
import { print } from "@adapttable/ng-zorro/print";
import { resizableColumns } from "@adapttable/ng-zorro/resizable-columns";
import { rowActions } from "@adapttable/ng-zorro/row-actions";
import { rowAppearance } from "@adapttable/ng-zorro/row-appearance";
import { rowDetail } from "@adapttable/ng-zorro/row-detail";
import { rowPinning } from "@adapttable/ng-zorro/row-pinning";
import { rowReorder } from "@adapttable/ng-zorro/row-reorder";
import { savedViews } from "@adapttable/ng-zorro/saved-views";
import { selectionStats } from "@adapttable/ng-zorro/selection-stats";
import { sidePanel } from "@adapttable/ng-zorro/side-panel";
import { statusBar } from "@adapttable/ng-zorro/status-bar";
import { tree } from "@adapttable/ng-zorro/tree";
import { virtualize } from "@adapttable/ng-zorro/virtualize";
import { getDebugNode } from "@angular/core";
import { NzSelectComponent } from "ng-zorro-antd/select";

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
import { kitSelector } from "../testUtils";

/** The ng-zorro kit as the shared Angular kit suites exercise it. */
export const kit: AngularKitUnderTest = {
  name: "ng-zorro",
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
  kitSelector,
  async chooseOption(fixture, control, value) {
    if (!control.matches("nz-select")) return false;
    const select = getDebugNode(control)?.injector.get(NzSelectComponent);
    if (!select) throw new Error("NG-ZORRO select is not rendered");
    const choice = select.listOfContainerItem.find(
      (item) => item.nzValue === value
    );
    if (!choice) throw new Error(`No select option for ${value}`);
    control.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await fixture.whenStable();
    const popup = select.cdkConnectedOverlay.overlayRef.overlayElement;
    const option = [
      ...popup.querySelectorAll<HTMLElement>("nz-option-item"),
    ].find((item) => item.getAttribute("title") === String(choice.nzLabel));
    if (!option)
      throw new Error(`Option ${String(choice.nzLabel)} is not visible`);
    option.click();
    await fixture.whenStable();
    return true;
  },
};
