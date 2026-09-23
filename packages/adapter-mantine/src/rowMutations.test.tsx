import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { rowActions } from "./row-actions";

interface Task {
  id: string;
  title: string;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship" },
  { id: "2", title: "Test" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
const buttonsNamed = (name: RegExp) =>
  screen.queryAllByRole("button", { name });

/**
 * Adding, duplicating and deleting rows.
 *
 * The table only ever asks — so what these check is that the controls appear
 * exactly when their handler is wired, that the ask reaches the host with the
 * right row, and that a delete goes through a confirmation first.
 */
describe("row mutations (mantine)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <MantineProvider>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          {...extra}
        />
      </MantineProvider>
    );

  it("renders no add control and no row actions until the host wires them", () => {
    table();
    expect(part("add-row")).toBeNull();
    expect(buttonsNamed(/duplicate row/i)).toHaveLength(0);
    expect(buttonsNamed(/delete row/i)).toHaveLength(0);
  });

  it("asks the host for a new row", () => {
    const onAddRow = vi.fn();
    table({ onAddRow });
    fireEvent.click(part("add-row")!);
    expect(onAddRow).toHaveBeenCalledTimes(1);
  });

  it("puts a duplicate action on every row, carrying that row", () => {
    const onDuplicateRow = vi.fn();
    table({ onDuplicateRow });
    const actions = buttonsNamed(/duplicate row/i);
    expect(actions).toHaveLength(ROWS.length);
    expect(actions[0]!.querySelector("svg")).not.toBeNull();
    expect(actions[0]!.textContent?.trim()).toBe("");
    fireEvent.click(actions[1]!);
    expect(onDuplicateRow).toHaveBeenCalledWith(ROWS[1]);
  });

  it("asks before deleting, and deletes only on yes", () => {
    const onDeleteRow = vi.fn();
    const confirm = vi
      .spyOn(window, "confirm")
      .mockImplementation(() => false)
      .mockName("confirm");
    table({ onDeleteRow });
    fireEvent.click(buttonsNamed(/delete row/i)[0]!);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onDeleteRow).not.toHaveBeenCalled();

    confirm.mockImplementation(() => true);
    fireEvent.click(buttonsNamed(/delete row/i)[0]!);
    expect(onDeleteRow).toHaveBeenCalledWith(ROWS[0]);
    confirm.mockRestore();
  });

  it("deletes without asking when the host already did", () => {
    const onDeleteRow = vi.fn();
    const confirm = vi.spyOn(window, "confirm");
    table({ onDeleteRow, confirmDeleteRow: false });
    fireEvent.click(buttonsNamed(/delete row/i)[0]!);
    expect(confirm).not.toHaveBeenCalled();
    expect(onDeleteRow).toHaveBeenCalledWith(ROWS[0]);
    confirm.mockRestore();
  });

  it("keeps the host's own actions ahead of a delete", () => {
    const open = vi.fn();
    table({
      rowActions: [{ key: "open", label: "Open", onClick: open }],
      onDeleteRow: vi.fn(),
    });
    const first = screen.getAllByRole("row")[1]!;
    const names = [...first.querySelectorAll("button")].map(
      (b) => b.getAttribute("aria-label") ?? b.textContent
    );
    expect(names).toEqual(["Open", "Delete row"]);
  });

  it("names the controls in the host's language", () => {
    table({
      onAddRow: vi.fn(),
      onDeleteRow: vi.fn(),
      labels: { addRow: "Neue Zeile", deleteRow: "Zeile löschen" },
    });
    expect(part("add-row")).toHaveTextContent("Neue Zeile");
    expect(buttonsNamed(/zeile löschen/i)).toHaveLength(ROWS.length);
  });

  describe("through rowActions(actions, handlers)", () => {
    it("draws Add in the toolbar and asks the host, with no host prop set", () => {
      const onAddRow = vi.fn();
      table({ features: [rowActions<Task>(undefined, { onAddRow })] });
      const add = part("add-row")!;
      expect(add).not.toBeNull();
      expect(add.tabIndex).not.toBe(-1);
      fireEvent.click(add);
      expect(onAddRow).toHaveBeenCalledTimes(1);
    });

    it("puts Duplicate and Delete on every row after the host's actions", () => {
      const onDuplicateRow = vi.fn();
      const onDeleteRow = vi.fn();
      const confirm = vi
        .spyOn(window, "confirm")
        .mockImplementation(() => true);
      table({
        features: [
          rowActions<Task>([{ key: "open", label: "Open", onClick: vi.fn() }], {
            onDuplicateRow,
            onDeleteRow,
          }),
        ],
      });
      expect(buttonsNamed(/duplicate row/i)).toHaveLength(ROWS.length);
      expect(buttonsNamed(/delete row/i)).toHaveLength(ROWS.length);
      const first = screen.getAllByRole("row")[1]!;
      const names = [...first.querySelectorAll("button")].map(
        (b) => b.getAttribute("aria-label") ?? b.textContent
      );
      expect(names).toEqual(["Open", "Duplicate row", "Delete row"]);
      fireEvent.click(buttonsNamed(/duplicate row/i)[1]!);
      expect(onDuplicateRow).toHaveBeenCalledWith(ROWS[1]);
      fireEvent.click(buttonsNamed(/delete row/i)[0]!);
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(onDeleteRow).toHaveBeenCalledWith(ROWS[0]);
      confirm.mockRestore();
    });

    it("skips the confirmation when confirmDeleteRow is false", () => {
      const onDeleteRow = vi.fn();
      const confirm = vi.spyOn(window, "confirm");
      table({
        features: [
          rowActions<Task>(undefined, { onDeleteRow, confirmDeleteRow: false }),
        ],
      });
      fireEvent.click(buttonsNamed(/delete row/i)[1]!);
      expect(confirm).not.toHaveBeenCalled();
      expect(onDeleteRow).toHaveBeenCalledWith(ROWS[1]);
      confirm.mockRestore();
    });

    it("keeps the actions on mobile cards", () => {
      const onDuplicateRow = vi.fn();
      table({
        forceMobile: true,
        features: [rowActions<Task>(undefined, { onDuplicateRow })],
      });
      expect(buttonsNamed(/duplicate row/i)).toHaveLength(ROWS.length);
      fireEvent.click(buttonsNamed(/duplicate row/i)[0]!);
      expect(onDuplicateRow).toHaveBeenCalledWith(ROWS[0]);
    });

    it("renders right to left with localized names", () => {
      table({
        dir: "rtl",
        labels: { addRow: "إضافة صف", deleteRow: "حذف الصف" },
        features: [
          rowActions<Task>(undefined, {
            onAddRow: vi.fn(),
            onDeleteRow: vi.fn(),
          }),
        ],
      });
      expect(document.querySelector('[dir="rtl"]')).not.toBeNull();
      expect(part("add-row")).toHaveTextContent("إضافة صف");
      expect(buttonsNamed(/حذف الصف/)).toHaveLength(ROWS.length);
    });

    it("draws nothing when the handlers are empty", () => {
      table({ features: [rowActions<Task>(undefined, {})] });
      expect(part("add-row")).toBeNull();
      expect(buttonsNamed(/duplicate row/i)).toHaveLength(0);
      expect(buttonsNamed(/delete row/i)).toHaveLength(0);
    });
  });
});
