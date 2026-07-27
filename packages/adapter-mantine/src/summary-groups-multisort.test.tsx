import { createMemoryAdapter } from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Person {
  id: string;
  name: string;
  city: string;
  budget: number;
}

// Two "Alice" rows with different cities so a name→city chain visibly
// reorders what a single-column sort cannot.
const PEOPLE: Person[] = [
  { id: "1", name: "Bob", city: "Dubai", budget: 100 },
  { id: "2", name: "Alice", city: "Dubai", budget: 200 },
  { id: "3", name: "Alice", city: "Aden", budget: 300 },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city, sortable: true },
  { key: "budget", header: "Budget", accessor: (r) => String(r.budget) },
];

// `city` + `budget` share a group while `name` stays ungrouped, exercising
// both the unlabeled gap cell and a spanning labeled cell.
const GROUPED_COLUMNS: ColumnDef<Person>[] = COLUMNS.map((column) =>
  column.key === "name" ? column : { ...column, group: "Geo" }
);

const CHROME_PROPS = {
  bulkActions: [{ key: "del", label: "Delete", onClick: () => undefined }],
  rowActions: [{ key: "edit", label: "Edit", onClick: () => undefined }],
  renderRowDetail: (row: Person) => <div>detail {row.id}</div>,
};

function renderTable(
  override: Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">> = {}
) {
  return render(
    <MantineProvider>
      <DataTable<Person>
        data={PEOPLE}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("")}
        {...override}
      />
    </MantineProvider>
  );
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("summaryRow (Mantine)", () => {
  it("renders a tfoot row with cells aligned under their columns", () => {
    const { container } = renderTable({
      summaryRow: (rows) => ({
        budget: `Σ ${rows.reduce((total, row) => total + row.budget, 0)}`,
      }),
    });
    const tfoot = container.querySelector("tfoot");
    expect(tfoot).not.toBeNull();
    const cells = tfoot!.querySelectorAll("td");
    expect(cells).toHaveLength(3);
    // Keys absent from the result render empty cells under their columns.
    expect(cells[0]!.textContent).toBe("");
    expect(cells[1]!.textContent).toBe("");
    expect(cells[2]!.textContent).toBe("Σ 600");
  });

  it("pads the leading expansion/selection and trailing actions cells", () => {
    const { container } = renderTable({
      ...CHROME_PROPS,
      summaryRow: () => ({ name: "3 people" }),
    });
    const cells = container.querySelectorAll("tfoot td");
    // chevron + checkbox + 3 data columns + actions
    expect(cells).toHaveLength(6);
    expect(cells[0]!.textContent).toBe("");
    expect(cells[1]!.textContent).toBe("");
    expect(cells[2]!.textContent).toBe("3 people");
    expect(cells[5]!.textContent).toBe("");
  });

  it("renders no tfoot without the prop", () => {
    const { container } = renderTable();
    expect(container.querySelector("tfoot")).toBeNull();
  });

  it("mobile: renders a final summary card with only the present keys", () => {
    renderTable({
      isMobile: true,
      summaryRow: () => ({ budget: "Σ 600" }),
    });
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4); // 3 row cards + the summary card
    const summary = items.at(-1)!;
    expect(within(summary).getByText("Budget")).toBeInTheDocument();
    expect(within(summary).getByText("Σ 600")).toBeInTheDocument();
    expect(within(summary).queryByText("Name")).toBeNull();
  });

  it("mobile: renders no summary card without the prop", () => {
    renderTable({ isMobile: true });
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("header groups (Mantine)", () => {
  it("renders a first header row with spanning cells over grouped columns", () => {
    const { container } = renderTable({ columns: GROUPED_COLUMNS });
    const headerRows = container.querySelectorAll("thead tr");
    expect(headerRows).toHaveLength(2);
    const groupCells = headerRows[0]!.querySelectorAll("th");
    expect(groupCells).toHaveLength(2);
    // Ungrouped `name` gets an unlabeled single-span gap cell.
    expect(groupCells[0]!.textContent).toBe("");
    expect(groupCells[0]!.colSpan).toBe(1);
    expect(groupCells[1]!.textContent).toBe("Geo");
    expect(groupCells[1]!.colSpan).toBe(2);
  });

  it("pads expansion/selection/actions columns with empty group headers", () => {
    const { container } = renderTable({
      ...CHROME_PROPS,
      columns: GROUPED_COLUMNS,
    });
    const groupCells = container
      .querySelectorAll("thead tr")[0]!
      .querySelectorAll("th");
    // chevron + checkbox + gap + "Geo" + actions
    expect(groupCells).toHaveLength(5);
    expect(groupCells[0]!.textContent).toBe("");
    expect(groupCells[1]!.textContent).toBe("");
    expect(groupCells[3]!.textContent).toBe("Geo");
    expect(groupCells[4]!.textContent).toBe("");
  });

  it("renders a single header row when no column declares a group", () => {
    const { container } = renderTable();
    expect(container.querySelectorAll("thead tr")).toHaveLength(1);
  });
});

describe("multiSort (Mantine)", () => {
  it("shift-click chains two columns, sorts by both and badges show 1/2", () => {
    const { container } = renderTable({ multiSort: true });
    const nameButton = screen.getByRole("button", { name: "Sort by: Name" });
    const cityButton = screen.getByRole("button", { name: "Sort by: City" });
    fireEvent.click(nameButton, { shiftKey: true });
    fireEvent.click(cityButton, { shiftKey: true });

    // 1-based chain badges next to the sort icons.
    expect(within(nameButton).getByText("1")).toBeInTheDocument();
    expect(within(cityButton).getByText("2")).toBeInTheDocument();
    expect(nameButton).toHaveAttribute("data-sort-index", "1");
    expect(cityButton).toHaveAttribute("data-sort-index", "2");
    expect(nameButton.closest("th")).toHaveAttribute("aria-sort", "ascending");

    // name asc, then the Alice tie broken by city asc: Aden before Dubai.
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]!.textContent).toContain("Aden");
    expect(rows[1]!.textContent).toContain("Dubai");
    expect(rows[2]!.textContent).toContain("Bob");
  });

  it("a plain click still single-sorts and renders no badge", () => {
    const { container } = renderTable({ multiSort: true });
    const nameButton = screen.getByRole("button", { name: "Sort by: Name" });
    fireEvent.click(nameButton);

    const rows = container.querySelectorAll("tbody tr");
    // Stable single sort: the two Alices keep their original relative order.
    expect(rows[0]!.textContent).toContain("Alice");
    expect(rows[0]!.textContent).toContain("Dubai");
    expect(rows[1]!.textContent).toContain("Aden");
    expect(rows[2]!.textContent).toContain("Bob");
    expect(nameButton).not.toHaveAttribute("data-sort-index");
    expect(within(nameButton).queryByText("1")).toBeNull();
  });
});
