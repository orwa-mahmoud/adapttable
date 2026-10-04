/** The real native kit used by every Angular showcase body. */
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import {
  AdaptAssistantButton,
  AdaptAssistantLanguageChip,
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/angular-unstyled/assistant";
import { batchEditing } from "@adapttable/angular-unstyled/batch-editing";
import { bulkActions } from "@adapttable/angular-unstyled/bulk-actions";
import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";
import { cellSpan } from "@adapttable/angular-unstyled/cell-span";
import { collapsibleColumnGroups } from "@adapttable/angular-unstyled/column-groups";
import { columnMenu } from "@adapttable/angular-unstyled/column-menu";
import { columnSelectionCheckbox } from "@adapttable/angular-unstyled/column-selection";
import { commandPalette } from "@adapttable/angular-unstyled/command-palette";
import { contextMenu } from "@adapttable/angular-unstyled/context-menu";
import { densityChooser } from "@adapttable/angular-unstyled/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/angular-unstyled/editing";
import { exportCsv } from "@adapttable/angular-unstyled/export";
import { extraRows } from "@adapttable/angular-unstyled/extra-rows";
import { filters } from "@adapttable/angular-unstyled/filters";
import { fullscreen } from "@adapttable/angular-unstyled/fullscreen";
import { groupingPanel } from "@adapttable/angular-unstyled/grouping-panel";
import { headerFilters } from "@adapttable/angular-unstyled/header-filters";
import { nestedTable } from "@adapttable/angular-unstyled/nested-table";
import { pinnedSummaryRows } from "@adapttable/angular-unstyled/pinned-summary-rows";
import {
  AdaptPivotPanel,
  pivotTableModel,
} from "@adapttable/angular-unstyled/pivot";
import { print } from "@adapttable/angular-unstyled/print";
import { resizableColumns } from "@adapttable/angular-unstyled/resizable-columns";
import { rowActions } from "@adapttable/angular-unstyled/row-actions";
import { rowAppearance } from "@adapttable/angular-unstyled/row-appearance";
import { rowPinning } from "@adapttable/angular-unstyled/row-pinning";
import { rowReorder } from "@adapttable/angular-unstyled/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/angular-unstyled/saved-views";
import { sidePanel } from "@adapttable/angular-unstyled/side-panel";
import { statusBar } from "@adapttable/angular-unstyled/status-bar";
import { tree } from "@adapttable/angular-unstyled/tree";
import { virtualize } from "@adapttable/angular-unstyled/virtualize";

import type { ShowcaseKit } from "../showcaseKit";
import { ShowcaseStatus } from "./unstyledStatus";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "unstyled",
  providers: [],
  table: AdaptDataTable,
  statusCell: ShowcaseStatus,
  pivotPanel: AdaptPivotPanel,
  assistant: AdaptTableAssistant,
  assistantButton: AdaptAssistantButton,
  assistantSelect: AdaptAssistantLanguageChip,
  savedViewsPanel: AdaptSavedViewsPanel,
  bulkActions,
  cellNavigation,
  cellSpan,
  collapsibleColumnGroups,
  columnMenu,
  columnSelectionCheckbox,
  densityChooser,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
  exportCsv,
  filters,
  groupingPanel,
  headerFilters,
  nestedTable,
  pinnedSummaryRows,
  pivotTableModel,
  resizableColumns,
  rowActions,
  rowPinning,
  rowReorder,
  savedViews,
  tree,
  virtualize,
  batchEditing,
  contextMenu,
  commandPalette,
  extraRows,
  rowAppearance,
  statusBar,
  sidePanel,
  fullscreen,
  print,
  agentApproval,
} satisfies ShowcaseKit;
