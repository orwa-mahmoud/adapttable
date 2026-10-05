import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import {
  KEYED_WINDOW,
  type KeyedWindowSlotProps,
  slotRender,
  type TableFeature,
} from "@adapttable/react/adapter";
import {
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";

interface Task {
  id: string;
  title: string;
  team: string;
}
const rows: Task[] = [
  { id: "a", title: "Alpha", team: "Core" },
  { id: "b", title: "Beta", team: "Web" },
  { id: "c", title: "Gamma", team: "Core" },
];
const columns: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (row) => row.title },
  { key: "team", header: "Team", accessor: (row) => row.team },
];
const rowKey = (row: Task) => row.id;
const leaves = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-adapttable-part="row"][data-row-id]'
  ),
];
const gripOf = (row: HTMLElement) =>
  row.querySelector<HTMLElement>(
    '[data-adapttable-part="row-reorder-handle"]'
  )!;

function pointerDrop(origin: HTMLElement, target: HTMLElement): void {
  const grip = gripOf(origin);
  const data = new Map<string, string>();
  const dataTransfer = {
    dropEffect: "none",
    effectAllowed: "all",
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? "",
  };
  const start = createEvent.dragStart(grip, { dataTransfer });
  fireEvent(grip, start);
  expect(start.defaultPrevented).toBe(false);
  // Lifting can replace native row nodes. The browser contract also finds
  // the current target by stable row identity after the lift rerenders.
  const liveRows = [...document.querySelectorAll<HTMLElement>("[data-row-id]")];
  const liveOrigin = liveRows.find(
    (node) => node.dataset.rowId === origin.dataset.rowId
  )!;
  const liveTarget = liveRows.find(
    (node) => node.dataset.rowId === target.dataset.rowId
  )!;
  expect(liveOrigin).toBeDefined();
  expect(liveTarget).toBeDefined();
  // jsdom does not lay out rows or implement DragEvent coordinates. Use
  // the same midpoint drop zone as the real-browser row-reorder contract.
  vi.spyOn(liveTarget, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 20, 300, 40)
  );
  const over = createEvent.dragOver(liveTarget, { dataTransfer });
  Object.defineProperty(over, "clientY", { value: 40 });
  fireEvent(liveTarget, over);
  expect(over.defaultPrevented).toBe(true);
  const hoveredRows = [
    ...document.querySelectorAll<HTMLElement>("[data-row-id]"),
  ];
  const hoveredOrigin = hoveredRows.find(
    (node) => node.dataset.rowId === origin.dataset.rowId
  )!;
  const dropTarget = hoveredRows.find(
    (node) => node.dataset.rowId === target.dataset.rowId
  )!;
  expect(hoveredOrigin).toHaveAttribute("data-dragging");
  expect(dropTarget).toHaveAttribute("data-drop", "inside");
  vi.spyOn(dropTarget, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 20, 300, 40)
  );
  const drop = createEvent.drop(dropTarget, { dataTransfer });
  Object.defineProperty(drop, "clientY", { value: 40 });
  fireEvent(dropTarget, drop);
  fireEvent.dragEnd(grip, { dataTransfer });
}

it("moves the grabbed grouped leaf when native indexes include group headers", async () => {
  const onGroupMove = vi.fn();
  render(
    <DataTable
      data={rows}
      columns={columns}
      rowKey={rowKey}
      urlSync={false}
      groupBy="team"
      features={[
        rowReorder<Task>(vi.fn(), { movePolicy: "confirm", onGroupMove }),
      ]}
    />
  );
  const inventory = leaves();
  expect(
    inventory.map((node) => [node.dataset.rowId, node.dataset.index])
  ).toEqual([
    ["a", "1"],
    ["c", "2"],
    ["b", "4"],
  ]);
  pointerDrop(inventory[0]!, inventory[2]!);
  const confirmation = await screen.findByRole("alertdialog", {
    name: "Confirm row move",
  });
  expect(confirmation).toHaveTextContent("Move Alpha from Core to Web?");
  fireEvent.click(within(confirmation).getByRole("button", { name: "Move" }));
  expect(onGroupMove).toHaveBeenCalledExactlyOnceWith(
    rows[0],
    expect.objectContaining({ label: "Core" }),
    expect.objectContaining({ label: "Web" }),
    0
  );
});

it("uses sibling positions for keyboard reordering inside a group", () => {
  const onRowReorder = vi.fn();
  render(
    <DataTable
      data={rows}
      columns={columns}
      rowKey={rowKey}
      urlSync={false}
      groupBy="team"
      features={[rowReorder<Task>(onRowReorder)]}
    />
  );
  const grip = gripOf(leaves()[0]!);
  fireEvent.keyDown(grip, { key: " " });
  fireEvent.keyDown(grip, { key: "ArrowDown" });
  fireEvent.keyDown(grip, { key: " " });
  expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, rows[0]);
});

it("reindexes the remaining leaves after an earlier group collapses", () => {
  const moreRows = [...rows, { id: "d", title: "Delta", team: "Ops" }];
  const onGroupMove = vi.fn();
  render(
    <DataTable
      data={moreRows}
      columns={columns}
      rowKey={rowKey}
      urlSync={false}
      groupBy="team"
      features={[
        rowReorder<Task>(vi.fn(), { movePolicy: "auto", onGroupMove }),
      ]}
    />
  );
  fireEvent.click(
    document.querySelector('[data-adapttable-part="group-toggle"]')!
  );
  const inventory = leaves();
  expect(inventory.map((node) => node.dataset.rowId)).toEqual(["b", "d"]);
  pointerDrop(inventory[0]!, inventory[1]!);
  expect(onGroupMove).toHaveBeenCalledExactlyOnceWith(
    rows[1],
    expect.objectContaining({ label: "Web" }),
    expect.objectContaining({ label: "Ops" }),
    0
  );
});

it("reads the refreshed row identity and grouped order", () => {
  const onGroupMove = vi.fn();
  const features = [
    rowReorder<Task>(vi.fn(), { movePolicy: "auto", onGroupMove }),
  ];
  const props = { columns, rowKey, urlSync: false, groupBy: "team", features };
  const view = render(<DataTable data={rows} {...props} />);
  const refreshed = [
    { ...rows[2]!, title: "Updated Gamma" },
    { ...rows[0]! },
    { ...rows[1]! },
  ];
  view.rerender(<DataTable data={refreshed} {...props} />);
  const inventory = leaves();
  expect(inventory.map((node) => node.dataset.rowId)).toEqual(["c", "a", "b"]);
  pointerDrop(inventory[0]!, inventory[2]!);
  expect(onGroupMove).toHaveBeenCalledExactlyOnceWith(
    refreshed[0],
    expect.objectContaining({ label: "Core" }),
    expect.objectContaining({ label: "Web" }),
    0
  );
});

it("keeps the dataset offset for a flat paged drag", () => {
  const moreRows = [...rows, { id: "d", title: "Delta", team: "Ops" }];
  const onRowReorder = vi.fn();
  render(
    <DataTable
      data={moreRows}
      columns={columns}
      rowKey={rowKey}
      urlAdapter={createMemoryAdapter("limit=2&page=2")}
      features={[rowReorder<Task>(onRowReorder)]}
    />
  );
  const inventory = leaves();
  expect(inventory.map((node) => node.dataset.rowId)).toEqual(["c", "d"]);
  pointerDrop(inventory[0]!, inventory[1]!);
  expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(2, 3, rows[2]);
});

it("keeps expanded tree identity and rejects a parent-to-child cycle", () => {
  const onTreeMove = vi.fn();
  const treeRows = [
    { ...rows[0]!, parentId: undefined },
    { ...rows[1]!, parentId: "a" },
    { ...rows[2]!, parentId: undefined },
  ];
  render(
    <DataTable
      data={treeRows}
      columns={columns}
      rowKey={rowKey}
      urlSync={false}
      getParentId={(row: Task & { parentId?: string }) => row.parentId}
      features={[rowReorder<Task>(vi.fn(), { movePolicy: "auto", onTreeMove })]}
    />
  );
  fireEvent.click(
    document.querySelector('[data-adapttable-part="tree-toggle"]')!
  );
  const inventory = leaves();
  expect(inventory.map((node) => node.dataset.rowId)).toEqual(["a", "b", "c"]);
  pointerDrop(inventory[0]!, inventory[1]!);
  expect(onTreeMove).not.toHaveBeenCalled();
  expect(
    document.querySelector('[data-adapttable-part="row-reorder-announcer"]')
  ).toHaveTextContent("cannot move inside");
  pointerDrop(inventory[1]!, inventory[2]!);
  expect(onTreeMove).toHaveBeenCalledExactlyOnceWith(
    treeRows[1],
    expect.objectContaining({ id: "a" }),
    expect.objectContaining({ id: "c" }),
    0
  );
});

it("keeps source indexes when native pinning moves a row ahead of its source slot", () => {
  const onRowReorder = vi.fn();
  render(
    <DataTable
      data={rows}
      columns={columns}
      rowKey={rowKey}
      urlSync={false}
      pinnedRowIds={{ top: ["c"], bottom: [] }}
      onPinnedRowIdsChange={vi.fn()}
      features={[rowReorder<Task>(onRowReorder)]}
    />
  );
  const pinned = document.querySelector<HTMLElement>(
    '[data-adapttable-part="pinned-top"]'
  )!;
  expect(pinned).toHaveAttribute("data-row-id", "c");
  expect(pinned).toHaveAttribute("data-index", "0");
  pointerDrop(pinned, leaves()[0]!);
  expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(2, 0, rows[2]);
  expect(leaves()[0]).toHaveAttribute("data-index", "1");
});

it("keeps the full leaf inventory when the native grouped body is windowed", () => {
  const onGroupMove = vi.fn();
  // The real keyed-window slot supplies an off-origin slice in jsdom,
  // whose missing layout cannot drive a measured virtualizer itself.
  const window: TableFeature<Task> = {
    id: "virtualize",
    apply: () => ({ virtualize: true }),
    renders: [
      slotRender(
        KEYED_WINDOW,
        ({ children, enabled, keys }: KeyedWindowSlotProps) =>
          children({
            enabled,
            indices: enabled ? [2, 3, 4] : keys.map((_, index) => index),
            paddingTop: 112,
            paddingBottom: 0,
          })
      ),
    ],
  };
  const adapter = createMemoryAdapter("limit=100");
  function Harness() {
    const source = useFrontendData({
      data: rows,
      columns,
      urlAdapter: adapter,
      paginationMode: "infinite",
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={rowKey}
        groupBy="team"
        features={[
          window,
          rowReorder<Task>(vi.fn(), { movePolicy: "auto", onGroupMove }),
        ]}
      />
    );
  }
  render(<Harness />);
  const inventory = leaves();
  expect(
    inventory.map((node) => [node.dataset.rowId, node.dataset.index])
  ).toEqual([
    ["c", "0"],
    ["b", "2"],
  ]);
  pointerDrop(inventory[0]!, inventory[1]!);
  expect(onGroupMove).toHaveBeenCalledExactlyOnceWith(
    rows[2],
    expect.objectContaining({ label: "Core" }),
    expect.objectContaining({ label: "Web" }),
    0
  );
});
