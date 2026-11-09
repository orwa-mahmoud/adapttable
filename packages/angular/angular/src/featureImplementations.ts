/**
 * The keys feature factories file their code under.
 *
 * The table reaches a feature's code through these keys instead of importing
 * it, so a table bundles only the code of the features it composes.
 */
import type {
  buildTreeEntries,
  closeFailedTreeNode,
  createGroupingPanelController,
  createRowReorderController,
  groupingIgnoredWarning,
  groupingPanelAggregations,
  groupingProjectionBundle,
  groupingSourceOf,
  isRowMovePending,
  partitionPinnedRows,
  projectGrouping,
  rowPinningControl,
  rowReorderRowAttributes,
  rowReorderRuntimeOptions,
  toggleTreeNode,
  treeExportExpandedIds,
} from "@adapttable/core";
import {
  featureStateKey,
  type groupingPanelState,
} from "@adapttable/core/binding";
import type { asBatchGesture } from "@adapttable/core/editing";

import type { editableCellController } from "./editing/editableCellController";
import type { injectTableEditHistory } from "./editing/editHistory";
import type { editingBundleFor } from "./editing/editingBundle";
import type { injectExportCsv } from "./export/exportHandler";
import type { injectFindInTable } from "./find/findInTable";
import type {
  findMarkAttrs,
  injectFindFocus,
  injectFindScroll,
  injectFindShortcut,
  injectFindWindowScroll,
} from "./find/findMarks";
import type { injectGroupCollapse } from "./grouping/groupCollapse";
import type { injectGroupPaging } from "./grouping/groupPaging";
import type { injectRowPinning } from "./rows/rowPinning";
import type { injectLazyChildren } from "./tree/lazyChildren";
import type { injectTreeExpansion } from "./tree/treeExpansion";
import type { injectRowPinningUrlState } from "./url/rowPinningUrlState";

/**
 * The code the edit-history feature brings.
 *
 * @public
 */
export interface EditHistoryImplementation {
  /** Builds the history the toolbar and the grid record into. */
  readonly inject: typeof injectTableEditHistory;
  /** Records a batch save as one undo step. */
  readonly batchGesture: typeof asBatchGesture;
}

/**
 * The code the find-in-table feature brings.
 *
 * @public
 */
export interface FindInTableImplementation {
  /** Builds the live find state. */
  readonly state: typeof injectFindInTable;
  /** Opens the bar from the keyboard. */
  readonly shortcut: typeof injectFindShortcut;
  /** Scrolls the current match into view. */
  readonly scroll: typeof injectFindScroll;
  /** Moves grid focus to the current match. */
  readonly focus: typeof injectFindFocus;
  /** Renders the current match in a virtual window. */
  readonly windowScroll: typeof injectFindWindowScroll;
  /** Marks matching cells. */
  readonly markAttrs: typeof findMarkAttrs;
}

/**
 * The code the row-reorder feature brings.
 *
 * @public
 */
export interface RowReorderImplementation {
  /** The drag and keyboard state machine. */
  readonly controller: typeof createRowReorderController;
  /** The controller's options from the live table. */
  readonly runtimeOptions: typeof rowReorderRuntimeOptions;
  /** A row's lifted and drop-target attributes. */
  readonly rowAttributes: typeof rowReorderRowAttributes;
  /** Whether a row waits on the host to confirm its move. */
  readonly isMovePending: typeof isRowMovePending;
}

/**
 * The code the grouping features bring.
 *
 * @public
 */
export interface GroupingImplementation {
  /** Which groups are closed. */
  readonly collapse: typeof injectGroupCollapse;
  /** How many groups, and rows per group, are shown. */
  readonly paging: typeof injectGroupPaging;
  /** The fields of the source grouping reads. */
  readonly sourceOf: typeof groupingSourceOf;
  /** Why grouping cannot apply to a source, when it cannot. */
  readonly ignoredWarning: typeof groupingIgnoredWarning;
  /** The grouped entries. */
  readonly project: typeof projectGrouping;
  /** The grouped model a kit renders. */
  readonly bundle: typeof groupingProjectionBundle;
}

/**
 * The code the grouping-panel feature brings.
 *
 * @public
 */
export interface GroupingPanelImplementation {
  /** The drag, keyboard and aggregate state machine. */
  readonly controller: typeof createGroupingPanelController;
  /** The panel's slot state. */
  readonly state: typeof groupingPanelState;
  /** Every active aggregation, and every column still on offer. */
  readonly aggregations: typeof groupingPanelAggregations;
}

/**
 * The code the tree feature brings.
 *
 * @public
 */
export interface TreeImplementation {
  /** Which nodes are open. */
  readonly expansion: typeof injectTreeExpansion;
  /** Children fetched as a node opens. */
  readonly lazyChildren: typeof injectLazyChildren;
  /** The walked hierarchy, in render order. */
  readonly entries: typeof buildTreeEntries;
  /** Every loaded node open, for an export of the whole tree. */
  readonly exportExpandedIds: typeof treeExportExpandedIds;
  /** Open or close a node, fetching its children as it opens. */
  readonly toggle: typeof toggleTreeNode;
  /** Close a node whose children failed to arrive. */
  readonly closeFailed: typeof closeFailedTreeNode;
}

/**
 * The code the row-pinning feature brings.
 *
 * @public
 */
export interface RowPinningImplementation {
  /** The pin lists the URL carries. */
  readonly url: typeof injectRowPinningUrlState;
  /** Whose pin lists win: the host's, the URL's or the table's own. */
  readonly control: typeof rowPinningControl;
  /** The live pin state and the pin actions. */
  readonly state: typeof injectRowPinning;
  /** Split the rows into the top stack, the body and the bottom stack. */
  readonly partition: typeof partitionPinnedRows;
}

/**
 * The keys a feature files its code under, and the table reads it from.
 *
 * @public
 */
export const FEATURE_IMPLEMENTATIONS = {
  /** The editing controllers, from the editing features. */
  editing: featureStateKey<typeof editingBundleFor>("editing"),
  /** Opens one cell's editor from the keyboard, from the editing features. */
  editableCell: featureStateKey<typeof editableCellController>("editable-cell"),
  /** Undo and redo, from `editHistory()`. */
  editHistory: featureStateKey<EditHistoryImplementation>("edit-history"),
  /** Find in table, from `findInTable()`. */
  findInTable: featureStateKey<FindInTableImplementation>("find-in-table"),
  /** The CSV export, from the export features. */
  exportCsv: featureStateKey<typeof injectExportCsv>("export-csv"),
  /** Row drag and keyboard reorder, from `rowReorder()`. */
  rowReorder: featureStateKey<RowReorderImplementation>("row-reorder"),
  /** The grouped model, from `grouping()` and `groupingPanel()`. */
  grouping: featureStateKey<GroupingImplementation>("grouping"),
  /** The grouping strip, from `groupingPanel()`. */
  groupingPanel: featureStateKey<GroupingPanelImplementation>("grouping-panel"),
  /** Pinned rows, from `rowPinning()`. */
  rowPinning: featureStateKey<RowPinningImplementation>("row-pinning"),
  /** The expandable tree, from `tree()`. */
  tree: featureStateKey<TreeImplementation>("tree"),
} as const;
