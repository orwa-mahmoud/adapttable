import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

/**
 * Base UI' `Select` is a button-based combobox: it opens a portalled
 * listbox on click, so a value change is "open the trigger, click the option"
 * rather than Chakra's native `<select>` change event.
 */
function selectOption(triggerName: string, optionName: string) {
  const trigger = screen.getByRole("combobox", { name: triggerName });
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  const option = screen.getByRole("option", { name: optionName });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
}

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

function renderHarness(props: Parameters<typeof Harness>[0] = {}, url = "") {
  adapter = createMemoryAdapter(url);
  return render(<Harness {...props} />);
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> (Base UI)", () => {
  it("applies the per-part classNames hooks", () => {
    const { container } = renderHarness({
      override: {
        classNames: {
          root: "my-root",
          toolbar: "my-toolbar",
          table: "my-table",
          footer: "my-footer",
        },
      },
    });
    expect(container.querySelector(".my-root")).toBeInTheDocument();
    expect(container.querySelector(".my-toolbar")).toBeInTheDocument();
    expect(container.querySelector(".my-table")).toBeInTheDocument();
    expect(container.querySelector(".my-footer")).toBeInTheDocument();
  });

  it("applies the card className on mobile", () => {
    const { container } = renderHarness({
      override: { forceMobile: true, classNames: { card: "my-card" } },
    });
    expect(container.querySelector(".my-card")).toBeInTheDocument();
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

  it("renders the empty state", () => {
    renderHarness({ rows: [] });
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders the noResults empty state with a clear-filters CTA when filters match nothing", () => {
    const onClearFilters = vi.fn();
    renderHarness(
      {
        rows: [],
        override: {
          filterLabels: { status: (v) => `Status: ${v}` },
          onClearFilters,
        },
      },
      "f_status=Active"
    );
    expect(
      screen.getByText("No results match your filters")
    ).toBeInTheDocument();
    expect(screen.queryByText("No data")).toBeNull();
    // The CTA routes through chrome.clearFilters → the caller's handler.
    const emptyState = screen.getByRole("status");
    fireEvent.click(
      within(emptyState).getByRole("button", { name: "Clear all" })
    );
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("noResults CTA falls back to clearing source extras without onClearFilters", () => {
    renderHarness(
      {
        rows: [],
        override: { filterLabels: { status: (v) => `Status: ${v}` } },
      },
      "f_status=Active"
    );
    const emptyState = screen.getByRole("status");
    fireEvent.click(
      within(emptyState).getByRole("button", { name: "Clear all" })
    );
    expect(adapter.getSearch()).not.toContain("f_status");
  });

  it("shows an indeterminate refresh bar and aria-busy while refreshing", () => {
    const { container } = renderHarness({
      isFetching: true,
      override: { classNames: { root: "my-root" } },
    });
    // Rows stay on screen — the refresh is non-blocking.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(container.querySelector(".my-root")).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("renders no refresh indicator when the source is idle", () => {
    const { container } = renderHarness({
      override: { classNames: { root: "my-root" } },
    });
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(container.querySelector(".my-root")).not.toHaveAttribute(
      "aria-busy"
    );
  });

  it("appends rowClassName to matching desktop rows only", () => {
    const { container } = renderHarness({
      override: {
        rowClassName: (row) => (row.id === "a" ? "row-overdue" : undefined),
      },
    });
    const flagged = container.querySelectorAll("tbody tr.row-overdue");
    expect(flagged).toHaveLength(1);
    expect(within(flagged[0] as HTMLElement).getByText("Alice")).toBeTruthy();
  });

  it("merges rowClassName with the card className on mobile", () => {
    const { container } = renderHarness({
      isMobile: true,
      override: {
        classNames: { card: "my-card" },
        rowClassName: (row) => (row.id === "a" ? "row-overdue" : undefined),
      },
    });
    // Both cards keep the static hook; only Alice's gets the row class.
    expect(container.querySelectorAll(".my-card")).toHaveLength(2);
    const flagged = container.querySelectorAll(".my-card.row-overdue");
    expect(flagged).toHaveLength(1);
    expect(within(flagged[0] as HTMLElement).getByText("Alice")).toBeTruthy();
  });

  it("applies rowClassName alone on mobile cards without a card className", () => {
    const { container } = renderHarness({
      isMobile: true,
      override: { rowClassName: () => "row-marked" },
    });
    expect(container.querySelectorAll(".row-marked")).toHaveLength(2);
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

  it("cycles sort on a header", () => {
    renderHarness();
    fireEvent.click(screen.getByRole("button", { name: /sort by: name/i }));
    expect(adapter.getSearch()).toContain("sortDir=asc");
    fireEvent.click(screen.getByRole("button", { name: /sort by: name/i }));
    expect(adapter.getSearch()).toContain("sortDir=desc");
  });

  it("paginates via prev/next", () => {
    renderHarness({}, "limit=1");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
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

  it("renders filter chips and opens the filter popover", async () => {
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
    expect(await screen.findByText("filter body")).toBeInTheDocument();
  });

  it("invokes onClearFilters from the popover header", async () => {
    const onClearFilters = vi.fn();
    renderHarness(
      {
        override: {
          filters: <div>filter body</div>,
          filterLabels: { status: (v) => `Status: ${v}` },
          onClearFilters,
        },
      },
      "f_status=Active"
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await screen.findByText("filter body");
    // Scope to the popover so we hit its header "Clear all", not the chip one.
    const popover = screen.getByTestId("adapttable-filter-popover");
    fireEvent.click(within(popover).getByText("Clear all"));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("renders the filter popover with no scrim and toggles closed from the trigger", async () => {
    renderHarness({ override: { filters: <div>filter body</div> } });
    const trigger = screen.getByRole("button", { name: /filters/i });
    fireEvent.click(trigger);
    await screen.findByText("filter body");
    // No backdrop/scrim is rendered — the background stays interactive.
    expect(
      screen.queryByTestId("adapttable-filter-scrim")
    ).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Toggling the trigger closes the popover (controlled open state).
    act(() => {
      fireEvent.click(trigger);
    });
    await waitFor(() =>
      expect(screen.queryByText("filter body")).not.toBeInTheDocument()
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the filter popover on Escape (Base UI dismiss → onCloseFilters)", async () => {
    renderHarness({ override: { filters: <div>filter body</div> } });
    const trigger = screen.getByRole("button", { name: /filters/i });
    fireEvent.click(trigger);
    await screen.findByText("filter body");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Base UI wires Escape to the document; the dismiss runs the popover's
    // `onOpenChange(false)` → `onClose` → the adapter's `onCloseFilters`,
    // which flips the controlled `filtersOpen` state.
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("removes a chip", () => {
    renderHarness(
      { override: { filterLabels: { status: (v) => `Status: ${v}` } } },
      "f_status=Active"
    );
    fireEvent.click(screen.getByLabelText("Clear all: Status: Active"));
    expect(adapter.getSearch()).not.toContain("f_status");
  });

  it("renders mobile cards when isMobile", () => {
    renderHarness({ isMobile: true });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("runs a row action immediately", () => {
    const onClick = vi.fn();
    renderHarness({
      override: { rowActions: [{ key: "e", label: "Edit", onClick }] },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("applies dir and shows the sort + rows-per-page selects in infinite mode", () => {
    const { container } = renderHarness({
      mode: "infinite",
      override: {
        dir: "rtl",
        sortByOptions: [{ value: "name", label: "Name" }],
      },
    });
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
    expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
    expect(screen.getByLabelText("Rows per page")).toBeInTheDocument();
  });

  it("changes rows-per-page (infinite) and sort selects", () => {
    renderHarness({
      mode: "infinite",
      override: { sortByOptions: [{ value: "name", label: "Name" }] },
    });
    selectOption("Rows per page", "50");
    expect(adapter.getSearch()).toContain("limit=50");
    selectOption("Sort by", "Name");
    expect(adapter.getSearch()).toContain("sortBy=name");
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

  it("mobile: selection + row action work", () => {
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

  it("bulk action with disabledReason is disabled", () => {
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

  it("keeps a bulk action enabled when disabledReason returns an empty string", () => {
    renderHarness({
      override: {
        bulkActions: [
          {
            key: "d",
            label: "Delete",
            onClick: vi.fn(),
            disabledReason: () => "",
          },
        ],
      },
    });
    fireEvent.click(screen.getByLabelText("Select all"));
    expect(screen.getByText("Delete").closest("button")).not.toBeDisabled();
  });

  it("fires prefetch on desktop row hover and renders a custom Cell", () => {
    const prefetch = vi.fn();
    const cellCols: ColumnDef<Row>[] = [
      {
        key: "name",
        header: "Name",
        align: "center",
        Cell: ({ row }) => <b data-testid="c">{row.name}</b>,
      },
    ];
    renderHarness({ override: { prefetch, columns: cellCols } });
    const row = within(screen.getAllByTestId("c")[0]!.closest("tr")!);
    fireEvent.mouseEnter(row.getByTestId("c").closest("tr")!);
    expect(prefetch).toHaveBeenCalled();
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

describe("<DataTable> (Base UI) density → table size", () => {
  // Base UI' `Table.Root` echoes our `size` onto its wrapping
  // `div.adapttable-table-root` as both `data-size` and an `rt-r-size-{n}` class — the
  // latter is the real size token applied to every descendant cell, so a class
  // assertion proves the size actually took effect (not just an echoed attr).
  function tableRoot(props: Parameters<typeof Harness>[0]): HTMLElement {
    const { container } = renderHarness(props);
    return container.querySelector<HTMLElement>(".adapttable-table-root")!;
  }
  function tableSizeOf(props: Parameters<typeof Harness>[0]): string | null {
    return tableRoot(props).getAttribute("data-size");
  }

  it('maps density="compact" to the smaller "1" size', () => {
    expect(tableRoot({ override: { density: "compact" } })).toHaveAttribute(
      "data-size",
      "1"
    );
  });

  it('maps density="comfortable" to the larger "2" size', () => {
    expect(tableRoot({ override: { density: "comfortable" } })).toHaveAttribute(
      "data-size",
      "2"
    );
  });

  it('defaults to the larger "2" size when density is omitted', () => {
    expect(tableSizeOf({})).toBe("2");
  });

  it("lets an explicit size prop win over density", () => {
    expect(
      tableRoot({ override: { density: "compact", size: "3" } })
    ).toHaveAttribute("data-size", "3");
  });
});

describe("select-all-matching banner (Base UI)", () => {
  const MANY: Row[] = [
    ...ROWS,
    { id: "c", name: "Cara", city: "Doha" },
    { id: "d", name: "Dina", city: "Muscat" },
    { id: "e", name: "Evan", city: "Amman" },
  ];
  const bulkX = [{ key: "x", label: "X", onClick: vi.fn() }];
  const selectPage = () => fireEvent.click(screen.getByLabelText("Select all"));

  it("stays absent when the whole filtered set is already selected", () => {
    renderHarness({ override: { bulkActions: bulkX } });
    selectPage();
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.queryByText(/on this page selected/)).toBeNull();
    expect(screen.queryByText(/matching/)).toBeNull();
  });

  it("offers all matching for a full page, flips to active, and clears", () => {
    renderHarness({ rows: MANY, override: { bulkActions: bulkX } }, "limit=2");
    selectPage();
    // Offer state: the page count replaces the plain "n selected" text.
    expect(screen.getByText("All 2 on this page selected")).toBeInTheDocument();
    expect(screen.queryByText("2 selected")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Select all 5 matching" })
    );
    // Active state.
    expect(screen.getByText("All 5 matching selected")).toBeInTheDocument();
    expect(screen.queryByText("All 2 on this page selected")).toBeNull();
    // The banner's own Clear all empties the selection and hides the bar.
    const clears = screen.getAllByRole("button", { name: "Clear all" });
    expect(clears).toHaveLength(2);
    fireEvent.click(clears[0]!);
    expect(screen.queryByText("All 5 matching selected")).toBeNull();
    expect(screen.queryByText("X")).toBeNull();
  });

  it("confirms with the matching TOTAL and passes the all-matching context", async () => {
    const onClick = vi.fn();
    const confirm = vi.fn((r: { onConfirm: () => void }) => r.onConfirm());
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
    selectPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Select all 5 matching" })
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
      await Promise.resolve();
    });
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Delete 5" })
    );
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: true,
      total: 5,
    });
  });

  it("narrows back to the page scope on any selection change", () => {
    renderHarness({ rows: MANY, override: { bulkActions: bulkX } }, "limit=2");
    selectPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Select all 5 matching" })
    );
    expect(screen.getByText("All 5 matching selected")).toBeInTheDocument();
    // Any explicit mutation auto-narrows the scope back to concrete ids.
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.queryByText("All 5 matching selected")).toBeNull();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    // Re-completing the page lands on the OFFER, not the active state.
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.getByText("All 2 on this page selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select all 5 matching" })
    ).toBeInTheDocument();
  });
});
