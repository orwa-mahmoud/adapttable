import { describe, expect, it, vi } from "vitest";

import { createTableEngine } from "../engine/createTableEngine";
import { createNeutralTable } from "../engine/neutralTable";
import type { TableRuntime, TableRuntimeView } from "../features/tableRuntime";
import type { RowGroupRef } from "../grouping/groupRows";
import type { TreeEntry } from "../tree/treeRows";
import type { RowMoveRequest } from "./rowMove";
import { createRowReorderController } from "./rowReorderController";
import { applyRowReorder } from "./rowReorderPolicy";
import {
  dispatchRowMove,
  rowMoveView,
  rowReorderRuntimeOptions,
} from "./rowReorderRuntime";

interface Row {
  id: string;
  name: string;
}

const A: Row = { id: "a", name: "Ada" };
const B: Row = { id: "b", name: "Bea" };
const D: Row = { id: "d", name: "Dee" };

const entry = (
  row: Row,
  parentId: string | undefined,
  siblingIndex: number,
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

const TREE = [
  entry(A, undefined, 0, ["b"]),
  entry(B, "a", 0),
  entry(D, undefined, 1),
];

function view(
  overrides: Partial<TableRuntimeView<Row>> = {}
): TableRuntimeView<Row> {
  return {
    rows: [A, B, D],
    getRowId: (row) => row.id,
    rowLabel: (row) => row.name,
    ...overrides,
  };
}

function runtime(
  current: TableRuntimeView<Row> | undefined,
  labels?: Record<string, unknown>
): TableRuntime<Row> {
  return {
    rowAt: (index) => current?.rows[index],
    labels: () => labels,
    view: () => current,
    featureIds: () => [],
  };
}

const west: RowGroupRef = { id: "g:w", label: "West", levels: [] };
const east: RowGroupRef = { id: "g:e", label: "East", levels: [] };

describe("rowMoveView", () => {
  it("narrows the runtime view to what a move reads", () => {
    const tree = { entries: TREE };
    expect(rowMoveView(view({ sortBy: "name", tree }))).toMatchObject({
      sortBy: "name",
      tree,
      grouping: undefined,
    });
  });
});

describe("dispatchRowMove", () => {
  it("routes a group move and a tree move to their handlers", () => {
    const onGroupMove = vi.fn();
    const onTreeMove = vi.fn();
    const group: RowMoveRequest<Row> = {
      kind: "group",
      row: A,
      rowLabel: "Ada",
      fromGroup: west,
      toGroup: east,
      position: 2,
    };
    const tree: RowMoveRequest<Row> = {
      kind: "tree",
      row: B,
      rowLabel: "Bea",
      fromParent: { id: "a", row: A, label: "Ada" },
      toParent: { id: "d", row: D, label: "Dee" },
      position: 0,
    };
    dispatchRowMove(group, { onGroupMove, onTreeMove });
    dispatchRowMove(tree, { onGroupMove, onTreeMove });
    expect(onGroupMove).toHaveBeenCalledWith(A, west, east, 2);
    expect(onTreeMove).toHaveBeenCalledWith(
      B,
      tree.fromParent,
      tree.toParent,
      0
    );
    expect(() => {
      dispatchRowMove(group, undefined);
      dispatchRowMove(tree, {});
    }).not.toThrow();
  });
});

describe("rowReorderRuntimeOptions", () => {
  it("reads the live table for rows, identity and labels", () => {
    const onRowReorder = vi.fn();
    const options = rowReorderRuntimeOptions(
      runtime(view(), { rowLifted: (at: number) => `up ${String(at)}` }),
      onRowReorder,
      { movePolicy: "confirm" }
    );
    expect(options).toMatchObject({
      enabled: true,
      onRowReorder,
      movePolicy: "confirm",
      confirmMove: undefined,
    });
    expect(options.rowAt(1)).toBe(B);
    expect(options.getRowId?.(D)).toBe("d");
    expect(options.labels.rowLifted(3)).toBe("up 3");
  });

  it("dispatches confirmed moves to the host's handlers", () => {
    const onTreeMove = vi.fn();
    const options = rowReorderRuntimeOptions(runtime(view()), vi.fn(), {
      onTreeMove,
    });
    void options.onRowMove?.({
      kind: "tree",
      row: B,
      rowLabel: "Bea",
      fromParent: { id: "a", row: A, label: "Ada" },
      toParent: { id: "d", row: D, label: "Dee" },
      position: 0,
    });
    expect(onTreeMove).toHaveBeenCalledTimes(1);
  });

  it("resolves tree drops and menus against the view of the moment", () => {
    const options = rowReorderRuntimeOptions(
      runtime(view({ tree: { entries: TREE } })),
      vi.fn(),
      { movePolicy: "auto", onTreeMove: vi.fn() }
    );
    expect(options.resolveMove?.(B, D, "inside")).toMatchObject({
      kind: "move",
    });
    expect(options.getMoveMenu?.(B)?.targets.length).toBeGreaterThan(0);
  });

  it("reports positions in the host's data while a filter hides rows", () => {
    const C: Row = { id: "c", name: "Cy" };
    const data = [A, B, C, D];
    const engine = createTableEngine<Row>({
      data,
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
    });
    // A filter hides Bea: the table draws Ada, Cy, Dee.
    const visible = [A, C, D];
    const onRowReorder = vi.fn();
    const controller = createRowReorderController(
      rowReorderRuntimeOptions(
        {
          ...runtime(
            view({
              rows: visible,
              neutralTable: createNeutralTable(engine, "t"),
            })
          ),
          rowAt: (index) => visible[index],
        },
        onRowReorder
      )
    );
    controller.moveBy(2, -1, D, 0, visible.length);
    expect(onRowReorder).toHaveBeenCalledWith(3, 2, D);
    const [from, to] = onRowReorder.mock.calls[0] as [number, number];
    expect(applyRowReorder(data, from, to)).toEqual([A, B, D, C]);
  });

  it("reports dataset positions when the table has no engine", () => {
    const onRowReorder = vi.fn();
    const controller = createRowReorderController(
      rowReorderRuntimeOptions(runtime(view()), onRowReorder)
    );
    controller.moveBy(2, -1, D, 10, 3);
    expect(onRowReorder).toHaveBeenCalledWith(12, 11, D);
  });

  it("answers nothing while no view is published", () => {
    const options = rowReorderRuntimeOptions(runtime(undefined), vi.fn());
    expect(options.getMoveMenu?.(A)).toBeUndefined();
    expect(options.resolveMove?.(A, B, "before")).toBeUndefined();
    expect(options.getRowId?.(A)).toBe("");
    expect(options.rowAt(0)).toBeUndefined();
  });
});
