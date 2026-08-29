import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Task {
  id: string;
  title: string;
}

const ROWS: Task[] = [{ id: "1", title: "Ship" }];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title, editable: true },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

/**
 * A commit's save-state bookkeeping settles in a microtask after the host's
 * handler has already run. Flushing it inside `act` keeps that update inside
 * the test, which is what React asks for.
 */
const settleCommit = () => act(() => Promise.resolve());

describe("edit lifecycle (chakra)", () => {
  it("fires start, commit and cancel from the cell the reader typed in", async () => {
    const onEditStart = vi.fn();
    const onEditCommit = vi.fn();
    const onEditCancel = vi.fn();
    const onCellEdit = vi.fn();
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          onCellEdit={onCellEdit}
          onEditStart={onEditStart}
          onEditCommit={onEditCommit}
          onEditCancel={onEditCancel}
        />
      </ChakraProvider>
    );
    fireEvent.doubleClick(part("edit-cell-activate")!);
    expect(onEditStart).toHaveBeenCalledOnce();
    const editor = part("edit-cell-editor")!;
    fireEvent.change(editor, { target: { value: "Ship it" } });
    fireEvent.keyDown(editor, { key: "Enter" });
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledOnce();
    expect(onEditCommit).toHaveBeenCalledOnce();

    fireEvent.doubleClick(part("edit-cell-activate")!);
    fireEvent.keyDown(part("edit-cell-editor")!, { key: "Escape" });
    expect(onEditCancel).toHaveBeenCalledOnce();
  });
});
