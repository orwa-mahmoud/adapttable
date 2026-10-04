/** The real Angular Material kit; styling is scoped to this demo and its portals. */
import "@angular/cdk/overlay-prebuilt.css";
import "@adapttable/angular-material/styles.css";
import "../material.scss";

import { AdaptDataTable } from "@adapttable/angular-material";
import {
  AdaptAssistantButton,
  AdaptAssistantLanguageChip,
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/angular-material/assistant";
/** Material components and feature factories for each Angular showcase body. */
import { batchEditing } from "@adapttable/angular-material/batch-editing";
import { bulkActions } from "@adapttable/angular-material/bulk-actions";
import { cellNavigation } from "@adapttable/angular-material/cell-navigation";
import { cellSpan } from "@adapttable/angular-material/cell-span";
import { collapsibleColumnGroups } from "@adapttable/angular-material/column-groups";
import { columnMenu } from "@adapttable/angular-material/column-menu";
import { columnSelectionCheckbox } from "@adapttable/angular-material/column-selection";
import { commandPalette } from "@adapttable/angular-material/command-palette";
import { contextMenu } from "@adapttable/angular-material/context-menu";
import { densityChooser } from "@adapttable/angular-material/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/angular-material/editing";
import { exportCsv } from "@adapttable/angular-material/export";
import { extraRows } from "@adapttable/angular-material/extra-rows";
import { filters } from "@adapttable/angular-material/filters";
import { fullscreen } from "@adapttable/angular-material/fullscreen";
import { groupingPanel } from "@adapttable/angular-material/grouping-panel";
import { headerFilters } from "@adapttable/angular-material/header-filters";
import { nestedTable } from "@adapttable/angular-material/nested-table";
import { pinnedSummaryRows } from "@adapttable/angular-material/pinned-summary-rows";
import {
  AdaptPivotPanel,
  pivotTableModel,
} from "@adapttable/angular-material/pivot";
import { print } from "@adapttable/angular-material/print";
import { resizableColumns } from "@adapttable/angular-material/resizable-columns";
import { rowActions } from "@adapttable/angular-material/row-actions";
import { rowAppearance } from "@adapttable/angular-material/row-appearance";
import { rowPinning } from "@adapttable/angular-material/row-pinning";
import { rowReorder } from "@adapttable/angular-material/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/angular-material/saved-views";
import { sidePanel } from "@adapttable/angular-material/side-panel";
import { statusBar } from "@adapttable/angular-material/status-bar";
import { tree } from "@adapttable/angular-material/tree";
import { virtualize } from "@adapttable/angular-material/virtualize";

import type { ShowcaseKit } from "../showcaseKit";
import { ShowcaseStatus } from "./materialStatus";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "material",
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
