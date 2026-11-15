/**
 * The Columns menu a kit gets from its primitives. Each test opens the menu
 * drawn with the native test set and checks what a person can do in it: find
 * a column, hide it, pin it, move it, rename it, and manage the columns the
 * table injects.
 */
import { ACTIONS_COLUMN_KEY, REORDER_COLUMN_KEY } from "@adapttable/core";
import { defaultLabels } from "@adapttable/core/binding";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import type { UseColumnLayoutResult } from "../columns/useColumnLayout";
import { testPrimitives } from "../internal/testPrimitives";
import { createColumnMenu, type KitColumnMenuLook } from "./columnMenu";
import type { KitRenameFieldProps } from "./columnRename";

interface Row {
  id: string;
}

const columns: ColumnDef<Row>[] = [
  { key: "a", header: "Alpha", accessor: (row) => row.id, renameable: true },
  { key: "b", header: "Bravo", accessor: (row) => row.id, sortable: true },
  { key: "c", header: "Charlie", accessor: (row) => row.id },
];

const look: KitColumnMenuLook = {
  panel: { minWidth: 250 },
  heading: {},
  search: {},
  bulk: {},
  row: { display: "flex" },
  rowSpacer: { width: 24 },
  grip: {},
  divider: {},
  submenu: {},
  choice: {},
  renameForm: {},
  renameActions: {},
  accent: "rgb(1, 2, 3)",
};

const ColumnMenu = createColumnMenu(testPrimitives, () => look);
const labels = defaultLabels;

function fakeLayout(
  over: Partial<UseColumnLayoutResult<Row>> = {}
): UseColumnLayoutResult<Row> {
  return {
    state: { hidden: [], order: [], pinned: { a: "start" }, widths: {} },
    visibleColumns: columns,
    isHidden: () => false,
    setHidden: vi.fn(),
    toggleVisible: vi.fn(),
    setPinned: vi.fn(),
    move: vi.fn(),
    setOrder: vi.fn(),
    setWidth: vi.fn(),
    setName: vi.fn(),
    resetName: vi.fn(),
    pinOffset: () => undefined,
    reset: vi.fn(),
    toggleColumnGroup: vi.fn(),
    ...over,
  };
}

const named = (name: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;
const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
const items = () =>
  document.querySelectorAll('[data-adapttable-part="column-menu-item"]');

function open(
  layout: UseColumnLayoutResult<Row>,
  props: Partial<Parameters<typeof ColumnMenu<Row>>[0]> = {}
) {
  const onAutoSize = vi.fn();
  render(
    <ColumnMenu
      allColumns={columns}
      layout={layout}
      labels={labels}
      onAutoSize={onAutoSize}
      {...props}
    />
  );
  const button = part("column-menu-button")!;
  fireEvent.click(button);
  return { button, onAutoSize };
}

describe("createColumnMenu", () => {
  it("opens from a button that says whether the panel is open", () => {
    const { button } = open(fakeLayout());
    expect(button).toHaveTextContent(labels.columns);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: labels.columns })).toBeVisible();
    expect(items()).toHaveLength(3);
  });

  it("hides, pins, moves and resets through the layout", () => {
    const layout = fakeLayout();
    const { onAutoSize } = open(layout);

    fireEvent.click(named(`${labels.hideColumn}: Bravo`));
    expect(layout.toggleVisible).toHaveBeenCalledWith("b");

    fireEvent.click(named(`${labels.unpin}: Alpha`));
    expect(layout.setPinned).toHaveBeenCalledWith("a", undefined);
    fireEvent.click(named(`${labels.pinStart}: Bravo`));
    expect(layout.setPinned).toHaveBeenCalledWith("b", "start");

    fireEvent.keyDown(named(`${labels.moveStart} / ${labels.moveEnd}: Alpha`), {
      key: "ArrowRight",
    });
    expect(layout.move).toHaveBeenCalledWith("a", 1);

    fireEvent.click(screen.getByText(labels.autoSizeColumns));
    expect(onAutoSize).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText(labels.resetColumns));
    expect(layout.reset).toHaveBeenCalledTimes(1);
  });

  it("marks a hidden column: struck through, eye not pressed", () => {
    open(fakeLayout({ isHidden: (key) => key === "b" }));
    const eye = named(`${labels.showColumn}: Bravo`);
    expect(eye).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Bravo")).toHaveStyle({
      textDecoration: "line-through",
    });
    expect(screen.getByText("Alpha")).toHaveStyle({ textDecoration: "none" });
    expect(named(`${labels.hideColumn}: Alpha`)).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("narrows the rows to the search and applies the bulk buttons to them", () => {
    const layout = fakeLayout();
    open(layout);
    fireEvent.change(part("column-menu-search")!, {
      target: { value: "brav" },
    });
    expect(items()).toHaveLength(1);
    fireEvent.click(screen.getByText(labels.hideAllColumns));
    expect(layout.setHidden).toHaveBeenCalledTimes(1);
    expect(layout.setHidden).toHaveBeenCalledWith("b", true);
  });

  it("manages the injected reorder and actions columns in their own rows", () => {
    const layout = fakeLayout();
    open(layout, { hasRowActions: true, hasRowReorder: true });

    fireEvent.click(named(`${labels.pinStart}: ${labels.reorderRow}`));
    expect(layout.setPinned).toHaveBeenCalledWith(REORDER_COLUMN_KEY, "start");
    fireEvent.click(named(`${labels.pinEnd}: ${labels.actions}`));
    expect(layout.setPinned).toHaveBeenCalledWith(ACTIONS_COLUMN_KEY, "end");
    fireEvent.click(named(`${labels.hideColumn}: ${labels.actions}`));
    expect(layout.toggleVisible).toHaveBeenCalledWith(ACTIONS_COLUMN_KEY);
    // Neither moves, so neither has a grip.
    expect(
      document.querySelectorAll(`[aria-label^="${labels.moveStart}"]`)
    ).toHaveLength(3);
  });

  it("leaves the injected rows out when the table has neither column", () => {
    open(fakeLayout());
    expect(named(`${labels.hideColumn}: ${labels.actions}`)).toBeNull();
    expect(document.querySelectorAll("hr")).toHaveLength(1);
  });

  it("sorts from a column's actions and closes them", () => {
    const onSortColumn = vi.fn();
    open(fakeLayout(), { onSortColumn });
    fireEvent.click(named(`${labels.columnActions}: Bravo`));
    expect(part("column-menu-submenu")).not.toBeNull();
    fireEvent.click(screen.getByText(labels.sortAscending));
    expect(onSortColumn).toHaveBeenCalledWith("b", "asc");
    expect(part("column-menu-submenu")).toBeNull();
  });

  it("renames a column inline: validates, saves trimmed, announces, restores focus", async () => {
    const onRenameColumn = vi.fn();
    open(fakeLayout(), { onRenameColumn });
    fireEvent.click(named(`${labels.columnActions}: Alpha`));
    const action = screen.getByRole("button", { name: labels.renameColumn });
    action.focus();
    fireEvent.click(action);
    expect(action).toBeDisabled();

    const input = part("column-rename-input")!;
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByText(labels.columnName)).toHaveAttribute(
      "for",
      input.id
    );
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent(labels.columnNameRequired);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);

    fireEvent.change(input, { target: { value: "  Owner  " } });
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(part("column-rename-save")!);
    expect(onRenameColumn).toHaveBeenCalledWith("a", "Owner");
    expect(part("column-rename-form")).toBeNull();
    await waitFor(() => expect(action).toHaveFocus());
    expect(part("column-rename-announcer")).toHaveTextContent("Owner");

    fireEvent.click(action);
    fireEvent.click(part("column-rename-cancel")!);
    expect(part("column-rename-form")).toBeNull();
    expect(onRenameColumn).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape, but leaves the key to the rename field", async () => {
    const { button } = open(fakeLayout(), { onRenameColumn: vi.fn() });
    fireEvent.click(named(`${labels.columnActions}: Alpha`));
    fireEvent.click(screen.getByRole("button", { name: labels.renameColumn }));
    const input = part("column-rename-input")!;
    fireEvent.keyDown(input, { key: "Escape" });
    expect(part("column-rename-form")).toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("draws a kit's own rename field with the label, the error and Escape", async () => {
    const RenameField = vi.fn(
      ({
        id,
        elementRef,
        label,
        value,
        error,
        errorId,
        onValueChange,
        onBlur,
        onKeyDown,
      }: KitRenameFieldProps) => (
        <span data-testid="own-field">
          <label htmlFor={id}>{label}</label>
          <input
            id={id}
            ref={elementRef}
            value={value}
            data-adapttable-part="column-rename-input"
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => onValueChange(event.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
          {error ? <em id={errorId}>{error}</em> : null}
        </span>
      )
    );
    const OwnMenu = createColumnMenu(
      { ...testPrimitives, RenameField },
      () => look
    );
    const onRenameColumn = vi.fn();
    render(
      <OwnMenu
        allColumns={columns}
        layout={fakeLayout()}
        labels={labels}
        onAutoSize={vi.fn()}
        onRenameColumn={onRenameColumn}
      />
    );
    fireEvent.click(part("column-menu-button")!);
    fireEvent.click(named(`${labels.columnActions}: Alpha`));
    fireEvent.click(screen.getByRole("button", { name: labels.renameColumn }));

    expect(screen.getByTestId("own-field")).toBeInTheDocument();
    expect(part("column-rename-label")).toBeNull();
    const input = screen.getByLabelText(labels.columnName);
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(screen.getByText(labels.columnNameRequired)).toHaveAttribute(
      "id",
      input.getAttribute("aria-describedby")
    );
    fireEvent.change(input, { target: { value: "Owner" } });
    fireEvent.click(part("column-rename-save")!);
    expect(onRenameColumn).toHaveBeenCalledWith("a", "Owner");

    fireEvent.click(screen.getByRole("button", { name: labels.renameColumn }));
    fireEvent.keyDown(screen.getByLabelText(labels.columnName), {
      key: "Escape",
    });
    expect(screen.queryByTestId("own-field")).toBeNull();
  });

  it("returns focus to its button when Escape closes it", async () => {
    const { button } = open(fakeLayout());
    part("column-menu-search")!.focus();
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(button).toHaveFocus());
  });

  it("hands the text direction to the panel", () => {
    open(fakeLayout(), { dir: "rtl" });
    expect(screen.getByRole("group", { name: labels.columns })).toHaveAttribute(
      "dir",
      "rtl"
    );
  });
});
