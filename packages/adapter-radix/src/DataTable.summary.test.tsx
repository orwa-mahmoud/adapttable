/**
 * summaryRow, header groups, and multiSort for the Radix table. Radix Themes
 * has no `<tfoot>`: the summary row renders as a `data-summary` row at the end
 * of the `<tbody>` (and a final summary card on mobile), so it is queried by
 * that marker, not by a footer section.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { Theme } from "@radix-ui/themes";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef, DataTableProps } from "./index";

interface Person {
  id: string;
  name: string;
  team: string;
  age: number;
  city: string;
}

// Two "Alice" rows so a single name sort leaves a tie that ONLY the
// multi-sort age level can break — proving the chain actually applies.
const PEOPLE: Person[] = [
  { id: "a", name: "Bob", team: "Core", age: 30, city: "Dubai" },
  { id: "b", name: "Alice", team: "Core", age: 25, city: "Riyadh" },
  { id: "c", name: "Alice", team: "Web", age: 20, city: "Cairo" },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "age", header: "Age", accessor: (r) => r.age, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

// "Person" spans two adjacent columns, "city" is the ungrouped gap.
const GROUPED: ColumnDef<Person>[] = [
  { ...COLUMNS[0]!, group: "Person" },
  { ...COLUMNS[1]!, group: "Person" },
  COLUMNS[2]!,
  { key: "team", header: "Team", accessor: (r) => r.team, group: "Org" },
];

/** Everything that enables the leading/trailing edge columns at once. */
const EDGES: Partial<Omit<DataTableProps<Person>, "mode">> = {
  bulkActions: [{ key: "x", label: "Export", onClick: vi.fn() }],
  rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
  renderRowDetail: (row) => <div>Detail {row.id}</div>,
};

function renderTable(
  override: Partial<Omit<DataTableProps<Person>, "mode">> = {}
) {
  return render(
    <Theme>
      <DataTable<Person>
        data={PEOPLE}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("")}
        {...override}
      />
    </Theme>
  );
}

/** The data-summary row Radix appends to the tbody, if present. */
function summaryRow(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>("tbody tr[data-summary]");
}

/** The city (3rd data column) cell of every NON-summary tbody row, DOM order. */
function cityOrder(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll("tbody tr:not([data-summary])")].map(
    (row) => row.querySelectorAll("td")[2]!.textContent
  );
}

describe("summaryRow (Radix)", () => {
  it("aligns summary cells under their columns with empties for expansion/selection/actions and missing keys", () => {
    const { container } = renderTable({
      ...EDGES,
      summaryRow: (rows) => ({
        name: `${rows.length} people`,
        age: rows.reduce((sum, r) => sum + r.age, 0),
      }),
    });
    const cells = within(summaryRow(container)!).getAllByRole("cell");
    // expansion + selection + name + age + city + actions
    expect(cells).toHaveLength(6);
    expect(cells[0]).toBeEmptyDOMElement();
    expect(cells[1]).toBeEmptyDOMElement();
    expect(cells[2]).toHaveTextContent("3 people");
    expect(cells[3]).toHaveTextContent("75");
    expect(cells[4]).toBeEmptyDOMElement(); // city absent from the result
    expect(cells[5]).toBeEmptyDOMElement();
  });

  it("renders only the data cells when there is no expansion/selection/actions", () => {
    const { container } = renderTable({ summaryRow: () => ({ age: "75" }) });
    const cells = within(summaryRow(container)!).getAllByRole("cell");
    expect(cells).toHaveLength(3);
    expect(cells[0]).toBeEmptyDOMElement();
    expect(cells[1]).toHaveTextContent("75");
    expect(cells[2]).toBeEmptyDOMElement();
  });

  it("renders no summary row without summaryRow", () => {
    const { container } = renderTable();
    expect(summaryRow(container)).toBeNull();
  });

  it("mobile: renders the summary as a final card, skipping absent keys", () => {
    renderTable({ forceMobile: true, summaryRow: () => ({ age: "75 total" }) });
    const card = screen.getAllByRole("listitem").at(-1)!;
    expect(within(card).getByText("Age")).toBeInTheDocument();
    expect(within(card).getByText("75 total")).toBeInTheDocument();
    expect(within(card).queryByText("Name")).toBeNull();
  });

  it("mobile compact: the summary card follows the dense card spacing", () => {
    renderTable({
      forceMobile: true,
      size: "1",
      summaryRow: () => ({ age: "75 total" }),
    });
    const card = screen.getAllByRole("listitem").at(-1)!;
    expect(within(card).getByText("75 total")).toBeInTheDocument();
  });

  it("mobile: renders no summary card without summaryRow", () => {
    renderTable({ forceMobile: true });
    expect(screen.getAllByRole("listitem")).toHaveLength(PEOPLE.length);
  });
});

describe("header groups (Radix)", () => {
  it("renders a first header row of spanning group cells with edge empties", () => {
    const { container } = renderTable({ ...EDGES, columns: GROUPED });
    const headRows = container.querySelectorAll<HTMLElement>("thead tr");
    expect(headRows).toHaveLength(2);
    const cells = within(headRows[0]!).getAllByRole("columnheader");
    // expansion + selection + Person(×2) + gap + Org + actions
    expect(cells).toHaveLength(6);
    expect(cells[0]).toBeEmptyDOMElement();
    expect(cells[1]).toBeEmptyDOMElement();
    expect(cells[2]).toHaveTextContent("Person");
    expect(cells[2]).toHaveAttribute("colspan", "2");
    expect(cells[3]).toBeEmptyDOMElement(); // the ungrouped city gap
    expect(cells[4]).toHaveTextContent("Org");
    expect(cells[5]).toBeEmptyDOMElement();
  });

  it("renders only the group cells when there is no expansion/selection/actions", () => {
    const { container } = renderTable({ columns: GROUPED });
    const cells = within(
      container.querySelector<HTMLElement>("thead tr")!
    ).getAllByRole("columnheader");
    expect(cells).toHaveLength(3);
    expect(cells.map((c) => c.textContent)).toEqual(["Person", "", "Org"]);
  });

  it("renders a single header row when no column declares a group", () => {
    const { container } = renderTable();
    expect(container.querySelectorAll("thead tr")).toHaveLength(1);
  });
});

describe("multiSort (Radix)", () => {
  it("shift-click chains two columns, badges them 1 and 2, and applies both levels", () => {
    const { container } = renderTable({ multiSort: true });
    const nameSort = screen.getByRole("button", { name: "Sort by: Name" });
    const ageSort = screen.getByRole("button", { name: "Sort by: Age" });

    fireEvent.click(nameSort, { shiftKey: true });
    fireEvent.click(ageSort, { shiftKey: true });

    expect(within(nameSort).getByText("1")).toHaveAttribute(
      "data-sort-index",
      "1"
    );
    expect(within(ageSort).getByText("2")).toHaveAttribute(
      "data-sort-index",
      "2"
    );
    // name asc + age asc: the Alice tie breaks by age (Cairo, 20 first) —
    // a single name sort would have kept the stable Riyadh-first order.
    expect(cityOrder(container)).toEqual(["Cairo", "Riyadh", "Dubai"]);

    // Both chained headers expose their own aria-sort direction.
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      "ascending"
    );
    expect(screen.getByRole("columnheader", { name: /Age/ })).toHaveAttribute(
      "aria-sort",
      "ascending"
    );
  });

  it("a plain click single-sorts (asc then desc) and renders no badge", () => {
    const { container } = renderTable({ multiSort: true });
    const nameSort = screen.getByRole("button", { name: "Sort by: Name" });

    fireEvent.click(nameSort);
    // Stable single sort: the Alice tie keeps source order (Riyadh first).
    expect(cityOrder(container)).toEqual(["Riyadh", "Cairo", "Dubai"]);
    expect(container.querySelector("[data-sort-index]")).toBeNull();

    fireEvent.click(nameSort);
    expect(cityOrder(container)).toEqual(["Dubai", "Riyadh", "Cairo"]);
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      "descending"
    );
  });
});
