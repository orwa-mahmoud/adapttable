import {
  createMemoryAdapter,
  type TableSource,
  useColumnLayoutUrlState,
  useFrontendData,
} from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
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

interface HarnessProps {
  rows?: readonly Row[];
  mode?: "paged" | "infinite";
  initialUrl?: string;
  error?: Error | null;
  refetch?: () => void;
  isLoading?: boolean;
  isMobile?: boolean;
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}

function Harness(props: HarnessProps) {
  const source = useFrontendData<Row>({
    data: props.rows ?? ROWS,
    adapter: harnessAdapter,
    columns,
    paginationMode: props.mode ?? "paged",
    error: props.error ?? null,
    refetch: props.refetch,
    isLoading: props.isLoading,
  });
  return (
    <DataTable<Row>
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      isMobile={props.isMobile}
      {...props.override}
    />
  );
}

let harnessAdapter: ReturnType<typeof createMemoryAdapter>;

function renderHarness(props: HarnessProps = {}) {
  harnessAdapter = createMemoryAdapter(props.initialUrl ?? "");
  return render(
    <MantineProvider>
      <Harness {...props} />
    </MantineProvider>
  );
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> (Mantine)", () => {
  it("empty + active search renders noResults with a working clear CTA", () => {
    const onClearFilters = vi.fn();
    renderHarness({ initialUrl: "q=zzz", override: { onClearFilters } });
    expect(
      screen.getByText("No results match your filters")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("a truly empty source renders noData without a clear button", () => {
    renderHarness({ rows: [] });
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear all" })
    ).not.toBeInTheDocument();
  });

  it("shows the thin refresh bar during a background refetch only", () => {
    const refreshingSource = {
      rows: ROWS,
      total: 2,
      page: 1,
      limit: 8,
      search: "",
      sortBy: undefined,
      sortDir: undefined,
      groupBy: undefined,
      extra: {},
      isLoading: false,
      isFetching: true,
      isFetchingNextPage: false,
      hasNextPage: false,
      error: null,
      paginationMode: "paged" as const,
      setPage: () => undefined,
      setLimit: () => undefined,
      setSort: () => undefined,
      setGroupBy: () => undefined,
      sortLevels: [],
      toggleSortLevel: () => undefined,
      setSearch: () => undefined,
      setExtra: () => undefined,
      setExtras: () => undefined,
      clearExtras: () => undefined,
      clearAll: () => undefined,
      fetchNextPage: () => undefined,
      refetch: () => undefined,
    };
    const { container, rerender } = render(
      <MantineProvider>
        <DataTable<Row>
          source={refreshingSource}
          columns={columns}
          rowKey={(r) => r.id}
        />
      </MantineProvider>
    );
    // Non-blocking: the rows stay on screen while the bar shows.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Loading…"]')).not.toBeNull();
    rerender(
      <MantineProvider>
        <DataTable<Row>
          source={{ ...refreshingSource, isFetching: false }}
          columns={columns}
          rowKey={(r) => r.id}
        />
      </MantineProvider>
    );
    expect(container.querySelector('[aria-label="Loading…"]')).toBeNull();
  });

  it("rowClassName lands on desktop rows and mobile cards", () => {
    const rowClassName = (r: Row) => (r.id === "a" ? "row-a" : undefined);
    const desktop = renderHarness({ override: { rowClassName } });
    const aliceRow = screen.getByText("Alice").closest("tr")!;
    expect(aliceRow.className).toContain("row-a");
    expect(screen.getByText("Bob").closest("tr")!.className).not.toContain(
      "row-a"
    );
    desktop.unmount();
    const mobile = renderHarness({
      isMobile: true,
      override: { rowClassName },
    });
    expect(mobile.container.querySelector(".row-a")).not.toBeNull();
  });

  it("drawer mode: the toolbar button opens the slide-in filter drawer", async () => {
    renderHarness({
      override: { filters: <div>drawer body</div>, filtersMode: "drawer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(await screen.findByText("drawer body")).toBeInTheDocument();
  });

  it("drawer mode: the Done button closes the drawer again", async () => {
    renderHarness({
      override: { filters: <div>drawer body</div>, filtersMode: "drawer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(await screen.findByText("drawer body")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByText("drawer body")).toBeNull());
  });

  it("popover mode: Escape closes and clear-all fires the handler", async () => {
    const onClearFilters = vi.fn();
    renderHarness({
      initialUrl: "f_status=Active",
      override: {
        filters: <div>popover body</div>,
        filterLabels: { status: (v) => `Status: ${v}` },
        onClearFilters,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(await screen.findByText("popover body")).toBeInTheDocument();
    // The dropdown stays visibility-hidden in jsdom (Floating UI never
    // positions it), so query by selector — the established pattern for
    // Mantine dropdowns in this suite.
    const dropdown = screen
      .getByText("popover body")
      .closest(".mantine-Popover-dropdown")!;
    const popoverClear = [...dropdown.querySelectorAll("button")].find(
      (b) => b.textContent === "Clear all"
    )!;
    fireEvent.click(popoverClear);
    expect(onClearFilters).toHaveBeenCalled();
    fireEvent.keyDown(screen.getByText("popover body"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("popover body")).toBeNull());
  });

  it("flips the filter popover to the start side under RTL", async () => {
    renderHarness({
      override: { dir: "rtl", filters: <div>rtl body</div> },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(await screen.findByText("rtl body")).toBeInTheDocument();
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

  it("renders a row per source entry with column values", () => {
    renderHarness();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Dubai")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("loads more rows via the Load more button in infinite mode", () => {
    renderHarness({ mode: "infinite", initialUrl: "limit=1" });
    expect(screen.queryByText("Bob")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    renderHarness({ rows: [] });
    expect(screen.getByText("No data")).toBeInTheDocument();
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
      renderHarness({ mode: "infinite", initialUrl: "limit=1" });
      expect(screen.queryByText("Bob")).toBeNull();
      act(() => trigger?.());
      expect(screen.getByText("Bob")).toBeInTheDocument();
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });

  it("shows the loading skeleton on first load", () => {
    const { container } = renderHarness({ rows: [], isLoading: true });
    expect(
      container.querySelector('[class*="mantine-Skeleton"]')
    ).toBeInTheDocument();
  });

  it("surfaces an error and retries via the source", () => {
    const refetch = vi.fn();
    renderHarness({ error: new Error("boom"), refetch });
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("omits the retry button when the source has no refetch", () => {
    renderHarness({ error: new Error("boom") });
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("commits the debounced search to the URL state", () => {
    renderHarness();
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "ali" } });
    act(() => vi.advanceTimersByTime(300));
    expect(harnessAdapter.getSearch()).toContain("q=ali");
  });

  it("cycles sort on header click", () => {
    renderHarness();
    const header = screen.getByRole("button", { name: /sort by: name/i });
    fireEvent.click(header);
    expect(harnessAdapter.getSearch()).toContain("sortDir=asc");
    fireEvent.click(header);
    expect(harnessAdapter.getSearch()).toContain("sortDir=desc");
  });

  it("renders the pagination footer in paged mode", () => {
    renderHarness({ override: { labels: { rowsPerPage: "Per page" } } });
    expect(screen.getByText("Per page")).toBeInTheDocument();
  });

  it("renders selection + a bulk action and runs it after confirm", async () => {
    const onClick = vi.fn();
    const confirm = vi.fn((req: { onConfirm: () => void }) => req.onConfirm());
    renderHarness({
      override: {
        bulkActions: [
          {
            key: "del",
            label: "Delete",
            onClick,
            confirm: {
              title: "Sure?",
              message: (n) => `Delete ${n}?`,
              confirmLabel: "Yes",
              danger: true,
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
    expect(confirm).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: false,
      total: 2,
    });
  });

  it("renders filter chips from filterLabels and clears one", () => {
    renderHarness({
      initialUrl: "f_status=Active",
      override: { filterLabels: { status: (v) => `Status: ${v}` } },
    });
    expect(screen.getByText("Status: Active")).toBeInTheDocument();
  });

  describe("all-matching scope banner", () => {
    const MANY_ROWS: Row[] = [
      { id: "r1", name: "Alice", city: "Dubai" },
      { id: "r2", name: "Bob", city: "Riyadh" },
      { id: "r3", name: "Cara", city: "Doha" },
      { id: "r4", name: "Dina", city: "Muscat" },
    ];
    const archive = { key: "arch", label: "Archive", onClick: vi.fn() };

    it("never renders when the page already holds every matching row", () => {
      renderHarness({ override: { bulkActions: [archive] } });
      fireEvent.click(screen.getByLabelText("Select all"));
      expect(screen.getByText("2 selected")).toBeInTheDocument();
      expect(screen.queryByRole("status")).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Select all 2 matching" })
      ).toBeNull();
    });

    it("offers the wider scope and flips to all-matching on click", () => {
      renderHarness({
        rows: MANY_ROWS,
        initialUrl: "limit=2",
        override: { bulkActions: [archive] },
      });
      fireEvent.click(screen.getByLabelText("Select all"));
      const banner = screen.getByRole("status");
      expect(
        within(banner).getByText("All 2 on this page selected")
      ).toBeInTheDocument();
      fireEvent.click(
        within(banner).getByRole("button", { name: "Select all 4 matching" })
      );
      // The banner swaps to the active-scope message + a clear affordance.
      const active = screen.getByRole("status");
      expect(
        within(active).getByText("All 4 matching selected")
      ).toBeInTheDocument();
      expect(
        within(active).getByRole("button", { name: "Clear all" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Select all 4 matching" })
      ).toBeNull();
    });

    it("confirm message and onClick context size by the TOTAL in all-matching scope", async () => {
      const onClick = vi.fn();
      const confirm = vi.fn((req: { onConfirm: () => void }) =>
        req.onConfirm()
      );
      renderHarness({
        rows: MANY_ROWS,
        initialUrl: "limit=2",
        override: {
          bulkActions: [
            {
              key: "del",
              label: "Delete",
              onClick,
              confirm: {
                title: "Sure?",
                message: (n) => `Delete ${n}?`,
                confirmLabel: "Yes",
                danger: true,
              },
            },
          ],
          confirm,
        },
      });
      fireEvent.click(screen.getByLabelText("Select all"));
      fireEvent.click(
        screen.getByRole("button", { name: "Select all 4 matching" })
      );
      await act(async () => {
        fireEvent.click(screen.getByText("Delete"));
        await Promise.resolve();
      });
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Delete 4?" })
      );
      expect(onClick).toHaveBeenCalledWith(["r1", "r2"], {
        allMatching: true,
        total: 4,
      });
    });

    it("a single row toggle narrows the scope back to the offer state", () => {
      renderHarness({
        rows: MANY_ROWS,
        initialUrl: "limit=2",
        override: { bulkActions: [archive] },
      });
      fireEvent.click(screen.getByLabelText("Select all"));
      fireEvent.click(
        screen.getByRole("button", { name: "Select all 4 matching" })
      );
      expect(screen.getByText("All 4 matching selected")).toBeInTheDocument();
      // Deselect one row: the page is no longer fully selected, so the
      // banner disappears AND the scope narrows back to concrete ids.
      fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.queryByText("All 4 matching selected")).toBeNull();
      // Re-selecting the row restores a fully-selected page — the banner
      // returns in the OFFER state, proving allMatching did not survive.
      fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
      const banner = screen.getByRole("status");
      expect(
        within(banner).getByText("All 2 on this page selected")
      ).toBeInTheDocument();
      expect(
        within(banner).getByRole("button", { name: "Select all 4 matching" })
      ).toBeInTheDocument();
    });
  });

  it("opens the filter drawer", async () => {
    renderHarness({
      override: { filters: <div>filter content</div> },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await waitFor(() =>
      expect(screen.getByText("filter content")).toBeInTheDocument()
    );
  });

  it("renders mobile cards when isMobile", () => {
    renderHarness({ isMobile: true });
    // Cards render the value with an uppercase label; the row data is present
    // and there is no column-header button.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sort by/i })).toBeNull();
  });

  it("tags rows with data-stagger so custom animation (e.g. GSAP) can target them", () => {
    const { container } = renderHarness();
    // The documented contract: every row carries [data-stagger], regardless
    // of the built-in `animate` flag, so a GSAP/Framer timeline can drive it.
    expect(container.querySelectorAll("[data-stagger]")).toHaveLength(2);
  });

  it("runs a row action immediately when there is no confirm", () => {
    const onClick = vi.fn();
    renderHarness({
      override: {
        rowActions: [{ key: "edit", label: "Edit", onClick }],
      },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("respects a slots.empty override", () => {
    renderHarness({
      rows: [],
      override: { slots: { empty: <div>nothing custom</div> } },
    });
    expect(screen.getByText("nothing custom")).toBeInTheDocument();
  });

  it("accepts a source prop typed as TableSource (type smoke test)", () => {
    const noop: TableSource<Row> = {
      rows: [],
      total: 0,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: () => undefined,
      error: null,
      paginationMode: "paged",
      page: 1,
      limit: 25,
      search: "",
      sortBy: undefined,
      sortDir: undefined,
      groupBy: undefined,
      extra: {},
      setPage: () => undefined,
      setLimit: () => undefined,
      setSort: () => undefined,
      setGroupBy: () => undefined,
      sortLevels: [],
      toggleSortLevel: () => undefined,
      setSearch: () => undefined,
      setExtra: () => undefined,
      setExtras: () => undefined,
      clearExtras: () => undefined,
      clearAll: () => undefined,
    };
    const tree: ReactNode = (
      <MantineProvider>
        <DataTable source={noop} columns={columns} rowKey={(r) => r.id} />
      </MantineProvider>
    );
    render(tree);
    expect(screen.getByText("No data")).toBeInTheDocument();
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
    expect(screen.getAllByText("name").length).toBeGreaterThan(0);
  });

  // Sticky header is opt-in (default off). When enabled it must pin via the
  // header *cells*, not the `<thead>` (which does not stick against the
  // document scroller), and must NOT live in an `overflow` wrapper that would
  // trap sticky and let the header overlap the first row.
  it("does not stick the header cells by default (opt-in)", () => {
    renderHarness();
    const th = screen.getByText("Name").closest("th");
    expect(th).not.toBeNull();
    expect(th).not.toHaveStyle({ position: "sticky" });
  });

  it("sticks the header cells when stickyHeader is enabled", () => {
    renderHarness({ override: { stickyHeader: true } });
    const th = screen.getByText("Name").closest("th");
    expect(th).toHaveStyle({ position: "sticky" });
    // the table must not sit inside a horizontal-overflow scroll container
    expect(th!.closest("[style*='overflow']")).toBeNull();
    // Chromium cannot stick a th inside a border-collapsed table, so the
    // sticky header must switch the table to separate borders.
    expect(th!.closest("table")).toHaveStyle({
      borderCollapse: "separate",
    });
  });

  // With no `maxHeight` and nothing pinned, the wrapper turns into a
  // horizontal scroller ONLY while the table is measurably wider than it
  // (otherwise wide tables bleed over the card border). When the table fits
  // it must stay a non-scroll container so sticky headers keep working.
  it("adds overflow-x only while the table is wider than its wrapper", () => {
    type ResizeCallback = (
      entries: ResizeObserverEntry[],
      observer: ResizeObserver
    ) => void;
    const callbacks: ResizeCallback[] = [];
    class FakeResizeObserver {
      constructor(cb: ResizeCallback) {
        callbacks.push(cb);
      }
      observe() {
        // measurement is driven manually via `fire` below
      }
      unobserve() {
        // not used by the hook
      }
      disconnect() {
        // not used by this test
      }
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const fire = () => {
      const observer = new FakeResizeObserver(() => undefined);
      for (const cb of [...callbacks]) cb([], observer);
    };
    try {
      renderHarness();
      const wrapper = screen.getByText("Name").closest("table")!.parentElement!;
      // jsdom measures 0x0 at mount -> the table fits -> NOT a scroll box.
      expect(wrapper.style.overflowX).toBe("");
      Object.defineProperty(wrapper, "scrollWidth", {
        value: 900,
        configurable: true,
      });
      Object.defineProperty(wrapper, "clientWidth", {
        value: 600,
        configurable: true,
      });
      act(() => fire());
      expect(wrapper).toHaveStyle({ overflowX: "auto" });
      // ... and it relinquishes the scroll container once the table fits.
      Object.defineProperty(wrapper, "scrollWidth", {
        value: 600,
        configurable: true,
      });
      act(() => fire());
      expect(wrapper.style.overflowX).toBe("");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("re-binds a page-sticky header to the box top once the table overflows", () => {
    type ResizeCallback = (
      entries: ResizeObserverEntry[],
      observer: ResizeObserver
    ) => void;
    const callbacks: ResizeCallback[] = [];
    class FakeResizeObserver {
      constructor(cb: ResizeCallback) {
        callbacks.push(cb);
      }
      observe() {
        // measurement is driven manually via `fire` below
      }
      unobserve() {
        // not used by the hook
      }
      disconnect() {
        // not used by this test
      }
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const fire = () => {
      const observer = new FakeResizeObserver(() => undefined);
      for (const cb of [...callbacks]) cb([], observer);
    };
    try {
      renderHarness({ override: { stickyHeader: true, stickyTop: 120 } });
      const th = screen.getByText("Name").closest("th")!;
      const wrapper = th.closest("table")!.parentElement!;
      // Fitting table: the viewport offset applies (resolved >= stickyTop).
      expect(Number.parseInt(th.style.top, 10)).toBeGreaterThanOrEqual(120);
      Object.defineProperty(wrapper, "scrollWidth", {
        value: 900,
        configurable: true,
      });
      Object.defineProperty(wrapper, "clientWidth", {
        value: 600,
        configurable: true,
      });
      act(() => fire());
      // Now the wrapper IS the scroll container: the header must pin to its
      // top — keeping the viewport offset would shove it down into the rows.
      expect(th).toHaveStyle({ top: "0" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders the Columns menu trigger when enableColumnMenu is set", () => {
    renderHarness({ override: { enableColumnMenu: true } });
    expect(screen.getByRole("button", { name: "Columns" })).toBeInTheDocument();
  });

  // Row density is independent of pinning: it only re-maps the Mantine
  // `<Table>` spacing. Mantine emits the chosen spacing as the
  // `--table-vertical-spacing` / `--table-horizontal-spacing` CSS vars on the
  // table element, so we assert on those.
  it("uses comfortable spacing (sm / md) by default", () => {
    renderHarness();
    const table = screen.getByText("Name").closest("table")!;
    expect(table.style.getPropertyValue("--table-vertical-spacing")).toBe(
      "var(--mantine-spacing-sm)"
    );
    expect(table.style.getPropertyValue("--table-horizontal-spacing")).toBe(
      "var(--mantine-spacing-md)"
    );
  });

  it("tightens rows when density is compact", () => {
    renderHarness({ override: { density: "compact" } });
    const table = screen.getByText("Name").closest("table")!;
    // 4 -> rem(4) === "0.25rem" (scaled); horizontal drops from md to sm.
    expect(table.style.getPropertyValue("--table-vertical-spacing")).toContain(
      "0.25rem"
    );
    expect(table.style.getPropertyValue("--table-horizontal-spacing")).toBe(
      "var(--mantine-spacing-sm)"
    );
    // Compact must not equal the comfortable vertical rhythm.
    expect(table.style.getPropertyValue("--table-vertical-spacing")).not.toBe(
      "var(--mantine-spacing-sm)"
    );
  });

  it("applies compact density to mobile cards too", () => {
    const { container } = renderHarness({
      isMobile: true,
      override: { density: "compact" },
    });
    // Compact cards use the tighter `sm` Card padding instead of `md`.
    const card = container.querySelector('[class*="mantine-Card-root"]');
    expect(card).not.toBeNull();
    expect(card!.getAttribute("style") ?? "").toContain(
      "var(--mantine-spacing-sm)"
    );
  });

  it("hides a column via a controlled columnLayout", () => {
    renderHarness({
      override: {
        columnLayout: { hidden: ["city"], order: [], pinned: {}, widths: {} },
      },
    });
    // The header and its values are dropped when the column is hidden.
    expect(screen.queryByText("City")).toBeNull();
    expect(screen.queryByText("Dubai")).toBeNull();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});

describe("actions column in the column layout", () => {
  const EDIT_ACTION = [
    { key: "edit", label: "Edit", onClick: () => undefined },
  ];
  const menuToggle = (label: string) =>
    document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;

  it("pins the actions column on its own — no data column pinned", () => {
    renderHarness({
      override: {
        rowActions: EDIT_ACTION,
        defaultColumnLayout: { pinned: { actions: "end" } },
      },
    });
    // Header and body cells both turn sticky at the inline end…
    const th = screen.getByText("Actions").closest("th")!;
    expect(th.style.position).toBe("sticky");
    expect(th.style.insetInlineEnd).toBe("0px");
    const td = screen
      .getAllByRole("button", { name: "Edit" })[0]!
      .closest("td")!;
    expect(td.style.position).toBe("sticky");
    expect(td.style.insetInlineEnd).toBe("0px");
    // …while every data column stays in normal flow.
    expect(screen.getByText("Name").closest("th")!.style.position).not.toBe(
      "sticky"
    );
    expect(screen.getByText("City").closest("th")!.style.position).not.toBe(
      "sticky"
    );
  });

  it("hiding the actions column drops the column and its pin lead", () => {
    // With the actions column visible, a right-pinned data column starts
    // past the 120px actions lead…
    const visible = renderHarness({
      override: {
        rowActions: EDIT_ACTION,
        defaultColumnLayout: { pinned: { city: "end" } },
      },
    });
    expect(screen.getByText("City").closest("th")!.style.insetInlineEnd).toBe(
      "120px"
    );
    visible.unmount();

    // …hiding it removes the column, its buttons AND the lead together.
    renderHarness({
      override: {
        rowActions: EDIT_ACTION,
        defaultColumnLayout: {
          hidden: ["actions"],
          pinned: { city: "end" },
        },
      },
    });
    expect(screen.queryByText("Actions")).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    const cityTh = screen.getByText("City").closest("th")!;
    expect(cityTh.style.position).toBe("sticky");
    expect(cityTh.style.insetInlineEnd).toBe("0px");
  });

  it("manages the actions column from the Columns menu", async () => {
    renderHarness({
      override: { enableColumnMenu: true, rowActions: EDIT_ACTION },
    });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    const table = () => screen.getByRole("table");

    // ONE click pins: the actions th turns sticky with no data column pinned.
    fireEvent.click(menuToggle("Pin to end: Actions"));
    const th = within(table()).getByText("Actions").closest("th")!;
    expect(th.style.position).toBe("sticky");
    expect(th.style.insetInlineEnd).toBe("0px");

    // The eye hides the whole column; the menu keeps the row to re-show it.
    fireEvent.click(menuToggle("Hide column: Actions"));
    expect(within(table()).queryByText("Actions")).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    fireEvent.click(menuToggle("Show column: Actions"));
    // Re-shown AND still pinned from the earlier single click.
    const restored = within(table()).getByText("Actions").closest("th")!;
    expect(restored.style.position).toBe("sticky");
  });

  it("round-trips the actions pin through the URL layout state", async () => {
    const adapter = createMemoryAdapter("");
    function UrlHarness() {
      const { layout, onLayoutChange } = useColumnLayoutUrlState({ adapter });
      const source = useFrontendData<Row>({ data: ROWS, adapter, columns });
      return (
        <DataTable<Row>
          source={source}
          columns={columns}
          rowKey={(r) => r.id}
          rowActions={EDIT_ACTION}
          enableColumnMenu
          columnLayout={layout}
          onColumnLayoutChange={onLayoutChange}
        />
      );
    }
    const first = render(
      <MantineProvider>
        <UrlHarness />
      </MantineProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.click(menuToggle("Pin to end: Actions"));
    // The hook debounces the URL write — flush it, then the layout has
    // serialized the reserved "actions" key like any column key.
    act(() => vi.advanceTimersByTime(200));
    expect(decodeURIComponent(adapter.getSearch())).toContain(
      "colPin=actions:end"
    );
    first.unmount();

    // A fresh mount restores the pin from the URL alone.
    render(
      <MantineProvider>
        <UrlHarness />
      </MantineProvider>
    );
    const th = within(screen.getByRole("table"))
      .getByText("Actions")
      .closest("th")!;
    expect(th.style.position).toBe("sticky");
    expect(th.style.insetInlineEnd).toBe("0px");
  });
});
