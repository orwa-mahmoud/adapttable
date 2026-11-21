import {
  cellSpan,
  extraRows,
  fitColumns,
  multiSort,
  resizableColumns,
  rowActions,
  rowAppearance,
} from "@adapttable/react/features";
import type { DataTableProps } from "@adapttable/unstyled";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

import { reactKitUnderTest } from "../../react/test/kit/harness";
import type { HarnessProps, ReactKitUnderTest } from "../../react/test/kit/kit";
import { agentApproval } from "./agent-approval";
import { TableAssistant, tableAssistant } from "./assistant";
import { bulkActions } from "./bulk-actions";
import { cellNavigation } from "./cell-navigation";
import { collapsibleColumnGroups } from "./column-groups";
import { columnLayoutFamily } from "./column-layout";
import { columnMenu } from "./column-menu";
import { columnSelectionCheckbox } from "./column-selection";
import { commandPalette } from "./command-palette";
import { contextMenu } from "./context-menu";
import { DataTable as Table } from "./DataTable";
import { densityChooser } from "./density";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  editingFamily,
  rowEditing,
  undoRedoButtons,
} from "./editing";
import { exportCsv } from "./export";
import { filteringFamily } from "./filtering";
import { filters, filterTypes } from "./filters";
import { findInTable } from "./find-in-table";
import { fullscreen } from "./fullscreen";
import { grouping } from "./grouping";
import { groupingPanel } from "./grouping-panel";
import { headerFilters } from "./header-filters";
import { pinnedSummaryRows } from "./pinned-summary-rows";
import { standardFeatures } from "./preset";
import { print } from "./print";
import { nestedTable, rowDetail } from "./row-detail";
import { rowPinning } from "./row-pinning";
import { rowReorder } from "./row-reorder";
import { savedViews } from "./saved-views";
import { sidePanel } from "./side-panel";
import { selectionStats, statusBar } from "./status-bar";
import { tree } from "./tree";
import { virtualize } from "./virtualize";

/** The shadcn kit as the shared React kit suites exercise it. */
export const kit: ReactKitUnderTest = reactKitUnderTest({
  name: "shadcn",
  render: render,
  axe,
  Table,
  features: {
    batchEditing,
    bulkActions,
    cellNavigation,
    cellSpan,
    collapsibleColumnGroups,
    columnMenu,
    columnSelectionCheckbox,
    commandPalette,
    contextMenu,
    densityChooser,
    dirtyIndicators,
    editHistory,
    editing,
    exportCsv,
    extraRows,
    filterTypes,
    filters,
    findInTable,
    fitColumns,
    fullscreen,
    grouping,
    groupingPanel,
    headerFilters,
    multiSort,
    nestedTable,
    pinnedSummaryRows,
    print,
    resizableColumns,
    rowActions,
    rowAppearance,
    rowDetail,
    rowEditing,
    rowPinning,
    rowReorder,
    savedViews,
    selectionStats,
    sidePanel,
    statusBar,
    tree,
    undoRedoButtons,
    virtualize,
  },
  components: {
    TableAssistant,
    agentApproval,
    standardFeatures,
    editingFamily,
    filteringFamily,
    columnLayoutFamily,
    tableAssistant,
  },
});

/**
 * The kit's table with its own props, composing its features from the
 * enabling props.
 */
export function DataTable<TRow>(
  props: Readonly<DataTableProps<TRow> & HarnessProps<TRow>>
) {
  return <kit.DataTable {...props} />;
}
