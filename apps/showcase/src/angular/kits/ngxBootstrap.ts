/** Route-isolated ngx-bootstrap components and scoped Bootstrap CSS. */
import "@adapttable/ngx-bootstrap/styles.css";

import { AdaptDataTable } from "@adapttable/ngx-bootstrap";
import {
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/ngx-bootstrap/assistant";
import { batchEditing } from "@adapttable/ngx-bootstrap/batch-editing";
import { bulkActions } from "@adapttable/ngx-bootstrap/bulk-actions";
import { cellNavigation } from "@adapttable/ngx-bootstrap/cell-navigation";
import { cellSpan } from "@adapttable/ngx-bootstrap/cell-span";
import { collapsibleColumnGroups } from "@adapttable/ngx-bootstrap/column-groups";
import { columnMenu } from "@adapttable/ngx-bootstrap/column-menu";
import { columnSelectionCheckbox } from "@adapttable/ngx-bootstrap/column-selection";
import { commandPalette } from "@adapttable/ngx-bootstrap/command-palette";
import { contextMenu } from "@adapttable/ngx-bootstrap/context-menu";
import { densityChooser } from "@adapttable/ngx-bootstrap/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/ngx-bootstrap/editing";
import { exportCsv } from "@adapttable/ngx-bootstrap/export";
import { extraRows } from "@adapttable/ngx-bootstrap/extra-rows";
import { filters } from "@adapttable/ngx-bootstrap/filters";
import { fullscreen } from "@adapttable/ngx-bootstrap/fullscreen";
import { groupingPanel } from "@adapttable/ngx-bootstrap/grouping-panel";
import { headerFilters } from "@adapttable/ngx-bootstrap/header-filters";
import { nestedTable } from "@adapttable/ngx-bootstrap/nested-table";
import { pinnedSummaryRows } from "@adapttable/ngx-bootstrap/pinned-summary-rows";
import {
  AdaptPivotPanel,
  pivotTableModel,
} from "@adapttable/ngx-bootstrap/pivot";
import { print } from "@adapttable/ngx-bootstrap/print";
import { resizableColumns } from "@adapttable/ngx-bootstrap/resizable-columns";
import { rowActions } from "@adapttable/ngx-bootstrap/row-actions";
import { rowAppearance } from "@adapttable/ngx-bootstrap/row-appearance";
import { rowPinning } from "@adapttable/ngx-bootstrap/row-pinning";
import { rowReorder } from "@adapttable/ngx-bootstrap/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/ngx-bootstrap/saved-views";
import { sidePanel } from "@adapttable/ngx-bootstrap/side-panel";
import { statusBar } from "@adapttable/ngx-bootstrap/status-bar";
import { tree } from "@adapttable/ngx-bootstrap/tree";
import { virtualize } from "@adapttable/ngx-bootstrap/virtualize";

import type { ShowcaseKit } from "../showcaseKit";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "ngx-bootstrap",
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
