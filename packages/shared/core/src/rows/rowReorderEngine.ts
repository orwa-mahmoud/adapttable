/**
 * Row reordering — the asking, never the data.
 *
 * The engine every binding shares: the keyboard grab model (Space lifts,
 * arrows move, Space drops, Escape cancels, each step announced), pointer
 * drag and drop, the mobile neighbour swap, and the resolution of a drop
 * inside grouped or tree rows into a same-scope reorder, a cross-boundary
 * move, or a rejection. Adapters keep the grip, the mobile buttons and the
 * destination menu.
 *
 * The table never mutates the array; `onRowReorder(from, to, row)` is the same
 * one-way write as `onCellEdit`. `from` / `to` are dataset-relative: the row's
 * index in the current source plus the page offset (`windowStart`), so a
 * virtual window or a paged slice does not lie to the host about where the row
 * sits.
 */
import type { GroupedFlatEntry } from "../grouping/groupRows";
import { isRtlElement } from "../layout/writingDirection";
import type { TreeEntry } from "../tree/treeRows";
import {
  type RowDropPosition,
  rowDropPosition,
  type RowMoveConfirmHandler,
  type RowMoveMenuModel,
  type RowMovePolicy,
  type RowMoveRequest,
  type RowMoveTarget,
  type RowReorderOptions,
  type RowTreeParentRef,
  treeMoveCreatesCycle,
} from "./rowMove";

/**
 * MIME type carrying the dragged row id during a reorder drag.
 *
 * @public
 */
export const ROW_DND_MIME = "application/x-adapttable-row";

/**
 * Move `from` to `to` in a copy of `rows`. Out-of-range is a no-op copy.
 *
 * @public
 */
export function applyRowReorder<T>(
  rows: readonly T[],
  from: number,
  to: number
): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= rows.length ||
    to >= rows.length
  ) {
    return rows.slice();
  }
  const next = rows.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return rows.slice();
  next.splice(to, 0, item);
  return next;
}

/**
 * Dataset-relative index: the rendered slot plus the page/window offset.
 *
 * @public
 */
export function datasetIndex(localIndex: number, windowStart: number): number {
  return windowStart + localIndex;
}

/**
 * What a host receives when the reader drops a row.
 *
 * @public
 */
export type RowReorderHandler<TRow> = (
  from: number,
  to: number,
  row: TRow
) => void;

/**
 * Resolution of one visual row drop.
 *
 * @public
 */
export type RowReorderDecision<TRow> =
  | {
      readonly kind: "reorder";
      readonly from: number;
      readonly to: number;
      readonly row: TRow;
    }
  | {
      readonly kind: "move";
      readonly request: RowMoveRequest<TRow>;
    }
  | {
      readonly kind: "reject";
      readonly message: string;
    };

/**
 * Labels the reorder handle and the live region need.
 *
 * @public
 */
export interface RowReorderLabels {
  /** Accessible name for the drag grip. */
  reorderRow: string;
  /** Move the row up one place. */
  moveRowUp: string;
  /** Move the row down one place. */
  moveRowDown: string;
  /** Announced when a row is picked up. */
  rowLifted: (position: number) => string;
  /** Announced when a row lands. */
  rowMoved: (from: number, to: number) => string;
  /** Announced when a reorder is abandoned. */
  rowReorderCancelled: string;
  /** Announced after a cross-group move. */
  rowMovedToGroup?: (group: string) => string;
  /** Announced after a tree re-parent. */
  rowMovedUnder?: (parent: string) => string;
  /** Cross-boundary moves were disabled by policy. */
  moveRejectedPolicyNever?: string;
  /** Visual order cannot be written while a sort owns it. */
  moveRejectedSorted?: string;
  /** A tree node cannot become its own ancestor. */
  moveRejectedCycle?: string;
  /** The host did not provide the matching move callback. */
  moveUnavailable?: string;
  /** Label for the tree's root level. */
  rootLevel?: string;
  /** Opens the group destination menu. */
  moveToGroup?: string;
  /** Opens the tree-parent destination menu. */
  moveUnder?: string;
  /** Heading on a pending move confirmation. */
  confirmRowMoveTitle?: string;
  /** Concrete source and destination shown before a move. */
  confirmRowMoveDescription?: (row: string, from: string, to: string) => string;
  /** Approves a pending move. */
  confirmRowMove?: string;
  /** Cancels a pending move. */
  cancel?: string;
}

/**
 * What the reorder engine speaks and names, every label resolved.
 *
 * @public
 */
export type RowReorderAnnouncements = Required<
  Pick<
    RowReorderLabels,
    | "rowLifted"
    | "rowMoved"
    | "rowReorderCancelled"
    | "rowMovedToGroup"
    | "rowMovedUnder"
    | "moveRejectedPolicyNever"
    | "moveRejectedSorted"
    | "moveRejectedCycle"
    | "moveUnavailable"
    | "rootLevel"
    | "moveToGroup"
    | "moveUnder"
  >
>;

/**
 * The built-in English for {@link RowReorderAnnouncements}.
 *
 * @public
 */
export const defaultRowReorderAnnouncements: RowReorderAnnouncements = {
  rowLifted: (position) => `Row lifted, position ${String(position)}`,
  rowMoved: (from, to) => `Row moved from ${String(from)} to ${String(to)}`,
  rowReorderCancelled: "Reorder cancelled",
  rowMovedToGroup: (group) => `Row moved to ${group}`,
  rowMovedUnder: (parent) => `Row moved under ${parent}`,
  moveRejectedPolicyNever: "Cross-boundary row moves are disabled",
  moveRejectedSorted: "Clear sorting before changing row order",
  moveRejectedCycle: "A row cannot move inside itself or its descendant",
  moveUnavailable: "This row move is not available",
  rootLevel: "Top level",
  moveToGroup: "Move to group…",
  moveUnder: "Move under…",
};

/**
 * Read the announcements off whatever labels the table resolved, falling back
 * to the built-in English per label.
 *
 * They are only ever used to speak — inside a commit, a lift or a cancel — so
 * each is read at that moment rather than captured once, which lets the
 * engine be created before the table has resolved its labels.
 *
 * @param read - Returns the table's resolved labels, when there are any.
 * @returns Announcements that read through on every access.
 *
 * @public
 */
export function rowReorderAnnouncements(
  read: () => Readonly<Record<string, unknown>> | undefined
): RowReorderAnnouncements {
  const of = <K extends keyof RowReorderAnnouncements>(
    key: K
  ): RowReorderAnnouncements[K] =>
    (read()?.[key] ??
      defaultRowReorderAnnouncements[key]) as RowReorderAnnouncements[K];
  return {
    rowLifted: (position) => of("rowLifted")(position),
    rowMoved: (from, to) => of("rowMoved")(from, to),
    rowMovedToGroup: (group) => of("rowMovedToGroup")(group),
    rowMovedUnder: (parent) => of("rowMovedUnder")(parent),
    get rowReorderCancelled() {
      return of("rowReorderCancelled");
    },
    get moveRejectedPolicyNever() {
      return of("moveRejectedPolicyNever");
    },
    get moveRejectedSorted() {
      return of("moveRejectedSorted");
    },
    get moveRejectedCycle() {
      return of("moveRejectedCycle");
    },
    get moveUnavailable() {
      return of("moveUnavailable");
    },
    get rootLevel() {
      return of("rootLevel");
    },
    get moveToGroup() {
      return of("moveToGroup");
    },
    get moveUnder() {
      return of("moveUnder");
    },
  };
}

/* ── Grouped and tree move resolution ──────────────────────────────── */

/**
 * The table shape a nested move is resolved against.
 *
 * @public
 */
export interface RowMoveView<TRow> {
  /** Stable row identity. */
  readonly getRowId: (row: TRow) => string;
  /** A row's human-readable name, for announcements and the move menu. */
  readonly rowLabel: (row: TRow) => string;
  /** The sorted column, when a sort owns the visual order. */
  readonly sortBy?: string;
  /** The grouped rows, when the table is grouped. */
  readonly grouping?: { readonly entries: readonly GroupedFlatEntry<TRow>[] };
  /** The tree rows, when the table is a tree. */
  readonly tree?: {
    readonly entries: readonly TreeEntry<TRow>[];
    readonly allEntries?: readonly TreeEntry<TRow>[];
  };
}

/**
 * One drop: the dragged row, the row it landed on, and the edge.
 *
 * @public
 */
export interface RowMoveDrop<TRow> {
  /** The dragged row. */
  readonly row: TRow;
  /** The row it was dropped on. */
  readonly target: TRow;
  /** The edge, or the middle of a tree row. */
  readonly position: RowDropPosition;
}

function parentRef<TRow>(
  parentId: string | undefined,
  entries: readonly TreeEntry<TRow>[],
  rowLabel: (row: TRow) => string,
  rootLevel: string
): RowTreeParentRef<TRow> {
  if (parentId === undefined) {
    return { id: null, row: null, label: rootLevel };
  }
  const parent = entries.find((entry) => entry.key === parentId)?.row ?? null;
  return {
    id: parentId,
    row: parent,
    label: parent === null ? parentId : rowLabel(parent),
  };
}

function reorderDecision<TRow>(
  row: TRow,
  from: number,
  to: number,
  sortBy: string | undefined,
  labels: RowReorderAnnouncements
): RowReorderDecision<TRow> {
  return sortBy
    ? { kind: "reject", message: labels.moveRejectedSorted }
    : { kind: "reorder", from, to, row };
}

function sameScopeDestination(
  from: number,
  target: number,
  position: RowDropPosition
): number {
  if (position === "before") return from < target ? target - 1 : target;
  if (position === "after") return from > target ? target + 1 : target;
  return target;
}

function resolveGroupedMove<TRow>(
  view: RowMoveView<TRow>,
  grouping: { readonly entries: readonly GroupedFlatEntry<TRow>[] },
  drop: RowMoveDrop<TRow>,
  options: RowReorderOptions<TRow> | undefined,
  labels: RowReorderAnnouncements
): RowReorderDecision<TRow> {
  const { row, position } = drop;
  const sourceEntry = grouping.entries.find(
    (entry) => entry.kind === "row" && entry.key === view.getRowId(drop.row)
  );
  const targetEntry = grouping.entries.find(
    (entry) => entry.kind === "row" && entry.key === view.getRowId(drop.target)
  );
  if (
    sourceEntry?.kind !== "row" ||
    targetEntry?.kind !== "row" ||
    !sourceEntry.group ||
    !targetEntry.group
  ) {
    return { kind: "reject", message: labels.moveUnavailable };
  }
  const from = sourceEntry.groupPosition ?? sourceEntry.index;
  const to = targetEntry.groupPosition ?? targetEntry.index;
  if (sourceEntry.group.id === targetEntry.group.id) {
    return reorderDecision(
      row,
      from,
      sameScopeDestination(from, to, position),
      view.sortBy,
      labels
    );
  }
  if ((options?.movePolicy ?? "never") === "never") {
    return { kind: "reject", message: labels.moveRejectedPolicyNever };
  }
  if (!options?.onGroupMove) {
    return { kind: "reject", message: labels.moveUnavailable };
  }
  return {
    kind: "move",
    request: {
      kind: "group",
      row,
      rowLabel: view.rowLabel(row),
      fromGroup: sourceEntry.group,
      toGroup: targetEntry.group,
      position: to + (position === "after" ? 1 : 0),
    },
  };
}

/**
 * Where a re-parented row lands among its new siblings: after the last child
 * for a drop on the middle of a node, beside the node for an edge drop. A
 * re-parent always leaves a different sibling list, so the node's own index is
 * the insertion point.
 */
function treeDestinationPosition<TRow>(
  entries: readonly TreeEntry<TRow>[],
  targetEntry: TreeEntry<TRow>,
  position: RowDropPosition
): number {
  if (position === "inside") {
    return entries.filter((entry) => entry.parentId === targetEntry.key).length;
  }
  return (targetEntry.siblingIndex ?? 0) + (position === "after" ? 1 : 0);
}

function resolveTreeMove<TRow>(
  view: RowMoveView<TRow>,
  tree: NonNullable<RowMoveView<TRow>["tree"]>,
  drop: RowMoveDrop<TRow>,
  options: RowReorderOptions<TRow> | undefined,
  labels: RowReorderAnnouncements
): RowReorderDecision<TRow> {
  const { row, target, position } = drop;
  const entries = tree.allEntries ?? tree.entries;
  const rowId = view.getRowId(row);
  const targetId = view.getRowId(target);
  const sourceEntry = entries.find((entry) => entry.key === rowId);
  const targetEntry = entries.find((entry) => entry.key === targetId);
  if (!sourceEntry || !targetEntry) {
    return { kind: "reject", message: labels.moveUnavailable };
  }
  const sourceParentId = sourceEntry.parentId;
  const targetParentId =
    position === "inside" ? targetEntry.key : targetEntry.parentId;
  const from = sourceEntry.siblingIndex ?? 0;
  const targetSibling = targetEntry.siblingIndex ?? 0;
  if (sourceParentId === targetParentId && position !== "inside") {
    return reorderDecision(
      row,
      from,
      sameScopeDestination(from, targetSibling, position),
      view.sortBy,
      labels
    );
  }
  if (
    treeMoveCreatesCycle(
      rowId,
      sourceEntry.descendantIds,
      targetParentId ?? null
    )
  ) {
    return { kind: "reject", message: labels.moveRejectedCycle };
  }
  if ((options?.movePolicy ?? "never") === "never") {
    return { kind: "reject", message: labels.moveRejectedPolicyNever };
  }
  if (!options?.onTreeMove) {
    return { kind: "reject", message: labels.moveUnavailable };
  }
  return {
    kind: "move",
    request: {
      kind: "tree",
      row,
      rowLabel: view.rowLabel(row),
      fromParent: parentRef(
        sourceParentId,
        entries,
        view.rowLabel,
        labels.rootLevel
      ),
      toParent: parentRef(
        targetParentId,
        entries,
        view.rowLabel,
        labels.rootLevel
      ),
      position: treeDestinationPosition(entries, targetEntry, position),
    },
  };
}

/**
 * Resolve a drop inside grouped or tree rows: a reorder within one group or
 * one parent, a cross-boundary move, or a rejection that says why. A flat
 * table under a sort rejects, since the sort owns the visual order; a flat
 * unsorted table resolves to `undefined` and reorders by index.
 *
 * @param view - The table shape.
 * @param drop - The dragged row, the row it landed on, and the edge.
 * @param options - The feature's nested-move options.
 * @param labels - The resolved announcements.
 * @returns The decision, or `undefined` for a plain flat reorder.
 *
 * @public
 */
export function resolveRowMove<TRow>(
  view: RowMoveView<TRow>,
  drop: RowMoveDrop<TRow>,
  options: RowReorderOptions<TRow> | undefined,
  labels: RowReorderAnnouncements
): RowReorderDecision<TRow> | undefined {
  if (view.grouping) {
    return resolveGroupedMove(view, view.grouping, drop, options, labels);
  }
  if (view.tree) return resolveTreeMove(view, view.tree, drop, options, labels);
  return view.sortBy
    ? { kind: "reject", message: labels.moveRejectedSorted }
    : undefined;
}

function groupMoveMenu<TRow>(
  view: RowMoveView<TRow>,
  grouping: { readonly entries: readonly GroupedFlatEntry<TRow>[] },
  row: TRow,
  options: RowReorderOptions<TRow> | undefined,
  labels: RowReorderAnnouncements,
  policyReason: string | undefined
): RowMoveMenuModel<TRow> | undefined {
  const rowId = view.getRowId(row);
  const source = grouping.entries.find(
    (entry) => entry.kind === "row" && entry.key === rowId
  );
  if (source?.kind !== "row" || !source.group) return undefined;
  const fromGroup = source.group;
  const deepestGroup = Math.max(
    ...grouping.entries.flatMap((entry) =>
      (entry.kind === "row" || entry.kind === "group") && entry.group
        ? [entry.group.levels.length]
        : []
    )
  );
  const groups = new Map(
    grouping.entries.flatMap((entry) =>
      (entry.kind === "row" || entry.kind === "group") &&
      entry.group?.levels.length === deepestGroup
        ? [[entry.group.id, entry.group] as const]
        : []
    )
  );
  const disabledReason =
    policyReason ?? (options?.onGroupMove ? undefined : labels.moveUnavailable);
  const targets = [...groups.values()]
    .filter((group) => group.id !== fromGroup.id)
    .map((group): RowMoveTarget<TRow> => {
      const position = grouping.entries.filter(
        (entry) => entry.kind === "row" && entry.group?.id === group.id
      ).length;
      return {
        id: group.id,
        label: group.label,
        request: disabledReason
          ? undefined
          : {
              kind: "group",
              row,
              rowLabel: view.rowLabel(row),
              fromGroup,
              toGroup: group,
              position,
            },
        disabledReason,
      };
    });
  return { kind: "group", label: labels.moveToGroup, targets };
}

function treeMoveMenu<TRow>(
  view: RowMoveView<TRow>,
  tree: NonNullable<RowMoveView<TRow>["tree"]>,
  row: TRow,
  options: RowReorderOptions<TRow> | undefined,
  labels: RowReorderAnnouncements,
  policyReason: string | undefined
): RowMoveMenuModel<TRow> | undefined {
  const entries = tree.allEntries ?? tree.entries;
  const rowId = view.getRowId(row);
  const source = entries.find((entry) => entry.key === rowId);
  if (!source) return undefined;
  const targetEntries: (TreeEntry<TRow> | null)[] = [null, ...entries];
  const targets = targetEntries
    .filter((entry) => (entry?.key ?? undefined) !== source.parentId)
    .filter((entry) => entry?.key !== rowId)
    .map((entry): RowMoveTarget<TRow> => {
      const parentId = entry?.key;
      const cycle = treeMoveCreatesCycle(
        rowId,
        source.descendantIds,
        parentId ?? null
      );
      const disabledReason =
        (cycle ? labels.moveRejectedCycle : undefined) ??
        policyReason ??
        (options?.onTreeMove ? undefined : labels.moveUnavailable);
      const toParent = parentRef(
        parentId,
        entries,
        view.rowLabel,
        labels.rootLevel
      );
      return {
        id: parentId ?? "__root__",
        label: toParent.label,
        request: disabledReason
          ? undefined
          : {
              kind: "tree",
              row,
              rowLabel: view.rowLabel(row),
              fromParent: parentRef(
                source.parentId,
                entries,
                view.rowLabel,
                labels.rootLevel
              ),
              toParent,
              position: entries.filter(
                (candidate) => candidate.parentId === parentId
              ).length,
            },
        disabledReason,
      };
    });
  return { kind: "tree", label: labels.moveUnder, targets };
}

/**
 * The keyboard and touch destinations for one row: every other deepest-level
 * group in a grouped table, every other parent (and the root) in a tree, each
 * disabled with its reason where policy, a missing handler or a cycle forbids
 * it. `undefined` for a flat table.
 *
 * @param view - The table shape.
 * @param row - The row to move.
 * @param options - The feature's nested-move options.
 * @param labels - The resolved announcements.
 * @returns The menu, or `undefined`.
 *
 * @public
 */
export function rowMoveMenu<TRow>(
  view: RowMoveView<TRow>,
  row: TRow,
  options: RowReorderOptions<TRow> | undefined,
  labels: RowReorderAnnouncements
): RowMoveMenuModel<TRow> | undefined {
  const policyReason =
    (options?.movePolicy ?? "never") === "never"
      ? labels.moveRejectedPolicyNever
      : undefined;
  if (view.grouping) {
    return groupMoveMenu(
      view,
      view.grouping,
      row,
      options,
      labels,
      policyReason
    );
  }
  if (view.tree) {
    return treeMoveMenu(view, view.tree, row, options, labels, policyReason);
  }
  return undefined;
}

/* ── The reorder controller ────────────────────────────────────────── */

/**
 * What a row-reorder controller is configured with.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface RowReorderControllerOptions<TRow> {
  /** Whether reordering is on; when false every gesture resets. */
  enabled: boolean;
  /** The host's write for a reorder. */
  onRowReorder?: RowReorderHandler<TRow>;
  /** Cross-boundary policy. Defaults to `"never"`. */
  movePolicy?: RowMovePolicy;
  /** Host-owned confirmation for a cross-boundary move. */
  confirmMove?: RowMoveConfirmHandler<TRow>;
  /** The host's write for a cross-boundary move. */
  onRowMove?: (request: RowMoveRequest<TRow>) => unknown;
  /** Keyboard/touch destinations for a row, when nested. */
  getMoveMenu?: (row: TRow) => RowMoveMenuModel<TRow> | undefined;
  /** Resolve a drop inside grouped or tree rows. */
  resolveMove?: (
    row: TRow,
    target: TRow,
    position: RowDropPosition
  ) => RowReorderDecision<TRow> | undefined;
  /**
   * The labels the engine speaks. The other three on
   * {@link RowReorderLabels} name the grip and its mobile buttons, which the
   * adapter draws from the table's own labels.
   */
  labels: Pick<
    RowReorderLabels,
    "rowLifted" | "rowMoved" | "rowReorderCancelled"
  > &
    Partial<
      Pick<
        RowReorderLabels,
        "rowMovedToGroup" | "rowMovedUnder" | "moveRejectedPolicyNever"
      >
    >;
  /** Look up a row in the current source by its rendered index. */
  rowAt: (localIndex: number) => TRow | undefined;
  /** Stable identity used to attach confirmation to its rendered row. */
  getRowId?: (row: TRow) => string;
}

/**
 * The reorder state at one moment.
 *
 * @public
 */
export interface RowReorderSnapshot<TRow> {
  /** The lifted row, or `null` when idle. */
  readonly lifted: { readonly rowId: string; readonly from: number } | null;
  /** Hovered drop index (local), or `null`. */
  readonly overIndex: number | null;
  /** Hovered edge, including the middle tree re-parent target. */
  readonly overPosition: RowDropPosition | null;
  /** Move awaiting kit-owned confirmation, or `null`. */
  readonly pendingMove: RowMoveRequest<TRow> | null;
  /** Host-owned `confirmMove` is awaiting a decision. */
  readonly hostConfirmPending: boolean;
  /** Live-region text. Empty until something happens. */
  readonly announcement: string;
}

/**
 * The parts of a drag event the engine reads — a DOM `DragEvent` fits.
 *
 * @public
 */
export interface RowDragEvent {
  /** The drag's data store. */
  readonly dataTransfer: Pick<
    DataTransfer,
    "setData" | "getData" | "effectAllowed" | "dropEffect"
  >;
  /** The pointer's vertical position. */
  readonly clientY: number;
  /** The row element the handler is attached to. */
  readonly currentTarget: {
    getBoundingClientRect?: () => Pick<DOMRect, "top" | "height">;
  } | null;
  /** Keep the browser's own handling of the event. */
  preventDefault: () => void;
}

/**
 * A key press on a row's grip.
 *
 * @public
 */
export interface RowKeyEvent {
  /** The key. */
  readonly key: string;
  /** The grip element, for its writing direction. */
  readonly currentTarget: HTMLElement | null;
  /** Keep the browser's own handling of the key. */
  preventDefault: () => void;
}

/**
 * One row's position in the rendered window, for a gesture on it.
 *
 * @public
 */
export interface RowReorderSlot<TRow> {
  /** The row's stable id. */
  readonly rowId: string;
  /** The row's index in the rendered window. */
  readonly localIndex: number;
  /** The row. */
  readonly row: TRow;
  /** Where the rendered window starts in the dataset. */
  readonly windowStart: number;
  /** Rows in the rendered window. */
  readonly rowCount: number;
}

/**
 * Row reordering for one table.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface RowReorderController<TRow> {
  /** The current state. A new object whenever anything in it changes. */
  readonly getSnapshot: () => RowReorderSnapshot<TRow>;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: RowReorderControllerOptions<TRow>) => void;
  /**
   * Mark the table mounted. Returns the teardown, after which a host
   * confirmation still in flight settles into nothing.
   */
  readonly connect: () => () => void;
  /** A drag started from a row's grip. */
  readonly dragStart: (
    event: RowDragEvent,
    rowId: string,
    localIndex: number
  ) => void;
  /** A drag ended, dropped or not. */
  readonly dragEnd: () => void;
  /** A drag moved over a row. */
  readonly dragOver: (event: RowDragEvent, localIndex: number) => void;
  /** A drag dropped on a row. */
  readonly drop: (
    event: RowDragEvent,
    localIndex: number,
    row: TRow,
    windowStart: number
  ) => void;
  /** Keyboard: Space lifts / drops, arrows move, Escape cancels. */
  readonly keyDown: (event: RowKeyEvent, slot: RowReorderSlot<TRow>) => void;
  /** Mobile: swap with the neighbour. */
  readonly moveBy: (
    localIndex: number,
    delta: -1 | 1,
    row: TRow,
    windowStart: number,
    rowCount: number
  ) => void;
  /** Keyboard/touch destinations for this row, when nested. */
  readonly moveMenu: (row: TRow) => RowMoveMenuModel<TRow> | undefined;
  /** Select a destination from the move menu. */
  readonly selectMoveTarget: (target: RowMoveTarget<TRow>) => void;
  /** Confirm the move shown by the kit confirmation surface. */
  readonly confirmMove: () => void;
  /** Cancel the move shown by the kit confirmation surface. */
  readonly cancelMove: () => void;
}

const IDLE = {
  lifted: null,
  overIndex: null,
  overPosition: null,
  pendingMove: null,
  hostConfirmPending: false,
  announcement: "",
} as const;

function isGrabKey(key: string): boolean {
  return key === " " || key === "Spacebar";
}

function arrowDelta(key: string, rtl: boolean): -1 | 0 | 1 {
  if (key === "ArrowDown" || key === (rtl ? "ArrowLeft" : "ArrowRight")) {
    return 1;
  }
  if (key === "ArrowUp" || key === (rtl ? "ArrowRight" : "ArrowLeft")) {
    return -1;
  }
  return 0;
}

/**
 * Create the row-reorder controller for one table.
 *
 * @typeParam TRow - The row type.
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createRowReorderController<TRow>(
  initial: RowReorderControllerOptions<TRow>
): RowReorderController<TRow> {
  let options = initial;
  let snapshot: RowReorderSnapshot<TRow> = IDLE;
  let mounted = true;
  let nextConfirmToken = 0;
  let activeConfirmToken = 0;
  let batchDepth = 0;
  let changed = false;
  const listeners = new Set<() => void>();

  const flush = (): void => {
    if (batchDepth > 0 || !changed) return;
    changed = false;
    for (const listener of listeners) listener();
  };

  const write = (patch: Partial<RowReorderSnapshot<TRow>>): void => {
    const next = { ...snapshot, ...patch };
    const keys = Object.keys(next) as (keyof RowReorderSnapshot<TRow>)[];
    if (keys.every((key) => next[key] === snapshot[key])) return;
    snapshot = next;
    changed = true;
    flush();
  };

  /** Run several writes as one change, so listeners hear the end state. */
  const batch = (run: () => void): void => {
    batchDepth += 1;
    try {
      run();
    } finally {
      batchDepth -= 1;
      flush();
    }
  };

  const say = (announcement: string): void => {
    write({ announcement });
  };

  const isLocked = (): boolean =>
    activeConfirmToken !== 0 || snapshot.pendingMove !== null;

  const reset = (): void => {
    write({ lifted: null, overIndex: null, overPosition: null });
  };

  const announceMove = (request: RowMoveRequest<TRow>): void => {
    const { labels } = options;
    say(
      request.kind === "group"
        ? (labels.rowMovedToGroup?.(request.toGroup.label) ??
            `Row moved to ${request.toGroup.label}`)
        : (labels.rowMovedUnder?.(request.toParent.label) ??
            `Row moved under ${request.toParent.label}`)
    );
  };

  const executeMove = (request: RowMoveRequest<TRow>): void => {
    options.onRowMove?.(request);
    batch(() => {
      announceMove(request);
      write({ pendingMove: null });
      reset();
    });
  };

  const settleHostConfirm = (
    token: number,
    request: RowMoveRequest<TRow>,
    approved: boolean
  ): void => {
    if (!mounted || activeConfirmToken !== token) return;
    activeConfirmToken = 0;
    batch(() => {
      write({ hostConfirmPending: false });
      if (approved) executeMove(request);
      else {
        say(options.labels.rowReorderCancelled);
        reset();
      }
    });
  };

  const askHost = async (
    confirm: RowMoveConfirmHandler<TRow>,
    request: RowMoveRequest<TRow>
  ): Promise<void> => {
    const token = ++nextConfirmToken;
    activeConfirmToken = token;
    batch(() => {
      write({ hostConfirmPending: true });
      reset();
    });
    let approved = false;
    try {
      approved = (await confirm(request)) ?? false;
    } catch {
      // A confirmation that throws is a confirmation that did not approve.
      approved = false;
    }
    settleHostConfirm(token, request, approved);
  };

  const requestMove = (request: RowMoveRequest<TRow>): void => {
    if (isLocked()) return;
    const policy = options.movePolicy ?? "never";
    if (policy === "never") {
      batch(() => {
        say(
          options.labels.moveRejectedPolicyNever ??
            "Cross-boundary row moves are disabled"
        );
        reset();
      });
      return;
    }
    if (policy === "auto") {
      executeMove(request);
      return;
    }
    if (options.confirmMove) {
      void askHost(options.confirmMove, request);
      return;
    }
    batch(() => {
      write({ pendingMove: request });
      reset();
    });
  };

  const reorder = (from: number, to: number, row: TRow): void => {
    options.onRowReorder?.(from, to, row);
    batch(() => {
      say(options.labels.rowMoved(from + 1, to + 1));
      reset();
    });
  };

  const commit = (
    fromLocal: number,
    toLocal: number,
    row: TRow,
    target: TRow,
    windowStart: number,
    position: RowDropPosition
  ): void => {
    if (!options.enabled) {
      reset();
      return;
    }
    if (isLocked()) return;
    const decision = options.resolveMove?.(row, target, position);
    if (decision?.kind === "reject") {
      batch(() => {
        say(decision.message);
        reset();
      });
      return;
    }
    if (decision?.kind === "move") {
      requestMove(decision.request);
      return;
    }
    if (decision?.kind === "reorder") {
      if (decision.from === decision.to) {
        reset();
        return;
      }
      reorder(decision.from, decision.to, decision.row);
      return;
    }
    if (fromLocal === toLocal) {
      reset();
      return;
    }
    reorder(
      datasetIndex(fromLocal, windowStart),
      datasetIndex(toLocal, windowStart),
      row
    );
  };

  const lift = (rowId: string, localIndex: number): void => {
    write({
      lifted: { rowId, from: localIndex },
      overIndex: localIndex,
      overPosition: "before",
    });
  };

  const keyDown = (event: RowKeyEvent, slot: RowReorderSlot<TRow>): void => {
    if (!options.enabled) return;
    if (isLocked() && event.key !== "Escape") return;
    const { lifted, overIndex } = snapshot;
    const { rowId, localIndex, row, windowStart, rowCount } = slot;
    if (event.key === "Escape" && lifted) {
      event.preventDefault();
      batch(() => {
        say(options.labels.rowReorderCancelled);
        reset();
      });
      return;
    }
    if (isGrabKey(event.key)) {
      event.preventDefault();
      if (lifted?.rowId === rowId) {
        const to = overIndex ?? lifted.from;
        const target = options.rowAt(to) ?? row;
        commit(
          lifted.from,
          to,
          row,
          target,
          windowStart,
          to > lifted.from ? "after" : "before"
        );
        return;
      }
      batch(() => {
        lift(rowId, localIndex);
        say(
          options.labels.rowLifted(datasetIndex(localIndex, windowStart) + 1)
        );
      });
      return;
    }
    if (lifted?.rowId !== rowId) return;
    const delta = arrowDelta(event.key, isRtlElement(event.currentTarget));
    if (delta === 0) return;
    event.preventDefault();
    const next = Math.min(
      rowCount - 1,
      Math.max(0, (overIndex ?? lifted.from) + delta)
    );
    write({
      overIndex: next,
      overPosition: next > lifted.from ? "after" : "before",
    });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next) {
      options = next;
    },
    connect() {
      mounted = true;
      return () => {
        mounted = false;
        activeConfirmToken = 0;
      };
    },
    dragStart(event, rowId, localIndex) {
      if (!options.enabled || isLocked()) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData(
        ROW_DND_MIME,
        `${rowId}:${String(localIndex)}`
      );
      event.dataTransfer.effectAllowed = "move";
      lift(rowId, localIndex);
    },
    dragEnd: reset,
    dragOver(event, localIndex) {
      // Custom MIME types are often missing from `types` during dragover; the
      // lift flag is the reliable same-table signal.
      if (snapshot.lifted === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const bounds = event.currentTarget?.getBoundingClientRect?.();
      write({
        overIndex: localIndex,
        overPosition: bounds ? rowDropPosition(event.clientY, bounds) : "after",
      });
    },
    drop(event, localIndex, row, windowStart) {
      const payload = event.dataTransfer.getData(ROW_DND_MIME);
      if (payload === "") return;
      event.preventDefault();
      const sep = payload.lastIndexOf(":");
      const fromLocal = Number(payload.slice(sep + 1));
      if (!Number.isFinite(fromLocal)) return;
      const dragged = options.rowAt(fromLocal);
      const bounds = event.currentTarget?.getBoundingClientRect?.();
      const fallbackPosition =
        snapshot.overPosition ?? (localIndex > fromLocal ? "after" : "before");
      const position = bounds
        ? rowDropPosition(event.clientY, bounds)
        : fallbackPosition;
      commit(fromLocal, localIndex, dragged ?? row, row, windowStart, position);
    },
    keyDown,
    moveBy(localIndex, delta, row, windowStart, rowCount) {
      const to = localIndex + delta;
      if (to < 0 || to >= rowCount) return;
      if (isLocked()) return;
      commit(
        localIndex,
        to,
        row,
        options.rowAt(to) ?? row,
        windowStart,
        delta > 0 ? "after" : "before"
      );
    },
    moveMenu: (row) => options.getMoveMenu?.(row),
    selectMoveTarget(target) {
      if (target.disabledReason) {
        say(target.disabledReason);
        return;
      }
      if (target.request) requestMove(target.request);
    },
    confirmMove() {
      const { pendingMove } = snapshot;
      if (pendingMove) executeMove(pendingMove);
    },
    cancelMove() {
      batch(() => {
        write({ pendingMove: null });
        say(options.labels.rowReorderCancelled);
      });
    },
  };
}

/**
 * Indicator attributes for one row: `data-dragging` on the lifted row, and
 * `data-drop` with the insertion edge on the row under the drag.
 *
 * @param state - The lifted row and the hovered index and edge.
 * @param rowId - The row's stable id.
 * @param localIndex - The row's index in the rendered window.
 * @returns The attributes.
 *
 * @public
 */
export function rowReorderRowAttributes(
  state: Pick<
    RowReorderSnapshot<unknown>,
    "lifted" | "overIndex" | "overPosition"
  >,
  rowId: string,
  localIndex: number
): { "data-dragging"?: ""; "data-drop"?: RowDropPosition } {
  const { lifted, overIndex, overPosition } = state;
  const dragging = lifted?.rowId === rowId;
  const from = lifted?.from;
  const isTarget =
    overIndex === localIndex && from !== undefined && lifted?.rowId !== rowId;
  const dropSide = from !== undefined && localIndex > from ? "after" : "before";
  return {
    "data-dragging": dragging ? "" : undefined,
    "data-drop": isTarget ? (overPosition ?? dropSide) : undefined,
  };
}

/**
 * Whether a row owns the pending move confirmation — by id when the table has
 * row identity, by reference otherwise.
 *
 * @param pendingMove - The move awaiting confirmation.
 * @param row - The row to ask about.
 * @param getRowId - Stable row identity, when there is one.
 * @returns Whether the confirmation belongs to this row.
 *
 * @public
 */
export function isRowMovePending<TRow>(
  pendingMove: RowMoveRequest<TRow> | null,
  row: TRow,
  getRowId?: (row: TRow) => string
): boolean {
  if (!pendingMove) return false;
  if (!getRowId) return pendingMove.row === row;
  return getRowId(pendingMove.row) === getRowId(row);
}
