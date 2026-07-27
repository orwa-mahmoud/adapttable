import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
  age: number;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai", age: 30 },
  { id: "b", name: "Bob", city: "Riyadh", age: 35 },
];
const baseColumns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
  { key: "age", header: "Age", accessor: (r) => r.age, align: "end" },
];

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness(props: {
  columns?: ColumnDef<Row>[];
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}) {
  const columns = props.columns ?? baseColumns;
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns,
    paginationMode: "paged",
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      {...props.override}
    />
  );
}

function renderHarness(props: Parameters<typeof Harness>[0] = {}, url = "") {
  adapter = createMemoryAdapter(url);
  return render(
    <ConfigProvider>
      <Harness {...props} />
    </ConfigProvider>
  );
}

/** All `<th>`s of the (first) header row, in DOM order. */
function headerCells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll("thead tr:first-child th"));
}

/** All summary-row `<td>`s, in DOM order. */
function summaryCells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(".ant-table-summary tr td"));
}

/** DOM index of the header whose text is exactly `text`. */
function headerIndex(container: HTMLElement, text: string): number {
  return headerCells(container).findIndex((th) => th.textContent === text);
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("summaryRow (antd native summary)", () => {
  it("renders one aligned footer cell per column, plus the actions pad", () => {
    const { container } = renderHarness({
      override: {
        summaryRow: (rows) => ({
          name: `${rows.length} rows`,
          age: rows.reduce((sum, r) => sum + r.age, 0),
        }),
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
      },
    });
    const headers = headerCells(container);
    const cells = summaryCells(container);
    // Name, City, Age, Actions — the summary mirrors the full grid width.
    expect(cells).toHaveLength(headers.length);
    expect(cells[headerIndex(container, "Name")]).toHaveTextContent("2 rows");
    expect(cells[headerIndex(container, "Age")]).toHaveTextContent("65");
    // A key absent from the result renders an empty cell, not a hole.
    expect(cells[headerIndex(container, "City")]!.textContent).toBe("");
    // The trailing actions column gets an empty pad cell.
    expect(cells.at(-1)!.textContent).toBe("");
    // Logical (RTL-safe) alignment carries into the summary cell.
    const ageDiv = cells[headerIndex(container, "Age")]!.querySelector("div");
    expect(ageDiv!.style.textAlign).toBe("end");
  });

  it("offsets the summary under the selection column antd injects", () => {
    const { container } = renderHarness({
      override: {
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        summaryRow: () => ({ name: "Total" }),
      },
    });
    const headers = headerCells(container);
    const cells = summaryCells(container);
    expect(cells).toHaveLength(headers.length);
    // The selection checkbox occupies the first grid column; the summary
    // pads it so "Total" still lands under the Name header.
    expect(headers[0]).toHaveClass("ant-table-selection-column");
    const nameIndex = headerIndex(container, "Name");
    expect(nameIndex).toBeGreaterThan(0);
    expect(cells[0]!.textContent).toBe("");
    expect(cells[nameIndex]).toHaveTextContent("Total");
  });

  it("offsets under BOTH injected columns when expansion joins selection", () => {
    const { container } = renderHarness({
      override: {
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        renderRowDetail: (r) => <div>detail {r.id}</div>,
        summaryRow: () => ({ city: "All cities" }),
      },
    });
    const headers = headerCells(container);
    const cells = summaryCells(container);
    expect(cells).toHaveLength(headers.length);
    // Expand + selection → two leading non-data columns in the grid.
    const cityIndex = headerIndex(container, "City");
    expect(cityIndex).toBeGreaterThanOrEqual(3); // 2 injected + Name
    expect(cells[cityIndex]).toHaveTextContent("All cities");
    expect(cells[0]!.textContent).toBe("");
    expect(cells[1]!.textContent).toBe("");
  });

  it("renders no summary footer without the prop", () => {
    const { container } = renderHarness();
    expect(container.querySelector(".ant-table-summary")).toBeNull();
  });

  it("renders a trailing mobile summary card listing only the covered keys", () => {
    const { container } = renderHarness({
      override: {
        isMobile: true,
        summaryRow: (rows) => ({
          age: rows.reduce((sum, r) => sum + r.age, 0),
        }),
      },
    });
    const card = container.querySelector<HTMLElement>(
      '[data-adapttable-part="summary-card"]'
    );
    expect(card).not.toBeNull();
    expect(within(card!).getByText("Age")).toBeInTheDocument();
    expect(within(card!).getByText("65")).toBeInTheDocument();
    // Keys absent from the result are omitted — no empty label/value noise.
    expect(within(card!).queryByText("Name")).toBeNull();
    expect(within(card!).queryByText("City")).toBeNull();
  });

  it("renders no mobile summary card without the prop", () => {
    const { container } = renderHarness({ override: { isMobile: true } });
    expect(
      container.querySelector('[data-adapttable-part="summary-card"]')
    ).toBeNull();
  });
});

describe("header groups (antd native grouped columns)", () => {
  const grouped: ColumnDef<Row>[] = [
    {
      key: "name",
      header: "Name",
      accessor: (r) => r.name,
      sortable: true,
      group: "Person",
    },
    { key: "city", header: "City", accessor: (r) => r.city, group: "Person" },
    { key: "age", header: "Age", accessor: (r) => r.age },
  ];

  it("merges contiguous same-group columns under one spanning parent", () => {
    const { container } = renderHarness({ columns: grouped });
    // Two header rows: the group row and the leaf row.
    expect(container.querySelectorAll("thead tr")).toHaveLength(2);
    const person = screen.getByRole("columnheader", { name: "Person" });
    expect(person).toHaveAttribute("colspan", "2");
    // The ungrouped Age column spans both header rows.
    expect(screen.getByRole("columnheader", { name: "Age" })).toHaveAttribute(
      "rowspan",
      "2"
    );
    // Leaf headers render inside the group.
    expect(
      screen.getByRole("columnheader", { name: "Name" })
    ).toBeInTheDocument();
  });

  it("keeps sorting working on a grouped leaf column", () => {
    renderHarness({ columns: grouped });
    fireEvent.click(screen.getByRole("columnheader", { name: "Name" }));
    expect(adapter.getSearch()).toContain("sortBy=name");
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
      "aria-sort",
      "ascending"
    );
  });

  it("keeps pinning working alongside a group", () => {
    const pinnable: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
      { key: "city", header: "City", accessor: (r) => r.city, group: "Geo" },
      { key: "age", header: "Age", accessor: (r) => r.age, group: "Geo" },
    ];
    const { container } = renderHarness({
      columns: pinnable,
      override: { defaultColumnLayout: { pinned: { name: "start" } } },
    });
    expect(
      screen.getByRole("columnheader", { name: "Geo" })
    ).toBeInTheDocument();
    expect(container.querySelector(".ant-table-cell-fix-start")).not.toBeNull();
  });

  it("splits a group when its columns are no longer adjacent", () => {
    const split: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name, group: "Person" },
      { key: "city", header: "City", accessor: (r) => r.city },
      { key: "age", header: "Age", accessor: (r) => r.age, group: "Person" },
    ];
    renderHarness({ columns: split });
    const parents = screen.getAllByRole("columnheader", { name: "Person" });
    expect(parents).toHaveLength(2);
    for (const parent of parents) {
      // Each split half spans exactly its own leaf (the DOM default of 1 —
      // rc-table omits the attribute rather than writing colspan="1").
      expect((parent as HTMLTableCellElement).colSpan).toBe(1);
    }
    // The ungrouped middle column stays a top-level, double-height header.
    expect(screen.getByRole("columnheader", { name: "City" })).toHaveAttribute(
      "rowspan",
      "2"
    );
  });

  it("renders a single header row when no column declares a group", () => {
    const { container } = renderHarness();
    expect(container.querySelectorAll("thead tr")).toHaveLength(1);
  });
});

describe("multiSort (shift-click chain on antd headers)", () => {
  const sortable: ColumnDef<Row>[] = [
    { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
    { key: "city", header: "City", accessor: (r) => r.city, sortable: true },
    { key: "age", header: "Age", accessor: (r) => r.age },
  ];
  const nameHeader = () => screen.getByRole("columnheader", { name: "Name" });
  const cityHeader = () => screen.getByRole("columnheader", { name: "City" });

  it("shift-click feeds the chain (badges 1/2, source.sortLevels) without antd single-sorting", () => {
    renderHarness({ columns: sortable, override: { multiSort: true } });
    fireEvent.click(nameHeader(), { shiftKey: true });
    // The chain — not antd's own single sort — received the click.
    expect(adapter.getSearch()).toContain("sort=name%3Aasc");
    expect(adapter.getSearch()).not.toContain("sortBy");
    expect(nameHeader()).toHaveAttribute("data-sort-index", "1");
    expect(nameHeader()).toHaveAttribute("aria-sort", "ascending");
    expect(within(nameHeader()).getByText("1")).toBeInTheDocument();

    fireEvent.click(cityHeader(), { shiftKey: true });
    expect(adapter.getSearch()).toContain("city%3Aasc");
    expect(cityHeader()).toHaveAttribute("data-sort-index", "2");
    expect(within(cityHeader()).getByText("2")).toBeInTheDocument();

    // Shift-clicking an existing level cycles its direction asc → desc.
    fireEvent.click(nameHeader(), { shiftKey: true });
    expect(adapter.getSearch()).toContain("sort=name%3Adesc");
    expect(nameHeader()).toHaveAttribute("aria-sort", "descending");
  });

  it("keeps plain clicks on antd's native single-sort path", () => {
    renderHarness({ columns: sortable, override: { multiSort: true } });
    fireEvent.click(nameHeader());
    expect(adapter.getSearch()).toContain("sortBy=name");
    expect(adapter.getSearch()).not.toContain("sort=");
    expect(nameHeader()).not.toHaveAttribute("data-sort-index");
  });

  it("treats shift-click as a plain antd sort without the prop", () => {
    renderHarness({ columns: sortable });
    fireEvent.click(nameHeader(), { shiftKey: true });
    expect(adapter.getSearch()).toContain("sortBy=name");
    expect(adapter.getSearch()).not.toContain("sort=");
  });

  it("urlSync={false} keeps state in memory and never touches the adapter", () => {
    const spy = {
      getSearch: vi.fn(() => ""),
      setSearch: vi.fn(),
      subscribe: vi.fn(() => () => undefined),
    };
    render(
      <ConfigProvider>
        <DataTable<Row>
          data={ROWS}
          columns={baseColumns}
          rowKey={(r) => r.id}
          urlAdapter={spy}
          urlSync={false}
        />
      </ConfigProvider>
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(spy.getSearch).not.toHaveBeenCalled();
    expect(spy.setSearch).not.toHaveBeenCalled();
    expect(spy.subscribe).not.toHaveBeenCalled();
  });
});
