/**
 * A focused cell whose row is drawn again under a new key — a rekey — is a
 * new element; focus moves to it instead of falling to the document.
 */
import { afterEach, expect, it } from "vitest";

import { createGridFocusController } from "./gridFocusController";

afterEach(() => document.body.replaceChildren());

function fixture() {
  const root = document.createElement("div");
  document.body.append(root);
  const grid = createGridFocusController({
    enabled: true,
    rows: [{ id: "a" }, { id: "b" }],
    columns: [{ key: "name" }],
    rowCount: 2,
    getRowId: (row) => row.id,
  });
  grid.attach(root);
  const mount = (row: number) => {
    const cell = document.createElement("button");
    cell.setAttribute("data-grid-cell", `${row}:0`);
    root.append(cell);
    return cell;
  };
  return { grid, mount };
}

it("hands focus to the cell that replaced the focused one", () => {
  const { grid, mount } = fixture();
  const first = mount(0);
  mount(1);
  first.focus();
  grid.trackFocus({ row: 0, col: 0 });
  first.remove();
  const replacement = mount(0);
  expect(document.activeElement).toBe(document.body);
  grid.syncFocus();
  expect(document.activeElement).toBe(replacement);
});

it("leaves focus where the reader took it", async () => {
  const { grid, mount } = fixture();
  const first = mount(0);
  first.focus();
  grid.trackFocus({ row: 0, col: 0 });
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  first.remove();
  mount(0);
  grid.syncFocus();
  expect(document.activeElement).toBe(outside);
  outside.blur();
  await Promise.resolve();
  grid.syncFocus();
  expect(document.activeElement).toBe(document.body);
});
