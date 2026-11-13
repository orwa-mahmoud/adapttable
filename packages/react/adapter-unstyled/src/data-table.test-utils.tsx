import {
  cellSpan,
  extraRows,
  fitColumns,
  multiSort,
  resizableColumns,
  rowActions,
  rowAppearance,
} from "@adapttable/react/features";
import { render } from "@testing-library/react";

import { reactKitUnderTest } from "../../react/test/kit/harness";
import type { HarnessProps, ReactKitUnderTest } from "../../react/test/kit/kit";
import { bulkActions } from "./bulk-actions";
import { cellNavigation } from "./cell-navigation";
import { collapsibleColumnGroups } from "./column-groups";
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
  rowEditing,
  undoRedoButtons,
} from "./editing";
import { exportCsv } from "./export";
import { filters, filterTypes } from "./filters";
import { findInTable } from "./find-in-table";
import { fullscreen } from "./fullscreen";
import { grouping } from "./grouping";
import { headerFilters } from "./header-filters";
import { print } from "./print";
import { nestedTable, rowDetail } from "./row-detail";
import { rowPinning } from "./row-pinning";
import { rowReorder } from "./row-reorder";
import { savedViews } from "./saved-views";
import { sidePanel } from "./side-panel";
import { selectionStats, statusBar } from "./status-bar";
import { tree } from "./tree";
import type { DataTableProps } from "./types";
import { virtualize } from "./virtualize";

/** The unstyled kit as the shared React kit suites exercise it. */
export const kit: ReactKitUnderTest = reactKitUnderTest({
  name: "unstyled",
  render: render,
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
    headerFilters,
    multiSort,
    nestedTable,
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
