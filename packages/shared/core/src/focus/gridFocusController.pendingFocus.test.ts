import { afterEach, expect, it } from "vitest";

import { createGridFocusController } from "./gridFocusController";

afterEach(() => document.body.replaceChildren());

function fixture() {
  const root = document.createElement("div");
  document.body.append(root);
  const grid = createGridFocusController({
    enabled: true,
    rows: [{ id: "first" }, { id: "second" }, { id: "third" }],
    columns: [{ key: "name" }],
    rowCount: 3,
    getRowId: (row) => row.id,
  });
  grid.attach(root);
  const mount = (row: number) => {
    const cell = document.createElement("button");
    cell.setAttribute("data-grid-cell", `${row}:0`);
    root.append(cell);
    return cell;
  };
  return { root, grid, mount };
}

it("retires the request when actual focus confirms its existing active address", () => {
  const { root, grid, mount } = fixture();
  grid.focusCell({ row: 1, col: 0 });
  const target = mount(1);
  target.focus();
  grid.trackFocus({ row: 1, col: 0 });
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  grid.syncFocus();
  expect(document.activeElement).toBe(outside);
  expect(root.contains(document.activeElement)).toBe(false);
});

it("preserves a fresh focus request issued by a focus-state subscriber", () => {
  const { grid, mount } = fixture();
  grid.focusCell({ row: 1, col: 0 });
  const current = mount(0);
  current.focus();
  let requested = false;
  grid.subscribe(() => {
    if (!requested && grid.getSnapshot().active?.row === 0) {
      requested = true;
      grid.focusCell({ row: 2, col: 0 });
    }
  });
  grid.trackFocus({ row: 0, col: 0 });
  const latest = mount(2);
  grid.syncFocus();
  expect(requested).toBe(true);
  expect(document.activeElement).toBe(latest);
});

it("keeps an ordinary deferred request until its cell mounts", () => {
  const { grid, mount } = fixture();
  grid.focusCell({ row: 1, col: 0 });
  grid.syncFocus();
  const late = mount(1);
  grid.syncFocus();
  expect(document.activeElement).toBe(late);
});

it("does not revive a pending numeric request after another mounted cell takes focus", () => {
  const root = document.createElement("div");
  document.body.append(root);
  const current = document.createElement("button");
  current.setAttribute("data-grid-cell", "0:0");
  root.append(current);
  const grid = createGridFocusController({
    enabled: true,
    rows: [{ id: "current" }, { id: "late" }],
    columns: [{ key: "name" }],
    rowCount: 2,
    getRowId: (row) => row.id,
  });
  grid.attach(root);
  grid.focusCell({ row: 1, col: 0 });
  current.focus();
  grid.trackFocus({ row: 0, col: 0 });
  expect(grid.getSnapshot().active).toEqual({ row: 0, col: 0 });
  const late = document.createElement("button");
  late.setAttribute("data-grid-cell", "1:0");
  root.append(late);
  grid.syncFocus();
  expect(document.activeElement).toBe(current);
});

it("does not revive a tracked-away request when the grid detaches and reconnects", () => {
  const { root, grid, mount } = fixture();
  grid.focusCell({ row: 1, col: 0 });
  const current = mount(0);
  current.focus();
  grid.trackFocus({ row: 0, col: 0 });
  grid.attach(null);
  mount(1);
  grid.syncFocus();
  expect(document.activeElement).toBe(current);
  grid.attach(root);
  grid.syncFocus();
  expect(document.activeElement).toBe(current);
});
