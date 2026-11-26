import {
  cellSpan,
  extraRows,
  fitColumns,
  multiSort,
  resizableColumns,
  rowActions,
  rowAppearance,
} from "@adapttable/react/features";
import { Table as MantineTable } from "@mantine/core";
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
import { ChecklistFilter } from "./components/ChecklistFilter";
import { ColumnHeaderRename } from "./components/ColumnHeaderRename";
import { FilterTreeBuilder } from "./components/FilterTreeBuilder";
import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";
import { AgentApproval, RowReorderHandle } from "./components/kitControls";
import { PivotPanel } from "./components/PivotPanel";
import {
  Checkbox as KitCheckbox,
  Divider as KitDivider,
  Popover as KitPopover,
  Select as KitSelect,
  Text as KitText,
  TextInput as KitTextInput,
} from "./components/primitives";
import { SavedViewsPanel } from "./components/SavedViewsPanel";
import { SelectionStatsBar } from "./components/SelectionStatsBar";
import {
  ExportCsvButton,
  FullscreenButton,
  PrintButton,
  UndoRedoButtons,
} from "./components/toolbarExtras";
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
import { selection } from "./selection";
import { sidePanel } from "./side-panel";
import { selectionStats, statusBar } from "./status-bar";
import { renderMantine } from "./test-utils";
import { tree } from "./tree";
import type { DataTableProps } from "./types";
import { virtualize } from "./virtualize";

/** The mantine kit as the shared React kit suites exercise it. */
export const kit: ReactKitUnderTest = reactKitUnderTest({
  name: "mantine",
  render: renderMantine,
  axe,
  primitives: {
    TextInput: KitTextInput,
    Select: KitSelect,
    Checkbox: KitCheckbox,
    Text: KitText,
    Divider: KitDivider,
    Popover: KitPopover,
  },
  TableBodyFrame: ({ children }) => (
    <MantineTable>
      <MantineTable.Tbody>{children}</MantineTable.Tbody>
    </MantineTable>
  ),
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
    selection,
    selectionStats,
    sidePanel,
    statusBar,
    tree,
    undoRedoButtons,
    virtualize,
  },
  components: {
    AgentApproval,
    ChecklistFilter,
    ColumnHeaderRename,
    ExportCsvButton,
    FilterTreeBuilder,
    FullscreenButton,
    GroupHeaderCard,
    GroupHeaderRow,
    PivotPanel,
    PrintButton,
    RowReorderHandle,
    SavedViewsPanel,
    SelectionStatsBar,
    TableAssistant,
    UndoRedoButtons,
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
