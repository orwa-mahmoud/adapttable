import {
  type ColumnLayoutState,
  createMemoryAdapter,
  type TableSource,
  useFrontendData,
} from "@adapttable/core";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ConfigProvider } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef, FilterDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai" },
  { id: "b", name: "Bob", city: "Riyadh" },
];
// More rows than one `limit=2` page — exercises the cross-page banner.
const MANY: Row[] = [
  ...ROWS,
  { id: "c", name: "Cara", city: "Doha" },
  { id: "d", name: "Dan", city: "Muscat" },
  { id: "e", name: "Eve", city: "Amman" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness(props: {
  rows?: readonly Row[];
  mode?: "paged" | "infinite";
  error?: Error | null;
  refetch?: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
  onSource?: (s: TableSource<Row>) => void;
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
  props.onSource?.(source);
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

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> (Ant Design)", () => {
  it("the pager names its arrows and announces the current page", () => {
    renderHarness({}, "limit=1");
    const current = document.querySelector('[aria-current="page"]');
    expect(current).not.toBeNull();
    expect(current?.textContent).toBe("1");
    expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeInTheDocument();
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
    expect(screen.getAllByText("No data").length).toBeGreaterThan(0);
  });

  it("renders the loading skeleton honoring skeletonRows", () => {
    const { container } = renderHarness({
      rows: [],
      isLoading: true,
      override: { skeletonRows: 3 },
    });
    expect(container.querySelector(".ant-skeleton")).toBeInTheDocument();
  });

  it("maps density='compact' to the small antd table", () => {
    const { container } = renderHarness({ override: { density: "compact" } });
    expect(container.querySelector(".ant-table-small")).toBeInTheDocument();
    expect(container.querySelector(".ant-table-medium")).toBeNull();
  });

  it("maps density='comfortable' to the middle antd table", () => {
    const { container } = renderHarness({
      override: { density: "comfortable" },
    });
    expect(container.querySelector(".ant-table-medium")).toBeInTheDocument();
    expect(container.querySelector(".ant-table-small")).toBeNull();
  });

  it("defaults to the middle antd table when no density is given", () => {
    const { container } = renderHarness();
    expect(container.querySelector(".ant-table-medium")).toBeInTheDocument();
    expect(container.querySelector(".ant-table-small")).toBeNull();
  });

  it("keeps density independent of column pinning (compact + pinned)", () => {
    const { container } = renderHarness({
      override: {
        density: "compact",
        defaultColumnLayout: { pinned: { name: "start" } },
      },
    });
    expect(container.querySelector(".ant-table-small")).toBeInTheDocument();
    expect(container.querySelector(".ant-table-cell-fix-start")).not.toBeNull();
  });

  it("lets an explicit size prop override density", () => {
    const { container } = renderHarness({
      override: { density: "compact", size: "large" },
    });
    // antd's "large" table carries no size modifier class — so neither the
    // small (from density) nor the middle class should be present.
    expect(container.querySelector(".ant-table")).toBeInTheDocument();
    expect(container.querySelector(".ant-table-small")).toBeNull();
    expect(container.querySelector(".ant-table-medium")).toBeNull();
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

  it("cycles sort ascending then descending on a header", () => {
    renderHarness();
    const header = () => screen.getByRole("columnheader", { name: /name/i });
    fireEvent.click(header());
    expect(adapter.getSearch()).toContain("sortDir=asc");
    fireEvent.click(header());
    expect(adapter.getSearch()).toContain("sortDir=desc");
  });

  it("paginates via the antd pager", () => {
    renderHarness({}, "limit=1");
    fireEvent.click(screen.getByText("2"));
    expect(adapter.getSearch()).toContain("page=2");
  });

  it("changes the page size via the footer rows-per-page select", () => {
    renderHarness();
    // The split footer's labelled Select replaces antd's "N / page" changer.
    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: "Rows per page" })
    );
    fireEvent.click(screen.getByTitle("50"));
    expect(adapter.getSearch()).toContain("limit=50");
    // The showing text comes from the same labels the other kits use.
    expect(screen.getByText(/Showing 1–/)).toBeInTheDocument();
  });

  it("changes rows-per-page and sort via the toolbar selects (infinite)", () => {
    renderHarness({
      mode: "infinite",
      override: { sortByOptions: [{ value: "name", label: "Name" }] },
    });
    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: "Rows per page" })
    );
    fireEvent.click(screen.getByTitle("50"));
    expect(adapter.getSearch()).toContain("limit=50");

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Sort by" }));
    fireEvent.click(screen.getAllByTitle("Name").at(-1)!);
    expect(adapter.getSearch()).toContain("sortBy=name");
  });

  it("exposes aria-sort on sortable headers", () => {
    renderHarness({}, "sortBy=name&sortDir=asc");
    expect(screen.getByRole("columnheader", { name: /name/i })).toHaveAttribute(
      "aria-sort",
      "ascending"
    );
    // The non-sortable City column gets no aria-sort.
    expect(
      screen.getByRole("columnheader", { name: /city/i })
    ).not.toHaveAttribute("aria-sort");
  });

  it("clears the sort when antd cycles past descending", () => {
    renderHarness({}, "sortBy=name&sortDir=desc");
    // Already descending; antd's next click cycles to unsorted.
    fireEvent.click(screen.getByRole("columnheader", { name: /name/i }));
    expect(adapter.getSearch()).not.toContain("sortBy=name");
  });

  it("selects all rows and shows the bulk bar, then runs an action", async () => {
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
    fireEvent.click(screen.getAllByLabelText("Select all")[0]!);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    // Every matching row is already visible — no cross-page banner.
    expect(screen.queryByText(/Select all \d+ matching/)).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
      await Promise.resolve();
    });
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: false,
      total: 2,
    });
  });

  it("offers select-all-matching when a full page is selected, flips to the active state, and clears", () => {
    renderHarness(
      {
        rows: MANY,
        override: { bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] },
      },
      "limit=2"
    );
    fireEvent.click(screen.getAllByLabelText("Select all")[0]!);
    // Offer state: the page is fully selected but 3 more rows match elsewhere.
    expect(screen.getByText("All 2 on this page selected")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Select all 5 matching" })
    );
    // Active state: the scope widened to the whole matching set.
    expect(screen.getByText("All 5 matching selected")).toBeInTheDocument();
    expect(screen.queryByText("All 2 on this page selected")).toBeNull();
    // The banner's clear link (first in DOM order; both clear) collapses it.
    fireEvent.click(screen.getAllByRole("button", { name: "Clear all" })[0]!);
    expect(screen.queryByText("All 5 matching selected")).toBeNull();
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it("runs a bulk action across the matching set: confirm and onClick see the total", async () => {
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
    fireEvent.click(screen.getAllByLabelText("Select all")[0]!);
    fireEvent.click(
      screen.getByRole("button", { name: "Select all 5 matching" })
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Delete"));
      await Promise.resolve();
    });
    // The confirm count and the handler scope reflect the WHOLE matching
    // set (5), even though only the visible page ids are concrete.
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Delete 5" })
    );
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: true,
      total: 5,
    });
  });

  it("narrows back to a page selection when a row is toggled while all-matching", () => {
    const { container } = renderHarness(
      {
        rows: MANY,
        override: { bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] },
      },
      "limit=2"
    );
    fireEvent.click(screen.getAllByLabelText("Select all")[0]!);
    fireEvent.click(
      screen.getByRole("button", { name: "Select all 5 matching" })
    );
    expect(screen.getByText("All 5 matching selected")).toBeInTheDocument();
    // Unticking one row narrows the scope back to concrete ids.
    const rowCheckbox = container.querySelector<HTMLInputElement>(
      'tbody [title="Select row"] input[type="checkbox"]'
    );
    expect(rowCheckbox).not.toBeNull();
    fireEvent.click(rowCheckbox!);
    expect(screen.queryByText("All 5 matching selected")).toBeNull();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
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

  it("closes the filter popover on an outside click with no scrim", async () => {
    renderHarness({ override: { filters: <div>filter body</div> } });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // No backdrop/scrim is rendered — the background stays interactive.
    expect(screen.queryByTestId("filter-scrim")).toBeNull();
    // A mousedown anywhere outside the popover hides it (antd toggles the
    // `ant-popover-hidden` class rather than unmounting the content).
    fireEvent.mouseDown(document.body);
    // The popover closes (its logical state flips); jsdom does not run antd's
    // leave animation to the `ant-popover-hidden` class, so assert the state
    // via the trigger's `aria-expanded` instead.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /filters/i })).toHaveAttribute(
        "aria-expanded",
        "false"
      )
    );
  });

  it("closes the filter popover when Escape is pressed", async () => {
    renderHarness({ override: { filters: <div>filter body</div> } });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(document.querySelector(".ant-popover")).not.toHaveClass(
      "ant-popover-hidden"
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /filters/i })).toHaveAttribute(
        "aria-expanded",
        "false"
      )
    );
  });

  it("keeps the filter popover open when its own content is clicked", () => {
    renderHarness({ override: { filters: <div>filter body</div> } });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    // A mousedown inside the floating popover must not close it.
    fireEvent.mouseDown(screen.getByText("filter body"));
    expect(document.querySelector(".ant-popover")).not.toHaveClass(
      "ant-popover-hidden"
    );
  });

  it("toggles the filter popover closed on a second Filters click", async () => {
    renderHarness({ override: { filters: <div>filter body</div> } });
    const button = screen.getByRole("button", { name: /filters/i });
    fireEvent.click(button);
    expect(document.querySelector(".ant-popover")).not.toHaveClass(
      "ant-popover-hidden"
    );
    fireEvent.click(button);
    await waitFor(() =>
      expect(button).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("clears all filters from the popover header", () => {
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
    // The popover header's "Clear all" sits above the filter body.
    const body = screen.getByText("filter body").parentElement!.parentElement!;
    fireEvent.click(within(body).getByText("Clear all"));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("anchors the filter popover to the start edge in RTL mode", () => {
    renderHarness({
      override: { dir: "rtl", filters: <div>filter body</div> },
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // No drawer is mounted in popover mode.
    expect(document.querySelector(".ant-drawer")).toBeNull();
  });

  it("renders the filters in a drawer when filtersMode is drawer", () => {
    renderHarness({
      override: { filters: <div>filter body</div>, filtersMode: "drawer" },
    });
    expect(screen.queryByTestId("filter-scrim")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    const drawer = document.querySelector(".ant-drawer")!;
    expect(drawer).toHaveClass("ant-drawer-open");
    expect(
      within(screen.getByRole("dialog")).getByText("filter body")
    ).toBeInTheDocument();
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

  it("runs a row action immediately", () => {
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

  it("keeps a row action enabled when disabledReason returns an empty string", () => {
    renderHarness({
      override: {
        rowActions: [
          {
            key: "d",
            label: "DeleteAct",
            onClick: vi.fn(),
            disabledReason: () => "",
          },
        ],
      },
    });
    expect(
      screen.getAllByRole("button", { name: "DeleteAct" })[0]!
    ).not.toBeDisabled();
  });

  it("labels the table with tableLabel", () => {
    renderHarness({ override: { tableLabel: "People" } });
    expect(screen.getByRole("table", { name: "People" })).toBeInTheDocument();
  });

  it("labels the table with the default table label when tableLabel is omitted", () => {
    renderHarness();
    expect(
      screen.getByRole("table", { name: "Data table" })
    ).toBeInTheDocument();
  });

  it("exposes exactly one select-all to the accessibility tree", () => {
    renderHarness({
      override: { bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] },
    });
    // antd's scroll measure row clones the header (incl. the select-all), but
    // it's aria-hidden, so role queries (and screen readers) see only one.
    expect(
      screen.getAllByRole("checkbox", { name: "Select all" })
    ).toHaveLength(1);
  });

  it("prefetches a row on hover", () => {
    const prefetch = vi.fn();
    renderHarness({ override: { prefetch } });
    fireEvent.mouseEnter(screen.getByText("Alice").closest("tr")!);
    expect(prefetch).toHaveBeenCalledWith(ROWS[0]);
  });

  it("renders cards instead of a table on mobile", () => {
    const { container } = renderHarness({ override: { forceMobile: true } });
    expect(
      container.querySelector('[data-adapttable-part="cards"]')
    ).toBeInTheDocument();
    expect(container.querySelector(".ant-table")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Riyadh")).toBeInTheDocument();
  });

  it("supports selection, row actions, and Cell in mobile cards", () => {
    const onClick = vi.fn();
    renderHarness({
      override: {
        isMobile: true,
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        rowActions: [{ key: "e", label: "Edit", onClick }],
        columns: [
          {
            key: "name",
            header: "Name",
            Cell: ({ row }) => <span>card-{row.name}</span>,
          },
        ],
      },
    });
    expect(screen.getByText("card-Alice")).toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("shows the empty state on mobile too", () => {
    renderHarness({ rows: [], override: { forceMobile: true } });
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.getAllByText("No data").length).toBeGreaterThan(0);
  });

  it("hides actions and uses the key as the card label for a non-string header", () => {
    renderHarness({
      override: {
        isMobile: true,
        rowActions: [
          {
            key: "h",
            label: "HiddenAct",
            onClick: vi.fn(),
            isHidden: () => true,
          },
        ],
        columns: [
          { key: "name", header: <em>Name</em>, accessor: (r) => r.name },
        ],
      },
    });
    expect(screen.queryByRole("button", { name: "HiddenAct" })).toBeNull();
    // The Descriptions label falls back to the column key for a JSX header.
    expect(screen.getAllByText("name").length).toBeGreaterThan(0);
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

  it("applies dir and shows the rows-per-page select in infinite mode", () => {
    const { container } = renderHarness({
      mode: "infinite",
      override: {
        dir: "rtl",
        sortByOptions: [{ value: "name", label: "Name" }],
      },
    });
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
    expect(screen.getAllByLabelText("Rows per page").length).toBeGreaterThan(0);
  });

  it("enables antd virtual scrolling when virtualize is true", () => {
    // The shared maxHeight model bounds the virtual scroller (no more
    // antd-only virtualHeight/virtualWidth extras).
    const { container } = renderHarness({
      override: {
        virtualize: true,
        maxHeight: 240,
      },
    });
    expect(
      container.querySelector(".ant-table-tbody-virtual")
    ).toBeInTheDocument();
  });

  it("loads more rows via the Load more button in infinite mode", () => {
    renderHarness({ mode: "infinite" }, "limit=1");
    expect(screen.queryByText("Bob")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("pages in the next slice when the virtual scroll nears its end", () => {
    // antd v6's virtual list collapses to a single rendered row under
    // jsdom (zero layout height), so the loaded slice can't be asserted
    // from the DOM — capture the source and assert the loaded row count
    // grows, which is the actual paging contract.
    let source: TableSource<Row> | undefined;
    const { container } = renderHarness(
      {
        mode: "infinite",
        override: { virtualize: true },
        onSource: (s) => (source = s),
      },
      "limit=1"
    );
    expect(source!.rows).toHaveLength(1);
    const scroller = container.querySelector<HTMLElement>(
      ".ant-table-tbody-virtual-holder"
    );
    expect(scroller).not.toBeNull();
    // Simulate scrolling to the bottom of antd's internal virtual holder.
    // scrollTop is a getter because rc-virtual-list (v6) resets the holder's
    // native scrollTop to 0 during its own scroll handling — a plain value
    // prop would be clobbered before our handler reads it.
    Object.defineProperty(scroller!, "scrollHeight", { value: 1000 });
    Object.defineProperty(scroller!, "clientHeight", { value: 400 });
    Object.defineProperty(scroller!, "scrollTop", {
      get: () => 600,
      set: () => undefined,
      configurable: true,
    });
    act(() => fireEvent.scroll(scroller!));
    expect(source!.rows.length).toBeGreaterThan(1);
  });

  it("keeps the Load more sentinel armed on mobile even with virtualize set", () => {
    // Mobile renders cards (never antd's virtual table), so the page-level
    // sentinel must stay enabled or infinite mode silently stops auto-loading.
    renderHarness(
      { mode: "infinite", override: { virtualize: true, isMobile: true } },
      "limit=1"
    );
    expect(screen.queryByText("Bob")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("ignores the virtual scroll handler in paged (non-infinite) mode", () => {
    const { container } = renderHarness({ override: { virtualize: true } });
    const scroller = container.querySelector<HTMLElement>(
      ".ant-table-tbody-virtual-holder"
    );
    expect(scroller).not.toBeNull();
    // No next page in paged mode — scrolling must not throw or page anything.
    act(() => fireEvent.scroll(scroller!));
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("toggles a single row's selection via its checkbox", () => {
    const { container } = renderHarness({
      override: { bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] },
    });
    // The first body-row checkbox lives in a cell titled "Select row".
    const rowCheckbox = container.querySelector<HTMLInputElement>(
      'tbody [title="Select row"] input[type="checkbox"]'
    );
    expect(rowCheckbox).not.toBeNull();
    fireEvent.click(rowCheckbox!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("renders a multi-column skeleton with a middle column width", () => {
    const { container } = renderHarness({
      rows: [],
      isLoading: true,
      override: {
        skeletonRows: 2,
        columns: [
          { key: "name", header: "Name", accessor: (r) => r.name },
          { key: "city", header: "City", accessor: (r) => r.city },
          { key: "id", header: "Id", accessor: (r) => r.id },
        ],
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
      },
    });
    expect(container.querySelector(".ant-skeleton")).toBeInTheDocument();
  });

  it("closes the filter drawer via the apply button", () => {
    renderHarness(
      { override: { filters: <div>filter body</div>, filtersMode: "drawer" } },
      "f_status=Active"
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    const dialog = screen.getByRole("dialog");
    const drawer = document.querySelector(".ant-drawer")!;
    expect(drawer).toHaveClass("ant-drawer-open");
    // The drawer's primary footer button (label "Done") closes it.
    fireEvent.click(within(dialog).getByText("Done"));
    expect(drawer).not.toHaveClass("ant-drawer-open");
  });

  it("clears all filters from the drawer footer", () => {
    const onClearFilters = vi.fn();
    renderHarness(
      {
        override: {
          filters: <div>filter body</div>,
          filtersMode: "drawer",
          filterLabels: { status: (v) => `Status: ${v}` },
          onClearFilters,
        },
      },
      "f_status=Active"
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    const drawer = screen.getByRole("dialog");
    fireEvent.click(within(drawer).getByText("Clear all"));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("renders a resize handle whose label falls back to the column key for a JSX header", () => {
    renderHarness({
      override: {
        resizableColumns: true,
        columns: [
          { key: "name", header: <em>Name</em>, accessor: (r) => r.name },
          { key: "city", header: "City", accessor: (r) => r.city },
        ],
      },
    });
    // The JSX-header column's resize handle uses the key, the string one its text.
    expect(
      screen.getByRole("button", { name: "Resize column: name" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resize column: City" })
    ).toBeInTheDocument();
  });

  it("renders the column menu inline in the toolbar when enabled", () => {
    renderHarness({ override: { enableColumnMenu: true } });
    expect(
      screen.getAllByRole("button", { name: "Columns" }).length
    ).toBeGreaterThan(0);
  });

  it("gives a fixed-width column set its summed min-width so it scrolls", () => {
    const { container } = renderHarness({
      override: {
        columns: [
          { key: "name", header: "Name", accessor: (r) => r.name, width: 200 },
          { key: "city", header: "City", accessor: (r) => r.city, width: 160 },
        ],
      },
    });
    // With every column fixed-width (and nothing pinned), scroll.x gets the
    // summed min-width so the table scrolls horizontally instead of squishing
    // the columns below their declared widths.
    expect(container.querySelector("table")).toHaveStyle({ width: "360px" });
  });

  it("pins the selection checkbox column alongside a left-pinned column", () => {
    const { container } = renderHarness({
      override: {
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        defaultColumnLayout: { pinned: { name: "start" } },
      },
    });
    // The checkbox column must ride along with the left-fixed data column,
    // or it would scroll out of view while Name stays pinned.
    const selectionCell = container.querySelector(
      "th.ant-table-selection-column"
    );
    expect(selectionCell).toHaveClass("ant-table-cell-fix-start");
  });

  it("keeps the filter popover open on a mousedown over its own trigger", () => {
    renderHarness({ override: { filters: <div>filter body</div> } });
    const button = screen.getByRole("button", { name: /filters/i });
    fireEvent.click(button);
    // A mousedown on the trigger must not close the popover — the click that
    // follows it toggles; closing on mousedown would immediately re-open it.
    fireEvent.mouseDown(button);
    expect(document.querySelector(".ant-popover")).not.toHaveClass(
      "ant-popover-hidden"
    );
  });

  it("ignores non-Escape keys while the filter popover is open", () => {
    renderHarness({ override: { filters: <div>filter body</div> } });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    // Only Escape dismisses; other keys (typing in filter inputs) must not.
    fireEvent.keyDown(document, { key: "Enter" });
    expect(document.querySelector(".ant-popover")).not.toHaveClass(
      "ant-popover-hidden"
    );
  });

  it("wires antd's sticky header when stickyHeader is set", () => {
    const { container } = renderHarness({
      override: { stickyHeader: true, stickyTop: 12 },
    });
    // antd renders its sticky-header holder only when the `sticky` prop is set.
    expect(container.querySelector(".ant-table-sticky-holder")).not.toBeNull();
  });

  it("omits the sticky header by default", () => {
    const { container } = renderHarness();
    expect(container.querySelector(".ant-table-sticky-holder")).toBeNull();
  });

  it("defaults the sticky header offset to 0 when stickyTop is omitted", () => {
    const { container } = renderHarness({ override: { stickyHeader: true } });
    // Without a stickyTop the header sticks flush to the viewport top.
    const holder = container.querySelector(".ant-table-sticky-holder");
    expect(holder).toHaveStyle({ top: "0px" });
  });

  it("tightens the card gap for density='compact' on mobile", () => {
    const { container } = renderHarness({
      override: { forceMobile: true, density: "compact" },
    });
    // Compact density halves the vertical rhythm between cards.
    const list = container.querySelector<HTMLElement>(
      '[data-adapttable-part="cards"]'
    );
    expect(list?.style.gap).toBe("4px");
  });

  it("disables a mobile card action without attaching a click handler", () => {
    const onClick = vi.fn();
    renderHarness({
      override: {
        isMobile: true,
        rowActions: [
          { key: "d", label: "DisabledAct", onClick, isDisabled: () => true },
        ],
      },
    });
    // The disabled attribute is what blocks activation — no handler is bound.
    const button = screen.getAllByRole("button", { name: "DisabledAct" })[0]!;
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("prefetches a row on card hover in mobile mode", () => {
    const prefetch = vi.fn();
    renderHarness({ override: { forceMobile: true, prefetch } });
    fireEvent.mouseEnter(screen.getByText("Alice").closest(".ant-card")!);
    expect(prefetch).toHaveBeenCalledWith(ROWS[0]);
  });

  it("uses an explicit mobileLabel for the card descriptions label", () => {
    renderHarness({
      override: {
        isMobile: true,
        columns: [
          {
            key: "name",
            header: "Name",
            mobileLabel: "Full name",
            accessor: (r) => r.name,
          },
        ],
      },
    });
    expect(screen.getAllByText("Full name").length).toBeGreaterThan(0);
  });

  it("derives mobile sort options from sortable columns when none are passed", () => {
    renderHarness({ override: { forceMobile: true } });
    // "name" is sortable, so the mobile toolbar exposes a Sort by select.
    expect(
      screen.getByRole("combobox", { name: "Sort by" })
    ).toBeInTheDocument();
  });

  it("falls back to source.limit for the skeleton row count when skeletonRows is omitted", () => {
    const { container } = renderHarness({ rows: [], isLoading: true });
    // No skeletonRows override → the skeleton uses source.limit (default 25).
    expect(container.querySelector(".ant-skeleton")).toBeInTheDocument();
  });

  it("center-aligns a column whose align is center", () => {
    const { container } = renderHarness({
      override: {
        columns: [
          {
            key: "name",
            header: "Name",
            accessor: (r) => r.name,
            align: "center",
          },
          { key: "city", header: "City", accessor: (r) => r.city },
        ],
      },
    });
    // The center column's body cells carry a center text-align style.
    const centered = container.querySelector<HTMLElement>(
      'tbody td[style*="center"]'
    );
    expect(centered).not.toBeNull();
  });

  it("uses a custom search placeholder when one is provided", () => {
    renderHarness({ override: { searchPlaceholder: "Find people…" } });
    expect(screen.getByPlaceholderText("Find people…")).toBeInTheDocument();
  });

  it("opens the filter drawer on the left edge in RTL mode", () => {
    renderHarness(
      {
        override: {
          dir: "rtl",
          filters: <div>filter body</div>,
          filtersMode: "drawer",
        },
      },
      "f_status=Active"
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    // antd places the drawer on the left edge when dir is rtl.
    expect(document.querySelector(".ant-drawer-left")).not.toBeNull();
    expect(document.querySelector(".ant-drawer-right")).toBeNull();
  });

  it("widens the table to max-content once a column is pinned", () => {
    const { container } = renderHarness({
      override: { enableColumnMenu: true },
    });
    // Before pinning, the table is not forced to max-content width.
    expect(container.querySelector(".ant-table-content")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    // Pin the Name column to the left edge via the menu.
    const pinStart = document.querySelector<HTMLElement>(
      '[aria-label="Pin to start: Name"]'
    );
    expect(pinStart).not.toBeNull();
    fireEvent.click(pinStart!);
    // antd renders a sticky/fixed cell once a column is pinned (x: max-content).
    expect(container.querySelector(".ant-table-cell-fix-start")).not.toBeNull();
  });

  it("pins the actions column right with one click and zero data pins", () => {
    const { container } = renderHarness({
      override: {
        enableColumnMenu: true,
        rowActions: [{ key: "edit", label: "Edit", onClick: vi.fn() }],
      },
    });
    // Nothing is fixed before the click.
    expect(container.querySelector(".ant-table-cell-fix-end")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const pin = document.querySelector<HTMLElement>(
      '[aria-label="Pin to end: Actions"]'
    );
    expect(pin).not.toBeNull();
    fireEvent.click(pin!);
    // The injected column itself carries antd's fixed-right sticky cell, and
    // it is the ONLY fixed column — no data pins involved.
    const fixedHeaders = container.querySelectorAll(
      "th.ant-table-cell-fix-end"
    );
    expect([...fixedHeaders].map((th) => th.textContent)).toEqual(["Actions"]);
    expect(container.querySelector(".ant-table-cell-fix-start")).toBeNull();
  });

  it("drags the actions column along when a data column pins right", () => {
    const { container } = renderHarness({
      override: {
        rowActions: [{ key: "edit", label: "Edit", onClick: vi.fn() }],
        defaultColumnLayout: { pinned: { city: "end" } },
      },
    });
    // antd needs the right-fixed run contiguous through the trailing edge,
    // so the unpinned actions column rides along with the pinned data column.
    const fixedHeaders = container.querySelectorAll(
      "th.ant-table-cell-fix-end"
    );
    expect([...fixedHeaders].map((th) => th.textContent)).toEqual([
      "City",
      "Actions",
    ]);
  });

  it("hides the actions column from the Columns menu like any column", () => {
    const { container } = renderHarness({
      override: {
        enableColumnMenu: true,
        rowActions: [{ key: "edit", label: "Edit", onClick: vi.fn() }],
        summaryRow: () => ({ name: "2 people" }),
      },
    });
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    // The summary row pads a trailing cell for the actions column.
    expect(container.querySelectorAll(".ant-table-summary tr td")).toHaveLength(
      3
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(
      document.querySelector<HTMLElement>(
        '[aria-label="Hide column: Actions"]'
      )!
    );
    // The injected column is stripped consistently: no action buttons, no
    // header cell, and the summary loses its trailing pad cell.
    expect(screen.queryAllByRole("button", { name: "Edit" })).toHaveLength(0);
    expect(
      within(
        container.querySelector<HTMLElement>(".ant-table-thead")!
      ).queryByText("Actions")
    ).toBeNull();
    expect(container.querySelectorAll(".ant-table-summary tr td")).toHaveLength(
      2
    );
    // The menu still lists it, now offering to show it again.
    expect(
      document.querySelector('[aria-label="Show column: Actions"]')
    ).not.toBeNull();
  });

  it("round-trips the actions pin through the layout state", () => {
    const layouts: ColumnLayoutState[] = [];
    const rowActions = [{ key: "edit", label: "Edit", onClick: vi.fn() }];
    const first = renderHarness({
      override: {
        enableColumnMenu: true,
        rowActions,
        onColumnLayoutChange: (next) => layouts.push(next),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(
      document.querySelector<HTMLElement>('[aria-label="Pin to end: Actions"]')!
    );
    // The layout change reports the reserved "actions" key like any column.
    const captured = layouts[layouts.length - 1];
    expect(captured?.pinned).toEqual({ actions: "end" });
    first.unmount();
    // Remount from the captured snapshot: the pin is live with zero clicks…
    const { container } = renderHarness({
      override: {
        enableColumnMenu: true,
        rowActions,
        defaultColumnLayout: captured,
      },
    });
    const fixedHeaders = container.querySelectorAll(
      "th.ant-table-cell-fix-end"
    );
    expect([...fixedHeaders].map((th) => th.textContent)).toEqual(["Actions"]);
    // …and the menu reflects it with the one-click unpin.
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(
      document.querySelector('[aria-label="Unpin: Actions"]')
    ).not.toBeNull();
  });

  it("stops paging the virtual scroll once there is no next page", () => {
    // All rows fit in the first page → infinite mode has no next page, but the
    // virtual scroll handler is still active (virtualize && !paged && !error).
    const { container } = renderHarness({
      mode: "infinite",
      override: { virtualize: true },
    });
    const scroller = container.querySelector<HTMLElement>(
      ".ant-table-tbody-virtual-holder"
    );
    expect(scroller).not.toBeNull();
    Object.defineProperty(scroller!, "scrollHeight", { value: 1000 });
    Object.defineProperty(scroller!, "clientHeight", { value: 400 });
    Object.defineProperty(scroller!, "scrollTop", {
      value: 600,
      writable: true,
    });
    // Both rows are already shown and hasNextPage is false; scrolling is a no-op.
    act(() => fireEvent.scroll(scroller!));
    expect(screen.getByText("Alice")).toBeInTheDocument();
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

  it("shows the no-results empty state and clears filters from its CTA", () => {
    renderHarness(
      {
        rows: [],
        override: { filterLabels: { status: (v) => `Status: ${v}` } },
      },
      "f_status=Active"
    );
    // Zero rows under an active filter → "no results", not "no data".
    const empty = screen.getByRole("status");
    expect(
      within(empty).getByText("No results match your filters")
    ).toBeInTheDocument();
    // Without a caller onClearFilters the CTA falls back to clearExtras:
    // the filter (and its chip) disappears and the variant flips to noData.
    fireEvent.click(within(empty).getByRole("button", { name: "Clear all" }));
    expect(screen.queryByText("Status: Active")).toBeNull();
    expect(screen.queryByText("No results match your filters")).toBeNull();
    // (the description div, not the decorative SVG's <title>)
    expect(empty.querySelector(".ant-empty-description")).toHaveTextContent(
      "No data"
    );
  });

  it("prefers the caller's onClearFilters in the no-results CTA", () => {
    const onClearFilters = vi.fn();
    renderHarness(
      {
        rows: [],
        override: {
          onClearFilters,
          filterLabels: { status: (v) => `Status: ${v}` },
        },
      },
      "f_status=Active"
    );
    const empty = screen.getByRole("status");
    fireEvent.click(within(empty).getByRole("button", { name: "Clear all" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("keeps the noData empty state plain, with no clear button", () => {
    renderHarness({ rows: [] });
    const empty = screen.getByRole("status");
    expect(empty.querySelector(".ant-empty-description")).toHaveTextContent(
      "No data"
    );
    expect(within(empty).queryByRole("button")).toBeNull();
  });

  it("shows a subtle non-blocking indicator while a refresh is in flight", () => {
    const { container } = renderHarness({ isFetching: true });
    // aria-busy on the wrapper + a small Spin in the toolbar area…
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".ant-spin")).toBeInTheDocument();
    // …while the rows stay rendered with no blocking blur overlay on them
    // (antd adds .ant-spin-blur when a wrapping Spin blocks its content).
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(container.querySelector(".ant-spin-blur")).toBeNull();
  });

  it("renders no refresh indicator when the source is idle", () => {
    const { container } = renderHarness();
    // antd v6 always renders the Spin wrapper; idle means it is not busy
    // and not actively spinning (no overlay).
    expect(container.firstElementChild).not.toHaveAttribute(
      "aria-busy",
      "true"
    );
    expect(container.querySelector(".ant-spin-spinning")).toBeNull();
  });

  it("applies rowClassName to desktop rows", () => {
    const { container } = renderHarness({
      override: {
        rowClassName: (r) => (r.name === "Alice" ? "row-vip" : undefined),
      },
    });
    const vip = container.querySelectorAll("tr.row-vip");
    expect(vip).toHaveLength(1);
    // Bob's row resolves undefined → no stray "undefined" class either.
    expect(vip[0]).toHaveTextContent("Alice");
    expect(container.querySelector("tr.undefined")).toBeNull();
  });

  it("applies rowClassName to the mobile card root", () => {
    const { container } = renderHarness({
      override: {
        isMobile: true,
        rowClassName: (r) => (r.name === "Alice" ? "card-vip" : undefined),
      },
    });
    const vip = container.querySelectorAll(".ant-card.card-vip");
    expect(vip).toHaveLength(1);
    expect(vip[0]).toHaveTextContent("Alice");
  });

  it("renders no expand affordance without renderRowDetail", () => {
    renderHarness();
    expect(screen.queryByRole("button", { name: "Expand row" })).toBeNull();
  });

  it("expands and collapses a row detail via antd's native expandable", () => {
    const onRowClick = vi.fn();
    renderHarness({
      override: {
        onRowClick,
        renderRowDetail: (r) => <div>detail-{r.name}</div>,
      },
    });
    // Nothing expanded initially: no detail row in the DOM at all.
    expect(screen.queryByText("detail-Alice")).toBeNull();
    const toggles = screen.getAllByRole("button", { name: "Expand row" });
    expect(toggles).toHaveLength(2); // one per row
    expect(toggles[0]).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggles[0]!);
    // Controlled round-trip: the icon toggles chrome state, chrome state
    // feeds antd's expandedRowKeys, antd renders the dedicated detail row.
    expect(screen.getByText("detail-Alice")).toBeVisible();
    expect(
      document.querySelector(".ant-table-expanded-row")
    ).toBeInTheDocument();
    const collapse = screen.getByRole("button", { name: "Collapse row" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    // The expand icon is an interactive child — it never activates the row.
    expect(onRowClick).not.toHaveBeenCalled();

    fireEvent.click(collapse);
    // rc-table keeps a once-expanded detail row mounted but hidden.
    expect(screen.getByText("detail-Alice").closest("tr")).not.toBeVisible();
    expect(screen.getAllByRole("button", { name: "Expand row" })).toHaveLength(
      2
    );
  });

  it("keeps a row's detail open across sorting (id-keyed expandedRowKeys)", () => {
    renderHarness({
      override: { renderRowDetail: (r) => <div>detail-{r.name}</div> },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Expand row" })[0]!);
    expect(screen.getByText("detail-Alice")).toBeVisible();
    // Sort descending: Bob now leads, but Alice's panel stays open because
    // the expansion state is keyed by row id, not position.
    const header = () => screen.getByRole("columnheader", { name: /name/i });
    fireEvent.click(header());
    fireEvent.click(header());
    expect(adapter.getSearch()).toContain("sortDir=desc");
    expect(screen.getByText("detail-Alice")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Collapse row" })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("honors labels.expandRow/collapseRow on the expand icon", () => {
    renderHarness({
      override: {
        renderRowDetail: (r) => <div>detail-{r.name}</div>,
        labels: { expandRow: "Open details", collapseRow: "Close details" },
      },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Open details" })[0]!
    );
    expect(
      screen.getByRole("button", { name: "Close details" })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("expands and collapses a mobile card's detail section via the chevron", () => {
    renderHarness({
      override: {
        isMobile: true,
        renderRowDetail: (r) => <div>detail-{r.name}</div>,
      },
    });
    expect(screen.queryByText("detail-Alice")).toBeNull();
    const toggle = screen.getAllByRole("button", { name: "Expand row" })[0]!;
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const detail = screen.getByText("detail-Alice");
    // The detail section renders inside the card itself.
    expect(
      detail.closest('[data-adapttable-part="card-detail"]')
    ).not.toBeNull();
    expect(detail.closest(".ant-card")).not.toBeNull();
    // The second card stays collapsed.
    expect(screen.queryByText("detail-Bob")).toBeNull();

    fireEvent.click(toggle);
    expect(screen.queryByText("detail-Alice")).toBeNull();
  });

  it("renders the mobile chevron beside row actions, without activating the row", () => {
    const onRowClick = vi.fn();
    renderHarness({
      override: {
        isMobile: true,
        onRowClick,
        renderRowDetail: (r) => <div>detail-{r.name}</div>,
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
      },
    });
    // The first card carries both the chevron and the action button.
    const card = screen.getAllByRole("listitem")[0]!;
    expect(
      within(card).getByRole("button", { name: "Expand row" })
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Edit" })
    ).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Expand row" }));
    expect(screen.getByText("detail-Alice")).toBeInTheDocument();
    // The chevron is an interactive child — it never activates the row…
    expect(onRowClick).not.toHaveBeenCalled();
    // …while a click on the card body still does.
    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice" })
    );
  });

  it("memoizes mobile cards: a search keystroke re-invokes no accessors for unchanged cards", () => {
    const nameAccessor = vi.fn((r: Row) => r.name);
    const cityAccessor = vi.fn((r: Row) => r.city);
    renderHarness({
      override: {
        isMobile: true,
        columns: [
          { key: "name", header: "Name", accessor: nameAccessor },
          { key: "city", header: "City", accessor: cityAccessor },
        ],
        bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
        renderRowDetail: (r) => <div>detail-{r.name}</div>,
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
        rowClassName: (r) => (r.name === "Alice" ? "card-vip" : undefined),
        onRowClick: vi.fn(),
        prefetch: vi.fn(),
      },
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(nameAccessor).toHaveBeenCalled();
    nameAccessor.mockClear();
    cityAccessor.mockClear();

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "a" },
    });
    // The toolbar re-rendered (controlled search input)…
    expect(screen.getByLabelText("Search")).toHaveValue("a");
    // …but every unchanged card bailed out: no accessor ran again.
    expect(nameAccessor).not.toHaveBeenCalled();
    expect(cityAccessor).not.toHaveBeenCalled();

    // A real change (selecting a card) re-renders that card.
    fireEvent.click(screen.getAllByLabelText("Select row")[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });
});

/* ── Declarative columns, filters & data tiers ─────────────────────── */

interface Person {
  id: string;
  firstName: string;
  city: string;
  role: string;
  hiredAt: string;
  age: number;
  department: { name: string };
}

const PEOPLE: Person[] = [
  {
    id: "1",
    firstName: "Alice",
    city: "Dubai",
    role: "admin",
    hiredAt: "2026-01-15",
    age: 30,
    department: { name: "Engineering" },
  },
  {
    id: "2",
    firstName: "Bob",
    city: "Riyadh",
    role: "editor",
    hiredAt: "2025-06-01",
    age: 45,
    department: { name: "Sales" },
  },
];

// Zero ceremony: no headers, no accessors — and a column-level filter.
const personColumns: ColumnDef<Person>[] = [
  { key: "firstName", filter: "text" },
  { key: "city" },
  { key: "department.name" },
];

const CITY_FILTER: FilterDef<Person>[] = [
  {
    key: "city",
    type: "select",
    options: [
      { value: "Dubai", label: "Dubai" },
      { value: "Riyadh", label: "Riyadh" },
    ],
  },
];

const TYPE_FILTERS: FilterDef<Person>[] = [
  { key: "firstName", type: "text", placeholder: "Type a name" },
  ...CITY_FILTER,
  {
    key: "role",
    type: "multiSelect",
    options: [
      { value: "admin", label: "Admin" },
      { value: "editor", label: "Editor" },
    ],
  },
  { key: "hiredAt", type: "dateRange" },
  { key: "age", type: "numberRange" },
];

function renderZero(
  override: Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">> = {},
  url = ""
) {
  adapter = createMemoryAdapter(url);
  return render(
    <ConfigProvider>
      <DataTable<Person>
        data={PEOPLE}
        columns={personColumns}
        rowKey={(r) => r.id}
        urlAdapter={adapter}
        {...override}
      />
    </ConfigProvider>
  );
}

/** Open the Filters popover and return its floating container. */
function openFilters(): HTMLElement {
  fireEvent.click(screen.getByRole("button", { name: /filters/i }));
  return document.querySelector<HTMLElement>(".ant-popover")!;
}

/** The adapter's query string, percent-decoded for readable assertions. */
const urlState = () => decodeURIComponent(adapter.getSearch());

describe("<DataTable> declarative engine (Ant Design)", () => {
  it("column filter shorthands alone (no filters prop) render the auto form", () => {
    renderZero();
    const popover = openFilters();
    // personColumns declares `filter: "text"` on firstName — the form must
    // appear without any `filters` prop at all.
    expect(
      popover.querySelector('input[type="text"], .ant-input')
    ).not.toBeNull();
  });

  it("filters rows, shows chips, and clears — end to end with zero ceremony", () => {
    renderZero({ filters: CITY_FILTER });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    // The column `filter: "text"` shorthand renders in the auto-built form.
    const popover = openFilters();
    fireEvent.change(within(popover).getByLabelText("First Name"), {
      target: { value: "ali" },
    });
    expect(urlState()).toContain("f_firstName=ali");
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).toBeNull();
    expect(screen.getByText("First Name: ali")).toBeInTheDocument();

    // The standalone select definition narrows further and chips up too.
    fireEvent.change(within(popover).getByLabelText("City"), {
      target: { value: "Dubai" },
    });
    expect(urlState()).toContain("f_city=Dubai");
    expect(screen.getByText("City: Dubai")).toBeInTheDocument();

    // Clear-all from the chip strip restores every row and the URL.
    const chipStrip = screen.getByRole("list", { name: "Filters" });
    fireEvent.click(within(chipStrip).getByText("Clear all"));
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(urlState()).not.toContain("f_");
  });

  it("derives headers from column keys when none are declared", () => {
    renderZero();
    expect(
      screen.getByRole("columnheader", { name: "First Name" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "City" })
    ).toBeInTheDocument();
    // "department.name" humanizes its last path segment.
    expect(
      screen.getByRole("columnheader", { name: "Name" })
    ).toBeInTheDocument();
  });

  it("renders nested values through dot-path column keys", () => {
    renderZero();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("server tier: emits once on mount with URL-restored params and leaves rows untouched", () => {
    adapter = createMemoryAdapter("page=2&q=ali&f_city=Dubai");
    const onQueryChange = vi.fn();
    render(
      <ConfigProvider>
        <DataTable<Person>
          data={PEOPLE}
          total={57}
          onQueryChange={onQueryChange}
          columns={personColumns}
          filters={CITY_FILTER}
          rowKey={(r) => r.id}
          urlAdapter={adapter}
        />
      </ConfigProvider>
    );
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    const [query, info] = onQueryChange.mock.calls[0] as [
      { page: number; search: string; limit: number; filters: object },
      { signal: AbortSignal },
    ];
    expect(query).toMatchObject({
      page: 2,
      limit: 25,
      search: "ali",
      filters: { city: "Dubai" },
    });
    expect(info.signal).toBeInstanceOf(AbortSignal);
    // Rows render exactly as handed in — no client-side predicate, even
    // though the search and the city filter are active.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    // The antd pager reflects the server total, not the row count.
    expect(screen.getByText("Showing 26–50 of 57")).toBeInTheDocument();
  });

  it("writes the right state key(s) for every declarative filter type", () => {
    renderZero({ columns: [{ key: "firstName" }], filters: TYPE_FILTERS });
    const popover = openFilters();

    fireEvent.change(within(popover).getByLabelText("First Name"), {
      target: { value: "ali" },
    });
    expect(urlState()).toContain("f_firstName=ali");
    expect(
      within(popover).getByPlaceholderText("Type a name")
    ).toBeInTheDocument();

    fireEvent.change(within(popover).getByLabelText("City"), {
      target: { value: "Dubai" },
    });
    expect(urlState()).toContain("f_city=Dubai");

    fireEvent.click(within(popover).getByRole("checkbox", { name: "Admin" }));
    expect(urlState()).toContain("f_role=admin");
    fireEvent.click(within(popover).getByRole("checkbox", { name: "Editor" }));
    expect(urlState()).toContain("f_role=admin,editor");

    // dateRange is operator-first: a single-bound comparison plus one value
    // writes ONLY that bound's key.
    fireEvent.mouseDown(
      within(popover).getByRole("combobox", { name: "Hired At Operator" })
    );
    fireEvent.click(within(popover).getByTitle("On or after"));
    fireEvent.change(within(popover).getByLabelText("Hired At Value"), {
      target: { value: "2026-01-01" },
    });
    expect(urlState()).toContain("f_hiredAtFrom=2026-01-01");
    expect(urlState()).not.toContain("f_hiredAtTo");

    // numberRange "Between" swaps in the labeled From/To pair → both keys.
    fireEvent.mouseDown(
      within(popover).getByRole("combobox", { name: "Age Operator" })
    );
    // Both flavours list "Between"; the age dropdown rendered last.
    fireEvent.click(within(popover).getAllByTitle("Between").at(-1)!);
    fireEvent.change(within(popover).getByLabelText("Age From"), {
      target: { value: "30" },
    });
    fireEvent.change(within(popover).getByLabelText("Age To"), {
      target: { value: "40" },
    });
    expect(urlState()).toContain("f_ageMin=30");
    expect(urlState()).toContain("f_ageMax=40");
  });

  it("restores control values from the URL and clears their keys when emptied", () => {
    renderZero(
      { columns: [{ key: "firstName" }], filters: TYPE_FILTERS },
      "f_firstName=ali&f_city=Dubai&f_role=admin&f_ageMin=30&f_ageMax=40&f_hiredAtFrom=2026-01-01"
    );
    const popover = openFilters();

    // Every control rehydrates from its URL-restored state key. The range
    // widgets derive their operator from the persisted pair: distinct
    // bounds → Between, a lower bound alone → On or after.
    expect(within(popover).getByLabelText("First Name")).toHaveValue("ali");
    expect(within(popover).getByLabelText("City")).toHaveValue("Dubai");
    expect(
      within(popover).getByRole("checkbox", { name: "Admin" })
    ).toBeChecked();
    expect(within(popover).getByTitle("Between")).toBeInTheDocument();
    expect(within(popover).getByLabelText("Age From")).toHaveValue("30");
    expect(within(popover).getByLabelText("Age To")).toHaveValue("40");
    expect(within(popover).getByTitle("On or after")).toBeInTheDocument();
    expect(within(popover).getByLabelText("Hired At Value")).toHaveValue(
      "2026-01-01"
    );

    // Emptying each control removes its key (and URL param) entirely.
    fireEvent.change(within(popover).getByLabelText("First Name"), {
      target: { value: "" },
    });
    fireEvent.change(within(popover).getByLabelText("City"), {
      target: { value: "" },
    });
    fireEvent.click(within(popover).getByRole("checkbox", { name: "Admin" }));
    fireEvent.change(within(popover).getByLabelText("Age From"), {
      target: { value: "" },
    });
    fireEvent.change(within(popover).getByLabelText("Age To"), {
      target: { value: "" },
    });
    fireEvent.change(within(popover).getByLabelText("Hired At Value"), {
      target: { value: "" },
    });
    expect(urlState()).not.toContain("f_");
  });

  it("mounts the range widget as Equal+value when the URL pair matches", () => {
    renderZero(
      {
        columns: [{ key: "firstName" }],
        filters: [{ key: "budget", type: "numberRange" }],
      },
      "f_budgetMin=5&f_budgetMax=5"
    );
    const popover = openFilters();
    expect(within(popover).getByTitle("Equal")).toBeInTheDocument();
    const value = within(popover).getByLabelText("Budget Value");
    expect(value).toHaveValue("5");
    // Equal keeps mirroring: editing the value rewrites BOTH keys.
    fireEvent.change(value, { target: { value: "7" } });
    expect(urlState()).toContain("f_budgetMin=7");
    expect(urlState()).toContain("f_budgetMax=7");
  });

  it("hides the filters button when the declarative array resolves to no definitions", () => {
    renderZero({ columns: [{ key: "firstName" }], filters: [] });
    expect(screen.queryByRole("button", { name: /filters/i })).toBeNull();
  });
});
