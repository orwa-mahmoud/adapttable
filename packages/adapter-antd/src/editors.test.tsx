import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Shift {
  id: string;
  approved: boolean;
  day: string;
  startsAt: string;
  reviewedAt: string;
  tags: string[];
  team: string;
}

const ROWS: Shift[] = [
  {
    id: "1",
    approved: false,
    day: "2026-08-13",
    startsAt: "09:30",
    reviewedAt: "2026-08-13T14:05",
    tags: ["urgent"],
    team: "core",
  },
];

const COLS: ColumnDef<Shift>[] = [
  { key: "approved", header: "Approved", editable: true, editor: "boolean" },
  { key: "day", header: "Day", editable: true, editor: "date" },
  { key: "startsAt", header: "Starts", editable: true, editor: "time" },
  {
    key: "reviewedAt",
    header: "Reviewed",
    editable: true,
    editor: "datetime",
  },
  {
    key: "tags",
    header: "Tags",
    editable: true,
    editor: {
      type: "multi-select",
      options: ["urgent", "billable", "remote"],
    },
  },
  // Appended, so every open(index) above keeps the cell it means.
  {
    key: "team",
    header: "Team",
    editable: true,
    editor: {
      type: "select",
      options: [
        { value: "core", label: "Core" },
        { value: "web", label: "Web" },
      ],
    },
  },
];

const activates = () =>
  document.querySelectorAll<HTMLElement>(
    '[data-adapttable-part="edit-cell-activate"]'
  );
const editor = () =>
  document.querySelector<HTMLElement>(
    '[data-adapttable-part="edit-cell-editor"]'
  )!;

/**
 * The editors beyond text, number and select.
 *
 * Each one uses the platform's own control, so what matters is the round trip:
 * the stored value seeds the editor in the shape that control holds, and what it
 * commits is a value the host can store back without parsing.
 */
/**
 * A commit's save-state bookkeeping settles in a microtask after the host's
 * handler has already run. Flushing it inside `act` keeps that update inside
 * the test, which is what React asks for.
 */
const settleCommit = () => act(() => Promise.resolve());

describe("editor set (antd)", () => {
  const table = () => {
    const onCellEdit = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        onCellEdit={onCellEdit}
      />
    );
    return { onCellEdit };
  };
  const open = (index: number) => {
    fireEvent.doubleClick(activates()[index]!);
  };

  it("commits a boolean in one gesture", async () => {
    const { onCellEdit } = table();
    open(0);
    expect(editor()).toHaveAttribute("type", "checkbox");
    expect(editor()).not.toBeChecked();
    fireEvent.click(editor());
    // A checkbox has one gesture: no Enter, no blur.
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "approved",
      true
    );
  });

  it("seeds a date editor with the day it holds, and commits one back", async () => {
    const { onCellEdit } = table();
    open(1);
    expect(editor()).toHaveAttribute("type", "date");
    expect(editor()).toHaveValue("2026-08-13");
    fireEvent.change(editor(), { target: { value: "2026-09-01" } });
    fireEvent.keyDown(editor(), { key: "Enter" });
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "day",
      "2026-09-01"
    );
  });

  it("uses the platform's time control", async () => {
    const { onCellEdit } = table();
    open(2);
    expect(editor()).toHaveAttribute("type", "time");
    expect(editor()).toHaveValue("09:30");
    fireEvent.change(editor(), { target: { value: "07:15" } });
    fireEvent.keyDown(editor(), { key: "Enter" });
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "startsAt",
      "07:15"
    );
  });

  it("uses the platform's datetime control", async () => {
    const { onCellEdit } = table();
    open(3);
    expect(editor()).toHaveAttribute("type", "datetime-local");
    expect(editor()).toHaveValue("2026-08-13T14:05");
    fireEvent.change(editor(), { target: { value: "2026-08-14T08:00" } });
    fireEvent.keyDown(editor(), { key: "Enter" });
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "reviewedAt",
      "2026-08-14T08:00"
    );
  });

  /** The values antd shows as chosen, in the order it shows them. */
  const chosen = () =>
    [...document.querySelectorAll(".ant-select-selection-item-content")].map(
      (item) => item.textContent
    );

  const openMenu = () =>
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Edit cell" }));

  /**
   * One row of the open menu. Scoped to the dropdown because antd gives the
   * chosen-value chip the same `title` as the option it came from.
   */
  const option = (name: string) =>
    within(
      document.querySelector<HTMLElement>(".ant-select-dropdown")!
    ).getByTitle(name);

  it("renders the single-select editor as the kit's own Select", () => {
    table();
    open(5);

    // Committing through this kit's Select cannot be driven in jsdom — it needs
    // the browser pointer and focus machinery the kit's own overlay relies on,
    // which is why the filter-overlay suite skips the same gestures here. What
    // jsdom can prove is that the editor IS the kit's Select and offers the
    // options the column declared.
    const trigger = screen.getByRole("combobox", { name: "Edit cell" });
    fireEvent.mouseDown(trigger);

    // Named rather than counted: this kit renders other selects' options into
    // the same document, so a total would not be about this editor.
    expect(screen.getByRole("option", { name: "Core" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Web" })).toBeInTheDocument();
  });

  it("commits a multi-select as the array it chose", async () => {
    const { onCellEdit } = table();
    open(4);
    expect(document.querySelector(".ant-select-multiple")).not.toBeNull();
    // Seeded from the stored array — no `editValue` needed for the round trip.
    expect(chosen()).toEqual(["urgent"]);

    openMenu();
    fireEvent.click(option("billable"));
    fireEvent.blur(document.querySelector(".ant-select-input")!);
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], "tags", [
      "urgent",
      "billable",
    ]);
  });

  it("commits an empty multi-select as an empty array, not an empty string", async () => {
    const { onCellEdit } = table();
    open(4);
    openMenu();
    // Clicking a chosen value again un-chooses it, leaving nothing selected.
    fireEvent.click(option("urgent"));
    fireEvent.blur(document.querySelector(".ant-select-input")!);
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], "tags", []);
  });
});
