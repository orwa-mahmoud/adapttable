/**
 * Kit-owned DesktopTable paint: header.leaf / leading / trailing, headerPlan,
 * bodySlots, pin-edge attributes, extra rows beside chrome columns, and the
 * tfoot summary pads.
 */
import {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
} from "@adapttable/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Person {
  id: string;
  name: string;
  city: string;
  note: string;
}

const PEOPLE: Person[] = [
  { id: "a", name: "Alice", city: "Dubai", note: "lead" },
  { id: "b", name: "Bob", city: "Riyadh", note: "follow" },
];

const COLUMNS: ColumnDef<Person>[] = [
  {
    key: "name",
    header: "Name",
    accessor: (row) => row.name,
    sortable: true,
    headerTooltip: "Full name",
    headerActions: <span data-testid="name-actions">★</span>,
    group: "Person",
  },
  {
    key: "city",
    header: "City",
    accessor: (row) => row.city,
    group: "Person",
  },
  {
    key: "note",
    header: "Note",
    headerTooltip: "Extra",
    Cell: ({ row }) => <em>{row.note}</em>,
  },
];

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">> = {}
) {
  return render(
    <DataTable<Person>
      data={PEOPLE}
      columns={COLUMNS}
      rowKey={(row) => row.id}
      urlSync={false}
      {...override}
    />
  );
}

const fullChrome = {
  renderRowDetail: (row: Person) => <div>detail-{row.id}</div>,
  onRowReorder: vi.fn(),
  bulkActions: [{ key: "x", label: "Export", onClick: vi.fn() }],
  rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
  columnLayout: {
    hidden: [] as string[],
    order: [] as string[],
    pinned: { name: "start", note: "end" },
    widths: {},
  },
  stickyHeader: true,
  prefetch: vi.fn(),
} satisfies Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">>;

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("DesktopTable assembly paint (unstyled)", () => {
  it("names leading/trailing headers, the header plan, and pin edges", () => {
    const { container } = mount(fullChrome);

    expect(part("expand-header")).toBeTruthy();
    expect(part("expand-header")).toHaveAttribute("rowspan", "2");
    expect(part("expand-header")).toHaveAttribute("data-sticky", "true");

    expect(part("reorder-header")).toBeTruthy();
    expect(part("reorder-header")).toHaveAttribute("data-pinned", "start");
    expect(part("reorder-header")).toHaveAttribute("rowspan", "2");

    expect(part("selection-header")).toBeTruthy();
    expect(part("selection-header")).toHaveAttribute("data-pinned", "start");

    expect(part("actions-header")).toBeTruthy();
    expect(part("actions-header")).toHaveAttribute("data-pinned", "end");
    expect(part("actions-header")).toHaveTextContent("Actions");

    expect(part("header-group-row")).toBeTruthy();
    expect(part("header-row")).toBeTruthy();
    expect(part("header-group-cell")?.textContent).toContain("Person");

    const nameHeader = container.querySelector(
      'th[data-column-key="name"], th[data-pinned="start"][data-adapttable-part="header-cell"]'
    );
    expect(
      container.querySelector('th[data-adapttable-part="header-cell"]')
    ).toHaveAttribute("data-sticky", "true");
    expect(nameHeader).toBeTruthy();

    expect(part("reorder-cell")).toHaveAttribute("data-pinned", "start");
    expect(part("selection-cell")).toHaveAttribute("data-pinned", "start");
    expect(part("actions-cell")).toHaveAttribute("data-pinned", "end");

    const nameCell = container.querySelector<HTMLElement>(
      'td[data-column-key="name"]'
    )!;
    expect(nameCell).toHaveAttribute("data-pinned", "start");

    expect(screen.getByTestId("name-actions")).toBeInTheDocument();
    expect(container.querySelector("em")?.textContent).toBe("lead");
  });

  it("splices extra rows into a chrome body and keeps the leading cells", () => {
    mount({
      ...fullChrome,
      extraRows: [
        { key: "s", kind: "separator", beforeRowId: "b" },
        { key: "n", kind: "fullWidth", render: () => "Team note" },
      ],
    });
    expect(part("separator-row")).toBeTruthy();
    expect(part("full-width-row")).toBeTruthy();
    expect(screen.getByText("Team note")).toBeInTheDocument();
    expect(part("expand-cell")).toBeTruthy();
    expect(part("reorder-cell")).toBeTruthy();
    expect(part("selection-cell")).toBeTruthy();
    expect(part("actions-cell")).toBeTruthy();
  });

  it("pads the tfoot summary for expand, reorder, selection and actions", () => {
    const { container } = mount({
      ...fullChrome,
      summaryRow: () => ({ name: "2 people" }),
    });
    expect(part("summary")?.tagName).toBe("TFOOT");
    const summary = container.querySelector<HTMLElement>(
      '[data-adapttable-part="summary-row"]'
    )!;
    const cells = within(summary).getAllByRole("cell");
    expect(cells).toHaveLength(7);
    expect(cells[3]).toHaveTextContent("2 people");
  });

  it("fires prefetch and toggles a row through the leading checkbox", () => {
    mount(fullChrome);
    fireEvent.mouseEnter(screen.getByText("Alice").closest("tr")!);
    expect(fullChrome.prefetch).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice" })
    );
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });
});

describe("DesktopTable layered chrome", () => {
  it("keeps header filters, column checkboxes, resize and row-edit on a pinned grouped table", () => {
    const onRowEdit = vi.fn();
    const { container } = mount({
      ...fullChrome,
      headerFilters: true,
      filters: [{ key: "name", type: "text", label: "Name" }],
      cellNavigation: true,
      columnSelectionCheckbox: true,
      resizableColumns: true,
      rowEditing: true,
      onRowEdit,
      pinnedRowIds: { top: ["a"], bottom: [] },
      extraRows: [{ key: "n", kind: "fullWidth", render: () => "Team note" }],
      renderRowActions: ({ row }) => <span>custom-{row.id}</span>,
      columns: COLUMNS.map((column) =>
        column.key === "name" ? { ...column, editable: true } : column
      ),
    });

    expect(
      container.querySelector('[data-adapttable-part="filter-header-trigger"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-adapttable-part="column-select"]')
    ).not.toBeNull();
    expect(screen.getByLabelText(/Resize column: Name/)).toBeInTheDocument();
    expect(
      container.querySelector('[data-adapttable-part="row-edit-begin"]')
    ).not.toBeNull();
    expect(screen.getByText("Team note")).toBeInTheDocument();
    expect(screen.getByText("custom-a")).toBeInTheDocument();
  });

  it("renders built-in action icons, a disabled reason, and a confirmable delete", () => {
    const onDelete = vi.fn();
    const confirm = vi.fn((request: { onConfirm: () => void }) => {
      request.onConfirm();
    });
    mount({
      rowActions: [
        { key: DUPLICATE_ROW_ACTION_KEY, label: "Duplicate", onClick: vi.fn() },
        {
          key: DELETE_ROW_ACTION_KEY,
          label: "Delete",
          color: "red",
          confirm: {
            title: "Remove",
            message: () => "Remove this row?",
            confirmLabel: "Yes",
          },
          onClick: onDelete,
        },
        {
          key: "locked",
          label: "Locked",
          isDisabled: () => true,
          disabledReason: () => "No access",
          onClick: vi.fn(),
        },
      ],
      confirm,
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    expect(onDelete).toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Locked" })[0]).toBeDisabled();
  });

  it("opens a row detail and groups with the leading chrome still present", () => {
    const { container } = mount({
      ...fullChrome,
      groupBy: "city",
    });
    expect(
      container.querySelector('[data-adapttable-part="group-label"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-adapttable-part="group-select"]')
    ).not.toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Expand row" })[0]!);
    expect(screen.getByText("detail-a")).toBeInTheDocument();
  });

  it("collapses row actions into a details menu and runs one", () => {
    const onEdit = vi.fn();
    mount({
      rowActions: [{ key: "e", label: "Edit", onClick: onEdit }],
      rowActionsLayout: "menu",
    });
    const trigger = document.querySelector(
      '[data-adapttable-part="row-actions-trigger"]'
    );
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    expect(onEdit).toHaveBeenCalled();
  });
});
