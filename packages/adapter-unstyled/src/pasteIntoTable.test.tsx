import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  team: string;
}
const ROWS: Row[] = [
  { id: "1", name: "A", team: "X" },
  { id: "2", name: "B", team: "Y" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name, editable: true },
  { key: "team", header: "T", accessor: (r) => r.team, editable: true },
];

/**
 * Paste, through the whole table rather than the hook.
 *
 * The hook's own tests prove the parsing and the mapping; these prove the
 * wiring — that a host who set `cellNavigation` and `onCellEdit` gets paste
 * without asking for it, and that a host who wants the batch whole gets it.
 */
describe("pasting into the table (unstyled)", () => {
  const cell = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-grid-cell="0:0"]')!;
  const clipboard = (text: string) => {
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn().mockResolvedValue(text) },
    });
  };

  it("commits a pasted block through the ordinary edit channel", async () => {
    clipboard("P\tQ");
    const onCellEdit = vi.fn();
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        cellNavigation
        onCellEdit={onCellEdit}
      />
    );
    act(() => cell(container).focus());
    fireEvent.keyDown(cell(container), { key: "v", ctrlKey: true });
    await waitFor(() => expect(onCellEdit).toHaveBeenCalledTimes(2));
    expect(onCellEdit).toHaveBeenNthCalledWith(1, ROWS[0], "name", "P");
    expect(onCellEdit).toHaveBeenNthCalledWith(2, ROWS[0], "team", "Q");
    vi.unstubAllGlobals();
  });

  it("hands the whole batch to onCellPaste when the host wants it", async () => {
    clipboard("P\tQ\nR\tS");
    const onCellPaste = vi.fn();
    const onCellEdit = vi.fn();
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        cellNavigation
        onCellEdit={onCellEdit}
        onCellPaste={onCellPaste}
      />
    );
    act(() => cell(container).focus());
    fireEvent.keyDown(cell(container), { key: "v", metaKey: true });
    await waitFor(() => expect(onCellPaste).toHaveBeenCalledOnce());
    // One call carrying all four cells — one transaction, one undo entry.
    expect(onCellPaste.mock.calls[0]?.[0]).toHaveLength(4);
    expect(onCellEdit).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("leaves the browser's paste alone on a table that takes no edits", () => {
    const readText = vi.fn().mockResolvedValue("P");
    vi.stubGlobal("navigator", { clipboard: { readText } });
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        cellNavigation
      />
    );
    act(() => cell(container).focus());
    fireEvent.keyDown(cell(container), { key: "v", ctrlKey: true });
    expect(readText).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("tells the host what a cut covered, clearing nothing itself", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const onCellCut = vi.fn();
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        cellNavigation
        onCellCut={onCellCut}
      />
    );
    act(() => cell(container).focus());
    fireEvent.keyDown(cell(container), { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(cell(container), { key: "x", ctrlKey: true });
    await waitFor(() => expect(onCellCut).toHaveBeenCalledOnce());
    expect(onCellCut.mock.calls[0]?.[0]).toMatchObject({
      anchor: { row: 0, col: 0 },
      head: { row: 0, col: 1 },
    });
    vi.unstubAllGlobals();
  });
});
