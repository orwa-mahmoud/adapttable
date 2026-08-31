import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./testDataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, editable: true },
];

const cell = () =>
  document.querySelector<HTMLElement>(
    '[data-adapttable-part="edit-cell-activate"]'
  )!;
const rows = () => [
  ...document.querySelectorAll<HTMLElement>(
    "tbody tr:not([aria-hidden]):not(.ant-table-measure-row)"
  ),
];

/**
 * The mark on a change nobody has confirmed.
 *
 * A table that looks identical before and after a save leaves the reader no way
 * to tell what is still at risk — and a mark that clears on its own would be
 * worse than none, so these check both directions.
 */
describe("dirty indicators (antd)", () => {
  const table = (
    onCellEdit: (row: Row, key: string, next: unknown) => unknown,
    extra?: Record<string, unknown>
  ) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        dirtyIndicators
        onCellEdit={onCellEdit}
        {...extra}
      />
    );
  const edit = (value: string) => {
    fireEvent.doubleClick(cell());
    const editor = document.querySelector<HTMLElement>(
      '[data-adapttable-part="edit-cell-editor"]'
    )!;
    fireEvent.change(editor, { target: { value } });
    fireEvent.keyDown(editor, { key: "Enter" });
  };

  it("marks nothing before anything is edited", () => {
    table(() => undefined);
    expect(cell()).not.toHaveAttribute("data-dirty");
    expect(rows()[0]).not.toHaveAttribute("data-dirty");
  });

  it("marks the cell and its row after an edit the host has not confirmed", () => {
    table(() => new Promise<void>(() => undefined));
    edit("Augusta");
    expect(cell()).toHaveAttribute("data-dirty");
    // The row carries it too, so a long table can be scanned.
    expect(rows()[0]).toHaveAttribute("data-dirty");
    expect(rows()[1]).not.toHaveAttribute("data-dirty");
  });

  it("clears the mark when the save resolves", async () => {
    let settle: (() => void) | undefined;
    table(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        })
    );
    edit("Augusta");
    expect(cell()).toHaveAttribute("data-dirty");

    await act(async () => {
      settle?.();
      await Promise.resolve();
    });
    expect(cell()).not.toHaveAttribute("data-dirty");
  });

  it("keeps the mark when the save fails — the value is still at risk", async () => {
    table(() => Promise.reject(new Error("Conflict")));
    edit("Augusta");
    await act(async () => {
      await Promise.resolve();
    });
    expect(cell()).toHaveAttribute("data-dirty");
    expect(rows()[0]).toHaveAttribute("data-dirty");
  });

  it("clears the mark when a rollback undoes the change", async () => {
    const onEditRollback = vi.fn();
    table(() => Promise.reject(new Error("Conflict")), { onEditRollback });
    edit("Augusta");
    await act(async () => {
      await Promise.resolve();
    });
    const undo = document.querySelector<HTMLElement>(
      '[data-adapttable-part="edit-cell-rollback"]'
    )!;
    fireEvent.click(undo);
    expect(onEditRollback).toHaveBeenCalledOnce();
    expect(cell()).not.toHaveAttribute("data-dirty");
  });

  it("marks nothing at all without the prop", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        onCellEdit={() => new Promise<void>(() => undefined)}
      />
    );
    edit("Augusta");
    // Opt-in: a table whose host never says what settled would be guessing.
    expect(cell()).not.toHaveAttribute("data-dirty");
    expect(rows()[0]).not.toHaveAttribute("data-dirty");
  });
});
