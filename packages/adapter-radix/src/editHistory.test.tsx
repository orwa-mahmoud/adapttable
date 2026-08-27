import { Theme } from "@radix-ui/themes";
import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "A" },
  { id: "2", name: "B" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name, editable: true },
];

/**
 * Undo and redo for the radix adapter.
 *
 * Core owns the history; each adapter has to route its commits through it and
 * hand the keys to the grid. The boundary shows up here: an undo is a COMMIT
 * of the old value back through onCellEdit, never a mutation of the rows.
 */
describe("undo and redo (radix)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <Theme>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          cellNavigation
          {...extra}
        />
      </Theme>
    );
  const cell = (row: number, col: number) =>
    document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`)!;
  const paste = (text: string) => {
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn().mockResolvedValue(text) },
    });
  };

  it("commits the previous value back on Ctrl+Z", async () => {
    paste("Z");
    const onCellEdit = vi.fn();
    table({ onCellEdit, editHistory: true });
    cell(0, 0).focus();
    await act(async () => {
      fireEvent.keyDown(cell(0, 0), { key: "v", ctrlKey: true });
      await vi.waitFor(() => expect(onCellEdit).toHaveBeenCalledOnce());
    });
    fireEvent.keyDown(cell(0, 0), { key: "z", ctrlKey: true });
    expect(onCellEdit).toHaveBeenLastCalledWith(ROWS[0], "name", "A");
    vi.unstubAllGlobals();
  });

  it("puts it back again on Ctrl+Shift+Z", async () => {
    paste("Z");
    const onCellEdit = vi.fn();
    table({ onCellEdit, editHistory: true });
    cell(0, 0).focus();
    await act(async () => {
      fireEvent.keyDown(cell(0, 0), { key: "v", ctrlKey: true });
      await vi.waitFor(() => expect(onCellEdit).toHaveBeenCalledOnce());
    });
    fireEvent.keyDown(cell(0, 0), { key: "z", ctrlKey: true });
    fireEvent.keyDown(cell(0, 0), { key: "z", ctrlKey: true, shiftKey: true });
    expect(onCellEdit).toHaveBeenLastCalledWith(ROWS[0], "name", "Z");
    vi.unstubAllGlobals();
  });

  it("records nothing without the prop", async () => {
    paste("Z");
    const onCellEdit = vi.fn();
    table({ onCellEdit });
    cell(0, 0).focus();
    await act(async () => {
      fireEvent.keyDown(cell(0, 0), { key: "v", ctrlKey: true });
      await vi.waitFor(() => expect(onCellEdit).toHaveBeenCalledOnce());
    });
    fireEvent.keyDown(cell(0, 0), { key: "z", ctrlKey: true });
    expect(onCellEdit).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
