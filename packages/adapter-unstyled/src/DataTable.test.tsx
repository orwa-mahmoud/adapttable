import type { ColumnLayoutState } from "@adapttable/core";
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { sparklineColumn } from "@adapttable/core/sparkline";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai" },
  { id: "b", name: "Bob", city: "Riyadh" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness(props: {
  rows?: readonly Row[];
  mode?: "paged" | "infinite";
  isMobile?: boolean;
  error?: Error | null;
  refetch?: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}) {
  const source = useFrontendData<Row>({
    data: props.rows ?? ROWS,
    urlAdapter: adapter,
    columns,
    paginationMode: props.mode ?? "paged",
    error: props.error ?? null,
    refetch: props.refetch,
    isLoading: props.isLoading,
    isFetching: props.isFetching,
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      forceMobile={props.isMobile}
      {...props.override}
    />
  );
}

function renderHarness(
  props: Parameters<typeof Harness>[0] = {},
  initialUrl = ""
) {
  adapter = createMemoryAdapter(initialUrl);
  return render(<Harness {...props} />);
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> (unstyled)", () => {
  it("renders normally under hostile URL params and corrupt storage", () => {
    // Prototype-named filter keys, an absurd colW, and garbage in the
    // column-layout storage must all degrade silently.
    globalThis.localStorage.setItem("hostile-cols", "{not json");
    const { container } = renderHarness(
      {
        override: {
          filterLabels: { status: (v: string) => `Status: ${v}` },
          columnLayout: undefined,
        },
      },
      "f_valueOf=x&f___proto__=y&f_constructor=z&colW=name:1000000000"
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(container.querySelector("table")).toBeInTheDocument();
    globalThis.localStorage.removeItem("hostile-cols");
  });

  it("applies the rowsPerPage class hook to both selects", () => {
    const { container } = renderHarness({
      override: { classNames: { rowsPerPage: "my-rpp" } },
    });
    // Paged mode renders the footer select.
    expect(
      container.querySelector('[data-adapttable-part="footer"] select.my-rpp')
    ).toBeInTheDocument();
    const infinite = renderHarness({
      mode: "infinite",
      override: { classNames: { rowsPerPage: "my-rpp" } },
    });
    // Infinite mode renders the toolbar select instead.
    expect(
      infinite.container.querySelector(
        '[data-adapttable-part="toolbar"] select.my-rpp'
      )
    ).toBeInTheDocument();
  });

  it("keeps an off-list default page size after switching to 10", () => {
    adapter = createMemoryAdapter("");
    function ScaleHarness() {
      const source = useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        columns,
        paginationMode: "infinite",
        defaults: { limit: 500 },
      });
      return (
        <DataTable source={source} columns={columns} rowKey={(r) => r.id} />
      );
    }
    render(<ScaleHarness />);
    const select = screen.getByLabelText("Rows per page");
    expect(
      within(select).getByRole("option", { name: "500" })
    ).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "10" } });
    expect(select).toHaveValue("10");
    expect(
      within(select).getByRole("option", { name: "500" })
    ).toBeInTheDocument();
  });

  it("activates onRowClick from a row, but never from row actions", () => {
    const onRowClick = vi.fn();
    const onAction = vi.fn();
    renderHarness({
      override: {
        onRowClick,
        rowActions: [{ key: "e", label: "Edit", onClick: onAction }],
      },
    });
    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice" })
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    expect(onAction).toHaveBeenCalled();
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("renders a semantic table with rows and data hooks", () => {
    const { container } = renderHarness();
    expect(
      container.querySelector('[data-adapttable-part="root"]')
    ).toBeInTheDocument();
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Riyadh")).toBeInTheDocument();
  });

  it("defaults the root density hook to comfortable", () => {
    const { container } = renderHarness();
    expect(
      container.querySelector('[data-adapttable-part="root"]')
    ).toHaveAttribute("data-density", "comfortable");
  });

  it("surfaces data-density=compact on the root when density is compact", () => {
    const { container } = renderHarness({
      override: { density: "compact" },
    });
    expect(
      container.querySelector('[data-adapttable-part="root"]')
    ).toHaveAttribute("data-density", "compact");
  });

  it("renders the no-data empty state without a clear button", () => {
    renderHarness({ rows: [] });
    expect(screen.getByText("No data")).toBeInTheDocument();
    // "noData" means nothing exists — a clear-filters CTA would be noise.
    expect(
      document.querySelector('[data-adapttable-part="empty-clear"]')
    ).toBeNull();
  });

  it("renders the no-results empty state when a search matches nothing", () => {
    const onClearFilters = vi.fn();
    renderHarness(
      {
        rows: [],
        override: {
          onClearFilters,
          classNames: { emptyClear: "my-clear" },
        },
      },
      "q=zzz"
    );
    expect(
      screen.getByText("No results match your filters")
    ).toBeInTheDocument();
    const clear = screen.getByRole("button", { name: "Clear all" });
    expect(clear).toHaveAttribute("data-adapttable-part", "empty-clear");
    expect(clear).toHaveClass("my-clear");
    fireEvent.click(clear);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("renders a custom empty state", () => {
    renderHarness({
      rows: [],
      override: { slots: { empty: <div>nada</div> } },
    });
    expect(screen.getByText("nada")).toBeInTheDocument();
  });

  it("surfaces a background refresh on the root and as a progressbar", () => {
    const { container } = renderHarness({
      isFetching: true,
      override: { classNames: { refreshIndicator: "my-refresh" } },
    });
    const root = container.querySelector('[data-adapttable-part="root"]');
    expect(root).toHaveAttribute("data-refreshing");
    expect(root).toHaveAttribute("aria-busy", "true");
    const bar = screen.getByRole("progressbar", { name: "Loading…" });
    expect(bar).toHaveAttribute("data-adapttable-part", "refresh-indicator");
    expect(bar).toHaveClass("my-refresh");
    // The rows on screen stay visible — a refresh is non-blocking.
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows no refresh indicator when the source is idle", () => {
    const { container } = renderHarness();
    const root = container.querySelector('[data-adapttable-part="root"]');
    expect(root).not.toHaveAttribute("data-refreshing");
    expect(root).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("appends rowClassName output to desktop rows", () => {
    const { container } = renderHarness({
      override: {
        rowClassName: (row) => (row.id === "a" ? "is-alice" : undefined),
        classNames: { row: "base-row" },
      },
    });
    const rows = container.querySelectorAll('[data-adapttable-part="row"]');
    expect(rows[0]).toHaveClass("base-row");
    expect(rows[0]).toHaveClass("is-alice");
    expect(rows[1]).toHaveClass("base-row");
    expect(rows[1]).not.toHaveClass("is-alice");
  });

  it("applies rowStyle and rowHeight to desktop rows", () => {
    const { container } = renderHarness({
      override: {
        rowStyle: (row) =>
          row.id === "a" ? { color: "rgb(255, 0, 0)" } : undefined,
        rowHeight: 48,
      },
    });
    const rows = container.querySelectorAll('[data-adapttable-part="row"]');
    expect(rows[0]).toHaveStyle({ color: "rgb(255, 0, 0)", height: "48px" });
    expect(rows[1]).toHaveStyle({ height: "48px" });
    expect(rows[1]).not.toHaveStyle({ color: "rgb(255, 0, 0)" });
  });

  it("applies rowStyle to mobile cards", () => {
    const { container } = renderHarness({
      isMobile: true,
      override: {
        rowStyle: (_row, index) =>
          index === 0 ? { backgroundColor: "rgb(0, 128, 0)" } : undefined,
      },
    });
    const cards = container.querySelectorAll('[data-adapttable-part="card"]');
    expect(cards[0]).toHaveStyle({ backgroundColor: "rgb(0, 128, 0)" });
    expect(cards[1]).not.toHaveStyle({ backgroundColor: "rgb(0, 128, 0)" });
  });

  it("appends rowClassName output to mobile cards", () => {
    const { container } = renderHarness({
      isMobile: true,
      override: {
        rowClassName: (_row, index) => (index === 0 ? "flagged" : undefined),
        classNames: { card: "base-card" },
      },
    });
    const cards = container.querySelectorAll('[data-adapttable-part="card"]');
    expect(cards[0]).toHaveClass("base-card");
    expect(cards[0]).toHaveClass("flagged");
    expect(cards[1]).not.toHaveClass("flagged");
  });

  it("renders the loading state", () => {
    const { container } = renderHarness({ rows: [], isLoading: true });
    expect(
      container.querySelector('[data-adapttable-part="loading"]')
    ).toBeInTheDocument();
  });

  it("renders skeleton cards in the mobile loading state", () => {
    const { container } = renderHarness({
      rows: [],
      isLoading: true,
      isMobile: true,
    });
    expect(
      container.querySelector('[data-adapttable-part="loading-cards"]')
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-adapttable-part="loading-card"]').length
    ).toBeGreaterThan(0);
  });

  it("renders skeleton header lines for every column while loading", () => {
    // Three columns exercises the middle-column width branch of the skeleton.
    const threeCols: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
      { key: "city", header: "City", accessor: (r) => r.city },
      { key: "id", header: "Id", accessor: (r) => r.id },
    ];
    const { container } = renderHarness({
      rows: [],
      isLoading: true,
      override: { columns: threeCols },
    });
    expect(
      container.querySelectorAll('[data-adapttable-part="loading-header-cell"]')
    ).toHaveLength(3);
  });

  it("renders a slots.skeleton override while loading", () => {
    renderHarness({
      rows: [],
      isLoading: true,
      override: { slots: { skeleton: <div>load-custom</div> } },
    });
    expect(screen.getByText("load-custom")).toBeInTheDocument();
  });

  it("renders the search icon glyph inside the search field", () => {
    const { container } = renderHarness();
    const field = container.querySelector(
      '[data-adapttable-part="search-field"]'
    );
    expect(field).toBeInTheDocument();
    expect(
      field?.querySelector('[data-adapttable-part="search-icon"] svg')
    ).toBeInTheDocument();
    // The input still lives inside the field wrapper.
    expect(
      field?.querySelector('[data-adapttable-part="search"]')
    ).toBeInTheDocument();
  });

  it("renders the funnel icon on the Filters button", () => {
    renderHarness({ override: { filters: <div>filter body</div> } });
    const button = screen.getByRole("button", { name: /filters/i });
    expect(
      button.querySelector('[data-adapttable-part="filters-icon"] svg')
    ).toBeInTheDocument();
  });

  it("orders the toolbar as Search · Filters · Columns", () => {
    const { container } = renderHarness({
      override: {
        filters: <div>filter body</div>,
        enableColumnMenu: true,
      },
    });
    const toolbar = container.querySelector(
      '[data-adapttable-part="toolbar"]'
    )!;
    const search = toolbar.querySelector(
      '[data-adapttable-part="search-field"]'
    )!;
    const filters = toolbar.querySelector(
      '[data-adapttable-part="filters-anchor"]'
    )!;
    const columns = toolbar.querySelector(
      '[data-adapttable-part="column-menu"]'
    )!;
    expect(search).toBeInTheDocument();
    expect(filters).toBeInTheDocument();
    expect(columns).toBeInTheDocument();
    // Document order: Columns comes after Filters which comes after Search.
    expect(
      search.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      filters.compareDocumentPosition(columns) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders an error with a working retry", () => {
    const refetch = vi.fn();
    renderHarness({ error: new Error("boom"), refetch });
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    fireEvent.click(screen.getByText("Retry"));
    expect(refetch).toHaveBeenCalled();
  });

  it("omits the retry button when the source has no refetch", () => {
    renderHarness({ error: new Error("boom") });
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    expect(screen.queryByText("Retry")).toBeNull();
  });

  it("lets the host replace the error state, error and retry in hand", () => {
    const refetch = vi.fn();
    renderHarness({
      error: new Error("boom"),
      refetch,
      override: {
        slots: {
          error: (state) => (
            <output>
              mine: {state.error.message}
              <button type="button" onClick={state.retry}>
                again
              </button>
            </output>
          ),
        },
      },
    });

    // The built-in went away entirely — not layered under the replacement.
    expect(screen.getByText(/mine: boom/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();

    // And the retry it was handed is the source's, not a decoration.
    fireEvent.click(screen.getByRole("button", { name: "again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("clears all active filters from the chip strip", () => {
    const onClearFilters = vi.fn();
    renderHarness(
      {
        override: {
          filterLabels: { status: (v) => `Status: ${v}` },
          onClearFilters,
        },
      },
      "f_status=Active"
    );
    const chipStrip = screen.getByRole("list", { name: "Filters" });
    fireEvent.click(within(chipStrip).getByText("Clear all"));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("commits debounced search to the URL", () => {
    renderHarness();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ali" },
    });
    act(() => vi.advanceTimersByTime(300));
    expect(adapter.getSearch()).toContain("q=ali");
  });

  it("cycles sort on a header button", () => {
    renderHarness();
    const btn = screen.getByRole("button", { name: /sort by: name/i });
    fireEvent.click(btn);
    expect(adapter.getSearch()).toContain("sortDir=asc");
    fireEvent.click(btn);
    expect(adapter.getSearch()).toContain("sortDir=desc");
  });

  it("paginates via the footer next button", () => {
    renderHarness({}, "limit=1");
    const next = screen.getByRole("button", { name: "Next page" });
    fireEvent.click(next);
    expect(adapter.getSearch()).toContain("page=2");
  });

  it("renders numbered page buttons, flags the current one, and groups them in the pager", () => {
    const { container } = renderHarness({}, "limit=1");
    const pager = container.querySelector('[data-adapttable-part="pager"]')!;
    // Prev/next live in the trailing pager group, not as loose footer children
    // a `justify-between` footer would strand at opposite edges.
    expect(
      pager.querySelector('[data-adapttable-part="page-prev"]')
    ).not.toBeNull();
    expect(
      pager.querySelector('[data-adapttable-part="page-next"]')
    ).not.toBeNull();
    // One numbered button per page (2 rows at limit=1 → pages 1 and 2), with the
    // current page marked for assistive tech.
    const numbers = pager.querySelectorAll<HTMLButtonElement>(
      '[data-adapttable-part="page-number"]'
    );
    expect(numbers).toHaveLength(2);
    expect(numbers[0]).toHaveAttribute("aria-current", "page");
    expect(numbers[1]).not.toHaveAttribute("aria-current");
    // Clicking a page number jumps straight to it.
    fireEvent.click(numbers[1]!);
    expect(adapter.getSearch()).toContain("page=2");
  });

  it("runs a bulk action after confirm", async () => {
    const onClick = vi.fn();
    const confirm = vi.fn((r: { onConfirm: () => void }) => r.onConfirm());
    renderHarness({
      override: {
        bulkActions: [
          {
            key: "del",
            label: "Delete",
            onClick,
            confirm: {
              title: "t",
              message: (n) => `Delete ${n}`,
              confirmLabel: "Yes",
            },
          },
        ],
        confirm,
      },
    });
    fireEvent.click(screen.getByLabelText("Select all"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
      await Promise.resolve();
    });
    // Plain page selection: the runner reports the page scope.
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: false,
      total: 2,
    });
  });

  it("a rejecting bulk action shows the error and keeps the selection", async () => {
    const onClick = vi.fn().mockRejectedValue(new Error("backend said no"));
    renderHarness({
      override: {
        bulkActions: [{ key: "del", label: "Delete", onClick }],
      },
    });
    fireEvent.click(screen.getByLabelText("Select all"));
    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
      await Promise.resolve();
      await Promise.resolve();
    });
    // The failure is announced in the bar and the selection survives for
    // a retry — nothing vanishes into an unhandled rejection.
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-adapttable-part", "bulk-error");
    expect(alert).toHaveTextContent("Something went wrong: backend said no");
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("hides the select-all banner when the page holds every match", () => {
    renderHarness({
      override: {
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      },
    });
    // Partial selection: the bulk bar shows but the banner does not.
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="select-all-banner"]')
    ).toBeNull();
    // Full page selected, but total === visible: still no banner.
    fireEvent.click(screen.getByLabelText("Select all"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="select-all-banner"]')
    ).toBeNull();
  });

  it("offers select-all-matching on a full page and flips to the active state", () => {
    renderHarness(
      {
        override: {
          bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
          classNames: {
            selectAllBanner: "my-banner",
            selectAllText: "my-text",
            selectAllButton: "my-button",
          },
        },
      },
      "limit=1"
    );
    fireEvent.click(screen.getByLabelText("Select all"));
    const banner = () => {
      const el = document.querySelector(
        '[data-adapttable-part="select-all-banner"]'
      );
      if (!(el instanceof HTMLElement)) throw new Error("banner missing");
      return el;
    };
    expect(banner()).toHaveClass("my-banner");
    const text = banner().querySelector(
      '[data-adapttable-part="select-all-text"]'
    );
    expect(text).toHaveClass("my-text");
    expect(text).toHaveTextContent("All 1 on this page selected");
    const offer = within(banner()).getByRole("button", {
      name: "Select all 2 matching",
    });
    expect(offer).toHaveClass("my-button");
    fireEvent.click(offer);
    // Active state: status text swaps and the button becomes a clear-all.
    expect(banner()).toHaveTextContent("All 2 matching selected");
    const clearButton = within(banner()).getByRole("button", {
      name: "Clear all",
    });
    expect(clearButton).toHaveClass("my-button");
    fireEvent.click(clearButton);
    expect(screen.queryByText("1 selected")).toBeNull();
  });

  it("confirms by the matching TOTAL and runs with the all-matching scope", async () => {
    const onClick = vi.fn();
    const confirm = vi.fn((r: { onConfirm: () => void }) => r.onConfirm());
    renderHarness(
      {
        override: {
          bulkActions: [
            {
              key: "del",
              label: "Delete",
              onClick,
              confirm: {
                title: "t",
                message: (n) => `Delete ${n}`,
                confirmLabel: "Yes",
              },
            },
          ],
          confirm,
        },
      },
      "limit=1"
    );
    fireEvent.click(screen.getByLabelText("Select all"));
    fireEvent.click(
      screen.getByRole("button", { name: "Select all 2 matching" })
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
      await Promise.resolve();
    });
    // The confirm size reflects the WHOLE matching set, not the page ids.
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Delete 2" })
    );
    expect(onClick).toHaveBeenCalledWith(["a"], {
      allMatching: true,
      total: 2,
    });
  });

  it("narrows back to the page scope when the selection is mutated", () => {
    renderHarness(
      {
        override: {
          bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        },
      },
      "limit=1"
    );
    fireEvent.click(screen.getByLabelText("Select all"));
    fireEvent.click(
      screen.getByRole("button", { name: "Select all 2 matching" })
    );
    expect(screen.getByText("All 2 matching selected")).toBeInTheDocument();
    // Any explicit mutation narrows the scope: deselect, then reselect.
    fireEvent.click(screen.getByLabelText("Select row"));
    expect(
      document.querySelector('[data-adapttable-part="select-all-banner"]')
    ).toBeNull();
    fireEvent.click(screen.getByLabelText("Select row"));
    // Back to the OFFER state — all-matching did not survive the toggle.
    expect(screen.getByText("All 1 on this page selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select all 2 matching" })
    ).toBeInTheDocument();
  });

  it("pins the selection column alongside a left-pinned data column", () => {
    const { container } = renderHarness({
      override: {
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        stickyHeader: true,
        defaultColumnLayout: { pinned: { name: "start" } },
      },
    });
    const selHeader = container.querySelector(
      '[data-adapttable-part="selection-header"]'
    );
    expect(selHeader).toHaveAttribute("data-pinned", "start");
    // Logical inset: sticks to the inline START, the correct edge in RTL too.
    expect(selHeader).toHaveStyle({ position: "sticky" });
    expect((selHeader as HTMLElement).style.insetInlineStart).toBe("0px");
    const selCell = container.querySelector(
      '[data-adapttable-part="selection-cell"]'
    );
    expect(selCell).toHaveAttribute("data-pinned", "start");
    expect(selCell).toHaveStyle({ position: "sticky" });
    expect((selCell as HTMLElement).style.insetInlineStart).toBe("0px");
  });

  it("leaves the selection column unpinned when nothing is pinned", () => {
    const { container } = renderHarness({
      override: {
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
      },
    });
    const selHeader = container.querySelector(
      '[data-adapttable-part="selection-header"]'
    );
    expect(selHeader).not.toHaveAttribute("data-pinned");
    expect(selHeader?.getAttribute("style")).toBeNull();
  });

  it("end-pins the actions column with ONE click and zero data pins", () => {
    const onColumnLayoutChange = vi.fn<(next: ColumnLayoutState) => void>();
    const { container } = renderHarness({
      override: {
        enableColumnMenu: true,
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
        onColumnLayoutChange,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Pin to end: Actions" })
    );
    // No data column is pinned — the actions column sticks on its own.
    expect(
      container.querySelector(
        '[data-adapttable-part="header-cell"][data-pinned]'
      )
    ).toBeNull();
    const header = container.querySelector(
      '[data-adapttable-part="actions-header"]'
    );
    expect(header).toHaveAttribute("data-pinned", "end");
    expect(header).toHaveStyle({ position: "sticky" });
    // Logical inset: sticks to the inline END, the correct edge in RTL too.
    expect((header as HTMLElement).style.insetInlineEnd).toBe("0px");
    const cell = container.querySelector(
      '[data-adapttable-part="actions-cell"]'
    );
    expect(cell).toHaveAttribute("data-pinned", "end");
    expect(cell).toHaveStyle({ position: "sticky" });
    expect((cell as HTMLElement).style.insetInlineEnd).toBe("0px");
    // The layout state names the reserved "actions" key like any column.
    expect(onColumnLayoutChange).toHaveBeenCalledWith(
      expect.objectContaining({ pinned: { actions: "end" } })
    );
    // ONE more click unpins it again.
    fireEvent.click(screen.getByRole("button", { name: "Unpin: Actions" }));
    expect(
      container.querySelector('[data-adapttable-part="actions-header"]')
    ).not.toHaveAttribute("data-pinned");
  });

  it("hides and re-shows the actions column from the Columns menu", () => {
    const { container } = renderHarness({
      override: {
        enableColumnMenu: true,
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
      },
    });
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hide column: Actions" })
    );
    // The whole column is gone — header and every row's action buttons.
    expect(
      container.querySelector('[data-adapttable-part="actions-header"]')
    ).toBeNull();
    expect(screen.queryAllByRole("button", { name: "Edit" })).toHaveLength(0);
    // …but the menu still lists Actions, so the eye brings it back.
    fireEvent.click(
      screen.getByRole("button", { name: "Show column: Actions" })
    );
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
  });

  it("round-trips the actions layout (hide + end-pin persist)", () => {
    const onColumnLayoutChange = vi.fn<(next: ColumnLayoutState) => void>();
    const first = renderHarness({
      override: {
        enableColumnMenu: true,
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
        onColumnLayoutChange,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Pin to end: Actions" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Hide column: Actions" })
    );
    // The captured layout carries the reserved "actions" key in both maps.
    const saved = onColumnLayoutChange.mock.calls.at(-1)![0];
    expect(saved.hidden).toContain("actions");
    expect(saved.pinned).toEqual({ actions: "end" });
    first.unmount();
    // A fresh table restored from that layout starts with actions hidden…
    const { container } = renderHarness({
      override: {
        enableColumnMenu: true,
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
        defaultColumnLayout: saved,
      },
    });
    expect(
      container.querySelector('[data-adapttable-part="actions-header"]')
    ).toBeNull();
    // …and re-showing it restores the persisted end pin too.
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Show column: Actions" })
    );
    const header = container.querySelector(
      '[data-adapttable-part="actions-header"]'
    );
    expect(header).toHaveAttribute("data-pinned", "end");
    expect((header as HTMLElement).style.insetInlineEnd).toBe("0px");
  });

  it("strips hidden row actions from mobile cards too", () => {
    const { container } = renderHarness({
      isMobile: true,
      override: {
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
        defaultColumnLayout: { hidden: ["actions"] },
      },
    });
    expect(
      container.querySelector('[data-adapttable-part="card-actions"]')
    ).toBeNull();
    expect(screen.queryAllByRole("button", { name: "Edit" })).toHaveLength(0);
  });

  it("renders filter chips and toggles the filters popover", () => {
    renderHarness(
      {
        override: {
          filters: <div>filter body</div>,
          filterLabels: { status: (v) => `Status: ${v}` },
        },
      },
      "f_status=Active"
    );
    expect(screen.getByText("Status: Active")).toBeInTheDocument();
    expect(screen.queryByText("filter body")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // Active-filter count badge surfaces alongside the button label.
    const count = document.querySelector(
      '[data-adapttable-part="filters-count"]'
    );
    expect(count).toHaveTextContent("1");
  });

  it("closes the filters popover on an outside click with no backdrop scrim", () => {
    renderHarness({
      override: { filters: <div>filter body</div> },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // No full-screen scrim is rendered — the background stays interactive.
    expect(
      document.querySelector('[data-adapttable-part="filters-backdrop"]')
    ).toBeNull();
    // Clicking outside the anchor/popover closes it.
    fireEvent.click(document.body);
    expect(screen.queryByText("filter body")).toBeNull();
    // No drawer dialog in popover mode.
    expect(
      document.querySelector('[data-adapttable-part="filters-panel"]')
    ).toBeNull();
  });

  it("renders the FilterPanel drawer when filtersMode='drawer'", () => {
    renderHarness({
      override: { filters: <div>filter body</div>, filtersMode: "drawer" },
    });
    expect(screen.queryByText("filter body")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // Drawer mode renders the native <dialog> panel, not the popover.
    expect(
      document.querySelector('[data-adapttable-part="filters-panel"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="filters-popover"]')
    ).toBeNull();
  });
  it("wraps focus with shift+tab inside the drawer", () => {
    renderHarness({
      override: { filters: <div>filter body</div>, filtersMode: "drawer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    const close = document.querySelector(
      '[data-adapttable-part="filters-close"]'
    ) as HTMLElement;
    const done = document.querySelector(
      '[data-adapttable-part="filters-done"]'
    ) as HTMLElement;
    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(done);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(
      document.querySelector('[data-adapttable-part="filters-close"]') ??
        document.querySelector('[data-adapttable-part="filters-clear"]')
    );
  });

  it("runs column-menu bulk and per-column sort from a live table", () => {
    renderHarness({
      override: {
        enableColumnMenu: true,
        dir: "rtl",
        filters: [{ key: "name", type: "text", label: "Name" }],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide all" }));
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Name" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Sort ascending" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Name" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Sort descending" }));
    expect(document.querySelector('[aria-sort="descending"]')).not.toBeNull();
  });
  it("closes the column menu on outside click and Escape", () => {
    renderHarness({ override: { enableColumnMenu: true } });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(
      document.querySelector('[data-adapttable-part="column-menu-panel"]')
    ).not.toBeNull();
    fireEvent.mouseDown(document.body);
    expect(
      document.querySelector('[data-adapttable-part="column-menu-panel"]')
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      document.querySelector('[data-adapttable-part="column-menu-panel"]')
    ).toBeNull();
  });

  it("renders mobile cards when isMobile", () => {
    const { container } = renderHarness({ isMobile: true });
    expect(
      container.querySelector('[data-adapttable-part="cards"]')
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sort by/i })).toBeNull();
  });

  it("renders a column via the Cell render-prop", () => {
    renderHarness({
      override: {
        columns: [
          {
            key: "name",
            header: "Name",
            Cell: ({ row }) => <span>cell-{row.name}</span>,
          },
        ],
      },
    });
    expect(screen.getByText("cell-Alice")).toBeInTheDocument();
  });

  it("renders a Cell render-prop in mobile cards", () => {
    renderHarness({
      isMobile: true,
      override: {
        columns: [
          {
            key: "name",
            header: "Name",
            Cell: ({ row }) => <span>m-{row.name}</span>,
          },
        ],
      },
    });
    expect(screen.getByText("m-Alice")).toBeInTheDocument();
  });

  it("uses the column key as the mobile label for a non-string header", () => {
    renderHarness({
      isMobile: true,
      override: {
        columns: [
          { key: "name", header: <em>Name</em>, accessor: (r) => r.name },
        ],
      },
    });
    // The card label falls back to the key when the header isn't a string.
    expect(screen.getAllByText("name").length).toBeGreaterThan(0);
  });

  it("runs a row action without confirm immediately", () => {
    const onClick = vi.fn();
    renderHarness({
      override: { rowActions: [{ key: "e", label: "Edit", onClick }] },
    });
    fireEvent.click(screen.getAllByLabelText("Edit")[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("hides and disables row actions per row", () => {
    renderHarness({
      override: {
        rowActions: [
          {
            key: "h",
            label: "HiddenAct",
            onClick: vi.fn(),
            isHidden: () => true,
          },
          {
            key: "d",
            label: "DisabledAct",
            onClick: vi.fn(),
            isDisabled: () => true,
          },
        ],
      },
    });
    expect(screen.queryByLabelText("HiddenAct")).toBeNull();
    expect(screen.getAllByLabelText("DisabledAct")[0]!).toBeDisabled();
  });

  it("collapses row actions into a 3-dot menu when layout is menu", () => {
    const onEdit = vi.fn();
    renderHarness({
      override: {
        rowActions: [{ key: "e", label: "Edit", onClick: onEdit }],
        rowActionsLayout: "menu",
      },
    });
    const trigger = document.querySelector(
      '[data-adapttable-part="row-actions-trigger"]'
    );
    expect(trigger).toHaveAttribute("aria-label", "Row actions");
    expect(
      document.querySelector('[data-adapttable-part="row-actions-menu"]')
    ).not.toBeNull();
    fireEvent.click(trigger!);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    expect(onEdit).toHaveBeenCalledWith(ROWS[0]);
  });

  it("lets renderRowActions replace the actions cell", () => {
    const onEdit = vi.fn();
    renderHarness({
      override: {
        rowActions: [{ key: "e", label: "Edit", onClick: onEdit }],
        rowActionsLayout: "menu",
        renderRowActions: ({ row }) => (
          <button
            type="button"
            aria-label="custom-e"
            onClick={() => onEdit(row)}
          >
            Custom
          </button>
        ),
      },
    });
    expect(
      document.querySelector('[data-adapttable-part="row-actions-trigger"]')
    ).toBeNull();
    fireEvent.click(screen.getAllByLabelText("custom-e")[0]!);
    expect(onEdit).toHaveBeenCalledWith(ROWS[0]);
  });

  it("merges extraChips with label chips", () => {
    renderHarness(
      {
        override: {
          filterLabels: { status: (v) => `Status: ${v}` },
          extraChips: [{ key: "x", label: "Custom", onRemove: vi.fn() }],
        },
      },
      "f_status=Active"
    );
    expect(screen.getByText("Status: Active")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("applies per-part classNames and dir", () => {
    const { container } = renderHarness({
      override: {
        dir: "rtl",
        classNames: { root: "my-root", table: "my-table" },
      },
    });
    const root = container.querySelector('[data-adapttable-part="root"]');
    expect(root).toHaveClass("my-root");
    expect(root).toHaveAttribute("dir", "rtl");
    expect(container.querySelector("table")).toHaveClass("my-table");
  });

  it("shows the rows-per-page select in infinite mode", () => {
    renderHarness({ mode: "infinite" });
    expect(screen.getAllByLabelText("Rows per page").length).toBeGreaterThan(0);
  });

  it("loads more rows via the Load more button in infinite mode", () => {
    renderHarness({ mode: "infinite" }, "limit=1");
    expect(screen.queryByText("Bob")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("auto-loads the next page when the sentinel scrolls into view", () => {
    let trigger: (() => void) | undefined;
    const original = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = vi.fn().mockImplementation(function (
      cb: IntersectionObserverCallback
    ) {
      return {
        observe: () => {
          trigger = () =>
            cb(
              [{ isIntersecting: true } as IntersectionObserverEntry],
              {} as IntersectionObserver
            );
        },
        disconnect: () => undefined,
        unobserve: () => undefined,
      };
    });
    try {
      renderHarness({ mode: "infinite" }, "limit=1");
      expect(screen.queryByText("Bob")).toBeNull();
      act(() => trigger?.());
      expect(screen.getByText("Bob")).toBeInTheDocument();
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });
});

describe("the noResults slot (unstyled)", () => {
  it("uses noResults for the filtered state and empty for no data", () => {
    renderHarness(
      {
        rows: [],
        override: {
          slots: {
            empty: <p>nothing here</p>,
            noResults: <p>nothing matched</p>,
          },
        },
      },
      "q=zzz"
    );
    expect(screen.getByText("nothing matched")).toBeInTheDocument();
    expect(screen.queryByText("nothing here")).toBeNull();
  });

  it("still lets a lone empty slot cover both states", () => {
    renderHarness(
      { rows: [], override: { slots: { empty: <p>nothing here</p> } } },
      "q=zzz"
    );
    expect(screen.getByText("nothing here")).toBeInTheDocument();
  });

  it("keeps the clear-filters action when no slot is given", () => {
    renderHarness({ rows: [] }, "q=zzz");
    expect(
      screen.getByRole("button", { name: "Clear all" })
    ).toBeInTheDocument();
  });
});

describe("custom header and footer", () => {
  it("renders a custom caption, tooltip, actions and table footer", () => {
    renderHarness({
      override: {
        columns: [
          {
            key: "name",
            header: "Name",
            accessor: (r) => r.name,
            sortable: true,
            headerTooltip: "Legal name",
            headerActions: <button type="button">info</button>,
            renderHeader: ({ controller }) => {
              const { label } = controller;
              if (typeof label !== "string") {
                throw new Error("expected a string header caption");
              }
              return `*${label}*`;
            },
            renderFooter: () => "Name foot",
          },
          { key: "city", header: "City", accessor: (r) => r.city },
        ],
        tableFooter: <p>Under the table</p>,
      },
    });
    expect(screen.getByText("*Name*")).toBeInTheDocument();
    expect(screen.getByTitle("Legal name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "info" })).toBeInTheDocument();
    expect(screen.getByText("Name foot")).toBeInTheDocument();
    expect(screen.getByText("Under the table")).toBeInTheDocument();
  });
});

describe("header filter trigger", () => {
  it("puts a filter icon on the column header instead of a second row", () => {
    renderHarness({
      override: {
        headerFilters: true,
        filters: [{ key: "name", type: "text", label: "Name" }],
      },
    });
    expect(screen.queryByRole("row", { name: "Column filters" })).toBeNull();
    const trigger = document.querySelector(
      '[data-adapttable-part="filter-header-trigger"]'
    );
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!.querySelector("summary") ?? trigger!);
    const input = document.querySelector(
      '[data-adapttable-part="filter-input"]'
    );
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { value: "Ali" } });
    expect(input).toHaveValue("Ali");
  });

  it("opens the same AutoFilterForm field for every built-in widget", () => {
    const option = { value: "a", label: "A" };
    const extraColumns: ColumnDef<Row>[] = [
      { key: "city", header: "City", accessor: (r) => r.city },
      { key: "tags", header: "Tags", accessor: () => "a" },
      { key: "skills", header: "Skills", accessor: () => "a" },
      { key: "core", header: "Core", accessor: () => true },
      { key: "budget", header: "Budget", accessor: () => 100 },
      { key: "hired", header: "Hired", accessor: () => "2026-01-01" },
    ];
    renderHarness({
      override: {
        headerFilters: true,
        columns: [
          { key: "name", header: "Name", accessor: (r) => r.name },
          ...extraColumns,
        ],
        filters: [
          { key: "name", type: "text", label: "Name" },
          {
            key: "city",
            type: "select",
            label: "City",
            options: [{ value: "Dubai", label: "Dubai" }],
          },
          {
            key: "tags",
            type: "multiSelect",
            label: "Tags",
            options: [option],
          },
          {
            key: "skills",
            type: "checklist",
            label: "Skills",
            options: [option],
          },
          { key: "core", type: "boolean", label: "Core" },
          { key: "budget", type: "numberRange", label: "Budget" },
          { key: "hired", type: "dateRange", label: "Hired" },
        ],
      },
    });
    const expectedPart: Record<string, string> = {
      name: "filter-operator",
      city: "filter-select",
      tags: "filter-checkbox-group",
      skills: "filter-checklist-search",
      core: "filter-select",
      budget: "filter-operator",
      hired: "filter-operator",
    };
    for (const key of Object.keys(expectedPart)) {
      const header = document.querySelector(`thead [data-column-key="${key}"]`);
      expect(header, key).not.toBeNull();
      const trigger = header!.querySelector(
        '[data-adapttable-part="filter-header-trigger"]'
      );
      expect(trigger, key).not.toBeNull();
      fireEvent.click(trigger!.querySelector("summary") ?? trigger!);
      const panel = trigger!.querySelector(
        '[data-adapttable-part="filter-header-cell"]'
      );
      expect(
        panel!.querySelector(`[data-adapttable-part="${expectedPart[key]}"]`),
        key
      ).not.toBeNull();
      expect(
        panel!.querySelector('[data-adapttable-part="filter-header-input"]'),
        key
      ).toBeNull();
    }
  });

  it("stays open after picking a text operator so the value can still be typed", () => {
    renderHarness({
      override: {
        headerFilters: true,
        filters: [{ key: "name", type: "text", label: "Name" }],
      },
    });
    const trigger = document.querySelector(
      '[data-adapttable-part="filter-header-trigger"]'
    );
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!.querySelector("summary") ?? trigger!);
    const operator = document.querySelector(
      '[data-adapttable-part="filter-operator"]'
    );
    expect(operator).not.toBeNull();
    fireEvent.change(operator!, { target: { value: "eq" } });
    expect(trigger).toHaveAttribute("open");
    expect(
      document.querySelector('[data-adapttable-part="filter-input"]')
    ).not.toBeNull();
  });

  it("hides the header filter trigger on mobile cards", () => {
    renderHarness({
      isMobile: true,
      override: {
        headerFilters: true,
        filters: [{ key: "name", type: "text", label: "Name" }],
      },
    });
    expect(
      document.querySelector('[data-adapttable-part="filter-header-trigger"]')
    ).toBeNull();
  });
});

describe("sparkline column", () => {
  it("renders an accessible chart from the optional entry", () => {
    renderHarness({
      override: {
        columns: [
          sparklineColumn({
            key: "trend",
            header: "Trend",
            values: () => [1, 4, 2],
            kind: "bar",
          }),
          { key: "name", header: "Name", accessor: (r) => r.name },
        ],
      },
    });
    expect(
      screen.getAllByRole("img", { name: "3 values, min 1, max 4, last 2" })
        .length
    ).toBeGreaterThan(0);
  });
});
