import {
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { columnMenu } from "./column-menu";
import { RowMoveMenu } from "./components/kitControls";
import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";
import { tree } from "./tree";

interface Task {
  id: string;
  title: string;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship" },
  { id: "2", title: "Test" },
  { id: "3", title: "Docs" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
];
interface TreeTask extends Task {
  children?: TreeTask[];
}
const TREE_ROWS: TreeTask[] = [
  {
    id: "parent",
    title: "Parent",
    children: [{ id: "child", title: "Child" }],
  },
  { id: "sibling", title: "Root sibling" },
];
const TREE_COLS: ColumnDef<TreeTask>[] = [
  { key: "title", header: "Title", accessor: (row) => row.title },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

function enable(onRowReorder?: (from: number, to: number, row: Task) => void) {
  return onRowReorder ? { features: [rowReorder(onRowReorder)] } : {};
}

describe("row reorder (mui)", () => {
  it("renders nothing until the feature is composed", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    expect(part("row-reorder-handle")).toBeNull();
  });

  it("lifts on Space and commits on the second Space", () => {
    const onRowReorder = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        {...enable(onRowReorder)}
      />
    );
    const grip = part("row-reorder-handle");
    expect(grip).not.toBeNull();
    fireEvent.keyDown(grip!, { key: " " });
    expect(grip).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(grip!, { key: "ArrowDown" });
    fireEvent.keyDown(grip!, { key: " " });
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
  });

  it("prevents default on a neighbour's dragover after a pointer lift", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        {...enable(vi.fn())}
      />
    );
    const grip = part("row-reorder-handle");
    expect(grip).not.toBeNull();
    const store: Record<string, string> = {};
    const dataTransfer = {
      dropEffect: "none",
      effectAllowed: "all",
      setData: (type: string, value: string) => {
        store[type] = value;
      },
      getData: (type: string) => store[type] ?? "",
    };
    fireEvent.dragStart(grip!, { dataTransfer });
    const neighbour = document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="row"]'
    )[1];
    expect(neighbour).toBeTruthy();
    const over = createEvent.dragOver(neighbour!, { dataTransfer });
    fireEvent(neighbour!, over);
    expect(over.defaultPrevented).toBe(true);
  });

  it("moves a card with the up/down buttons", () => {
    const onRowReorder = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile
        {...enable(onRowReorder)}
      />
    );
    expect(part("row-reorder-handle")).toBeNull();
    fireEvent.click(part("row-reorder-down")!);
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
  });

  it("uses an accessible MUI menu for nested move destinations", async () => {
    const onTreeMove = vi.fn();
    render(
      <DataTable
        data={TREE_ROWS}
        columns={TREE_COLS}
        rowKey={(row) => row.id}
        urlSync={false}
        features={[
          tree({ getChildren: (row: TreeTask) => row.children }),
          rowReorder(vi.fn(), {
            movePolicy: "confirm",
            onTreeMove,
          }),
        ]}
      />
    );

    const trigger = screen.getAllByRole("button", { name: "Move under…" })[0]!;
    expect(trigger).toHaveAttribute(
      "data-adapttable-part",
      "row-move-menu-trigger"
    );
    trigger.focus();
    fireEvent.click(trigger);

    const disabled = await screen.findByRole("menuitem", { name: "Child" });
    expect(part("row-move-menu-content")).toBeInTheDocument();
    expect(disabled).toBeVisible();
    expect(
      disabled.hasAttribute("disabled") ||
        disabled.getAttribute("aria-disabled") === "true"
    ).toBe(true);
    expect(disabled).toHaveAttribute(
      "title",
      "A row cannot move inside itself or its descendant"
    );
    expect(trigger.tabIndex).toBeGreaterThanOrEqual(0);
    expect(onTreeMove).not.toHaveBeenCalled();
  });

  it("runs MUI menu confirmation and cancellation callbacks", async () => {
    const onSelect = vi.fn();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const items = [
      {
        id: "destination",
        label: "Destination",
        disabled: false,
        onSelect,
      },
    ];
    const { rerender } = render(
      <RowMoveMenu label="Move under…" items={items} />
    );
    let trigger = screen.getByRole("button", { name: "Move under…" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Destination" }));
    expect(onSelect).toHaveBeenCalledOnce();

    rerender(
      <RowMoveMenu
        label="Move under…"
        items={items}
        confirmation={{
          title: "Confirm row move",
          description: "Move Parent to Destination?",
          confirmLabel: "Move",
          cancelLabel: "Cancel",
          onConfirm,
          onCancel,
        }}
      />
    );
    expect(
      screen.getByRole("alertdialog", { name: "Confirm row move" })
    ).toHaveAttribute("data-adapttable-part", "row-move-confirmation");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await Promise.resolve();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    rerender(<RowMoveMenu label="Move under…" items={items} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Move under…" })).toHaveFocus()
    );

    trigger = screen.getByRole("button", { name: "Move under…" });
    fireEvent.click(trigger);
    rerender(
      <RowMoveMenu
        label="Move under…"
        items={items}
        confirmation={{
          title: "Confirm row move",
          description: "Move Parent to Destination?",
          confirmLabel: "Move",
          cancelLabel: "Cancel",
          onConfirm,
          onCancel,
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    await Promise.resolve();
    expect(onConfirm).toHaveBeenCalledOnce();
    rerender(<RowMoveMenu label="Move under…" items={items} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Move under…" })).toHaveFocus()
    );
  });

  it("lists the reorder column in the Columns menu", async () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        enableColumnMenu
        features={[rowReorder(vi.fn()), columnMenu()]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(
      await screen.findByRole("button", { name: "Hide column: Reorder row" })
    ).toBeInTheDocument();
  });
});
