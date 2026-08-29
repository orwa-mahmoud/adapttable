import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
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
 * Editing lifecycle events.
 *
 * The handlers observe; they cannot change whether a commit lands. These check
 * that the same three events fire through this kit that core already proved.
 */
/**
 * A commit's save-state bookkeeping settles in a microtask after the host's
 * handler has already run. Flushing it inside `act` keeps that update inside
 * the test, which is what React asks for.
 */
const settleCommit = () => act(() => Promise.resolve());

describe("edit lifecycle (mantine)", () => {
  it("fires start, commit and cancel from the cell the reader typed in", async () => {
    const onEditStart = vi.fn();
    const onEditCommit = vi.fn();
    const onEditCancel = vi.fn();
    const onCellEdit = vi.fn();
    render(
      <MantineProvider>
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
      </MantineProvider>
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

  it("keeps a hit area after the host commits an empty value", () => {
    function Live() {
      const [data, setData] = useState(ROWS);
      return (
        <MantineProvider>
          <DataTable
            data={data}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            onCellEdit={(row, _key, value) => {
              setData((prev) =>
                prev.map((item) =>
                  item.id === row.id
                    ? { ...item, title: typeof value === "string" ? value : "" }
                    : item
                )
              );
            }}
          />
        </MantineProvider>
      );
    }
    render(<Live />);
    fireEvent.doubleClick(part("edit-cell-activate")!);
    fireEvent.change(part("edit-cell-editor")!, { target: { value: "" } });
    fireEvent.keyDown(part("edit-cell-editor")!, { key: "Enter" });
    const activate = part("edit-cell-activate")!;
    expect(activate.style.height).toBe("100%");
    expect(activate.style.minHeight).toBe("1.25em");
    fireEvent.doubleClick(activate);
    expect(part("edit-cell-editor")).not.toBeNull();
  });
});
