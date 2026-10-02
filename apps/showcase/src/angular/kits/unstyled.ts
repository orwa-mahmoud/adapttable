/** The real native kit used by every Angular showcase body. */
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import {
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/angular-unstyled/assistant";
import { bulkActions } from "@adapttable/angular-unstyled/bulk-actions";
import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";
import { cellSpan } from "@adapttable/angular-unstyled/cell-span";
import { collapsibleColumnGroups } from "@adapttable/angular-unstyled/column-groups";
import { columnMenu } from "@adapttable/angular-unstyled/column-menu";
import { columnSelectionCheckbox } from "@adapttable/angular-unstyled/column-selection";
import { densityChooser } from "@adapttable/angular-unstyled/density";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/angular-unstyled/editing";
import { exportCsv } from "@adapttable/angular-unstyled/export";
import { filters } from "@adapttable/angular-unstyled/filters";
import { groupingPanel } from "@adapttable/angular-unstyled/grouping-panel";
import { headerFilters } from "@adapttable/angular-unstyled/header-filters";
import { nestedTable } from "@adapttable/angular-unstyled/nested-table";
import { pinnedSummaryRows } from "@adapttable/angular-unstyled/pinned-summary-rows";
import {
  AdaptPivotPanel,
  pivotTableModel,
} from "@adapttable/angular-unstyled/pivot";
import { resizableColumns } from "@adapttable/angular-unstyled/resizable-columns";
import { rowActions } from "@adapttable/angular-unstyled/row-actions";
import { rowPinning } from "@adapttable/angular-unstyled/row-pinning";
import { rowReorder } from "@adapttable/angular-unstyled/row-reorder";
import { savedViews } from "@adapttable/angular-unstyled/saved-views";
import { tree } from "@adapttable/angular-unstyled/tree";
import { virtualize } from "@adapttable/angular-unstyled/virtualize";

import type { ShowcaseKit } from "../showcaseKit";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "unstyled",
  providers: [],
  table: AdaptDataTable,
  pivotPanel: AdaptPivotPanel,
  assistant: AdaptTableAssistant,
  bulkActions,
  cellNavigation,
  cellSpan,
  collapsibleColumnGroups,
  columnMenu,
  columnSelectionCheckbox,
  densityChooser,
  editHistory,
  editing,
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
  agentApproval,
} satisfies ShowcaseKit;
