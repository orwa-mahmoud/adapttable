/**
 * Kit-owned DesktopTable paint: SURFACE/HAIRLINE, the 480px min-width floor,
 * sticky border-collapse, the visually-hidden expand header, and the
 * expansion/reorder/selection leads against a start pin. Density tokens are
 * already covered in DataTable.test.
 */
import { defaultLabels } from "@adapttable/core";
import {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
} from "@adapttable/react";
import { MantineProvider } from "@mantine/core";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnHeaderRename } from "./components/ColumnHeaderRename";
import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";
import { HAIRLINE, SURFACE } from "./surface";

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

const EXPANSION_WIDTH = 36;
const REORDER_WIDTH = 64;

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">> = {}
) {
  return render(
    <MantineProvider>
      <DataTable<Person>
        data={PEOPLE}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        urlSync={false}
        {...override}
      />
    </MantineProvider>
  );
}

const fullChrome = {
  renderRowDetail: (row: Person) => <div>detail-{row.id}</div>,
  features: [rowReorder(vi.fn())],
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

describe("DesktopTable assembly paint (Mantine)", () => {
  it("floors the table min-width at 480 even without wide columns", () => {
    const { container } = mount({ density: "compact" });
    const table = container.querySelector<HTMLElement>(
      '[data-adapttable-part="table"]'
    )!;
    expect(table.style.minWidth).toBe("480px");
  });

  it("uses SURFACE/HAIRLINE and separate collapse when the header sticks", () => {
    const { container } = mount(fullChrome);
    const table = container.querySelector<HTMLElement>(
      '[data-adapttable-part="table"]'
    )!;
    expect(table.style.borderCollapse).toBe("separate");
    expect(table.style.borderSpacing).toBe("0px");

    const thead = container.querySelector<HTMLElement>(
      '[data-adapttable-part="thead"]'
    )!;
    expect(thead.style.background).toBe(SURFACE);

    const nameHeader = container.querySelector<HTMLElement>(
      'th[data-adapttable-part="header-cell"]'
    )!;
    expect(nameHeader.style.background).toBe(SURFACE);
    expect(nameHeader.style.boxShadow).toContain(HAIRLINE);

    const tbody = container.querySelector('[data-adapttable-part="tbody"]');
    expect(tbody?.tagName).toBe("TBODY");
  });

  it("shifts reorder and selection past the expand column and hides the expand caption", () => {
    const { container } = mount(fullChrome);

    const expandTh = screen.getByText("Expand row").closest("th")!;
    expect(expandTh).toHaveAttribute("rowspan", "2");
    // VisuallyHidden keeps the label in the accessibility tree.
    expect(
      expandTh.style.insetInlineStart || expandTh.style.left
    ).toBeDefined();

    const reorderTh = container.querySelector<HTMLElement>(
      '[data-adapttable-part="reorder-header"]'
    )!;
    expect(reorderTh.style.insetInlineStart).toBe(`${EXPANSION_WIDTH}px`);

    const selectTh = screen.getByLabelText("Select all").closest("th")!;
    expect(selectTh.style.insetInlineStart).toBe(
      `${EXPANSION_WIDTH + REORDER_WIDTH}px`
    );

    const nameCell = container.querySelector<HTMLElement>(
      'td[data-column-key="name"]'
    )!;
    expect(nameCell.style.background).toBe(SURFACE);

    expect(screen.getByTestId("name-actions")).toBeInTheDocument();
    expect(container.querySelector("em")?.textContent).toBe("lead");
  });

  it("pads the tfoot summary for expand, reorder, selection and actions", () => {
    const { container } = mount({
      ...fullChrome,
      summaryRow: () => ({ name: "2 people" }),
    });
    const summary = container.querySelector<HTMLElement>("tfoot tr")!;
    const cells = within(summary).getAllByRole("cell");
    expect(cells).toHaveLength(7);
    expect(cells[3]).toHaveTextContent("2 people");
  });

  it("fires prefetch on hover and keeps the selected checkbox in the lead column", () => {
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
});

describe("DesktopTable header rename (Mantine)", () => {
  it("mounts the optional slot only for a renameable column", () => {
    const { container } = mount({
      enableColumnMenu: true,
      onColumnRename: vi.fn(),
      columns: COLUMNS.map((column) =>
        column.key === "name" ? { ...column, renameable: true } : column
      ),
    });
    expect(
      screen.getByRole("button", { name: "Rename column: Name" })
    ).toHaveAttribute("data-adapttable-part", "header-rename-button");
    expect(
      container.querySelectorAll(
        '[data-adapttable-part="header-rename-button"]'
      )
    ).toHaveLength(1);
  });

  it("validates, commits, announces, and restores trigger focus", async () => {
    const onColumnRename = vi.fn();
    const { container } = render(
      <MantineProvider>
        <div>
          <ColumnHeaderRename
            columnKey="name"
            name="Name"
            labels={defaultLabels}
            onRenameColumn={onColumnRename}
          >
            <span data-adapttable-part="header-caption-control">Name</span>
          </ColumnHeaderRename>
        </div>
      </MantineProvider>
    );

    const trigger = screen.getByRole("button", {
      name: "Rename column: Name",
    });
    expect(trigger).toHaveAttribute(
      "data-adapttable-part",
      "header-rename-button"
    );
    trigger.focus();
    fireEvent.click(trigger);
    expect(trigger).toBeDisabled();
    expect(
      container.querySelector('[data-adapttable-part="header-caption-control"]')
    ).toBeNull();
    const input = screen.getByRole("textbox", { name: "Column name" });
    expect(input).toHaveAttribute(
      "data-adapttable-part",
      "header-rename-input"
    );
    await waitFor(() => expect(input).toHaveFocus());

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Enter a column name.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);

    fireEvent.change(input, { target: { value: "  Display name  " } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Save name" })).toHaveAttribute(
      "type",
      "submit"
    );
    fireEvent.submit(
      container.querySelector('[data-adapttable-part="header-rename-form"]')!
    );
    expect(
      container.querySelector('[data-adapttable-part="header-rename-form"]')
    ).toBeNull();
    expect(
      container.querySelector('[data-adapttable-part="header-caption-control"]')
    ).toHaveTextContent("Name");
    await waitFor(() =>
      expect(onColumnRename).toHaveBeenCalledWith("name", "Display name")
    );
    expect(
      screen.getByText("Column Name renamed to Display name")
    ).toHaveAttribute("data-adapttable-part", "header-rename-announcer");
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Column name" }), {
      key: "Escape",
    });
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
