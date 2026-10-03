import "@angular/localize/init";
import "@adapttable/ng-bootstrap/styles.css";

import { AdaptDataTable } from "@adapttable/ng-bootstrap";
import {
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/ng-bootstrap/assistant";
/** The ng-bootstrap kit used by every Angular showcase body. */
import { batchEditing } from "@adapttable/ng-bootstrap/batch-editing";
import { bulkActions } from "@adapttable/ng-bootstrap/bulk-actions";
import { cellNavigation } from "@adapttable/ng-bootstrap/cell-navigation";
import { cellSpan } from "@adapttable/ng-bootstrap/cell-span";
import { collapsibleColumnGroups } from "@adapttable/ng-bootstrap/column-groups";
import { columnMenu } from "@adapttable/ng-bootstrap/column-menu";
import { columnSelectionCheckbox } from "@adapttable/ng-bootstrap/column-selection";
import { commandPalette } from "@adapttable/ng-bootstrap/command-palette";
import { contextMenu } from "@adapttable/ng-bootstrap/context-menu";
import { densityChooser } from "@adapttable/ng-bootstrap/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/ng-bootstrap/editing";
import { exportCsv } from "@adapttable/ng-bootstrap/export";
import { extraRows } from "@adapttable/ng-bootstrap/extra-rows";
import { filters } from "@adapttable/ng-bootstrap/filters";
import { fullscreen } from "@adapttable/ng-bootstrap/fullscreen";
import { groupingPanel } from "@adapttable/ng-bootstrap/grouping-panel";
import { headerFilters } from "@adapttable/ng-bootstrap/header-filters";
import { nestedTable } from "@adapttable/ng-bootstrap/nested-table";
import { pinnedSummaryRows } from "@adapttable/ng-bootstrap/pinned-summary-rows";
import {
  AdaptPivotPanel,
  pivotTableModel,
} from "@adapttable/ng-bootstrap/pivot";
import { print } from "@adapttable/ng-bootstrap/print";
import { resizableColumns } from "@adapttable/ng-bootstrap/resizable-columns";
import { rowActions } from "@adapttable/ng-bootstrap/row-actions";
import { rowAppearance } from "@adapttable/ng-bootstrap/row-appearance";
import { rowPinning } from "@adapttable/ng-bootstrap/row-pinning";
import { rowReorder } from "@adapttable/ng-bootstrap/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/ng-bootstrap/saved-views";
import { sidePanel } from "@adapttable/ng-bootstrap/side-panel";
import { statusBar } from "@adapttable/ng-bootstrap/status-bar";
import { tree } from "@adapttable/ng-bootstrap/tree";
import { virtualize } from "@adapttable/ng-bootstrap/virtualize";

import type { ShowcaseKit } from "../showcaseKit";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "ng-bootstrap",
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
