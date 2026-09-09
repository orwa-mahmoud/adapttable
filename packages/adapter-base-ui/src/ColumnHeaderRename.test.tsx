/**
 * Column rename in Base UI's own controls.
 *
 * The rename flow is drawn per kit, so it has to be proven per kit: the
 * trigger disables while editing, focus moves into the field and comes back
 * on cancel and on Escape, an empty name is refused with a live error, and a
 * committed name is trimmed and announced.
 */
import type { ColumnMenuLabels } from "@adapttable/react/adapter";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnHeaderRename } from "./components/ColumnHeaderRename";
import { renderBaseUi } from "./test-utils";

const labels: ColumnMenuLabels = {
  columns: "Columns",
  pinStart: "Pin to start",
  pinEnd: "Pin to end",
  unpin: "Unpin",
  moveStart: "Move to start",
  moveEnd: "Move to end",
  resetColumns: "Reset columns",
  autoSizeColumns: "Size columns to content",
  autoSizeColumn: "Size column to content",
  showColumn: "Show column",
  hideColumn: "Hide column",
  searchColumns: "Search columns",
  showAllColumns: "Show all",
  hideAllColumns: "Hide all",
  unpinAllColumns: "Unpin all",
  resetColumn: "Reset column",
  renameColumn: "Rename column",
  columnName: "Column name",
  saveColumnName: "Save name",
  cancelColumnRename: "Cancel",
  columnNameRequired: "Enter a column name.",
  columnRenamed: ({ previous, name }) =>
    `Column ${previous} renamed to ${name}`,
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  filterColumn: "Filter column",
  columnActions: "Column actions",
  groupByColumn: (label) => `Group by ${label}`,
  ungroupColumn: (label) => `Ungroup ${label}`,
  groupingAggregation: "Group aggregation",
  groupingRemoveAggregation: (name: string) => `Remove ${name} aggregation`,
  groupingAverage: "Average",
  selectionCount: "Count",
  selectionSum: "Sum",
  selectionMin: "Minimum",
  selectionMax: "Maximum",
};

describe("Base UI ColumnHeaderRename", () => {
  it("validates, cancels, restores focus, and commits", async () => {
    const onRenameColumn = vi.fn();
    renderBaseUi(
      <ColumnHeaderRename
        columnKey="name"
        name="Name"
        labels={labels}
        onRenameColumn={onRenameColumn}
      />
    );

    const renameButton = screen.getByRole("button", {
      name: "Rename column: Name",
    });
    renameButton.focus();
    fireEvent.click(renameButton);
    expect(renameButton).toBeDisabled();

    const input = screen.getByRole("textbox", { name: "Column name" });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: " " } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a column name.");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(renameButton).toHaveFocus());

    fireEvent.click(renameButton);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Column name" }), {
      key: "Escape",
    });
    await waitFor(() => expect(renameButton).toHaveFocus());

    fireEvent.click(renameButton);
    fireEvent.change(screen.getByRole("textbox", { name: "Column name" }), {
      target: { value: "  Account owner  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));

    expect(onRenameColumn).toHaveBeenCalledWith("name", "Account owner");
    expect(
      document.querySelector('[data-adapttable-part="header-rename-announcer"]')
    ).toHaveTextContent("Column Name renamed to Account owner");
  });
});
