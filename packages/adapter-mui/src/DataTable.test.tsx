import type { ColumnLayoutState } from "@adapttable/core";
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { createTheme, ThemeProvider } from "@mui/material";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
const theme = createTheme();

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
      isMobile={props.isMobile}
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

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> (MUI)", () => {
  it("drawer mode opens the slide-in filter drawer", async () => {
    renderHarness({
      override: { filters: <div>drawer body</div>, filtersMode: "drawer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(await screen.findByText("drawer body")).toBeInTheDocument();
  });

  it("flips the filter popover to the start side under RTL", async () => {
    renderHarness({
      override: { dir: "rtl", filters: <div>rtl body</div> },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(await screen.findByText("rtl body")).toBeInTheDocument();
  });

  it("kitchen sink: sticky header in a scroll box with pins, selection, resize, compact density", () => {
    const { container } = renderHarness({
      override: {
        stickyHeader: true,
        maxHeight: 300,
        density: "compact",
        resizableColumns: true,
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
        columns: [
          {
            key: "name",
            header: "Name",
            accessor: (r) => r.name,
            width: 200,
          },
          { key: "city", header: "City", accessor: (r) => r.city },
        ],
        defaultColumnLayout: {
          pinned: { name: "start", city: "end" },
        },
      },
    });
    // Inside the scroll box the header pins to the box's own top (0).
    // (MUI applies `sx` via emotion classes, so read computed styles.)
    const nameHeader = screen.getByText("Name").closest("th")!;
    expect(getComputedStyle(nameHeader).top).toBe("0px");
    expect(getComputedStyle(nameHeader).position).toBe("sticky");
    const cityHeader = screen.getByText("City").closest("th")!;
    expect(getComputedStyle(cityHeader).position).toBe("sticky");
    // The scroll box bounds the table.
    expect(container.querySelector("table")!.closest("div")!).toBeTruthy();
    // Compact density maps to MUI's small size; Table forwards it to the
    // cells via context, so the size class lands on each TableCell.
    expect(nameHeader).toHaveClass("MuiTableCell-sizeSmall");
  });

  it("pinning without maxHeight still gets a horizontal scroll box", () => {
    const { container } = renderHarness({
      override: {
        defaultColumnLayout: { pinned: { name: "start" } },
      },
    });
    const table = container.querySelector("table")!;
    const wrapper = table.parentElement!;
    expect(wrapper.className).toContain("MuiBox-root");
  });

  it("compact density tightens the mobile cards", () => {
    const { container } = renderHarness({
      override: { isMobile: true, density: "compact" },
    });
    expect(container.querySelector('[role="list"]')).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
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

  it("renders rows with values", () => {
    renderHarness();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Riyadh")).toBeInTheDocument();
  });

  it("renders the no-data empty state without a clear-filters button", () => {
    renderHarness({ rows: [] });
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("renders the no-results empty state with a clear-filters button", () => {
    const onClearFilters = vi.fn();
    // An active search that matches nothing → "noResults", not "noData".
    renderHarness({ override: { onClearFilters } }, "q=zzz");
    expect(
      screen.getByText("No results match your filters")
    ).toBeInTheDocument();
    expect(screen.queryByText("No data")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("shows a refresh strip and marks the region busy while refetching", () => {
    const { container } = renderHarness({ isFetching: true });
    // Background refresh (isFetching without isLoading): rows stay visible
    // under MUI's idiomatic LinearProgress strip, and the region is aria-busy.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(document.querySelector(".MuiLinearProgress-root")).not.toBeNull();
    expect(container.querySelector(".MuiPaper-root")).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("renders no refresh strip and no aria-busy when idle", () => {
    const { container } = renderHarness();
    expect(document.querySelector(".MuiLinearProgress-root")).toBeNull();
    expect(container.querySelector(".MuiPaper-root")).not.toHaveAttribute(
      "aria-busy"
    );
  });

  it("applies rowClassName to desktop rows, skipping undefined", () => {
    renderHarness({
      override: {
        rowClassName: (row) => (row.id === "a" ? "vip-row" : undefined),
      },
    });
    const aliceRow = screen.getByText("Alice").closest("tr")!;
    expect(aliceRow).toHaveClass("vip-row");
    // MUI's own classes survive the merge.
    expect(aliceRow).toHaveClass("MuiTableRow-root");
    expect(screen.getByText("Bob").closest("tr")).not.toHaveClass("vip-row");
  });

  it("applies rowClassName to mobile card roots, skipping undefined", () => {
    renderHarness({
      isMobile: true,
      override: {
        rowClassName: (_row, index) => (index === 1 ? "vip-card" : undefined),
      },
    });
    const cards = screen.getAllByRole("listitem");
    expect(cards[1]).toHaveClass("vip-card");
    expect(cards[1]).toHaveClass("MuiCard-root");
    expect(cards[0]).not.toHaveClass("vip-card");
  });

  it("renders loading skeletons", () => {
    renderHarness({ rows: [], isLoading: true });
    expect(screen.getByTestId("adapttable-loading")).toBeInTheDocument();
  });

  it("surfaces an error and retries", () => {
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

  it("commits debounced search to the URL", () => {
    renderHarness();
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "ali" },
    });
    act(() => vi.advanceTimersByTime(300));
    expect(adapter.getSearch()).toContain("q=ali");
  });

  it("cycles sort on a header label", () => {
    renderHarness();
    fireEvent.click(screen.getByText("Name"));
    expect(adapter.getSearch()).toContain("sortDir=asc");
    fireEvent.click(screen.getByText("Name"));
    expect(adapter.getSearch()).toContain("sortDir=desc");
  });

  it("paginates via the MUI pager", () => {
    renderHarness({}, "limit=1");
    fireEvent.click(screen.getByRole("button", { name: /go to page 2/i }));
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
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: false,
      total: 2,
    });
  });

  describe("select-all-matching banner", () => {
    const MANY: Row[] = [
      ...ROWS,
      { id: "c", name: "Cara", city: "Doha" },
      { id: "d", name: "Dina", city: "Muscat" },
    ];
    const bulkActions = [{ key: "x", label: "X", onClick: vi.fn() }];

    it("stays hidden when the page already holds every match", () => {
      renderHarness({ override: { bulkActions } });
      fireEvent.click(screen.getByLabelText("Select all"));
      expect(screen.getByText("2 selected")).toBeInTheDocument();
      expect(screen.queryByText(/on this page selected/)).toBeNull();
      expect(screen.queryByText(/matching/)).toBeNull();
    });

    it("flips from the offer to the active state and back to none via clear", () => {
      renderHarness({ rows: MANY, override: { bulkActions } }, "limit=2");
      fireEvent.click(screen.getByLabelText("Select all"));
      // Offer: full page selected, more rows match elsewhere.
      expect(
        screen.getByText("All 2 on this page selected")
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Select all 4 matching" })
      );
      // Active: scope widened to every matching row.
      expect(screen.getByText("All 4 matching selected")).toBeInTheDocument();
      expect(screen.queryByText("All 2 on this page selected")).toBeNull();
      // The banner's own clear button drops the whole selection.
      fireEvent.click(screen.getAllByRole("button", { name: "Clear all" })[0]!);
      expect(screen.queryByText(/selected/)).toBeNull();
    });

    it("confirms by the matching TOTAL and passes the all-matching context", async () => {
      const onClick = vi.fn();
      const confirm = vi.fn((r: { message: string; onConfirm: () => void }) =>
        r.onConfirm()
      );
      renderHarness(
        {
          rows: MANY,
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
        "limit=2"
      );
      fireEvent.click(screen.getByLabelText("Select all"));
      fireEvent.click(
        screen.getByRole("button", { name: "Select all 4 matching" })
      );
      await act(async () => {
        fireEvent.click(screen.getByText("Delete"));
        await Promise.resolve();
      });
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Delete 4" })
      );
      expect(onClick).toHaveBeenCalledWith(["a", "b"], {
        allMatching: true,
        total: 4,
      });
    });

    it("narrows back to the page scope on a single row toggle", () => {
      renderHarness({ rows: MANY, override: { bulkActions } }, "limit=2");
      fireEvent.click(screen.getByLabelText("Select all"));
      fireEvent.click(
        screen.getByRole("button", { name: "Select all 4 matching" })
      );
      expect(screen.getByText("All 4 matching selected")).toBeInTheDocument();
      fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
      expect(screen.queryByText("All 4 matching selected")).toBeNull();
      expect(screen.queryByText(/matching/)).toBeNull();
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });
  });

  it("renders filter chips and opens the filter popover", () => {
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
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
  });

  it("renders mobile cards when isMobile", () => {
    renderHarness({ isMobile: true });
    // Cards, not a <table>.
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("runs a row action without confirm immediately", () => {
    const onClick = vi.fn();
    renderHarness({
      override: { rowActions: [{ key: "e", label: "Edit", onClick }] },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
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
    expect(screen.queryByRole("button", { name: "HiddenAct" })).toBeNull();
    expect(
      screen.getAllByRole("button", { name: "DisabledAct" })[0]!
    ).toBeDisabled();
  });

  it("disables row actions with a disabledReason", () => {
    renderHarness({
      override: {
        rowActions: [
          {
            key: "delete",
            label: "Delete",
            onClick: vi.fn(),
            disabledReason: () => "Referenced elsewhere",
          },
        ],
      },
    });
    expect(
      screen.getAllByRole("button", { name: "Delete" })[0]!
    ).toBeDisabled();
  });

  it("keeps a row action enabled when disabledReason returns an empty string", () => {
    renderHarness({
      override: {
        rowActions: [
          {
            key: "delete",
            label: "Delete",
            onClick: vi.fn(),
            disabledReason: () => "",
          },
        ],
      },
    });
    expect(
      screen.getAllByRole("button", { name: "Delete" })[0]!
    ).not.toBeDisabled();
  });

  it("applies className and dir", () => {
    const { container } = renderHarness({
      override: { className: "my-root", dir: "rtl" },
    });
    const root = container.querySelector(".my-root");
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("dir", "rtl");
  });

  it("shows rows-per-page in infinite mode and a sort select with options", () => {
    renderHarness({
      mode: "infinite",
      override: { sortByOptions: [{ value: "name", label: "Name" }] },
    });
    expect(screen.getAllByLabelText(/rows per page/i).length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByLabelText(/sort by/i).length).toBeGreaterThan(0);
  });

  it("renders a slots.empty override", () => {
    renderHarness({
      rows: [],
      override: { slots: { empty: <div>nada</div> } },
    });
    expect(screen.getByText("nada")).toBeInTheDocument();
  });

  it("renders a slots.skeleton override while loading", () => {
    renderHarness({
      rows: [],
      isLoading: true,
      override: { slots: { skeleton: <div>loading-custom</div> } },
    });
    expect(screen.getByText("loading-custom")).toBeInTheDocument();
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

  it("mobile: selection + row actions work", () => {
    const onClick = vi.fn();
    renderHarness({
      isMobile: true,
      override: {
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        rowActions: [{ key: "e", label: "Edit", onClick }],
      },
    });
    const checks = screen.getAllByLabelText("Select row");
    expect(checks).toHaveLength(2);
    fireEvent.click(checks[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("bulk action with a disabledReason is disabled", () => {
    renderHarness({
      override: {
        bulkActions: [
          {
            key: "d",
            label: "Delete",
            onClick: vi.fn(),
            disabledReason: () => "no",
          },
        ],
      },
    });
    fireEvent.click(screen.getByLabelText("Select all"));
    expect(screen.getByText("Delete").closest("button")).toBeDisabled();
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
});

describe("actions column management (MUI)", () => {
  const edit = { key: "e", label: "Edit", onClick: vi.fn() };
  /** The actions header cell — "Actions" also names the open menu's row. */
  const actionsHeader = () =>
    screen
      .queryAllByText("Actions")
      .map((el) => el.closest("th"))
      .find((th) => th !== null);
  const openMenu = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
  };
  // The menu is a modal Popover that aria-hides the table behind it, so
  // close it before asserting on the table's accessibility tree.
  const closeMenu = async () => {
    fireEvent.click(document.querySelector(".MuiBackdrop-root")!);
    await vi.waitFor(() =>
      expect(screen.queryByText("Reset columns")).toBeNull()
    );
  };

  it("pins the actions column with ONE click — sticky with NO data pins", async () => {
    renderHarness({
      override: { enableColumnMenu: true, rowActions: [edit] },
    });
    // In normal flow before the pin: nothing anywhere is pinned.
    expect(getComputedStyle(actionsHeader()!).position).not.toBe("sticky");
    await openMenu();
    fireEvent.click(screen.getByLabelText("Pin to end: Actions"));
    await closeMenu();
    // One click → the header and every body actions cell stick to the inline
    // end on their own; no data column is pinned right.
    expect(getComputedStyle(actionsHeader()!).position).toBe("sticky");
    const cell = screen
      .getAllByRole("button", { name: "Edit" })[0]!
      .closest("td")!;
    expect(getComputedStyle(cell).position).toBe("sticky");
    // The pin control now offers the one-click reverse.
    await openMenu();
    fireEvent.click(screen.getByLabelText("Unpin: Actions"));
    await closeMenu();
    expect(getComputedStyle(actionsHeader()!).position).not.toBe("sticky");
  });

  it("hides and re-shows the actions column from the Columns menu", async () => {
    renderHarness({
      override: { enableColumnMenu: true, rowActions: [edit] },
    });
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    await openMenu();
    fireEvent.click(screen.getByLabelText("Hide column: Actions"));
    await closeMenu();
    // The header cell and every per-row action disappear together…
    expect(actionsHeader()).toBeUndefined();
    expect(screen.queryAllByRole("button", { name: "Edit" })).toHaveLength(0);
    // …while the menu keeps the entry, so one click brings it all back.
    await openMenu();
    fireEvent.click(screen.getByLabelText("Show column: Actions"));
    await closeMenu();
    expect(actionsHeader()).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
  });

  it("layout persistence round-trips the reserved actions key", async () => {
    // Phase 1: pin via the menu and capture the persisted layout state.
    let persisted: ColumnLayoutState | undefined;
    const first = renderHarness({
      override: {
        enableColumnMenu: true,
        rowActions: [edit],
        onColumnLayoutChange: (next) => (persisted = next),
      },
    });
    await openMenu();
    fireEvent.click(screen.getByLabelText("Pin to end: Actions"));
    expect(persisted?.pinned).toEqual({ actions: "end" });
    first.unmount();
    // Phase 2: a fresh mount restores the pin from the captured state alone.
    renderHarness({
      override: { rowActions: [edit], defaultColumnLayout: persisted },
    });
    expect(getComputedStyle(actionsHeader()!).position).toBe("sticky");
  });

  it("a persisted hidden actions column strips actions on desktop and mobile", () => {
    const defaultColumnLayout = { hidden: ["actions"] };
    const first = renderHarness({
      override: { rowActions: [edit], defaultColumnLayout },
    });
    expect(actionsHeader()).toBeUndefined();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    first.unmount();
    renderHarness({
      isMobile: true,
      override: { rowActions: [edit], defaultColumnLayout },
    });
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });
});
