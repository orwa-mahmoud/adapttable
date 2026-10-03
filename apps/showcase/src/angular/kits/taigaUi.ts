/** The real Taiga UI kit used by every Angular showcase body. */
import {
  AdaptDataTable,
  AdaptTaigaRoot,
  provideAdaptTaiga,
} from "@adapttable/taiga-ui";
import {
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/taiga-ui/assistant";
import { batchEditing } from "@adapttable/taiga-ui/batch-editing";
import { bulkActions } from "@adapttable/taiga-ui/bulk-actions";
import { cellNavigation } from "@adapttable/taiga-ui/cell-navigation";
import { cellSpan } from "@adapttable/taiga-ui/cell-span";
import { collapsibleColumnGroups } from "@adapttable/taiga-ui/column-groups";
import { columnMenu } from "@adapttable/taiga-ui/column-menu";
import { columnSelectionCheckbox } from "@adapttable/taiga-ui/column-selection";
import { commandPalette } from "@adapttable/taiga-ui/command-palette";
import { contextMenu } from "@adapttable/taiga-ui/context-menu";
import { densityChooser } from "@adapttable/taiga-ui/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/taiga-ui/editing";
import { exportCsv } from "@adapttable/taiga-ui/export";
import { extraRows } from "@adapttable/taiga-ui/extra-rows";
import { filters } from "@adapttable/taiga-ui/filters";
import { fullscreen } from "@adapttable/taiga-ui/fullscreen";
import { groupingPanel } from "@adapttable/taiga-ui/grouping-panel";
import { headerFilters } from "@adapttable/taiga-ui/header-filters";
import { nestedTable } from "@adapttable/taiga-ui/nested-table";
import { pinnedSummaryRows } from "@adapttable/taiga-ui/pinned-summary-rows";
import { AdaptPivotPanel, pivotTableModel } from "@adapttable/taiga-ui/pivot";
import { print } from "@adapttable/taiga-ui/print";
import { resizableColumns } from "@adapttable/taiga-ui/resizable-columns";
import { rowActions } from "@adapttable/taiga-ui/row-actions";
import { rowAppearance } from "@adapttable/taiga-ui/row-appearance";
import { rowPinning } from "@adapttable/taiga-ui/row-pinning";
import { rowReorder } from "@adapttable/taiga-ui/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/taiga-ui/saved-views";
import { sidePanel } from "@adapttable/taiga-ui/side-panel";
import { statusBar } from "@adapttable/taiga-ui/status-bar";
import { tree } from "@adapttable/taiga-ui/tree";
import { virtualize } from "@adapttable/taiga-ui/virtualize";
import { inject } from "@angular/core";
import { TUI_ASSETS_PATH } from "@taiga-ui/core";

import { SHOWCASE_ASSET_ROOT, type ShowcaseKit } from "../showcaseKit";

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "taiga-ui",
  root: AdaptTaigaRoot,
  providers: [
    ...provideAdaptTaiga(),
    {
      provide: TUI_ASSETS_PATH,
      useFactory: () => `${inject(SHOWCASE_ASSET_ROOT)}/taiga-ui/icons`,
    },
  ],
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
