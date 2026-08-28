import { Theme } from "@radix-ui/themes";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

describe("editor set (radix)", () => {
  const table = () => {
    const onCellEdit = vi.fn();
    render(
      <Theme>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          onCellEdit={onCellEdit}
        />
      </Theme>
    );
    return { onCellEdit };
  };
  const open = (index: number) => {
    fireEvent.doubleClick(activates()[index]!);
  };

  it("commits a boolean in one gesture", async () => {
    const { onCellEdit } = table();
    open(0);
    // The kit's checkbox, not a native input: state reads off aria-checked.
    const box = screen.getByRole("checkbox", { name: "Edit cell" });
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
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

  /** This kit's select holds one value, so several values is a checkbox group. */
  const tag = (name: string) => screen.getByRole("checkbox", { name });

  it("commits a single-select through the kit's own Select", async () => {
    const { onCellEdit } = table();
    open(5);
    fireEvent.click(screen.getByRole("combobox", { name: "Edit cell" }));
    fireEvent.click(screen.getByRole("option", { name: "Web" }));
    // Some kits close the editor on the pick itself; where the trigger is
    // still there, Enter is what confirms the draft.
    const stillOpen = screen.queryByRole("combobox", { name: "Edit cell" });
    if (stillOpen) fireEvent.keyDown(stillOpen, { key: "Enter" });
    await settleCommit();

    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], "team", "web");
  });

  it("commits a multi-select as the array it chose", async () => {
    const { onCellEdit } = table();
    open(4);
    expect(screen.getByRole("group", { name: "Edit cell" })).toBe(editor());
    // Seeded from the stored array — no `editValue` needed for the round trip.
    expect(tag("urgent")).toHaveAttribute("aria-checked", "true");
    expect(tag("billable")).toHaveAttribute("aria-checked", "false");

    fireEvent.click(tag("billable"));
    fireEvent.blur(tag("billable"), { relatedTarget: document.body });
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], "tags", [
      "urgent",
      "billable",
    ]);
  });

  it("commits an empty multi-select as an empty array, not an empty string", async () => {
    const { onCellEdit } = table();
    open(4);
    fireEvent.click(tag("urgent"));
    fireEvent.blur(tag("urgent"), { relatedTarget: document.body });
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], "tags", []);
  });
});
