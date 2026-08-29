import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, editable: true },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

/**
 * A save the reader can see.
 *
 * A cell that looks committed while a request is still out is a lie the reader
 * finds out about only when it fails — so what these check is that the cell says
 * it is working, says why it failed, and offers the value back.
 */
/**
 * A synchronous host still commits through the async save path, so the dirty-cell
 * bookkeeping lands a microtask later. Flushing it inside `act` keeps that update
 * inside the test.
 */
const settleCommit = () => act(() => Promise.resolve());

describe("async save states (chakra)", () => {
  const table = (
    onCellEdit: (row: Row, key: string, next: unknown) => unknown,
    extra?: Record<string, unknown>
  ) =>
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          onCellEdit={onCellEdit}
          {...extra}
        />
      </ChakraProvider>
    );
  const edit = (value: string) => {
    fireEvent.doubleClick(part("edit-cell-activate")!);
    const editor = part("edit-cell-editor")!;
    fireEvent.change(editor, { target: { value } });
    fireEvent.keyDown(editor, { key: "Enter" });
  };
  /** Commit, then let the rejected save settle. */
  const editAndSettle = async (value: string) => {
    edit(value);
    await act(async () => {
      await Promise.resolve();
    });
  };

  it("says nothing extra for a host that saves synchronously", async () => {
    table(() => undefined);
    edit("Augusta");
    await settleCommit();
    expect(part("edit-cell-activate")).not.toHaveAttribute("aria-busy");
    expect(part("edit-cell-save-error")).toBeNull();
  });

  it("marks the cell busy while the save is in flight", async () => {
    let settle: (() => void) | undefined;
    table(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        })
    );
    edit("Augusta");
    expect(part("edit-cell-activate")).toHaveAttribute("aria-busy", "true");
    expect(part("edit-cell-activate")).toHaveAttribute("data-save", "saving");

    await act(async () => {
      settle?.();
      await Promise.resolve();
    });
    expect(part("edit-cell-activate")).not.toHaveAttribute("aria-busy");
  });

  it("says why a save failed, out loud", async () => {
    table(() => Promise.reject(new Error("Someone else changed this row")));
    await editAndSettle("Augusta");
    const message = part("edit-cell-save-error")!;
    expect(message).toHaveAttribute("role", "alert");
    expect(message).toHaveTextContent("Someone else changed this row");
    expect(part("edit-cell-activate")).toHaveAttribute("data-save", "failed");
  });

  it("offers the previous value back when the host says how", async () => {
    const onEditRollback = vi.fn();
    table(() => Promise.reject(new Error("Conflict")), { onEditRollback });
    await editAndSettle("Augusta");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onEditRollback).toHaveBeenCalledExactlyOnceWith(ROWS[0], "name");
    // The message goes with it.
    expect(part("edit-cell-save-error")).toBeNull();
  });

  it("offers no undo when the host never said how to perform one", async () => {
    table(() => Promise.reject(new Error("Conflict")));
    await editAndSettle("Augusta");
    // A control that would do nothing when pressed is worse than none.
    expect(part("edit-cell-save-error")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("takes the host's own wording for a rejection", async () => {
    // A real API rejects with its own error type, not with a bare Error.
    class HttpError extends Error {
      constructor(readonly status: number) {
        super(`HTTP ${String(status)}`);
      }
    }
    table(() => Promise.reject(new HttpError(409)), {
      formatEditError: (error: unknown) =>
        error instanceof HttpError ? `HTTP ${String(error.status)}` : "unknown",
    });
    await editAndSettle("Augusta");
    expect(part("edit-cell-save-error")).toHaveTextContent("HTTP 409");
  });
});
