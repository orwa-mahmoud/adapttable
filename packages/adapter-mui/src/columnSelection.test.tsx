import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cellNavigation } from "./cell-navigation";
import { columnSelectionCheckbox } from "./column-selection";
import type { ColumnDef } from "./index";
import { renderMui } from "./test-utils";
import { DataTable } from "./testDataTable";

interface Row {
  id: string;
  name: string;
  team: string;
}
const ROWS: Row[] = [
  { id: "1", name: "A", team: "X" },
  { id: "2", name: "B", team: "Y" },
];
/** One sortable column and one not: the gesture differs between them. */
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name },
  { key: "team", header: "T", accessor: (r) => r.team, sortable: true },
];

/**
 * Column selection from the header (mui).
 *
 * A sortable header's plain click already sorts, so the rule is: Ctrl/Cmd+click
 * selects anywhere, a plain click selects only where nothing else claims it.
 */
describe("column selection from the header (mui)", () => {
  const headers = (c: HTMLElement) =>
    c.querySelectorAll<HTMLElement>("thead th");

  it("selects a whole non-sorting column on a plain click", () => {
    const { container } = renderMui(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[cellNavigation<Row>()]}
        cellNavigation
      />
    );
    fireEvent.click(headers(container)[0]!);
    // Both loaded rows of that column, and nothing from the other.
    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(2);
  });

  it("leaves a sortable header's plain click to sorting", () => {
    const { container } = renderMui(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[cellNavigation<Row>()]}
        cellNavigation
      />
    );
    fireEvent.click(headers(container)[1]!);
    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(0);
  });

  it("selects a sortable column on Ctrl+click", () => {
    const { container } = renderMui(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[cellNavigation<Row>()]}
        cellNavigation
      />
    );
    fireEvent.click(headers(container)[1]!, { ctrlKey: true });
    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(2);
  });
});

/**
 * The header checkbox — the same column selection, reachable without Ctrl.
 *
 * A touch device has no modifier key to hold and a screen reader has no way to
 * discover a gesture nothing announces, so the state needs a control. It is
 * opt-in twice over: the option, and `cellNavigation` for there to be a
 * selection at all.
 */
describe("the column-selection header checkbox (mui)", () => {
  const table = (extra?: Record<string, unknown>) =>
    renderMui(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[
          ...(extra?.cellNavigation ? [cellNavigation<Row>()] : []),
          ...(extra?.columnSelectionCheckbox
            ? [columnSelectionCheckbox<Row>()]
            : []),
        ]}
        {...extra}
      />
    );
  const boxes = (c: HTMLElement) =>
    c.querySelectorAll<HTMLElement>('[data-adapttable-part="column-select"]');
  /**
   * The control inside the slot, whatever element the kit made it.
   *
   * Radix and Base UI build a checkbox out of a button carrying the role;
   * Mantine, MUI, Chakra, antd and the native path use an `<input>`. The role
   * is the one thing all seven agree on, so the test asks for that.
   */
  const box = (c: HTMLElement, index: number) =>
    boxes(c)[index]!.querySelector<HTMLElement>(
      '[role="checkbox"], input[type="checkbox"]'
    )!;
  const isChecked = (el: HTMLElement) =>
    el instanceof HTMLInputElement
      ? el.checked
      : el.getAttribute("aria-checked") === "true";

  it("draws nothing until asked", () => {
    const { container } = table({ cellNavigation: true });

    expect(boxes(container)).toHaveLength(0);
  });

  it("draws nothing without cell navigation to select into", () => {
    const { container } = table({ columnSelectionCheckbox: true });

    expect(boxes(container)).toHaveLength(0);
  });

  it("offers one per column and names the column in each", () => {
    const { container } = table({
      cellNavigation: true,
      columnSelectionCheckbox: true,
    });

    expect(boxes(container)).toHaveLength(COLS.length);
    expect(box(container, 0).getAttribute("aria-label")).toBe(
      "Select column: N"
    );
    expect(box(container, 1).getAttribute("aria-label")).toBe(
      "Select column: T"
    );
  });

  it("selects the whole column, and clears on a second click", () => {
    const { container } = table({
      cellNavigation: true,
      columnSelectionCheckbox: true,
    });

    fireEvent.click(box(container, 0));
    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(2);
    expect(isChecked(box(container, 0))).toBe(true);

    fireEvent.click(box(container, 0));
    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(0);
    expect(isChecked(box(container, 0))).toBe(false);
  });

  it("reads as checked only for the column that is the selection", () => {
    const { container } = table({
      cellNavigation: true,
      columnSelectionCheckbox: true,
    });

    fireEvent.click(box(container, 1));

    expect(isChecked(box(container, 1))).toBe(true);
    expect(isChecked(box(container, 0))).toBe(false);
  });

  it("does not sort the header it sits in", () => {
    const { container } = table({
      cellNavigation: true,
      columnSelectionCheckbox: true,
    });

    // Column 1 is the sortable one: its plain header click sorts, and the
    // checkbox is inside that header. Ticking it must not do both.
    fireEvent.click(box(container, 1));

    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(2);
    const header = container.querySelectorAll("thead th")[1]!;
    expect(header.getAttribute("aria-sort")).not.toBe("ascending");
  });

  it("leaves the Ctrl/Cmd+click gesture exactly as it was", () => {
    const { container } = table({
      cellNavigation: true,
      columnSelectionCheckbox: true,
    });

    fireEvent.click(container.querySelectorAll("thead th")[1]!, {
      ctrlKey: true,
    });

    expect(container.querySelectorAll("[data-cell-selected]")).toHaveLength(2);
  });
});
