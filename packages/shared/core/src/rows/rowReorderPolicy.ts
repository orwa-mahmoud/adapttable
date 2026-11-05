/**
 * Pure row-reorder decisions.
 *
 * Index math, grouped and tree legality, and the destination menu. No DOM,
 * no session, and no attribute projection. The controller and the attribute
 * helper consume these results; they do not reimplement them.
 */
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { TreeEntry } from "../tree/treeRows";
import {
  type RowDropPosition,
  type RowMoveMenuModel,
  type RowMoveRequest,
  type RowMoveTarget,
  type RowReorderOptions,
  type RowTreeParentRef,
  treeMoveCreatesCycle,
} from "./rowMove";

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

export function sameScopeDestination(
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
