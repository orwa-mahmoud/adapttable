import {
  createMemoryAdapter,
  type TableSource,
  useFrontendData,
} from "@adapttable/core";
import { flattenColumnTree } from "@adapttable/core/adapter";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef, ColumnInput } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai", amount: 10 },
  { id: "b", name: "Bob", city: "Riyadh", amount: 32 },
];

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city, sortable: true },
  { key: "amount", header: "Amount", accessor: (r) => String(r.amount) },
];

let adapter: ReturnType<typeof createMemoryAdapter>;
let lastSource: TableSource<Row>;

function Harness(props: {
  columns?: ColumnInput<Row>[];
  isMobile?: boolean;
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}) {
  const cols = props.columns ?? columns;
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns: flattenColumnTree(cols).leaves,
  });
  lastSource = source;
  return (
    <DataTable
      source={source}
      columns={cols}
      rowKey={(r) => r.id}
      forceMobile={props.isMobile}
      {...props.override}
    />
  );
}

function renderHarness(props: Parameters<typeof Harness>[0] = {}) {
  adapter = createMemoryAdapter("");
  return render(<Harness {...props} />);
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

const sumAmount = (rows: readonly Row[]) => ({
  amount: rows.reduce((acc, r) => acc + r.amount, 0),
});

describe("summary row (desktop)", () => {
  it("aligns summary cells under columns with pads for the edge columns", () => {
    const { container } = renderHarness({
      override: {
        summaryRow: sumAmount,
        bulkActions: [{ key: "x", label: "X", onClick: () => undefined }],
        rowActions: [{ key: "e", label: "Edit", onClick: () => undefined }],
        renderRowDetail: (r) => <div>{r.name}</div>,
        classNames: {
          summary: "my-summary",
          summaryRow: "my-summary-row",
          summaryCell: "my-summary-cell",
        },
      },
    });
    const tfoot = container.querySelector(
      'tfoot[data-adapttable-part="summary"]'
    );
    expect(tfoot).toHaveClass("my-summary");
    const row = tfoot!.querySelector('tr[data-adapttable-part="summary-row"]');
    expect(row).toHaveClass("my-summary-row");
    const cells = row!.querySelectorAll(
      'td[data-adapttable-part="summary-cell"]'
    );
    // expand pad + selection pad + 3 data columns + actions pad.
    expect(cells).toHaveLength(6);
    for (const cell of cells) expect(cell).toHaveClass("my-summary-cell");
    // Only `amount` is present in the summary record; the rest stay empty.
    expect(cells[4]).toHaveTextContent("42");
    expect(cells[2]).toHaveTextContent("");
    expect(cells[3]).toHaveTextContent("");
  });

  it("renders no pads without selection/expansion/actions", () => {
    const { container } = renderHarness({
      override: { summaryRow: sumAmount },
    });
    const cells = container.querySelectorAll(
      'td[data-adapttable-part="summary-cell"]'
    );
    expect(cells).toHaveLength(3);
    expect(cells[2]).toHaveTextContent("42");
  });

  it("renders no tfoot when summaryRow is absent", () => {
    const { container } = renderHarness();
    expect(
      container.querySelector('[data-adapttable-part="summary"]')
    ).toBeNull();
  });
});

describe("group header row", () => {
  const grouped: ColumnDef<Row>[] = [
    { key: "name", header: "Name", accessor: (r) => r.name },
    { key: "city", header: "City", accessor: (r) => r.city, group: "Location" },
    {
      key: "amount",
      header: "Amount",
      accessor: (r) => String(r.amount),
      group: "Location",
    },
  ];

  it("rowspans ungrouped leaves beside the group and pads the edges", () => {
    const { container } = renderHarness({
      columns: grouped,
      override: {
        bulkActions: [{ key: "x", label: "X", onClick: () => undefined }],
        rowActions: [{ key: "e", label: "Edit", onClick: () => undefined }],
        renderRowDetail: (r) => <div>{r.name}</div>,
        classNames: {
          headerGroupRow: "my-group-row",
          headerGroupCell: "my-group-cell",
        },
      },
    });
    const groupRow = container.querySelector(
      'thead tr[data-adapttable-part="header-group-row"]'
    );
    expect(groupRow).toHaveClass("my-group-row");
    expect(groupRow!.parentElement!.firstElementChild).toBe(groupRow);
    const cells = groupRow!.querySelectorAll("th");
    // expand + selection + Name (rowspan) + Location + actions
    expect(cells).toHaveLength(5);
    expect(cells[2]).toHaveTextContent("Name");
    expect(cells[2]).toHaveAttribute("rowspan", "2");
    const location = groupRow!.querySelector(
      'th[data-adapttable-part="header-group-cell"]'
    );
    expect(location).toHaveClass("my-group-cell");
    expect(location).toHaveTextContent("Location");
    expect(location).toHaveAttribute("colspan", "2");
    const leafRow = container.querySelectorAll("thead tr")[1]!;
    expect(
      [...leafRow.querySelectorAll("th")].map((th) => th.textContent)
    ).toEqual(expect.arrayContaining(["City", "Amount"]));
  });

  it("collapses a group to an arrow stub when armed", () => {
    const { container } = renderHarness({
      columns: grouped,
      override: { collapsibleColumnGroups: true },
    });
    const toggle = container.querySelector(
      '[data-adapttable-part="column-group-toggle"]'
    );
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle!);
    expect(
      container.querySelector('[data-adapttable-part="column-group-toggle"]')
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("columnheader", { name: "Amount" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "City" })).toBeNull();
    expect(container.querySelectorAll("thead tr")).toHaveLength(1);
    const stubToggle = container.querySelector(
      '[data-adapttable-part="column-group-toggle"]'
    );
    expect(stubToggle).not.toHaveAttribute("title");
    expect(stubToggle?.closest("th")).toHaveStyle({
      maxWidth: "36px",
      minWidth: "36px",
    });
  });

  it("keeps the child header when collapsedKey stays a real leaf", () => {
    const tree: ColumnInput<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
      {
        header: "Location",
        collapsedKey: "city",
        children: [
          { key: "city", header: "City", accessor: (r) => r.city },
          {
            key: "amount",
            header: "Amount",
            accessor: (r) => String(r.amount),
          },
        ],
      },
    ];
    const { container } = renderHarness({
      columns: tree,
      override: { collapsibleColumnGroups: true },
    });
    fireEvent.click(
      container.querySelector('[data-adapttable-part="column-group-toggle"]')!
    );
    expect(screen.queryByRole("columnheader", { name: "Amount" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "City" })).toBeVisible();
    expect(container.querySelectorAll("thead tr")).toHaveLength(2);
  });

  it("drops the child header row for collapsedRender", () => {
    const tree: ColumnInput<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
      {
        header: "Location",
        collapsedRender: (row) => `${row.city} · ${row.amount}`,
        children: [
          { key: "city", header: "City", accessor: (r) => r.city },
          {
            key: "amount",
            header: "Amount",
            accessor: (r) => String(r.amount),
          },
        ],
      },
    ];
    const { container } = renderHarness({
      columns: tree,
      override: { collapsibleColumnGroups: true },
    });
    fireEvent.click(
      container.querySelector('[data-adapttable-part="column-group-toggle"]')!
    );
    expect(screen.queryByRole("columnheader", { name: "City" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Amount" })).toBeNull();
    expect(screen.getByText("Location")).toBeVisible();
    expect(container.querySelectorAll("thead tr")).toHaveLength(1);
  });

  it("renders no group row when no column declares a group", () => {
    const { container } = renderHarness();
    expect(
      container.querySelector('[data-adapttable-part="header-group-row"]')
    ).toBeNull();
  });
});

describe("multi-sort", () => {
  const sortButton = (name: string) =>
    screen.getByRole("button", { name: `Sort by: ${name}` });

  it("single-sorts on a plain click, with no chain and no badges", () => {
    const { container } = renderHarness({ override: { multiSort: true } });
    fireEvent.click(sortButton("Name"));
    expect(lastSource.sortBy).toBe("name");
    expect(lastSource.sortLevels).toHaveLength(0);
    expect(
      container.querySelector('[data-adapttable-part="sort-index"]')
    ).toBeNull();
  });

  it("chains two columns on shift-click and badges their 1-based order", () => {
    const { container } = renderHarness({
      override: { multiSort: true, classNames: { sortIndex: "my-badge" } },
    });
    fireEvent.click(sortButton("Name"), { shiftKey: true });
    fireEvent.click(sortButton("City"), { shiftKey: true });
    expect(lastSource.sortLevels).toEqual([
      { key: "name", dir: "asc" },
      { key: "city", dir: "asc" },
    ]);
    const badges = container.querySelectorAll(
      '[data-adapttable-part="sort-index"]'
    );
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent("1");
    expect(badges[0]).toHaveClass("my-badge");
    expect(badges[1]).toHaveTextContent("2");
    expect(sortButton("Name")).toHaveAttribute("data-sort-index", "1");
    expect(sortButton("City")).toHaveAttribute("data-sort-index", "2");
  });
});

describe("summary card (mobile)", () => {
  it("lists only the present keys as a trailing card", () => {
    const { container } = renderHarness({
      isMobile: true,
      override: {
        summaryRow: sumAmount,
        classNames: { summaryCard: "my-summary-card" },
      },
    });
    const card = container.querySelector(
      'li[data-adapttable-part="summary-card"]'
    );
    expect(card).toHaveClass("my-summary-card");
    // The trailing card in the list.
    expect(card!.parentElement!.lastElementChild).toBe(card);
    const rows = card!.querySelectorAll('[data-adapttable-part="card-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Amount");
    expect(rows[0]).toHaveTextContent("42");
  });

  it("renders no summary card when summaryRow is absent", () => {
    const { container } = renderHarness({ isMobile: true });
    expect(
      container.querySelector('[data-adapttable-part="summary-card"]')
    ).toBeNull();
  });
});
