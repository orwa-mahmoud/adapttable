import "@angular/cdk/overlay-prebuilt.css";
import "@adapttable/angular-cdk/styles.css";

import { AdaptDataTable } from "@adapttable/angular-cdk";
import {
  AdaptAssistantButton,
  AdaptAssistantLanguageChip,
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/angular-cdk/assistant";
/** The CDK neutral kit used by every Angular showcase body. */
import { batchEditing } from "@adapttable/angular-cdk/batch-editing";
import { bulkActions } from "@adapttable/angular-cdk/bulk-actions";
import { cellNavigation } from "@adapttable/angular-cdk/cell-navigation";
import { cellSpan } from "@adapttable/angular-cdk/cell-span";
import { collapsibleColumnGroups } from "@adapttable/angular-cdk/column-groups";
import { columnMenu } from "@adapttable/angular-cdk/column-menu";
import { columnSelectionCheckbox } from "@adapttable/angular-cdk/column-selection";
import { commandPalette } from "@adapttable/angular-cdk/command-palette";
import { contextMenu } from "@adapttable/angular-cdk/context-menu";
import { densityChooser } from "@adapttable/angular-cdk/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/angular-cdk/editing";
import { exportCsv } from "@adapttable/angular-cdk/export";
import { extraRows } from "@adapttable/angular-cdk/extra-rows";
import { filters } from "@adapttable/angular-cdk/filters";
import { fullscreen } from "@adapttable/angular-cdk/fullscreen";
import { groupingPanel } from "@adapttable/angular-cdk/grouping-panel";
import { headerFilters } from "@adapttable/angular-cdk/header-filters";
import { nestedTable } from "@adapttable/angular-cdk/nested-table";
import { pinnedSummaryRows } from "@adapttable/angular-cdk/pinned-summary-rows";
import {
  AdaptPivotPanel,
  pivotTableModel,
} from "@adapttable/angular-cdk/pivot";
import { print } from "@adapttable/angular-cdk/print";
import { resizableColumns } from "@adapttable/angular-cdk/resizable-columns";
import { rowActions } from "@adapttable/angular-cdk/row-actions";
import { rowAppearance } from "@adapttable/angular-cdk/row-appearance";
import { rowPinning } from "@adapttable/angular-cdk/row-pinning";
import { rowReorder } from "@adapttable/angular-cdk/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/angular-cdk/saved-views";
import { sidePanel } from "@adapttable/angular-cdk/side-panel";
import { statusBar } from "@adapttable/angular-cdk/status-bar";
import { tree } from "@adapttable/angular-cdk/tree";
import { virtualize } from "@adapttable/angular-cdk/virtualize";

import type { ShowcaseKit } from "../showcaseKit";
import { ShowcaseStatus } from "./angularCdkStatus";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "angular-cdk",
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
