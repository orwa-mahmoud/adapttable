/** One kit selected at bootstrap, shared by every demo and nested table. */
import type { agentApproval } from "@adapttable/angular-unstyled/assistant";
import type { bulkActions } from "@adapttable/angular-unstyled/bulk-actions";
import type { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";
import type { cellSpan } from "@adapttable/angular-unstyled/cell-span";
import type { collapsibleColumnGroups } from "@adapttable/angular-unstyled/column-groups";
import type { columnMenu } from "@adapttable/angular-unstyled/column-menu";
import type { columnSelectionCheckbox } from "@adapttable/angular-unstyled/column-selection";
import type { densityChooser } from "@adapttable/angular-unstyled/density";
import type {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/angular-unstyled/editing";
import type { exportCsv } from "@adapttable/angular-unstyled/export";
import type { filters } from "@adapttable/angular-unstyled/filters";
import type { groupingPanel } from "@adapttable/angular-unstyled/grouping-panel";
import type { headerFilters } from "@adapttable/angular-unstyled/header-filters";
import type { nestedTable } from "@adapttable/angular-unstyled/nested-table";
import type { pinnedSummaryRows } from "@adapttable/angular-unstyled/pinned-summary-rows";
import type { pivotTableModel } from "@adapttable/angular-unstyled/pivot";
import type { resizableColumns } from "@adapttable/angular-unstyled/resizable-columns";
import type { rowActions } from "@adapttable/angular-unstyled/row-actions";
import type { rowPinning } from "@adapttable/angular-unstyled/row-pinning";
import type { rowReorder } from "@adapttable/angular-unstyled/row-reorder";
import type { savedViews } from "@adapttable/angular-unstyled/saved-views";
import type { tree } from "@adapttable/angular-unstyled/tree";
import type { virtualize } from "@adapttable/angular-unstyled/virtualize";
import {
  type EnvironmentProviders,
  InjectionToken,
  type Provider,
  type Type,
} from "@angular/core";

/** Only the host component types and feature factories differ between kits. */
export interface ShowcaseKit {
  readonly key: "unstyled" | "ng-zorro";
  readonly providers: readonly (Provider | EnvironmentProviders)[];
  readonly table: Type<unknown>;
  readonly pivotPanel: Type<unknown>;
  readonly assistant: Type<unknown>;
  readonly bulkActions: typeof bulkActions;
  readonly cellNavigation: typeof cellNavigation;
  readonly cellSpan: typeof cellSpan;
  readonly collapsibleColumnGroups: typeof collapsibleColumnGroups;
  readonly columnMenu: typeof columnMenu;
  readonly columnSelectionCheckbox: typeof columnSelectionCheckbox;
  readonly densityChooser: typeof densityChooser;
  readonly editHistory: typeof editHistory;
  readonly editing: typeof editing;
  readonly undoRedoButtons: typeof undoRedoButtons;
  readonly exportCsv: typeof exportCsv;
  readonly filters: typeof filters;
  readonly groupingPanel: typeof groupingPanel;
  readonly headerFilters: typeof headerFilters;
  readonly nestedTable: typeof nestedTable;
  readonly pinnedSummaryRows: typeof pinnedSummaryRows;
  readonly pivotTableModel: typeof pivotTableModel;
  readonly resizableColumns: typeof resizableColumns;
  readonly rowActions: typeof rowActions;
  readonly rowPinning: typeof rowPinning;
  readonly rowReorder: typeof rowReorder;
  readonly savedViews: typeof savedViews;
  readonly tree: typeof tree;
  readonly virtualize: typeof virtualize;
  readonly agentApproval: typeof agentApproval;
}

/** Supplied by the route entry, with no default or cross-kit fallback. */
export const SHOWCASE_KIT = new InjectionToken<ShowcaseKit>(
  "adapttable showcase kit"
);
