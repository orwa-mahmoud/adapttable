import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { createTheme, ThemeProvider } from "@mui/material";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: "1", name: "Bob", city: "Berlin", amount: 7 },
  { id: "2", name: "Alice", city: "Cairo", amount: 13 },
  { id: "3", name: "Alice", city: "Amman", amount: 10 },
];

/** name + city sortable; amount end-aligned (for summary alignment). */
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city, sortable: true },
  {
    key: "amount",
    header: "Amount",
    accessor: (r) => String(r.amount),
    align: "end",
  },
];

/** `name` ungrouped, `city` + `amount` share the "Place" group. */
const GROUPED: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "city", header: "City", accessor: (r) => r.city, group: "Place" },
  {
    key: "amount",
    header: "Amount",
    accessor: (r) => String(r.amount),
    group: "Place",
  },
];

const theme = createTheme();

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness(props: {
  columns?: ColumnDef<Row>[];
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}) {
  const columns = props.columns ?? COLUMNS;
  const source = useFrontendData<Row>({ data: ROWS, adapter, columns });
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
    <ThemeProvider theme={theme}>
      <Harness {...props} />
    </ThemeProvider>
  );
}

/** The header's sort label (its accessible name may gain a chain badge). */
function sortButton(label: string) {
  return screen.getByRole("button", { name: new RegExp(`^${label}`, "i") });
}

const sumAmount = (rows: readonly Row[]) =>
  `Total: ${rows.reduce((sum, r) => sum + r.amount, 0)}`;

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("summary row (desktop)", () => {
  it("aligns summary cells under columns, with empties for missing keys and the edge columns", () => {
    const { container } = renderHarness({
      override: {
        summaryRow: (rows) => ({ amount: sumAmount(rows) }),
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
        renderRowDetail: (r) => <div>detail {r.id}</div>,
      },
    });
    const cells = container.querySelectorAll("tfoot td");
    // expand + selection + 3 data columns + actions.
    expect(cells).toHaveLength(6);
    expect(cells[0]).toBeEmptyDOMElement(); // expand chevron column
    expect(cells[1]).toBeEmptyDOMElement(); // selection column
    expect(cells[2]).toBeEmptyDOMElement(); // name — no summary key
    expect(cells[3]).toBeEmptyDOMElement(); // city — no summary key
    expect(cells[4]).toHaveTextContent("Total: 30");
    expect(cells[5]).toBeEmptyDOMElement(); // actions column
    // The summary inherits the column's logical alignment.
    expect(getComputedStyle(cells[4]!).textAlign).toBe("end");
  });

  it("renders only the data-column cells when there is no selection/expansion/actions", () => {
    const { container } = renderHarness({
      override: { summaryRow: (rows) => ({ name: rows.length }) },
    });
    const cells = container.querySelectorAll("tfoot td");
    expect(cells).toHaveLength(3);
    expect(cells[0]).toHaveTextContent("3");
    expect(cells[1]).toBeEmptyDOMElement();
    expect(cells[2]).toBeEmptyDOMElement();
  });

  it("renders no footer at all without summaryRow", () => {
    const { container } = renderHarness();
    expect(container.querySelector("tfoot")).toBeNull();
  });
});

describe("header groups (desktop)", () => {
  it("spans contiguous grouped columns with a centered semibold cell and a gap over ungrouped ones", () => {
    const { container } = renderHarness({ columns: GROUPED });
    const headRows = container.querySelectorAll("thead tr");
    expect(headRows).toHaveLength(2);
    const groupCells = headRows[0]!.querySelectorAll("th");
    expect(groupCells).toHaveLength(2);
    expect(groupCells[0]).toBeEmptyDOMElement(); // gap over "name"
    expect(groupCells[0]).toHaveAttribute("colspan", "1");
    expect(groupCells[1]).toHaveTextContent("Place");
    expect(groupCells[1]).toHaveAttribute("colspan", "2");
    expect(getComputedStyle(groupCells[1]!).textAlign).toBe("center");
    expect(getComputedStyle(groupCells[1]!).fontWeight).toBe("600");
  });

  it("pads the group row past the expand/selection columns and under actions", () => {
    const { container } = renderHarness({
      columns: GROUPED,
      override: {
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
        renderRowDetail: (r) => <div>detail {r.id}</div>,
      },
    });
    const groupCells = container
      .querySelectorAll("thead tr")[0]!
      .querySelectorAll("th");
    // expand + selection + gap + "Place" + actions.
    expect(groupCells).toHaveLength(5);
    expect(groupCells[0]).toBeEmptyDOMElement();
    expect(groupCells[1]).toBeEmptyDOMElement();
    expect(groupCells[3]).toHaveTextContent("Place");
    expect(groupCells[3]).toHaveAttribute("colspan", "2");
    expect(groupCells[4]).toBeEmptyDOMElement();
  });

  it("renders a single header row when no column declares a group", () => {
    const { container } = renderHarness();
    expect(container.querySelectorAll("thead tr")).toHaveLength(1);
  });
});

describe("multi-sort", () => {
  it("shift-click chains two columns, badged 1 and 2, and sorts by the chain", () => {
    const { container } = renderHarness({ override: { multiSort: true } });
    fireEvent.click(sortButton("Name"), { shiftKey: true });
    fireEvent.click(sortButton("City"), { shiftKey: true });
    const nameTh = sortButton("Name").closest("th")!;
    const cityTh = sortButton("City").closest("th")!;
    expect(nameTh).toHaveAttribute("data-sort-index", "1");
    expect(cityTh).toHaveAttribute("data-sort-index", "2");
    expect(nameTh).toHaveAttribute("aria-sort", "ascending");
    expect(cityTh).toHaveAttribute("aria-sort", "ascending");
    expect(within(nameTh).getByText("1")).toBeInTheDocument();
    expect(within(cityTh).getByText("2")).toBeInTheDocument();
    // name asc, then city asc breaks the Alice tie: Amman before Cairo.
    const bodyRows = container.querySelectorAll("tbody tr");
    expect(bodyRows[0]).toHaveTextContent("Amman");
    expect(bodyRows[1]).toHaveTextContent("Cairo");
    expect(bodyRows[2]).toHaveTextContent("Berlin");
  });

  it("plain click single-sorts with no chain badge", () => {
    renderHarness({ override: { multiSort: true } });
    fireEvent.click(sortButton("Name"));
    const nameTh = sortButton("Name").closest("th")!;
    expect(nameTh).toHaveAttribute("aria-sort", "ascending");
    expect(nameTh).not.toHaveAttribute("data-sort-index");
    expect(within(nameTh).queryByText("1")).toBeNull();
    expect(adapter.getSearch()).toContain("sortBy=name");
  });
});

describe("summary card (mobile)", () => {
  /** The card list's listitems (the MUI pager renders its own list). */
  function cards() {
    const list = screen.getByRole("list", { name: "Data table" });
    return within(list).getAllByRole("listitem");
  }

  it("renders a final summary card, skipping columns without a summary value", () => {
    renderHarness({
      override: {
        isMobile: true,
        summaryRow: (rows) => ({ amount: sumAmount(rows) }),
      },
    });
    const items = cards();
    expect(items).toHaveLength(ROWS.length + 1);
    const summaryCard = items.at(-1)!;
    expect(within(summaryCard).getByText("Amount")).toBeInTheDocument();
    expect(within(summaryCard).getByText("Total: 30")).toBeInTheDocument();
    expect(within(summaryCard).queryByText("Name")).toBeNull();
    expect(within(summaryCard).queryByText("City")).toBeNull();
  });

  it("compacts the summary card under compact density", () => {
    renderHarness({
      override: {
        isMobile: true,
        density: "compact",
        summaryRow: () => ({ name: "3 people" }),
      },
    });
    const summaryCard = cards().at(-1)!;
    expect(within(summaryCard).getByText("3 people")).toBeInTheDocument();
  });
});
