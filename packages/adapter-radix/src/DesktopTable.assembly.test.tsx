/**
 * Kit-owned DesktopTable paint that stayed in this adapter after pin/header
 * assembly moved to `@adapttable/core/adapter`. Existing suites already cover
 * expand, reorder, selection, summary, fit, and page-stick on their own;
 * what they never combine is the leading-chrome leads (expansion + reorder +
 * selection) against a start pin, the selected-row fill, and the scroll-box
 * path (maxHeight) that turns page-stick off.
 */
import {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
} from "@adapttable/core";
import { Theme } from "@radix-ui/themes";
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

const EXPANSION_WIDTH = 32;
const REORDER_WIDTH = 40;

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">> = {}
) {
  return render(
    <Theme>
      <DataTable<Person>
        data={PEOPLE}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        urlSync={false}
        {...override}
      />
    </Theme>
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
  maxHeight: 320,
  prefetch: vi.fn(),
} satisfies Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">>;

describe("DesktopTable assembly paint (Radix)", () => {
  it("shifts reorder and selection past the expand column when a start pin is active", () => {
    const { container } = mount(fullChrome);

    const expandTh = screen.getByRole("columnheader", { name: "Expand row" });
    expect(expandTh.style.position).toBe("sticky");
    expect(expandTh.style.insetInlineStart).toBe("0px");
    expect(expandTh.style.background).toBe("var(--color-background)");
    expect(expandTh).toHaveAttribute("rowspan", "2");

    const reorderTh = container.querySelector<HTMLElement>(
      '[data-adapttable-part="reorder-header"]'
    )!;
    expect(reorderTh).toBeTruthy();
    expect(reorderTh.style.insetInlineStart).toBe(`${EXPANSION_WIDTH}px`);
    expect(reorderTh).toHaveAttribute("rowspan", "2");

    const selectTh = screen.getByLabelText("Select all").closest("th")!;
    expect(selectTh.style.insetInlineStart).toBe(
      `${EXPANSION_WIDTH + REORDER_WIDTH}px`
    );

    const reorderTd = container.querySelector<HTMLElement>(
      '[data-adapttable-part="reorder-cell"]'
    )!;
    expect(reorderTd.style.insetInlineStart).toBe(`${EXPANSION_WIDTH}px`);

    const selectTd = screen.getAllByLabelText("Select row")[0]!.closest("td")!;
    expect(selectTd.style.insetInlineStart).toBe(
      `${EXPANSION_WIDTH + REORDER_WIDTH}px`
    );

    const nameCell = container.querySelector<HTMLElement>(
      'td[data-column-key="name"]'
    )!;
    expect(nameCell.style.position).toBe("sticky");
    expect(nameCell.style.background).toBe("var(--color-background)");

    const actionsTh = screen.getByRole("columnheader", { name: "Actions" });
    expect(actionsTh.style.position).toBe("sticky");
    expect(actionsTh.style.background).toBe("var(--color-background)");
  });

  it("paints the selected-row fill and names the table via the ScrollArea ref", () => {
    const { container } = mount(fullChrome);

    expect(
      container.querySelector('[data-adapttable-part="table"]')?.tagName
    ).toBe("TABLE");
    expect(container.querySelector(".adapttable-radix-page-stick")).toBeNull();

    const wrapper = container.querySelector(".adapttable-radix-scroll")!;
    expect(wrapper).toHaveStyle({ overflowY: "auto", maxHeight: "320px" });
    expect(wrapper.getAttribute("style") ?? "").toContain(
      "--adapttable-min-width"
    );

    fireEvent.mouseEnter(screen.getByText("Alice").closest("tr")!);
    expect(fullChrome.prefetch).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice" })
    );

    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    const selected = screen.getByText("Alice").closest("tr")!;
    expect(selected.style.background).toBe("var(--gray-a3)");
  });

  it("renders grouped header actions, a Cell, and a row-span through the body", () => {
    const { container } = mount({
      ...fullChrome,
      getCellSpan: ({ column, rowIndex }) =>
        column.key === "note" && rowIndex === 0 ? { rowSpan: 2 } : undefined,
    });

    expect(screen.getByTestId("name-actions")).toBeInTheDocument();
    expect(container.querySelector("em")?.textContent).toBe("lead");
    const noteCell = container.querySelector<HTMLElement>(
      'td[data-column-key="note"]'
    )!;
    expect(noteCell).toHaveAttribute("rowspan", "2");
  });

  it("pads the tbody summary for expand, reorder, selection and actions", () => {
    const { container } = mount({
      ...fullChrome,
      summaryRow: () => ({ name: "2 people" }),
    });
    const summary = container.querySelector<HTMLElement>(
      "tbody tr[data-summary]"
    )!;
    const cells = within(summary).getAllByRole("cell");
    // expand + reorder + selection + name + city + note + actions
    expect(cells).toHaveLength(7);
    expect(cells[0]).toBeEmptyDOMElement();
    expect(cells[1]).toBeEmptyDOMElement();
    expect(cells[2]).toBeEmptyDOMElement();
    expect(cells[3]).toHaveTextContent("2 people");
    expect(cells[6]).toBeEmptyDOMElement();
  });

  it("keeps RTL and fit classes on the ScrollArea table when the header sticks to the page", () => {
    const { container } = mount({
      stickyHeader: true,
      stickyTop: 48,
      fitColumns: true,
      dir: "rtl",
    });
    const wrapper = container.querySelector(".adapttable-radix-scroll")!;
    expect(wrapper.classList.contains("adapttable-radix-page-stick")).toBe(
      true
    );
    expect(container.querySelector(".adapttable-radix-fit")).not.toBeNull();
    expect(container.querySelector(".rt-TableRoot")).toHaveAttribute(
      "dir",
      "rtl"
    );
    expect(wrapper.querySelector("style")!.textContent ?? "").toContain(
      '[dir="rtl"]'
    );
  });
});

describe("DesktopTable layered chrome (Radix)", () => {
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
    expect(
      container.querySelector('[data-adapttable-part="pinned-top"]')
    ).not.toBeNull();
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
    expect(
      document.querySelectorAll('[data-adapttable-part="action-button"] svg')
        .length
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    expect(onDelete).toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Locked" })[0]).toBeDisabled();
  });
});

describe("DesktopTable grouping and RTL expand (Radix)", () => {
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

  it("expands a row under RTL so the chevron flips with the table", () => {
    mount({ ...fullChrome, dir: "rtl" });
    fireEvent.click(screen.getAllByRole("button", { name: "Expand row" })[0]!);
    expect(screen.getByText("detail-a")).toBeInTheDocument();
  });

  it("opens the header filter overlay from the funnel", () => {
    const { container } = mount({
      headerFilters: true,
      filters: [{ key: "name", type: "text", label: "Name" }],
    });
    fireEvent.click(
      container.querySelector('[data-adapttable-part="filter-header-trigger"]')!
    );
    expect(
      document.querySelector('[data-adapttable-part="filter-header-cell"]')
    ).not.toBeNull();
  });
});
