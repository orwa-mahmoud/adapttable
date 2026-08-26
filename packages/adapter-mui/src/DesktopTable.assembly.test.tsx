/**
 * Kit-owned DesktopTable paint: paper pin backgrounds, TableSortLabel,
 * expansion/reorder/selection leads, and the exported muiColor / ExpandChevron
 * helpers. `useStableToggle` is already covered in DataTable.expansion.test.
 */
import {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
} from "@adapttable/core";
import { createTheme, ThemeProvider } from "@mui/material";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExpandChevron, muiColor } from "./components/DesktopTable";
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

const EXPANSION_WIDTH = 48;
const REORDER_WIDTH = 40;
const PIN_BG = "var(--mui-palette-background-paper)";
const theme = createTheme();

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">> = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <DataTable<Person>
        data={PEOPLE}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        urlSync={false}
        density="compact"
        {...override}
      />
    </ThemeProvider>
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

describe("muiColor / ExpandChevron", () => {
  it("maps destructive tokens to error and everything else to default", () => {
    expect(muiColor("danger")).toBe("error");
    expect(muiColor("red")).toBe("error");
    expect(muiColor("error")).toBe("error");
    expect(muiColor("primary")).toBe("default");
    expect(muiColor(undefined)).toBe("default");
  });

  it("rotates the chevron for open, RTL, and the resting LTR state", () => {
    const wrap = (node: React.ReactElement) => (
      <ThemeProvider theme={theme}>{node}</ThemeProvider>
    );
    const { rerender, container } = render(
      wrap(<ExpandChevron expanded={false} dir="ltr" />)
    );
    const el = () => container.firstElementChild as HTMLElement;
    expect(getComputedStyle(el()).transform).toBe("none");
    rerender(wrap(<ExpandChevron expanded={false} dir="rtl" />));
    expect(getComputedStyle(el()).transform).toBe("rotate(180deg)");
    rerender(wrap(<ExpandChevron expanded dir="rtl" />));
    expect(getComputedStyle(el()).transform).toBe("rotate(90deg)");
  });
});

describe("DesktopTable assembly paint (MUI)", () => {
  it("shifts reorder and selection past the expand column and paints paper pins", () => {
    const { container } = mount(fullChrome);

    const expandTh = document.querySelectorAll("thead th")[0] as HTMLElement;
    expect(expandTh).toHaveAttribute("rowspan", "2");
    expect(expandTh.style.insetInlineStart).toBe("0px");
    expect(expandTh.style.background).toBe(PIN_BG);

    const reorderTh = container.querySelector<HTMLElement>(
      '[data-adapttable-part="reorder-header"]'
    )!;
    expect(reorderTh.style.insetInlineStart).toBe(`${EXPANSION_WIDTH}px`);
    expect(reorderTh.style.background).toBe(PIN_BG);

    const selectTh = screen.getByLabelText("Select all").closest("th")!;
    expect(selectTh.style.insetInlineStart).toBe(
      `${EXPANSION_WIDTH + REORDER_WIDTH}px`
    );

    const nameCell = container.querySelector<HTMLElement>(
      'td[data-column-key="name"]'
    )!;
    expect(nameCell.style.background).toBe(PIN_BG);
    expect(nameCell.style.position).toBe("sticky");

    const sortLabel = screen.getByRole("button", { name: /Name/ });
    expect(sortLabel.className).toMatch(/MuiTableSortLabel/);
    expect(screen.getByTestId("name-actions")).toBeInTheDocument();
    expect(container.querySelector("em")?.textContent).toBe("lead");
  });

  it("marks a selected row and fires prefetch from the paper body", () => {
    mount(fullChrome);
    fireEvent.mouseEnter(screen.getByText("Alice").closest("tr")!);
    expect(fullChrome.prefetch).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice" })
    );
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.getByText("Alice").closest("tr")!.className).toMatch(
      /Mui-selected/
    );
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
