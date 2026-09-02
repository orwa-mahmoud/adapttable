import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

function table(
  extra: {
    onRowReorder?: (from: number, to: number, row: Task) => void;
    forceMobile?: boolean;
    enableColumnMenu?: boolean;
  } = {}
) {
  const reorder = enable(extra.onRowReorder);
  return (
    <ChakraProvider value={defaultSystem}>
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        {...reorder}
        forceMobile={extra.forceMobile}
        enableColumnMenu={extra.enableColumnMenu}
      />
    </ChakraProvider>
  );
}

describe("row reorder (chakra)", () => {
  it("renders nothing until the feature is composed", () => {
    render(table());
    expect(part("row-reorder-handle")).toBeNull();
  });

  it("lifts on Space and commits on the second Space", () => {
    const onRowReorder = vi.fn();
    render(table({ onRowReorder }));
    const grip = part("row-reorder-handle");
    expect(grip).not.toBeNull();
    fireEvent.keyDown(grip!, { key: " " });
    expect(grip).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(grip!, { key: "ArrowDown" });
    fireEvent.keyDown(grip!, { key: " " });
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
  });

  it("prevents default on a neighbour's dragover after a pointer lift", () => {
    render(table({ onRowReorder: vi.fn() }));
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
    render(table({ onRowReorder, forceMobile: true }));
    expect(part("row-reorder-handle")).toBeNull();
    fireEvent.click(part("row-reorder-down")!);
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
  });

  it("uses an accessible Chakra menu for nested move destinations", async () => {
    const onTreeMove = vi.fn();
    render(
      <ChakraProvider value={defaultSystem}>
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
      </ChakraProvider>
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

  it("runs Chakra menu confirmation and cancellation callbacks", async () => {
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
      <ChakraProvider value={defaultSystem}>
        <RowMoveMenu label="Move under…" items={items} />
      </ChakraProvider>
    );
    const trigger = screen.getByRole("button", { name: "Move under…" });
    trigger.focus();
    await act(async () => {
      fireEvent.click(trigger);
      await Promise.resolve();
    });
    const destination = await screen.findByRole("menuitem", {
      name: "Destination",
    });
    await act(async () => {
      fireEvent.click(destination);
      await Promise.resolve();
    });
    expect(onSelect).toHaveBeenCalledOnce();

    rerender(
      <ChakraProvider value={defaultSystem}>
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
      </ChakraProvider>
    );
    expect(
      screen.getByRole("alertdialog", { name: "Confirm row move" })
    ).toHaveAttribute("data-adapttable-part", "row-move-confirmation");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await Promise.resolve();
    });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());

    rerender(
      <ChakraProvider value={defaultSystem}>
        <RowMoveMenu label="Move under…" items={items} />
      </ChakraProvider>
    );
    await act(async () => {
      fireEvent.click(trigger);
      await Promise.resolve();
    });
    rerender(
      <ChakraProvider value={defaultSystem}>
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
      </ChakraProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Move" }));
      await Promise.resolve();
    });
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("lists the reorder column in the Columns menu", async () => {
    render(table({ onRowReorder: vi.fn(), enableColumnMenu: true }));
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(
      await screen.findByRole("button", { name: "Hide column: Reorder row" })
    ).toBeInTheDocument();
  });
});
