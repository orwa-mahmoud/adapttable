/**
 * The state each feature publishes under its own key, for the controls a kit
 * draws elsewhere in the table — a toolbar button reads its feature's key and
 * nothing the base names.
 */
import type {
  ActiveFilterChip,
  EditHistoryState,
  GroupAggregatesFn,
  GroupByInput,
  GroupedFlatEntry,
  RowAction,
  TreeEntry,
  TreeShape,
} from "@adapttable/core";
import { featureStateKey } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import type { EditableCellEditing } from "../editing/editableCellController";
import type { ExportHandlerState } from "../export/useExportHandler";
import type { GroupCollapseState } from "../grouping/useGroupCollapse";
import type { KitRegionProps } from "../kit/rootRegion";
import type { FullscreenState } from "../layout/useFullscreen";
import type { RowMutationsState } from "../rows/rowMutations";
import type { RowPinningState } from "../rows/rowPinning";
import type { RowExpansionState } from "../rows/useRowExpansion";
import type { DataTableShellChromeProps } from "../shell/shellContract";
import type { TreeExpansionState } from "../tree/useTreeExpansion";

/**
 * The active filters' chips and count.
 *
 * @public
 */
export interface FilterChipsState {
  /** The removable chips: label-driven, the host's `extraChips`, the tree's. */
  readonly chips: readonly ActiveFilterChip[];
  /** The badge count: the host's override, or the chip count. */
  readonly activeFilterCount: number;
}

/** The active filters' chips, published by the filter-chips stage. */
export const FILTER_CHIPS_STATE =
  featureStateKey<FilterChipsState>("filter-chips");

/**
 * The row-detail renderer and the expansion state its chevrons drive.
 *
 * @public
 */
export interface RowDetailState<TRow = unknown> {
  /** The detail-panel renderer. */
  readonly render: (row: TRow) => ReactNode;
  /** Which rows are expanded. */
  readonly expansion: RowExpansionState;
}

/** The row detail, published by the expansion stage. */
export const ROW_DETAIL_STATE = featureStateKey<RowDetailState>("row-detail");

/**
 * The row actions column and the row mutations behind it.
 *
 * @public
 */
export interface RowActionsState<TRow = unknown> {
  /** Adding, duplicating and deleting rows. */
  readonly rowMutations: RowMutationsState<TRow>;
  /** The trailing column's actions, host and built-in. */
  readonly rowActions: RowAction<TRow>[] | undefined;
  /** Whether that column renders. */
  readonly hasRowActions: boolean;
}

/** The row actions, published by the row-actions and row-pinning stages. */
export const ROW_ACTIONS_STATE =
  featureStateKey<RowActionsState>("row-actions");

/** The row pins, published by the row-pinning stage. */
export const ROW_PINNING_STATE =
  featureStateKey<RowPinningState<unknown>>("row-pinning");

/**
 * The grouped rows and the grouping's controls.
 *
 * @public
 */
export interface GroupingState<TRow = unknown> {
  /** The grouping keys in order — one entry for a flat group, more for nested. */
  readonly groupBy: readonly string[];
  readonly collapsed: GroupCollapseState;
  readonly aggregates?: GroupAggregatesFn<TRow>;
  /** Flat group-header + leaf entries for adapters to render. */
  readonly entries: readonly GroupedFlatEntry<TRow>[];
  readonly setGroupBy: (key: GroupByInput) => void;
  /** Open every group. */
  readonly expandAll: () => void;
  /** Close every group, at every level. */
  readonly collapseAll: () => void;
  /**
   * Show the tree down to `depth` and no further — `0` leaves only the
   * outermost headers, `1` opens the first level inside them.
   */
  readonly collapseToDepth: (depth: number) => void;
  /** Reveal the next page of groups, or of one group's rows. */
  readonly showMore: (entry: {
    scope: "groups" | "rows";
    groupKey?: string;
  }) => void;
}

/** The grouping, published by the grouping stage. */
export const GROUPING_STATE = featureStateKey<GroupingState>("grouping");

/**
 * The flattened hierarchy and its expansion.
 *
 * @public
 */
export interface TreeState<TRow = unknown> {
  /** The flattened hierarchy, in render order. */
  readonly entries: readonly TreeEntry<TRow>[];
  /** Every loaded node, including descendants of collapsed parents. */
  readonly allEntries?: readonly TreeEntry<TRow>[];
  /** Loaded descendants to read within an export's source scope. */
  readonly getChildren?: NonNullable<TreeShape<TRow>["getChildren"]>;
  /** Flat ancestry to reconstruct within an export's source scope. */
  readonly getParentId?: NonNullable<TreeShape<TRow>["getParentId"]>;
  /** Which nodes are open. */
  readonly expansion: TreeExpansionState;
  /** Which column carries the chevron and the indent. */
  readonly columnKey?: string;
}

/** The tree, published by the tree stage. */
export const TREE_STATE = featureStateKey<TreeState>("tree");

/**
 * The live column layout's sizing actions.
 *
 * @public
 */
export interface ColumnSizingState {
  /** Size every visible column to its content. */
  readonly autoSizeColumns: () => void;
  /** Size one column to its content. */
  readonly autoSizeColumn: (key: string) => void;
}

/** The live column layout, published by the column-layout stage. */
export const COLUMN_SIZING_STATE =
  featureStateKey<ColumnSizingState>("column-sizing");

/** The armed cell editing, published by the editing stage. */
export const EDITING_STATE =
  featureStateKey<EditableCellEditing<unknown>>("editing");

/** Undo and redo, published by the edit-history stage. */
export const EDIT_HISTORY_STATE =
  featureStateKey<EditHistoryState<unknown>>("edit-history");

/** The export control's state, published by the export stage. */
export const EXPORT_STATE = featureStateKey<ExportHandlerState>("export");

/** Fullscreen, published by the fullscreen stage. */
export const FULLSCREEN_STATE = featureStateKey<FullscreenState>("fullscreen");

/**
 * The table's finished props, features applied: what a feature's control
 * reads of the host's own options (the print callback, the density).
 */
export const TABLE_PROPS_STATE =
  featureStateKey<DataTableShellChromeProps<unknown>>("table-props");

/**
 * The composition's finished view and the table's props, for a toolbar entry
 * that builds its control from both (saved views, the column menu).
 */
export const TABLE_REGION_STATE =
  featureStateKey<KitRegionProps<unknown>>("table-region");
