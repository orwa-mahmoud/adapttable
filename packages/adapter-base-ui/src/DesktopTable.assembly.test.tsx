/**
 * Kit-owned DesktopTable paint: sticky-fix CSS, --adapttable-min-width,
 * native thead/tbody, the tbody summary row, and expansion/reorder/selection
 * leads against a start pin.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { renderBaseUi } from "./test-utils";

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
const PIN_BG = "var(--adapttable-surface, #ffffff)";

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">> = {}
) {
  return renderBaseUi(
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
  maxHeight: 320,
  prefetch: vi.fn(),
} satisfies Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">>;

describe("DesktopTable assembly paint (Base UI)", () => {
  it("injects sticky-fix CSS and the min-width custom property on the scroll box", () => {
    const { container } = mount(fullChrome);
    const box = container.querySelector(".adapttable-base-ui-scroll")!;
    expect(box.querySelector("style")!.textContent ?? "").toContain(
      "--adapttable-min-width"
    );
    expect(box.getAttribute("style") ?? "").toContain("--adapttable-min-width");
    expect(box).toHaveStyle({ overflowY: "auto", maxHeight: "320px" });

    const thead = container.querySelector('[data-adapttable-part="thead"]');
    const tbody = container.querySelector('[data-adapttable-part="tbody"]');
    expect(thead?.tagName).toBe("THEAD");
    expect(tbody?.tagName).toBe("TBODY");
  });

  it("shifts reorder and selection past the expand column and paints PIN_BG", () => {
    const { container } = mount(fullChrome);

    const expandTh = screen.getByRole("columnheader", { name: "Expand row" });
    expect(expandTh).toHaveAttribute("rowspan", "2");
    expect(expandTh.style.insetInlineStart).toBe("0px");
    expect(expandTh.style.background).toBe(PIN_BG);

    const reorderTh = container.querySelector(
      '[data-adapttable-part="reorder-header"]'
    ) as HTMLElement;
    expect(reorderTh.style.insetInlineStart).toBe(`${EXPANSION_WIDTH}px`);

    const selectTh = screen.getByLabelText("Select all").closest("th")!;
    expect(selectTh.style.insetInlineStart).toBe(
      `${EXPANSION_WIDTH + REORDER_WIDTH}px`
    );

    const nameCell = container.querySelector(
      'td[data-column-key="name"]'
    ) as HTMLElement;
    expect(nameCell.style.background).toBe(PIN_BG);
    expect(nameCell.style.position).toBe("sticky");

    expect(screen.getByTestId("name-actions")).toBeInTheDocument();
    expect(container.querySelector("em")?.textContent).toBe("lead");
  });

  it("keeps the summary row inside tbody and pads the leading chrome", () => {
    const { container } = mount({
      ...fullChrome,
      summaryRow: () => ({ name: "2 people" }),
    });
    const summary = container.querySelector("tbody tr[data-summary]")!;
    expect(summary.parentElement?.tagName).toBe("TBODY");
    const cells = within(summary).getAllByRole("cell");
    expect(cells).toHaveLength(7);
    expect(cells[3]).toHaveTextContent("2 people");
  });

  it("paints the selected-row fill", () => {
    mount(fullChrome);
    fireEvent.mouseEnter(screen.getByText("Alice").closest("tr")!);
    expect(fullChrome.prefetch).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice" })
    );
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.getByText("Alice").closest("tr")!.style.background).toBe(
      "var(--gray-a3)"
    );
  });
});
