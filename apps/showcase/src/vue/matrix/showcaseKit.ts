/** One kit selected at boot, shared by every demo and nested table. */
import type { agentApproval } from "@adapttable/vue-unstyled/assistant";
import type { bulkActions } from "@adapttable/vue-unstyled/bulk-actions";
import type { cellNavigation } from "@adapttable/vue-unstyled/cell-navigation";
import type { cellSpan } from "@adapttable/vue-unstyled/cell-span";
import type { collapsibleColumnGroups } from "@adapttable/vue-unstyled/column-groups";
import type { columnMenu } from "@adapttable/vue-unstyled/column-menu";
import type { columnSelectionCheckbox } from "@adapttable/vue-unstyled/column-selection";
import type { densityChooser } from "@adapttable/vue-unstyled/density";
import type {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/vue-unstyled/editing";
import type { exportCsv } from "@adapttable/vue-unstyled/export";
import type { filters } from "@adapttable/vue-unstyled/filters";
import type { fullscreen } from "@adapttable/vue-unstyled/fullscreen";
import type { groupingPanel } from "@adapttable/vue-unstyled/grouping-panel";
import type { headerFilters } from "@adapttable/vue-unstyled/header-filters";
import type { nestedTable } from "@adapttable/vue-unstyled/nested-table";
import type { pinnedSummaryRows } from "@adapttable/vue-unstyled/pinned-summary-rows";
import type { resizableColumns } from "@adapttable/vue-unstyled/resizable-columns";
import type { rowActions } from "@adapttable/vue-unstyled/row-actions";
import type { rowPinning } from "@adapttable/vue-unstyled/row-pinning";
import type { rowReorder } from "@adapttable/vue-unstyled/row-reorder";
import type { savedViews } from "@adapttable/vue-unstyled/saved-views";
import type { statusBar } from "@adapttable/vue-unstyled/status-bar";
import type { tree } from "@adapttable/vue-unstyled/tree";
import type { virtualize } from "@adapttable/vue-unstyled/virtualize";
import {
  type App,
  type Component,
  inject,
  type InjectionKey,
  type VNodeChild,
} from "vue";

import type { StatusRenderer } from "./data";

/** A plain kit button the demo itself needs, outside any table slot. */
export interface ShowcaseButtonProps {
  readonly label: string;
  readonly part: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

/** A plain kit choice the demo itself needs, outside any table slot. */
export interface ShowcaseSelectProps {
  readonly label: string;
  readonly part: string;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly disabled?: boolean;
  readonly onChange: (value: string) => void;
}

/** The page's appearance, as a kit's root and plugins read it. */
export interface ShowcaseAppearance {
  readonly dark: boolean;
  readonly dir: "ltr" | "rtl";
  readonly locale: string;
}

/** Only the components, factories and setup differ between kits. */
export interface ShowcaseKit {
  readonly key: string;
  /** Install the kit's own plugin before the app mounts, where it has one. */
  readonly install?: (app: App, appearance: ShowcaseAppearance) => void;
  /** Wraps everything under the seam: the kit's provider or app root. */
  readonly Root?: Component<{ dark: boolean; dir: "ltr" | "rtl" }>;
  /** Follow a theme change the kit reads outside its root. */
  readonly setDark?: (dark: boolean) => void;
  readonly DataTable: Component;
  readonly PivotPanel: Component;
  readonly TableAssistant: Component;
  /** The status column's cell, drawn as the kit's own tag or badge. */
  readonly status: StatusRenderer;
  readonly button: (props: ShowcaseButtonProps) => VNodeChild;
  readonly select: (props: ShowcaseSelectProps) => VNodeChild;
  readonly agentApproval: typeof agentApproval;
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
  readonly fullscreen: typeof fullscreen;
  readonly groupingPanel: typeof groupingPanel;
  readonly headerFilters: typeof headerFilters;
  readonly nestedTable: typeof nestedTable;
  readonly pinnedSummaryRows: typeof pinnedSummaryRows;
  readonly resizableColumns: typeof resizableColumns;
  readonly rowActions: typeof rowActions;
  readonly rowPinning: typeof rowPinning;
  readonly rowReorder: typeof rowReorder;
  readonly savedViews: typeof savedViews;
  readonly statusBar: typeof statusBar;
  readonly tree: typeof tree;
  readonly virtualize: typeof virtualize;
}

/** Supplied by the route entry, with no default or cross-kit fallback. */
export const SHOWCASE_KIT: InjectionKey<ShowcaseKit> = Symbol(
  "adapttable showcase kit"
);

/** The kit this page booted with. */
export function useShowcaseKit(): ShowcaseKit {
  const kit = inject(SHOWCASE_KIT);
  if (!kit) throw new Error("The showcase page was mounted without a kit");
  return kit;
}
