/** The real Angular Aria kit; styling is scoped to this demo and its portals. */
import "@angular/cdk/overlay-prebuilt.css";
import "@adapttable/angular-aria/styles.css";

import { AdaptDataTable } from "@adapttable/angular-aria";
import {
  AdaptAssistantButton,
  AdaptAssistantLanguageChip,
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/angular-aria/assistant";
/** Aria components and feature factories for each Angular showcase body. */
import { batchEditing } from "@adapttable/angular-aria/batch-editing";
import { bulkActions } from "@adapttable/angular-aria/bulk-actions";
import { cellNavigation } from "@adapttable/angular-aria/cell-navigation";
import { cellSpan } from "@adapttable/angular-aria/cell-span";
import { collapsibleColumnGroups } from "@adapttable/angular-aria/column-groups";
import { columnMenu } from "@adapttable/angular-aria/column-menu";
import { columnSelectionCheckbox } from "@adapttable/angular-aria/column-selection";
import { commandPalette } from "@adapttable/angular-aria/command-palette";
import { contextMenu } from "@adapttable/angular-aria/context-menu";
import { densityChooser } from "@adapttable/angular-aria/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/angular-aria/editing";
import { exportCsv } from "@adapttable/angular-aria/export";
import { extraRows } from "@adapttable/angular-aria/extra-rows";
import { filters } from "@adapttable/angular-aria/filters";
import { fullscreen } from "@adapttable/angular-aria/fullscreen";
import { groupingPanel } from "@adapttable/angular-aria/grouping-panel";
import { headerFilters } from "@adapttable/angular-aria/header-filters";
import { nestedTable } from "@adapttable/angular-aria/nested-table";
import { pinnedSummaryRows } from "@adapttable/angular-aria/pinned-summary-rows";
import {
  AdaptPivotPanel,
  pivotTableModel,
} from "@adapttable/angular-aria/pivot";
import { print } from "@adapttable/angular-aria/print";
import { resizableColumns } from "@adapttable/angular-aria/resizable-columns";
import { rowActions } from "@adapttable/angular-aria/row-actions";
import { rowAppearance } from "@adapttable/angular-aria/row-appearance";
import { rowPinning } from "@adapttable/angular-aria/row-pinning";
import { rowReorder } from "@adapttable/angular-aria/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/angular-aria/saved-views";
import { sidePanel } from "@adapttable/angular-aria/side-panel";
import { statusBar } from "@adapttable/angular-aria/status-bar";
import { tree } from "@adapttable/angular-aria/tree";
import { virtualize } from "@adapttable/angular-aria/virtualize";

import type { ShowcaseKit } from "../showcaseKit";
import { ShowcaseStatus } from "./ariaStatus";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "aria",
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
