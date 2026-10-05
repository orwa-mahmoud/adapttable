import { expect, it, vi } from "vitest";

import {
  createRowReorderController,
  defaultRowReorderAnnouncements,
  type RowDragEvent,
} from "./rowReorderEngine";
import { rowReorderRuntimeOptions } from "./rowReorderRuntime";

const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

function drag(): RowDragEvent {
  const data = new Map<string, string>();
  return {
    dataTransfer: {
      effectAllowed: "none",
      dropEffect: "none",
      setData: (key, value) => {
        data.set(key, value);
      },
      getData: (key) => data.get(key) ?? "",
    },
    clientY: 0,
    currentTarget: null,
    preventDefault: vi.fn(),
  };
}

it("keeps rows-only runtime dragging before the view publishes identity", () => {
  const onRowReorder = vi.fn();
  const controller = createRowReorderController(
    rowReorderRuntimeOptions(
      {
        rowAt: (index) => rows[index],
        view: () => undefined,
        labels: () => undefined,
        featureIds: () => [],
      },
      onRowReorder
    )
  );
  const event = drag();
  controller.dragStart(event, "a", 0);
  controller.drop(event, 2, rows[2]!, 0);
  expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 2, rows[0]);
});

it("keeps identity validation when source indexes opt in without a session", () => {
  let current = rows;
  const onRowReorder = vi.fn();
  const controller = createRowReorderController({
    enabled: true,
    onRowReorder,
    labels: defaultRowReorderAnnouncements,
    rowAt: (index) => current[index],
    getRowId: (row) => row.id,
    getRowIndex: (row) => rows.findIndex((entry) => entry.id === row.id),
  });
  const event = drag();
  controller.dragStart(event, "a", 0);
  current = [rows[1]!, rows[0]!, rows[2]!];
  controller.drop(event, 2, rows[2]!, 0);
  expect(onRowReorder).not.toHaveBeenCalled();
  const staleStart = drag();
  controller.dragStart(staleStart, "a", 0);
  expect(staleStart.preventDefault).toHaveBeenCalledOnce();
  expect(controller.getSnapshot().lifted).toBeNull();
});

it("substitutes the live row for an indexed gesture with the same identity", () => {
  const live = [{ ...rows[2]!, revision: 2 }, rows[0]!, rows[1]!];
  const onRowReorder = vi.fn();
  const controller = createRowReorderController({
    enabled: true,
    onRowReorder,
    labels: defaultRowReorderAnnouncements,
    rowAt: (index) => live[index],
    getRowId: (row) => row.id,
    getRowIndex: (row) => rows.findIndex((entry) => entry.id === row.id),
  });
  controller.moveBy(0, 1, rows[2]!, 0, 3);
  expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(2, 1, live[0]);
  expect(onRowReorder.mock.calls[0]?.[2]).toBe(live[0]);
});
