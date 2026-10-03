import "@angular/cdk/overlay-prebuilt.css";
import "@adapttable/spartan/styles.css";

import { AdaptDataTable } from "@adapttable/spartan";
import {
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/spartan/assistant";
/** Spartan components and feature factories for each Angular showcase body. */
import { batchEditing } from "@adapttable/spartan/batch-editing";
import { bulkActions } from "@adapttable/spartan/bulk-actions";
import { cellNavigation } from "@adapttable/spartan/cell-navigation";
import { cellSpan } from "@adapttable/spartan/cell-span";
import { collapsibleColumnGroups } from "@adapttable/spartan/column-groups";
import { columnMenu } from "@adapttable/spartan/column-menu";
import { columnSelectionCheckbox } from "@adapttable/spartan/column-selection";
import { commandPalette } from "@adapttable/spartan/command-palette";
import { contextMenu } from "@adapttable/spartan/context-menu";
import { densityChooser } from "@adapttable/spartan/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/spartan/editing";
import { exportCsv } from "@adapttable/spartan/export";
import { extraRows } from "@adapttable/spartan/extra-rows";
import { filters } from "@adapttable/spartan/filters";
import { fullscreen } from "@adapttable/spartan/fullscreen";
import { groupingPanel } from "@adapttable/spartan/grouping-panel";
import { headerFilters } from "@adapttable/spartan/header-filters";
import { nestedTable } from "@adapttable/spartan/nested-table";
import { pinnedSummaryRows } from "@adapttable/spartan/pinned-summary-rows";
import { AdaptPivotPanel, pivotTableModel } from "@adapttable/spartan/pivot";
import { print } from "@adapttable/spartan/print";
import { resizableColumns } from "@adapttable/spartan/resizable-columns";
import { rowActions } from "@adapttable/spartan/row-actions";
import { rowAppearance } from "@adapttable/spartan/row-appearance";
import { rowPinning } from "@adapttable/spartan/row-pinning";
import { rowReorder } from "@adapttable/spartan/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/spartan/saved-views";
import { sidePanel } from "@adapttable/spartan/side-panel";
import { statusBar } from "@adapttable/spartan/status-bar";
import { tree } from "@adapttable/spartan/tree";
import { virtualize } from "@adapttable/spartan/virtualize";

import type { ShowcaseKit } from "../showcaseKit";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "spartan",
  providers: [],
  table: AdaptDataTable,
  pivotPanel: AdaptPivotPanel,
  assistant: AdaptTableAssistant,
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
