import "@adapttable/clarity/styles.css";

import { AdaptDataTable } from "@adapttable/clarity";
import {
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/clarity/assistant";
/** The real Clarity kit used by every Angular showcase body. */
import { batchEditing } from "@adapttable/clarity/batch-editing";
import { bulkActions } from "@adapttable/clarity/bulk-actions";
import { cellNavigation } from "@adapttable/clarity/cell-navigation";
import { cellSpan } from "@adapttable/clarity/cell-span";
import { collapsibleColumnGroups } from "@adapttable/clarity/column-groups";
import { columnMenu } from "@adapttable/clarity/column-menu";
import { columnSelectionCheckbox } from "@adapttable/clarity/column-selection";
import { commandPalette } from "@adapttable/clarity/command-palette";
import { contextMenu } from "@adapttable/clarity/context-menu";
import { densityChooser } from "@adapttable/clarity/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/clarity/editing";
import { exportCsv } from "@adapttable/clarity/export";
import { extraRows } from "@adapttable/clarity/extra-rows";
import { filters } from "@adapttable/clarity/filters";
import { fullscreen } from "@adapttable/clarity/fullscreen";
import { groupingPanel } from "@adapttable/clarity/grouping-panel";
import { headerFilters } from "@adapttable/clarity/header-filters";
import { nestedTable } from "@adapttable/clarity/nested-table";
import { pinnedSummaryRows } from "@adapttable/clarity/pinned-summary-rows";
import { AdaptPivotPanel, pivotTableModel } from "@adapttable/clarity/pivot";
import { print } from "@adapttable/clarity/print";
import { resizableColumns } from "@adapttable/clarity/resizable-columns";
import { rowActions } from "@adapttable/clarity/row-actions";
import { rowAppearance } from "@adapttable/clarity/row-appearance";
import { rowPinning } from "@adapttable/clarity/row-pinning";
import { rowReorder } from "@adapttable/clarity/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/clarity/saved-views";
import { sidePanel } from "@adapttable/clarity/side-panel";
import { statusBar } from "@adapttable/clarity/status-bar";
import { tree } from "@adapttable/clarity/tree";
import { virtualize } from "@adapttable/clarity/virtualize";
import { provideNoopAnimations } from "@angular/platform-browser/animations";

import type { ShowcaseKit } from "../showcaseKit";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "clarity",
  providers: [provideNoopAnimations()],
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
