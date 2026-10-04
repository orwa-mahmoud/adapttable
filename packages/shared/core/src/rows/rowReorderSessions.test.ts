import { describe, expect, it, vi } from "vitest";

import type { RowMoveRequest } from "./rowMove";
import {
  createRowReorderController,
  ROW_DND_MIME,
  type RowDragEvent,
  type RowReorderControllerOptions,
} from "./rowReorderEngine";
const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
type Row = (typeof rows)[number];
const request = (row: Row): RowMoveRequest<Row> => ({
  kind: "group",
  row,
  rowLabel: row.id,
  fromGroup: { id: "one", label: "One", levels: [] },
  toGroup: { id: "two", label: "Two", levels: [] },
  position: 0,
});
const labels = {
  rowLifted: (at: number) => `Lift ${at}`,
  rowMoved: (from: number, to: number) => `${from} to ${to}`,
  rowReorderCancelled: "Cancelled",
};
function setup(overrides: Partial<RowReorderControllerOptions<Row>> = {}) {
  const onRowReorder = vi.fn();
  const onRowMove = vi.fn();
  const options: RowReorderControllerOptions<Row> = {
    enabled: true,
    session: "A",
    labels,
    rowAt: (index) => rows[index],
    getRowId: (row) => row.id,
    onRowReorder,
    onRowMove,
    movePolicy: "confirm",
    getMoveMenu: (row) => ({
      kind: "group",
      label: "Move",
      targets: [{ id: "two", label: "Two", request: request(row) }],
    }),
    ...overrides,
  };
  const controller = createRowReorderController(options);
  return { controller, options, onRowReorder, onRowMove };
}
function drag() {
  const data = new Map<string, string>();
  const event: RowDragEvent = {
    dataTransfer: {
      effectAllowed: "none",
      dropEffect: "none",
      getData: (key) => data.get(key) ?? "",
      setData: (key, value) => {
        data.set(key, value);
      },
    },
    clientY: 0,
    currentTarget: null,
    preventDefault: vi.fn(),
  };
  return event;
}
describe("owned row reorder sessions", () => {
  it.each(["confirm", "auto"] as const)(
    "retires %s menu actions on disconnect and subsequent reconnect",
    (policy) => {
      const { controller, onRowMove } = setup({ movePolicy: policy });
      const release = controller.connect();
      const actions = controller.forSession();
      const target = actions.moveMenu(rows[0]!)!.targets[0]!;
      if (policy === "confirm") actions.selectMoveTarget(target);
      const pending = controller.forSession();
      release();
      controller.connect();
      actions.selectMoveTarget(target);
      pending.confirmMove();
      controller.selectMoveTarget(target);
      controller.confirmMove();
      expect(onRowMove).not.toHaveBeenCalled();
      expect(controller.getSnapshot()).toMatchObject({
        pendingMove: null,
        hostConfirmPending: false,
        lifted: null,
      });
    }
  );
  it("retires all prior callbacks across A to B to A and preserves current actions", () => {
    const { controller, options, onRowReorder, onRowMove } = setup();
    const old = controller.forSession();
    const target = old.moveMenu(rows[0]!)!.targets[0]!;
    old.selectMoveTarget(target);
    const confirm = controller.forSession();
    controller.configure({ ...options, session: "B" });
    controller.configure({ ...options, session: "A" });
    confirm.confirmMove();
    old.moveBy(0, 1, rows[0]!, 0, 3);
    old.dragStart(drag(), "a", 0);
    old.keyDown(
      { key: " ", currentTarget: null, preventDefault: vi.fn() },
      { rowId: "a", row: rows[0]!, localIndex: 0, windowStart: 0, rowCount: 3 }
    );
    old.selectMoveTarget(target);
    expect(onRowReorder).not.toHaveBeenCalled();
    expect(onRowMove).not.toHaveBeenCalled();
    expect(old.moveMenu(rows[0]!)).toBeUndefined();
    controller.forSession().moveBy(0, 1, rows[0]!, 0, 3);
    expect(onRowReorder).toHaveBeenCalledWith(0, 1, rows[0]);
  });
  it("binds confirmation to the pending request it rendered", () => {
    const { controller, onRowMove } = setup();
    controller.selectMoveTarget(controller.moveMenu(rows[0]!)!.targets[0]!);
    const first = controller.forSession();
    first.cancelMove();
    controller.selectMoveTarget(controller.moveMenu(rows[1]!)!.targets[0]!);
    first.confirmMove();
    first.cancelMove();
    expect(controller.getSnapshot().pendingMove?.row.id).toBe("b");
    expect(onRowMove).not.toHaveBeenCalled();
    controller.forSession().confirmMove();
    expect(onRowMove.mock.calls[0]?.[0].row.id).toBe("b");
  });
  it("drops a late host decision after the source session changes", async () => {
    let approve: ((value: boolean) => void) | undefined;
    const { controller, options, onRowMove } = setup({
      confirmMove: () =>
        new Promise<boolean>((resolve) => {
          approve = resolve;
        }),
    });
    controller.selectMoveTarget(controller.moveMenu(rows[0]!)!.targets[0]!);
    expect(controller.getSnapshot().hostConfirmPending).toBe(true);
    controller.configure({ ...options, session: "B" });
    approve?.(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(onRowMove).not.toHaveBeenCalled();
    expect(controller.getSnapshot().hostConfirmPending).toBe(false);
  });
  it("maps visual adjacency to authoritative source order by row identity", () => {
    const visual = [rows[2]!, rows[0]!, rows[1]!];
    const { controller, onRowReorder } = setup({
      rowAt: (index) => visual[index],
      getRowIndex: (row) => rows.findIndex((entry) => entry.id === row.id),
    });
    controller.forSession().moveBy(0, 1, rows[2]!, 0, 3);
    expect(onRowReorder).toHaveBeenCalledWith(2, 1, rows[2]);
  });
  it("rejects stale pointer identity even before owner configuration is refreshed", () => {
    let current = rows;
    const { controller, onRowReorder } = setup({
      rowAt: (index) => current[index],
    });
    const event = drag();
    controller.dragStart(event, "a", 0);
    current = [rows[1]!, rows[0]!, rows[2]!];
    controller.drop(event, 2, rows[2]!, 0);
    expect(onRowReorder).not.toHaveBeenCalled();
  });
  it("refuses foreign payloads and unloaded or unindexed destinations", () => {
    const { controller, onRowReorder, options } = setup();
    const event = drag();
    controller.dragStart(event, "a", 0);
    event.dataTransfer.setData(ROW_DND_MIME, "b:0");
    controller.drop(event, 2, rows[2]!, 0);
    expect(onRowReorder).not.toHaveBeenCalled();
    controller.configure({ ...options, getRowIndex: () => undefined });
    controller.moveBy(0, 1, rows[0]!, 0, 3);
    expect(onRowReorder).not.toHaveBeenCalled();
    controller.configure({ ...options, enabled: false });
    controller.confirmMove();
    controller.cancelMove();
    controller.dragOver(event, 1);
    controller.drop(event, 2, rows[2]!, 0);
    expect(controller.moveMenu(rows[0]!)).toBeUndefined();
  });
});
it("keeps the completed move announcement after its host updates the source session", () => {
  const owner: ReturnType<typeof setup> = setup({
    onRowReorder: () =>
      owner.controller.configure({
        ...owner.options,
        session: "accepted-data",
      }),
  });
  owner.controller.forSession().moveBy(0, 1, rows[0]!, 0, 3);
  expect(owner.controller.getSnapshot().announcement).toBe("1 to 2");
});
