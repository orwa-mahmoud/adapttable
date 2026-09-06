/**
 * Row reordering — `@adapttable/<kit>/row-reorder`.
 *
 * The factory and the hook that implements it ship together on this entry, so
 * a table that never imports it never carries the drag state machine, its
 * keyboard handling or its announcements. Nothing in the base graph reaches
 * this module.
 */
import {
  type GroupedFlatEntry,
  type RowDropPosition,
  type RowMoveMenuModel,
  type RowMoveRequest,
  type RowReorderOptions,
  type RowTreeParentRef,
  type TreeEntry,
  treeMoveCreatesCycle,
} from "@adapttable/core";
import type { ReactNode } from "react";

import {
  type RowReorderDecision,
  type RowReorderHandler,
  type RowReorderLabels,
  useRowReorder,
} from "../rows/rowReorder";
import {
  type FeatureProviderProps,
  FeatureStateScope,
  useTableRuntime,
} from "./providers";
import { ROW_REORDER } from "./rowReorderKey";
import type { TableFeature } from "./tableFeature";

/** The composed feature, carrying the host's handler for its provider to read. */
interface RowReorderFeature<TRow> extends TableFeature<TRow> {
  readonly onRowReorder: RowReorderHandler<TRow>;
  readonly options?: RowReorderOptions<TRow>;
}

/** What the state machine speaks, before the table has resolved its labels. */
type Announcements = Required<
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

const FALLBACK: Announcements = {
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
 * Read the announcement labels off whatever the table resolved.
 *
 * They are only ever used to speak — inside a commit, a lift or a cancel — so
 * they are read at that moment rather than captured at mount, which is what
 * lets this provider sit above the chrome that resolves them.
 */
function labelsFrom(
  read: () => Readonly<Record<string, unknown>> | undefined
): Announcements {
  const of = <K extends keyof Announcements>(key: K): Announcements[K] =>
    (read()?.[key] ?? FALLBACK[key]) as Announcements[K];
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

interface NestedMoveContext<TRow> {
  row: TRow;
  target: TRow;
  position: RowDropPosition;
  getRowId: (row: TRow) => string;
  rowLabel: (row: TRow) => string;
  sortBy: string | undefined;
  grouping: { entries: readonly GroupedFlatEntry<TRow>[] } | undefined;
  tree:
    | {
        entries: readonly TreeEntry<TRow>[];
        allEntries?: readonly TreeEntry<TRow>[];
      }
    | undefined;
  featureOptions: RowReorderOptions<TRow> | undefined;
  labels: Announcements;
}

function reorderDecision<TRow>(
  row: TRow,
  from: number,
  to: number,
  sortBy: string | undefined,
  labels: Announcements
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
  context: NestedMoveContext<TRow>,
  grouping: { entries: readonly GroupedFlatEntry<TRow>[] }
): RowReorderDecision<TRow> {
  const { row, position, featureOptions, labels } = context;
  const sourceEntry = grouping.entries.find(
    (entry) =>
      entry.kind === "row" && entry.key === context.getRowId(context.row)
  );
  const targetEntry = grouping.entries.find(
    (entry) =>
      entry.kind === "row" && entry.key === context.getRowId(context.target)
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
      context.sortBy,
      labels
    );
  }
  if ((featureOptions?.movePolicy ?? "never") === "never") {
    return { kind: "reject", message: labels.moveRejectedPolicyNever };
  }
  if (!featureOptions?.onGroupMove) {
    return { kind: "reject", message: labels.moveUnavailable };
  }
  return {
    kind: "move",
    request: {
      kind: "group",
      row,
      rowLabel: context.rowLabel(row),
      fromGroup: sourceEntry.group,
      toGroup: targetEntry.group,
      position: to + (position === "after" ? 1 : 0),
    },
  };
}

function treeDestinationPosition<TRow>(
  entries: readonly TreeEntry<TRow>[],
  sourceEntry: TreeEntry<TRow>,
  targetEntry: TreeEntry<TRow>,
  position: RowDropPosition,
  targetParentId: string | undefined
): number {
  if (position === "inside") {
    return entries.filter((entry) => entry.parentId === targetEntry.key).length;
  }
  let destination =
    (targetEntry.siblingIndex ?? 0) + (position === "after" ? 1 : 0);
  if (
    sourceEntry.parentId === targetParentId &&
    (sourceEntry.siblingIndex ?? 0) < (targetEntry.siblingIndex ?? 0)
  ) {
    destination -= 1;
  }
  return Math.max(0, destination);
}

function resolveTreeMove<TRow>(
  context: NestedMoveContext<TRow>,
  tree: {
    entries: readonly TreeEntry<TRow>[];
    allEntries?: readonly TreeEntry<TRow>[];
  }
): RowReorderDecision<TRow> {
  const { row, target, position, getRowId, featureOptions, labels } = context;
  const entries = tree.allEntries ?? tree.entries;
  const rowId = getRowId(row);
  const targetId = getRowId(target);
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
      context.sortBy,
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
  if ((featureOptions?.movePolicy ?? "never") === "never") {
    return { kind: "reject", message: labels.moveRejectedPolicyNever };
  }
  if (!featureOptions?.onTreeMove) {
    return { kind: "reject", message: labels.moveUnavailable };
  }
  const toParent = parentRef(
    targetParentId,
    entries,
    context.rowLabel,
    labels.rootLevel
  );
  return {
    kind: "move",
    request: {
      kind: "tree",
      row,
      rowLabel: context.rowLabel(row),
      fromParent: parentRef(
        sourceParentId,
        entries,
        context.rowLabel,
        labels.rootLevel
      ),
      toParent,
      position: treeDestinationPosition(
        entries,
        sourceEntry,
        targetEntry,
        position,
        targetParentId
      ),
    },
  };
}

function resolveNestedMove<TRow>(
  context: NestedMoveContext<TRow>
): RowReorderDecision<TRow> | undefined {
  if (context.grouping) {
    return resolveGroupedMove(context, context.grouping);
  }
  if (context.tree) return resolveTreeMove(context, context.tree);
  return context.sortBy
    ? { kind: "reject", message: context.labels.moveRejectedSorted }
    : undefined;
}

function buildMoveMenu<TRow>(options: {
  row: TRow;
  getRowId: (row: TRow) => string;
  rowLabel: (row: TRow) => string;
  grouping: { entries: readonly GroupedFlatEntry<TRow>[] } | undefined;
  tree:
    | {
        entries: readonly TreeEntry<TRow>[];
        allEntries?: readonly TreeEntry<TRow>[];
      }
    | undefined;
  featureOptions: RowReorderOptions<TRow> | undefined;
  labels: Announcements;
}): RowMoveMenuModel<TRow> | undefined {
  const { row, getRowId, rowLabel, grouping, tree, featureOptions, labels } =
    options;
  const policyReason =
    (featureOptions?.movePolicy ?? "never") === "never"
      ? labels.moveRejectedPolicyNever
      : undefined;
  if (grouping) {
    const rowId = getRowId(row);
    const source = grouping.entries.find(
      (entry) => entry.kind === "row" && entry.key === rowId
    );
    if (source?.kind !== "row" || !source.group) return undefined;
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
    const targets = [...groups.values()]
      .filter((group) => group.id !== source.group?.id)
      .map((group) => {
        const position = grouping.entries.filter(
          (entry) => entry.kind === "row" && entry.group?.id === group.id
        ).length;
        const disabledReason =
          policyReason ??
          (featureOptions?.onGroupMove ? undefined : labels.moveUnavailable);
        return {
          id: group.id,
          label: group.label,
          request: disabledReason
            ? undefined
            : {
                kind: "group" as const,
                row,
                rowLabel: rowLabel(row),
                fromGroup: source.group!,
                toGroup: group,
                position,
              },
          disabledReason,
        };
      });
    return { kind: "group", label: labels.moveToGroup, targets };
  }
  if (!tree) return undefined;

  const entries = tree.allEntries ?? tree.entries;
  const rowId = getRowId(row);
  const source = entries.find((entry) => entry.key === rowId);
  if (!source) return undefined;
  const targetEntries: (TreeEntry<TRow> | null)[] = [null, ...entries];
  const targets = targetEntries
    .filter((entry) => (entry?.key ?? undefined) !== source.parentId)
    .filter((entry) => entry?.key !== rowId)
    .map((entry) => {
      const parentId = entry?.key;
      const cycle = treeMoveCreatesCycle(
        rowId,
        source.descendantIds,
        parentId ?? null
      );
      const disabledReason =
        (cycle ? labels.moveRejectedCycle : undefined) ??
        policyReason ??
        (featureOptions?.onTreeMove ? undefined : labels.moveUnavailable);
      const toParent = parentRef(parentId, entries, rowLabel, labels.rootLevel);
      return {
        id: parentId ?? "__root__",
        label: toParent.label,
        request: disabledReason
          ? undefined
          : {
              kind: "tree" as const,
              row,
              rowLabel: rowLabel(row),
              fromParent: parentRef(
                source.parentId,
                entries,
                rowLabel,
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
 * One stable component for every `rowReorder(fn)` call — the handler arrives
 * on the feature, so calling the factory inline never remounts a drag.
 */
function RowReorderProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const { onRowReorder, options } = feature as RowReorderFeature<unknown>;
  const runtime = useTableRuntime();
  const labels = labelsFrom(() => runtime.labels());
  const state = useRowReorder<unknown>({
    enabled: true,
    onRowReorder,
    movePolicy: options?.movePolicy,
    confirmMove: options?.confirmMove,
    onRowMove: (request: RowMoveRequest<unknown>) => {
      if (request.kind === "group") {
        options?.onGroupMove?.(
          request.row,
          request.fromGroup,
          request.toGroup,
          request.position
        );
      } else {
        options?.onTreeMove?.(
          request.row,
          request.fromParent,
          request.toParent,
          request.position
        );
      }
    },
    getMoveMenu: (row) => {
      const view = runtime.view();
      if (!view) return undefined;
      return buildMoveMenu({
        row,
        getRowId: view.getRowId,
        rowLabel: view.rowLabel,
        grouping: view.grouping as
          { entries: readonly GroupedFlatEntry<unknown>[] } | undefined,
        tree: view.tree as
          | {
              entries: readonly TreeEntry<unknown>[];
              allEntries?: readonly TreeEntry<unknown>[];
            }
          | undefined,
        featureOptions: options,
        labels,
      });
    },
    resolveMove: (row, target, position) => {
      const view = runtime.view();
      if (!view) return undefined;
      return resolveNestedMove({
        row,
        target,
        position,
        getRowId: view.getRowId,
        rowLabel: view.rowLabel,
        sortBy: view.sortBy,
        grouping: view.grouping as
          { entries: readonly GroupedFlatEntry<unknown>[] } | undefined,
        tree: view.tree as
          | {
              entries: readonly TreeEntry<unknown>[];
              allEntries?: readonly TreeEntry<unknown>[];
            }
          | undefined,
        featureOptions: options,
        labels,
      });
    },
    labels,
    rowAt: (localIndex) => runtime.rowAt(localIndex),
    getRowId: (row) => runtime.view()?.getRowId(row) ?? "",
  });
  return (
    <FeatureStateScope stateKey={ROW_REORDER} value={state}>
      {children}
    </FeatureStateScope>
  );
}

/**
 * Let rows be dragged, or moved with the keyboard, into a new order.
 *
 * ```tsx
 * import { rowReorder } from "@adapttable/mantine/row-reorder";
 *
 * <DataTable features={[rowReorder((from, to) => reorder(from, to))]} … />
 * ```
 *
 * The table never writes to your rows: the handler is told what moved where
 * and the new order is yours to apply.
 *
 * @public
 */
export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>,
  options?: RowReorderOptions<TRow>
): TableFeature<TRow> {
  return {
    id: "row-reorder",
    onRowReorder,
    options,
    provider: { Provider: RowReorderProvider },
  } as RowReorderFeature<TRow>;
}

export type {
  RowReorderDecision,
  RowReorderHandler,
  RowReorderState,
} from "../rows/rowReorder";
export { ROW_REORDER } from "./rowReorderKey";
export type { RowGroupLevel, RowGroupRef } from "@adapttable/core";
export type {
  RowGroupMoveHandler,
  RowMoveConfirmHandler,
  RowMoveMenuModel,
  RowMovePolicy,
  RowMoveRequest,
  RowMoveTarget,
  RowReorderOptions,
  RowTreeMoveHandler,
  RowTreeParentRef,
} from "@adapttable/core";
export { rowDropPosition, treeMoveCreatesCycle } from "@adapttable/core";
