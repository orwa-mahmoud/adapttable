import type {
  RowMoveMenuModel,
  RowMoveRequest,
  RowMoveTarget,
  RowReorderLabels,
  RowReorderState,
} from "@adapttable/react/adapter";
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { columnMenu } from "./column-menu";
import { RowReorderHandle } from "./components/kitControls";
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

/**
 * The move menu is an internal slot component: a host reaches it only by
 * composing row reorder, so the tests reach it the same way — through the
 * public `RowReorderHandle`, with a reorder state that has a destination and,
 * for the second half, a move waiting to be confirmed.
 */
const MOVE_ROW: Task = { id: "parent", title: "Parent" };

const MOVE_LABELS: RowReorderLabels = {
  reorderRow: "Reorder row",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  rowLifted: () => "",
  rowMoved: () => "",
  rowReorderCancelled: "",
  confirmRowMoveTitle: "Confirm row move",
  confirmRowMoveDescription: (row, _from, to) => `Move ${row} to ${to}?`,
  confirmRowMove: "Move",
  cancel: "Cancel",
};

const MOVE_TARGET: RowMoveTarget<Task> = {
  id: "destination",
  label: "Destination",
};

const MOVE_MENU: RowMoveMenuModel<Task> = {
  kind: "tree",
  label: "Move under…",
  targets: [MOVE_TARGET],
};

const MOVE_PENDING: RowMoveRequest<Task> = {
  kind: "tree",
  row: MOVE_ROW,
  rowLabel: "Parent",
  fromParent: { id: null, row: null, label: "Root" },
  toParent: { id: "destination", row: MOVE_ROW, label: "Destination" },
  position: 0,
};

interface MoveHandlers {
  readonly onSelect: () => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function moveReorder(
  pendingMove: RowMoveRequest<Task> | null,
  handlers: MoveHandlers
): RowReorderState<Task> {
  return {
    lifted: null,
    overIndex: null,
    overPosition: null,
    pendingMove,
    hostConfirmPending: false,
    announcement: "",
    isLifted: () => false,
    dragProps: () => ({
      draggable: true,
      onDragStart: () => undefined,
      onDragEnd: () => undefined,
    }),
    dropProps: () => ({
      onDragOver: () => undefined,
      onDrop: () => undefined,
    }),
    handleKeyDown: () => undefined,
    moveBy: () => undefined,
    moveMenu: () => MOVE_MENU,
    selectMoveTarget: handlers.onSelect,
    confirmMove: handlers.onConfirm,
    cancelMove: handlers.onCancel,
    rowAttrs: () => ({}),
  };
}

function MoveHandle({
  pendingMove,
  handlers,
}: Readonly<{
  pendingMove: RowMoveRequest<Task> | null;
  handlers: MoveHandlers;
}>) {
  return (
    <RowReorderHandle
      reorder={moveReorder(pendingMove, handlers)}
      labels={MOVE_LABELS}
      rowId="parent"
      localIndex={0}
      row={MOVE_ROW}
      windowStart={0}
      rowCount={2}
    />
  );
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
    const handlers = { onSelect, onConfirm, onCancel };
    const { rerender } = render(
      <MoveHandle pendingMove={null} handlers={handlers} />
    );
    let trigger = screen.getByRole("button", { name: "Move under…" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Destination" }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(MOVE_TARGET);

    rerender(<MoveHandle pendingMove={MOVE_PENDING} handlers={handlers} />);
    expect(
      screen.getByRole("alertdialog", { name: "Confirm row move" })
    ).toHaveAttribute("data-adapttable-part", "row-move-confirmation");
    expect(screen.getByText("Move Parent to Destination?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await Promise.resolve();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    rerender(<MoveHandle pendingMove={null} handlers={handlers} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Move under…" })).toHaveFocus()
    );
    // Closing ignores a click on the trigger for 500ms so MUI's backdrop
    // dismiss does not bounce the menu open again.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    trigger = screen.getByRole("button", { name: "Move under…" });
    fireEvent.click(trigger);
    rerender(<MoveHandle pendingMove={MOVE_PENDING} handlers={handlers} />);
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    await Promise.resolve();
    expect(onConfirm).toHaveBeenCalledOnce();
    rerender(<MoveHandle pendingMove={null} handlers={handlers} />);
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
