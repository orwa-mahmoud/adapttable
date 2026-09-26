/**
 * The row reorder engine: move application, grouped and tree resolution, the
 * move menu, and the controller driven the way a binding drives it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GroupedFlatEntry, RowGroupRef } from "../grouping/groupRows";
import type { TreeEntry } from "../tree/treeRows";
import type { RowMoveRequest, RowReorderOptions } from "./rowMove";
import {
  applyRowReorder,
  createRowReorderController,
  datasetIndex,
  defaultRowReorderAnnouncements,
  isRowMovePending,
  resolveRowMove,
  ROW_DND_MIME,
  type RowDragEvent,
  type RowKeyEvent,
  rowMoveMenu,
  type RowMoveView,
  rowReorderAnnouncements,
  type RowReorderControllerOptions,
  rowReorderRowAttributes,
} from "./rowReorderEngine";

interface Row {
  id: string;
  name: string;
}

const A: Row = { id: "a", name: "Ada" };
const B: Row = { id: "b", name: "Bea" };
const C: Row = { id: "c", name: "Cy" };
const D: Row = { id: "d", name: "Dee" };
const ROWS = [A, B, C, D];

const labels = defaultRowReorderAnnouncements;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("applyRowReorder and datasetIndex", () => {
  it("moves one item in a copy", () => {
    const rows = [1, 2, 3, 4];
    expect(applyRowReorder(rows, 0, 2)).toEqual([2, 3, 1, 4]);
    expect(rows).toEqual([1, 2, 3, 4]);
  });

  it("copies unchanged for a no-op or out-of-range move", () => {
    const rows = [1, 2, 3];
    for (const [from, to] of [
      [1, 1],
      [-1, 0],
      [0, -1],
      [3, 0],
      [0, 3],
    ] as const) {
      const next = applyRowReorder(rows, from, to);
      expect(next).toEqual(rows);
      expect(next).not.toBe(rows);
    }
    expect(applyRowReorder([undefined, 1], 0, 1)).toEqual([undefined, 1]);
  });

  it("offsets a rendered slot by the window start", () => {
    expect(datasetIndex(3, 40)).toBe(43);
  });
});

describe("rowReorderAnnouncements", () => {
  it("reads each label at use, falling back per label", () => {
    const table: { labels?: Record<string, unknown> } = {};
    const said = rowReorderAnnouncements(() => table.labels);
    expect(said.rowLifted(2)).toBe("Row lifted, position 2");
    expect(said.rowMoved(1, 3)).toBe("Row moved from 1 to 3");
    expect(said.rowMovedToGroup("West")).toBe("Row moved to West");
    expect(said.rowMovedUnder("Root")).toBe("Row moved under Root");
    expect(said.rowReorderCancelled).toBe("Reorder cancelled");
    expect(said.moveRejectedPolicyNever).toBe(
      "Cross-boundary row moves are disabled"
    );
    expect(said.moveRejectedSorted).toBe(
      "Clear sorting before changing row order"
    );
    expect(said.moveRejectedCycle).toBe(
      "A row cannot move inside itself or its descendant"
    );
    expect(said.moveUnavailable).toBe("This row move is not available");
    expect(said.rootLevel).toBe("Top level");
    expect(said.moveToGroup).toBe("Move to group…");
    expect(said.moveUnder).toBe("Move under…");
    table.labels = {
      rowReorderCancelled: "Annulé",
      rowLifted: (position: number) => `Levée ${String(position)}`,
    };
    expect(said.rowReorderCancelled).toBe("Annulé");
    expect(said.rowLifted(4)).toBe("Levée 4");
  });
});

/* ── Resolution fixtures ─────────────────────────────────────────── */

const group = (id: string, levels = 1): RowGroupRef => ({
  id,
  label: id.toUpperCase(),
  levels: Array.from({ length: levels }, (_, level) => ({
    key: `k${String(level)}`,
    value: id,
    label: id,
  })),
});

const WEST = group("west");
const EAST = group("east");

const rowEntry = (
  row: Row,
  index: number,
  ref: RowGroupRef | undefined,
  groupPosition?: number
): GroupedFlatEntry<Row> => ({
  kind: "row",
  key: row.id,
  row,
  index,
  groupKey: ref?.id ?? "",
  groupPosition,
  group: ref,
});

const header = (ref: RowGroupRef): GroupedFlatEntry<Row> => ({
  kind: "group",
  key: ref.id,
  value: ref.id,
  label: ref.label,
  level: ref.levels.length - 1,
  groupBy: "k0",
  path: [ref.id],
  group: ref,
  leafRows: [],
  leafIds: [],
  collapsed: false,
});

const GROUPED: GroupedFlatEntry<Row>[] = [
  header(WEST),
  rowEntry(A, 0, WEST, 0),
  rowEntry(B, 1, WEST, 1),
  header(EAST),
  rowEntry(C, 2, EAST, 0),
  rowEntry(D, 3, EAST),
];

const treeEntry = (
  row: Row,
  parentId: string | undefined,
  siblingIndex: number | undefined,
  descendantIds: string[] = []
): TreeEntry<Row> => ({
  row,
  key: row.id,
  level: parentId ? 1 : 0,
  hasChildren: descendantIds.length > 0,
  expanded: true,
  path: parentId ? [parentId] : [],
  parentId,
  siblingIndex,
  descendantIds,
});

// a ─┬─ b
//    └─ c
// d
const TREE: TreeEntry<Row>[] = [
  treeEntry(A, undefined, 0, ["b", "c"]),
  treeEntry(B, "a", 0),
  treeEntry(C, "a", 1),
  treeEntry(D, undefined, 1),
];

const flat: RowMoveView<Row> = {
  getRowId: (row) => row.id,
  rowLabel: (row) => row.name,
};
const grouped: RowMoveView<Row> = { ...flat, grouping: { entries: GROUPED } };
const tree: RowMoveView<Row> = { ...flat, tree: { entries: TREE } };

const auto: RowReorderOptions<Row> = {
  movePolicy: "auto",
  onGroupMove: vi.fn(),
  onTreeMove: vi.fn(),
};

describe("resolveRowMove", () => {
  it("leaves a flat unsorted drop to the index reorder", () => {
    expect(
      resolveRowMove(
        flat,
        { row: A, target: B, position: "after" },
        undefined,
        labels
      )
    ).toBeUndefined();
  });

  it("rejects a flat drop while a sort owns the order", () => {
    expect(
      resolveRowMove(
        { ...flat, sortBy: "name" },
        { row: A, target: B, position: "after" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reject", message: labels.moveRejectedSorted });
  });

  it("reorders within one group by group position", () => {
    expect(
      resolveRowMove(
        grouped,
        { row: A, target: B, position: "after" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reorder", from: 0, to: 1, row: A });
    expect(
      resolveRowMove(
        grouped,
        { row: B, target: A, position: "before" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reorder", from: 1, to: 0, row: B });
    expect(
      resolveRowMove(
        grouped,
        { row: A, target: B, position: "before" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reorder", from: 0, to: 0, row: A });
    expect(
      resolveRowMove(
        grouped,
        { row: B, target: A, position: "after" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reorder", from: 1, to: 1, row: B });
    expect(
      resolveRowMove(
        grouped,
        { row: A, target: B, position: "inside" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reorder", from: 0, to: 1, row: A });
  });

  it("falls back to the flat index without a group position", () => {
    expect(
      resolveRowMove(
        grouped,
        { row: D, target: C, position: "before" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reorder", from: 3, to: 0, row: D });
  });

  it("rejects a sorted same-group reorder", () => {
    expect(
      resolveRowMove(
        { ...grouped, sortBy: "name" },
        { row: A, target: B, position: "after" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reject", message: labels.moveRejectedSorted });
  });

  it("gates a cross-group move on policy and handler", () => {
    const drop = { row: A, target: C, position: "after" } as const;
    expect(resolveRowMove(grouped, drop, undefined, labels)).toEqual({
      kind: "reject",
      message: labels.moveRejectedPolicyNever,
    });
    expect(
      resolveRowMove(grouped, drop, { movePolicy: "auto" }, labels)
    ).toEqual({ kind: "reject", message: labels.moveUnavailable });
    expect(resolveRowMove(grouped, drop, auto, labels)).toEqual({
      kind: "move",
      request: {
        kind: "group",
        row: A,
        rowLabel: "Ada",
        fromGroup: WEST,
        toGroup: EAST,
        position: 1,
      },
    });
    expect(
      resolveRowMove(grouped, { ...drop, position: "before" }, auto, labels)
    ).toMatchObject({ request: { position: 0 } });
    expect(
      resolveRowMove(
        grouped,
        { row: A, target: D, position: "after" },
        auto,
        labels
      )
    ).toMatchObject({ request: { toGroup: EAST, position: 4 } });
  });

  it("rejects a grouped drop it cannot place", () => {
    expect(
      resolveRowMove(
        grouped,
        { row: { id: "zz", name: "?" }, target: A, position: "after" },
        auto,
        labels
      )
    ).toEqual({ kind: "reject", message: labels.moveUnavailable });
    expect(
      resolveRowMove(
        {
          ...flat,
          grouping: {
            entries: [rowEntry(A, 0, undefined), rowEntry(B, 1, WEST)],
          },
        },
        { row: A, target: B, position: "after" },
        auto,
        labels
      )
    ).toEqual({ kind: "reject", message: labels.moveUnavailable });
    expect(
      resolveRowMove(
        {
          ...flat,
          grouping: {
            entries: [rowEntry(A, 0, WEST), rowEntry(B, 1, undefined)],
          },
        },
        { row: A, target: B, position: "after" },
        auto,
        labels
      )
    ).toEqual({ kind: "reject", message: labels.moveUnavailable });
  });

  it("reorders among siblings in a tree", () => {
    expect(
      resolveRowMove(
        tree,
        { row: B, target: C, position: "after" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reorder", from: 0, to: 1, row: B });
    expect(
      resolveRowMove(
        { ...tree, sortBy: "name" },
        { row: B, target: C, position: "after" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reject", message: labels.moveRejectedSorted });
  });

  it("refuses a re-parent into the row's own subtree", () => {
    expect(
      resolveRowMove(
        tree,
        { row: A, target: B, position: "inside" },
        auto,
        labels
      )
    ).toEqual({ kind: "reject", message: labels.moveRejectedCycle });
  });

  it("gates a re-parent on policy and handler", () => {
    const drop = { row: D, target: B, position: "inside" } as const;
    expect(resolveRowMove(tree, drop, undefined, labels)).toEqual({
      kind: "reject",
      message: labels.moveRejectedPolicyNever,
    });
    expect(
      resolveRowMove(tree, drop, { movePolicy: "confirm" }, labels)
    ).toEqual({ kind: "reject", message: labels.moveUnavailable });
  });

  it("re-parents under a node, appending to its children", () => {
    expect(
      resolveRowMove(
        tree,
        { row: D, target: A, position: "inside" },
        auto,
        labels
      )
    ).toEqual({
      kind: "move",
      request: {
        kind: "tree",
        row: D,
        rowLabel: "Dee",
        fromParent: { id: null, row: null, label: "Top level" },
        toParent: { id: "a", row: A, label: "Ada" },
        position: 2,
      },
    });
  });

  it("moves beside a node under another parent", () => {
    expect(
      resolveRowMove(
        tree,
        { row: D, target: B, position: "after" },
        auto,
        labels
      )
    ).toMatchObject({
      request: { toParent: { id: "a" }, position: 1 },
    });
    expect(
      resolveRowMove(
        tree,
        { row: B, target: D, position: "before" },
        auto,
        labels
      )
    ).toMatchObject({
      request: {
        fromParent: { id: "a", label: "Ada" },
        toParent: { id: null, label: "Top level" },
        position: 1,
      },
    });
  });

  it("places a re-parent beside a node at the node's index", () => {
    const roots: TreeEntry<Row>[] = [
      treeEntry(A, undefined, 0),
      treeEntry(B, undefined, 1),
      treeEntry(C, "b", 0),
      treeEntry(D, undefined, 2),
    ];
    const view = { ...flat, tree: { entries: roots } };
    expect(
      resolveRowMove(
        view,
        { row: C, target: D, position: "before" },
        auto,
        labels
      )
    ).toMatchObject({ request: { position: 2 } });
    const withGap: TreeEntry<Row>[] = [
      treeEntry(A, undefined, undefined),
      treeEntry(B, "x", undefined),
    ];
    expect(
      resolveRowMove(
        { ...flat, tree: { entries: withGap } },
        { row: B, target: A, position: "before" },
        auto,
        labels
      )
    ).toMatchObject({
      request: { fromParent: { id: "x", row: null, label: "x" }, position: 0 },
    });
  });

  it("prefers the full tree over the visible entries", () => {
    expect(
      resolveRowMove(
        { ...flat, tree: { entries: [], allEntries: TREE } },
        { row: B, target: C, position: "after" },
        undefined,
        labels
      )
    ).toEqual({ kind: "reorder", from: 0, to: 1, row: B });
  });

  it("rejects a tree drop it cannot place", () => {
    expect(
      resolveRowMove(
        tree,
        { row: { id: "zz", name: "?" }, target: A, position: "after" },
        auto,
        labels
      )
    ).toEqual({ kind: "reject", message: labels.moveUnavailable });
  });

  it("re-parents under a childless node at position zero", () => {
    const shifted = resolveRowMove(
      {
        ...flat,
        tree: {
          entries: [
            treeEntry(A, undefined, 0),
            treeEntry(B, undefined, 1),
            treeEntry(C, undefined, 2),
          ],
        },
      },
      { row: A, target: C, position: "inside" },
      auto,
      labels
    );
    expect(shifted).toMatchObject({
      request: { toParent: { id: "c" }, position: 0 },
    });
  });
});

describe("rowMoveMenu", () => {
  it("offers nothing for a flat table", () => {
    expect(rowMoveMenu(flat, A, auto, labels)).toBeUndefined();
  });

  it("lists every other deepest group", () => {
    const deep = group("deep", 2);
    const menu = rowMoveMenu(
      {
        ...flat,
        grouping: {
          entries: [
            ...GROUPED,
            header(group("outer", 0)),
            rowEntry(D, 4, deep),
            rowEntry({ id: "loose", name: "Loose" }, 5, undefined),
          ],
        },
      },
      A,
      auto,
      labels
    );
    expect(menu?.kind).toBe("group");
    expect(menu?.label).toBe("Move to group…");
    expect(menu?.targets.map((target) => target.id)).toEqual(["deep"]);
    expect(menu?.targets[0]?.request).toEqual({
      kind: "group",
      row: A,
      rowLabel: "Ada",
      fromGroup: WEST,
      toGroup: deep,
      position: 1,
    });
  });

  it("disables group targets by policy or a missing handler", () => {
    const never = rowMoveMenu(grouped, A, undefined, labels);
    expect(never?.targets).toEqual([
      {
        id: "east",
        label: "EAST",
        request: undefined,
        disabledReason: labels.moveRejectedPolicyNever,
      },
    ]);
    const noHandler = rowMoveMenu(grouped, A, { movePolicy: "auto" }, labels);
    expect(noHandler?.targets[0]?.disabledReason).toBe(labels.moveUnavailable);
    expect(rowMoveMenu(grouped, A, auto, labels)?.targets[0]?.request).toEqual(
      expect.objectContaining({ toGroup: EAST, position: 2 })
    );
  });

  it("offers nothing for a row outside any group", () => {
    expect(
      rowMoveMenu(
        { ...flat, grouping: { entries: [rowEntry(A, 0, undefined)] } },
        A,
        auto,
        labels
      )
    ).toBeUndefined();
    expect(
      rowMoveMenu(grouped, { id: "zz", name: "?" }, auto, labels)
    ).toBeUndefined();
  });

  it("lists every parent but the current one and the row itself", () => {
    const menu = rowMoveMenu(tree, B, auto, labels);
    expect(menu?.kind).toBe("tree");
    expect(menu?.label).toBe("Move under…");
    expect(menu?.targets.map((target) => target.id)).toEqual([
      "__root__",
      "c",
      "d",
    ]);
    expect(menu?.targets[0]?.request).toEqual({
      kind: "tree",
      row: B,
      rowLabel: "Bea",
      fromParent: { id: "a", row: A, label: "Ada" },
      toParent: { id: null, row: null, label: "Top level" },
      position: 2,
    });
  });

  it("disables a descendant, then policy, then a missing handler", () => {
    const menu = rowMoveMenu(tree, A, undefined, labels);
    const reasons = Object.fromEntries(
      (menu?.targets ?? []).map((target) => [target.id, target.disabledReason])
    );
    expect(reasons).toEqual({
      b: labels.moveRejectedCycle,
      c: labels.moveRejectedCycle,
      d: labels.moveRejectedPolicyNever,
    });
    const noHandler = rowMoveMenu(tree, D, { movePolicy: "auto" }, labels);
    expect(noHandler?.targets[0]?.disabledReason).toBe(labels.moveUnavailable);
  });

  it("offers nothing for a row outside the tree", () => {
    expect(
      rowMoveMenu(
        { ...flat, tree: { entries: [], allEntries: TREE } },
        { id: "zz", name: "?" },
        auto,
        labels
      )
    ).toBeUndefined();
  });
});

/* ── The controller ──────────────────────────────────────────────── */

const setup = (overrides: Partial<RowReorderControllerOptions<Row>> = {}) => {
  const onRowReorder = vi.fn();
  const reorder = createRowReorderController<Row>({
    enabled: true,
    onRowReorder,
    labels,
    rowAt: (index) => ROWS[index],
    getRowId: (row) => row.id,
    ...overrides,
  });
  return { reorder, onRowReorder };
};

const keyEvent = (
  key: string,
  currentTarget: HTMLElement | null = null
): RowKeyEvent & { preventDefault: ReturnType<typeof vi.fn<() => void>> } => ({
  key,
  currentTarget,
  preventDefault: vi.fn<() => void>(),
});

const slot = (localIndex: number, windowStart = 0) => ({
  rowId: ROWS[localIndex]?.id ?? "",
  localIndex,
  row: ROWS[localIndex] ?? A,
  windowStart,
  rowCount: ROWS.length,
});

const dataTransfer = () => {
  const data = new Map<string, string>();
  return {
    setData: vi.fn((format: string, value: string) => {
      data.set(format, value);
    }),
    getData: vi.fn((format: string) => data.get(format) ?? ""),
    effectAllowed: "none" as DataTransfer["effectAllowed"],
    dropEffect: "none" as DataTransfer["dropEffect"],
  };
};

const dragEvent = (
  transfer: ReturnType<typeof dataTransfer>,
  options: { clientY?: number; bounds?: { top: number; height: number } } = {}
): RowDragEvent & { preventDefault: ReturnType<typeof vi.fn<() => void>> } => ({
  dataTransfer: transfer,
  clientY: options.clientY ?? 0,
  currentTarget: options.bounds
    ? { getBoundingClientRect: () => options.bounds ?? { top: 0, height: 0 } }
    : null,
  preventDefault: vi.fn<() => void>(),
});

const request = (row: Row): RowMoveRequest<Row> => ({
  kind: "group",
  row,
  rowLabel: row.name,
  fromGroup: WEST,
  toGroup: EAST,
  position: 0,
});

describe("keyboard grab", () => {
  it("lifts, moves and drops, announcing each step", () => {
    const { reorder, onRowReorder } = setup();
    const lift = keyEvent(" ");
    reorder.keyDown(lift, slot(0, 10));
    expect(lift.preventDefault).toHaveBeenCalled();
    expect(reorder.getSnapshot()).toMatchObject({
      lifted: { rowId: "a", from: 0 },
      overIndex: 0,
      overPosition: "before",
      announcement: "Row lifted, position 11",
    });
    reorder.keyDown(keyEvent("ArrowDown"), slot(0, 10));
    reorder.keyDown(keyEvent("ArrowRight"), slot(0, 10));
    expect(reorder.getSnapshot()).toMatchObject({
      overIndex: 2,
      overPosition: "after",
    });
    reorder.keyDown(keyEvent("Spacebar"), slot(0, 10));
    expect(onRowReorder).toHaveBeenCalledWith(10, 12, A);
    expect(reorder.getSnapshot()).toMatchObject({
      lifted: null,
      overIndex: null,
      announcement: "Row moved from 11 to 13",
    });
  });

  it("clamps to the window and moves back up", () => {
    const { reorder } = setup();
    reorder.keyDown(keyEvent(" "), slot(1));
    reorder.keyDown(keyEvent("ArrowUp"), slot(1));
    reorder.keyDown(keyEvent("ArrowLeft"), slot(1));
    expect(reorder.getSnapshot()).toMatchObject({
      overIndex: 0,
      overPosition: "before",
    });
    for (let i = 0; i < 6; i += 1) {
      reorder.keyDown(keyEvent("ArrowDown"), slot(1));
    }
    expect(reorder.getSnapshot().overIndex).toBe(3);
  });

  it("flips the horizontal arrows right to left", () => {
    const { reorder } = setup();
    const grip = document.createElement("button");
    grip.dir = "rtl";
    document.body.append(grip);
    reorder.keyDown(keyEvent(" "), slot(1));
    reorder.keyDown(keyEvent("ArrowLeft", grip), slot(1));
    expect(reorder.getSnapshot().overIndex).toBe(2);
    reorder.keyDown(keyEvent("ArrowRight", grip), slot(1));
    expect(reorder.getSnapshot().overIndex).toBe(1);
  });

  it("drops in place without writing", () => {
    const { reorder, onRowReorder } = setup();
    reorder.keyDown(keyEvent(" "), slot(1));
    reorder.keyDown(keyEvent(" "), slot(1));
    expect(onRowReorder).not.toHaveBeenCalled();
    expect(reorder.getSnapshot().lifted).toBeNull();
  });

  it("cancels on Escape", () => {
    const { reorder } = setup();
    reorder.keyDown(keyEvent(" "), slot(1));
    const escape = keyEvent("Escape");
    reorder.keyDown(escape, slot(1));
    expect(escape.preventDefault).toHaveBeenCalled();
    expect(reorder.getSnapshot()).toMatchObject({
      lifted: null,
      announcement: "Reorder cancelled",
    });
  });

  it("ignores keys that do not belong to the lifted row", () => {
    const { reorder } = setup();
    const idle = keyEvent("ArrowDown");
    reorder.keyDown(idle, slot(0));
    expect(idle.preventDefault).not.toHaveBeenCalled();
    reorder.keyDown(keyEvent("Escape"), slot(0));
    expect(reorder.getSnapshot().announcement).toBe("");
    reorder.keyDown(keyEvent(" "), slot(0));
    const other = keyEvent("ArrowDown");
    reorder.keyDown(other, slot(1));
    expect(other.preventDefault).not.toHaveBeenCalled();
    const letter = keyEvent("x");
    reorder.keyDown(letter, slot(0));
    expect(letter.preventDefault).not.toHaveBeenCalled();
  });

  it("takes the row under a drop from the source", () => {
    const { reorder, onRowReorder } = setup({ rowAt: () => undefined });
    reorder.keyDown(keyEvent(" "), slot(0));
    reorder.keyDown(keyEvent("ArrowDown"), slot(0));
    reorder.keyDown(keyEvent(" "), slot(0));
    expect(onRowReorder).toHaveBeenCalledWith(0, 1, A);
  });

  it("does nothing while disabled", () => {
    const { reorder } = setup({ enabled: false });
    reorder.keyDown(keyEvent(" "), slot(0));
    expect(reorder.getSnapshot().lifted).toBeNull();
  });

  it("notifies once per gesture", () => {
    const { reorder } = setup();
    const listener = vi.fn();
    const stop = reorder.subscribe(listener);
    reorder.keyDown(keyEvent(" "), slot(0));
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    reorder.keyDown(keyEvent("Escape"), slot(0));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("drag and drop", () => {
  it("drags, tracks the edge, and drops", () => {
    const { reorder, onRowReorder } = setup();
    const transfer = dataTransfer();
    reorder.dragStart(dragEvent(transfer), "a", 0);
    expect(transfer.setData).toHaveBeenCalledWith(ROW_DND_MIME, "a:0");
    expect(transfer.effectAllowed).toBe("move");
    expect(reorder.getSnapshot().lifted).toEqual({ rowId: "a", from: 0 });
    const over = dragEvent(transfer, {
      clientY: 38,
      bounds: { top: 20, height: 20 },
    });
    reorder.dragOver(over, 2);
    expect(over.preventDefault).toHaveBeenCalled();
    expect(transfer.dropEffect).toBe("move");
    expect(reorder.getSnapshot()).toMatchObject({
      overIndex: 2,
      overPosition: "after",
    });
    reorder.dragOver(dragEvent(transfer), 3);
    expect(reorder.getSnapshot().overPosition).toBe("after");
    const drop = dragEvent(transfer, {
      clientY: 21,
      bounds: { top: 20, height: 20 },
    });
    reorder.drop(drop, 2, C, 0);
    expect(drop.preventDefault).toHaveBeenCalled();
    expect(onRowReorder).toHaveBeenCalledWith(0, 2, A);
  });

  it("ignores a drag over before anything is lifted", () => {
    const { reorder } = setup();
    const over = dragEvent(dataTransfer());
    reorder.dragOver(over, 1);
    expect(over.preventDefault).not.toHaveBeenCalled();
  });

  it("refuses to start while disabled", () => {
    const { reorder } = setup({ enabled: false });
    const start = dragEvent(dataTransfer());
    reorder.dragStart(start, "a", 0);
    expect(start.preventDefault).toHaveBeenCalled();
  });

  it("ends a drag without dropping", () => {
    const { reorder } = setup();
    reorder.dragStart(dragEvent(dataTransfer()), "a", 0);
    reorder.dragEnd();
    expect(reorder.getSnapshot().lifted).toBeNull();
  });

  it("ignores a drop that carries no row or a broken one", () => {
    const { reorder, onRowReorder } = setup();
    const empty = dragEvent(dataTransfer());
    reorder.drop(empty, 1, B, 0);
    expect(empty.preventDefault).not.toHaveBeenCalled();
    const transfer = dataTransfer();
    transfer.setData(ROW_DND_MIME, "a:x");
    reorder.drop(dragEvent(transfer), 1, B, 0);
    expect(onRowReorder).not.toHaveBeenCalled();
  });

  it("falls back to the hovered edge, then to the direction", () => {
    const resolveMove = vi.fn(() => undefined);
    const { reorder } = setup({ resolveMove, rowAt: () => undefined });
    const transfer = dataTransfer();
    transfer.setData(ROW_DND_MIME, "a:0");
    reorder.drop(dragEvent(transfer), 2, C, 0);
    expect(resolveMove).toHaveBeenLastCalledWith(C, C, "after");
    reorder.drop(dragEvent(transfer), 0, A, 0);
    expect(resolveMove).toHaveBeenLastCalledWith(A, A, "before");
    reorder.dragStart(dragEvent(dataTransfer()), "b", 1);
    reorder.drop(dragEvent(transfer), 2, C, 0);
    expect(resolveMove).toHaveBeenLastCalledWith(C, C, "before");
  });

  it("resets instead of writing while disabled", () => {
    const { reorder, onRowReorder } = setup();
    reorder.keyDown(keyEvent(" "), slot(0));
    reorder.configure({
      enabled: false,
      onRowReorder,
      labels,
      rowAt: (index) => ROWS[index],
    });
    const transfer = dataTransfer();
    transfer.setData(ROW_DND_MIME, "a:0");
    reorder.drop(dragEvent(transfer), 2, C, 0);
    expect(onRowReorder).not.toHaveBeenCalled();
    expect(reorder.getSnapshot().lifted).toBeNull();
  });
});

describe("mobile swap", () => {
  it("swaps with a neighbour inside the window", () => {
    const { reorder, onRowReorder } = setup();
    reorder.moveBy(1, 1, B, 5, 4);
    expect(onRowReorder).toHaveBeenCalledWith(6, 7, B);
    reorder.moveBy(0, -1, A, 0, 4);
    reorder.moveBy(3, 1, D, 0, 4);
    expect(onRowReorder).toHaveBeenCalledTimes(1);
    reorder.moveBy(1, -1, B, 0, 4);
    expect(onRowReorder).toHaveBeenLastCalledWith(1, 0, B);
  });

  it("uses the row itself when the neighbour is not loaded", () => {
    const resolveMove = vi.fn(() => undefined);
    const { reorder } = setup({ resolveMove, rowAt: () => undefined });
    reorder.moveBy(0, 1, A, 0, 4);
    expect(resolveMove).toHaveBeenCalledWith(A, A, "after");
  });
});

describe("resolved decisions", () => {
  it("speaks a rejection", () => {
    const { reorder, onRowReorder } = setup({
      resolveMove: () => ({ kind: "reject", message: "No." }),
    });
    reorder.moveBy(0, 1, A, 0, 4);
    expect(onRowReorder).not.toHaveBeenCalled();
    expect(reorder.getSnapshot().announcement).toBe("No.");
  });

  it("writes a resolved reorder, and skips a no-op one", () => {
    const decide = vi.fn();
    const { reorder, onRowReorder } = setup({ resolveMove: decide });
    decide.mockReturnValueOnce({ kind: "reorder", from: 1, to: 1, row: B });
    reorder.moveBy(0, 1, A, 0, 4);
    expect(onRowReorder).not.toHaveBeenCalled();
    decide.mockReturnValueOnce({ kind: "reorder", from: 4, to: 6, row: B });
    reorder.moveBy(0, 1, A, 0, 4);
    expect(onRowReorder).toHaveBeenCalledWith(4, 6, B);
    expect(reorder.getSnapshot().announcement).toBe("Row moved from 5 to 7");
  });

  it("refuses a move under the default policy", () => {
    const onRowMove = vi.fn();
    const { reorder } = setup({
      onRowMove,
      resolveMove: () => ({ kind: "move", request: request(A) }),
    });
    reorder.moveBy(0, 1, A, 0, 4);
    expect(onRowMove).not.toHaveBeenCalled();
    expect(reorder.getSnapshot().announcement).toBe(
      "Cross-boundary row moves are disabled"
    );
    const custom = setup({
      labels: { ...labels, moveRejectedPolicyNever: "Nope" },
      resolveMove: () => ({ kind: "move", request: request(A) }),
    });
    custom.reorder.moveBy(0, 1, A, 0, 4);
    expect(custom.reorder.getSnapshot().announcement).toBe("Nope");
    const bare = setup({
      labels: {
        rowLifted: labels.rowLifted,
        rowMoved: labels.rowMoved,
        rowReorderCancelled: labels.rowReorderCancelled,
      },
      resolveMove: () => ({ kind: "move", request: request(A) }),
    });
    bare.reorder.moveBy(0, 1, A, 0, 4);
    expect(bare.reorder.getSnapshot().announcement).toBe(
      "Cross-boundary row moves are disabled"
    );
  });

  it("moves at once under the auto policy, announcing the destination", () => {
    const onRowMove = vi.fn();
    const { reorder } = setup({
      movePolicy: "auto",
      onRowMove,
      resolveMove: () => ({ kind: "move", request: request(A) }),
    });
    reorder.moveBy(0, 1, A, 0, 4);
    expect(onRowMove).toHaveBeenCalledWith(request(A));
    expect(reorder.getSnapshot().announcement).toBe("Row moved to EAST");
  });

  it("announces a tree move under its parent, with labels or without", () => {
    const tree: RowMoveRequest<Row> = {
      kind: "tree",
      row: B,
      rowLabel: "Bea",
      fromParent: { id: "a", row: A, label: "Ada" },
      toParent: { id: "d", row: D, label: "Dee" },
      position: 0,
    };
    const { reorder } = setup({ movePolicy: "auto" });
    reorder.selectMoveTarget({ id: "d", label: "Dee", request: tree });
    expect(reorder.getSnapshot().announcement).toBe("Row moved under Dee");
    const bare = setup({
      movePolicy: "auto",
      labels: {
        rowLifted: labels.rowLifted,
        rowMoved: labels.rowMoved,
        rowReorderCancelled: labels.rowReorderCancelled,
      },
    });
    bare.reorder.selectMoveTarget({ id: "d", label: "Dee", request: tree });
    expect(bare.reorder.getSnapshot().announcement).toBe("Row moved under Dee");
    bare.reorder.selectMoveTarget({ id: "e", label: "E", request: request(A) });
    expect(bare.reorder.getSnapshot().announcement).toBe("Row moved to EAST");
  });

  it("holds a move for the kit's confirmation", () => {
    const onRowMove = vi.fn();
    const { reorder } = setup({ movePolicy: "confirm", onRowMove });
    reorder.selectMoveTarget({ id: "e", label: "E", request: request(A) });
    expect(reorder.getSnapshot().pendingMove).toEqual(request(A));
    // Locked: nothing else starts while a confirmation is open.
    reorder.keyDown(keyEvent(" "), slot(1));
    reorder.moveBy(1, 1, B, 0, 4);
    reorder.selectMoveTarget({ id: "e", label: "E", request: request(B) });
    reorder.dragStart(dragEvent(dataTransfer()), "b", 1);
    const transfer = dataTransfer();
    transfer.setData(ROW_DND_MIME, "b:1");
    reorder.drop(dragEvent(transfer), 2, C, 0);
    expect(onRowMove).not.toHaveBeenCalled();
    expect(reorder.getSnapshot()).toMatchObject({
      lifted: null,
      pendingMove: request(A),
    });
    reorder.confirmMove();
    expect(onRowMove).toHaveBeenCalledWith(request(A));
    expect(reorder.getSnapshot().pendingMove).toBeNull();
    reorder.confirmMove();
    expect(onRowMove).toHaveBeenCalledTimes(1);
  });

  it("cancels a held move", () => {
    const { reorder } = setup({ movePolicy: "confirm" });
    reorder.selectMoveTarget({ id: "e", label: "E", request: request(A) });
    reorder.cancelMove();
    expect(reorder.getSnapshot()).toMatchObject({
      pendingMove: null,
      announcement: "Reorder cancelled",
    });
  });

  it("asks the host, and moves when it approves", async () => {
    const onRowMove = vi.fn();
    const confirmMove = vi.fn(() => Promise.resolve(true));
    const { reorder } = setup({
      movePolicy: "confirm",
      confirmMove,
      onRowMove,
    });
    reorder.selectMoveTarget({ id: "e", label: "E", request: request(A) });
    expect(reorder.getSnapshot().hostConfirmPending).toBe(true);
    await vi.waitFor(() => {
      expect(onRowMove).toHaveBeenCalledWith(request(A));
    });
    expect(reorder.getSnapshot().hostConfirmPending).toBe(false);
  });

  it("cancels when the host declines, answers nothing, or throws", async () => {
    for (const answer of [
      () => Promise.resolve(false),
      () => Promise.resolve(undefined as unknown as boolean),
      () => Promise.reject(new Error("offline")),
    ]) {
      const onRowMove = vi.fn();
      const { reorder } = setup({
        movePolicy: "confirm",
        confirmMove: answer,
        onRowMove,
      });
      reorder.selectMoveTarget({ id: "e", label: "E", request: request(A) });
      await vi.waitFor(() => {
        expect(reorder.getSnapshot().hostConfirmPending).toBe(false);
      });
      expect(onRowMove).not.toHaveBeenCalled();
      expect(reorder.getSnapshot().announcement).toBe("Reorder cancelled");
    }
  });

  it("drops a host answer that arrives after teardown", async () => {
    const host: { approve?: (value: boolean) => void } = {};
    const onRowMove = vi.fn();
    const { reorder } = setup({
      movePolicy: "confirm",
      onRowMove,
      confirmMove: () =>
        new Promise<boolean>((resolve) => {
          host.approve = resolve;
        }),
    });
    const disconnect = reorder.connect();
    reorder.selectMoveTarget({ id: "e", label: "E", request: request(A) });
    disconnect();
    host.approve?.(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onRowMove).not.toHaveBeenCalled();
    expect(reorder.getSnapshot().hostConfirmPending).toBe(true);
  });

  it("speaks a disabled menu target instead of moving", () => {
    const onRowMove = vi.fn();
    const { reorder } = setup({ movePolicy: "auto", onRowMove });
    reorder.selectMoveTarget({ id: "x", label: "X", disabledReason: "Why" });
    expect(reorder.getSnapshot().announcement).toBe("Why");
    reorder.selectMoveTarget({ id: "x", label: "X" });
    expect(onRowMove).not.toHaveBeenCalled();
  });

  it("hands the move menu through", () => {
    const menu = { kind: "tree" as const, label: "Move", targets: [] };
    const { reorder } = setup({ getMoveMenu: () => menu });
    expect(reorder.moveMenu(A)).toBe(menu);
    expect(setup().reorder.moveMenu(A)).toBeUndefined();
  });
});

describe("row attributes", () => {
  it("marks the lifted row and the drop target", () => {
    const idle = { lifted: null, overIndex: null, overPosition: null };
    expect(rowReorderRowAttributes(idle, "a", 0)).toEqual({
      "data-dragging": undefined,
      "data-drop": undefined,
    });
    const dragging = {
      lifted: { rowId: "a", from: 1 },
      overIndex: 3,
      overPosition: null,
    };
    expect(rowReorderRowAttributes(dragging, "a", 1)).toEqual({
      "data-dragging": "",
      "data-drop": undefined,
    });
    expect(rowReorderRowAttributes(dragging, "d", 3)["data-drop"]).toBe(
      "after"
    );
    expect(
      rowReorderRowAttributes({ ...dragging, overIndex: 0 }, "x", 0)[
        "data-drop"
      ]
    ).toBe("before");
    expect(
      rowReorderRowAttributes({ ...dragging, overPosition: "inside" }, "d", 3)[
        "data-drop"
      ]
    ).toBe("inside");
  });

  it("finds the row a pending move belongs to", () => {
    expect(isRowMovePending(null, A)).toBe(false);
    expect(isRowMovePending(request(A), A)).toBe(true);
    expect(isRowMovePending(request(A), { ...A })).toBe(false);
    expect(isRowMovePending(request(A), { ...A }, (row) => row.id)).toBe(true);
  });
});
