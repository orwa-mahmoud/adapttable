/**
 * Gap-fill: mobile selection + row actions, footer interactions, and the
 * bulk disabled-reason path. Virtual-window rendering is driven through a
 * mocked `useChromeBodyData` (the loader wiring itself lives in core).
 */
import {
  createMemoryAdapter,
  useChromeBodyData,
  useFrontendData,
  type VirtualTableRow,
} from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useChromeBodyData: vi.fn(),
  };
});

let adapter: ReturnType<typeof createMemoryAdapter>;

beforeEach(() => {
  // Mirror the real hook's disabled state so non-virtual tests render the
  // full row set with a working load-more gate.
  vi.mocked(useChromeBodyData).mockImplementation((chrome, props) => ({
    virtualization: {
      enabled: false,
      rows: [],
      paddingTop: 0,
      paddingBottom: 0,
    },
    loadMoreRef: { current: null },
    canLoadMore: !chrome.isPaged && !props.source.error,
    virtualScrollRef: () => undefined,
  }));
});

function Harness(props: {
  isMobile?: boolean;
  mode?: "paged" | "infinite";
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}) {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns,
    paginationMode: props.mode ?? "paged",
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
  return render(<Harness {...props} />);
}

describe("<DataTable> (unstyled) gaps", () => {
  it("mobile: selection checkboxes toggle and bulk bar appears", () => {
    renderHarness({
      isMobile: true,
      override: { bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] },
    });
    const checkboxes = screen.getAllByLabelText("Select row");
    expect(checkboxes).toHaveLength(2);
    fireEvent.click(checkboxes[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("mobile: row actions render and fire", () => {
    const onClick = vi.fn();
    renderHarness({
      isMobile: true,
      override: { rowActions: [{ key: "e", label: "Edit", onClick }] },
    });
    fireEvent.click(screen.getAllByLabelText("Edit")[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("footer: changing rows-per-page commits a new limit", () => {
    renderHarness({}, "page=1");
    const select = screen.getAllByLabelText("Rows per page")[0]!;
    fireEvent.change(select, { target: { value: "50" } });
    expect(adapter.getSearch()).toContain("limit=50");
  });

  it("footer: previous button goes back a page", () => {
    renderHarness({}, "limit=1&page=2");
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    // page=1 is the default and is dropped from the URL.
    expect(adapter.getSearch()).not.toContain("page=2");
  });

  it("bulk action with a disabledReason is disabled and titled", () => {
    const onClick = vi.fn();
    renderHarness({
      override: {
        bulkActions: [
          {
            key: "del",
            label: "Delete",
            onClick,
            disabledReason: () => "Referenced",
          },
        ],
      },
    });
    fireEvent.click(screen.getByLabelText("Select all"));
    const btn = screen.getByText("Delete");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("title", "Referenced");
  });

  it("keeps a bulk action enabled when disabledReason returns an empty string", () => {
    renderHarness({
      override: {
        bulkActions: [
          {
            key: "del",
            label: "Delete",
            onClick: vi.fn(),
            disabledReason: () => "",
          },
        ],
      },
    });
    fireEvent.click(screen.getByLabelText("Select all"));
    expect(screen.getByText("Delete")).not.toBeDisabled();
  });

  // Sticky header is opt-in (default off). When enabled it is applied to the
  // header *cells* inline (not a `<thead>`), with a `data-sticky` hook so the
  // consumer can give them an opaque background.
  it("does not stick header cells by default (opt-in)", () => {
    renderHarness();
    const th = screen.getByText("Name").closest("th");
    expect(th).not.toHaveStyle({ position: "sticky" });
  });

  it("sticks header cells when stickyHeader is enabled", () => {
    renderHarness({ override: { stickyHeader: true } });
    const th = screen.getByText("Name").closest("th");
    expect(th).toHaveStyle({ position: "sticky" });
    expect(th).toHaveAttribute("data-sticky");
  });

  it("toggles an individual desktop row via its selection checkbox", () => {
    renderHarness({
      override: { bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] },
    });
    // The per-row checkboxes are distinct from the header "Select all" box.
    const rowCheckbox = screen.getAllByLabelText("Select row")[0]!;
    fireEvent.click(rowCheckbox);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("labels a resize handle with the column key for a non-string header", () => {
    // resizableColumns turns on the resize handle; a non-string header forces
    // the aria-label to fall back to the column key.
    renderHarness({
      override: {
        resizableColumns: true,
        columns: [
          { key: "name", header: <em>Name</em>, accessor: (r) => r.name },
        ],
      },
    });
    expect(
      screen.getByRole("button", { name: /resize column: name/i })
    ).toBeInTheDocument();
  });

  it("fires prefetch on desktop row hover", () => {
    const prefetch = vi.fn();
    renderHarness({ override: { prefetch } });
    const row = screen.getByText("Alice").closest("tr")!;
    fireEvent.mouseEnter(row);
    expect(prefetch).toHaveBeenCalledWith(ROWS[0]);
  });

  it("renders a sort-by select and commits a sort", () => {
    renderHarness({
      override: { sortByOptions: [{ value: "name", label: "Name" }] },
    });
    fireEvent.change(screen.getByLabelText("Sort by"), {
      target: { value: "name" },
    });
    expect(adapter.getSearch()).toContain("sortBy=name");
  });

  it("renders the filters button without a count when no filters are active", () => {
    renderHarness({
      override: { filters: <div>filter body</div> },
    });
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("opens a modal filter drawer with backdrop and done action", () => {
    renderHarness({
      override: { filters: <div>filter body</div>, filtersMode: "drawer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByText("filter body")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull();
  });

  it("closes the filter drawer on Escape", () => {
    renderHarness({
      override: { filters: <div>filter body</div>, filtersMode: "drawer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull();
  });

  it("virtualizes desktop rows when enabled", () => {
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: true,
        rows: [
          {
            row: { id: "b", name: "Bob" },
            index: 1,
            key: "b",
          } satisfies VirtualTableRow<Row>,
        ],
        paddingTop: 40,
        paddingBottom: 40,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: true,
      virtualScrollRef: () => undefined,
    });
    renderHarness({
      mode: "infinite",
      override: { virtualize: true, estimateRowSize: 40 },
    });
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("virtualizes mobile cards when enabled", () => {
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: true,
        rows: [
          {
            row: { id: "b", name: "Bob" },
            index: 1,
            key: "b",
          } satisfies VirtualTableRow<Row>,
        ],
        paddingTop: 132,
        paddingBottom: 0,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: true,
      virtualScrollRef: () => undefined,
    });
    renderHarness({
      isMobile: true,
      mode: "infinite",
      override: { virtualize: true, estimateCardSize: 132 },
    });
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("changes the toolbar rows-per-page select in infinite mode", () => {
    // In infinite (non-paged) mode the toolbar renders its own rows-per-page
    // select (separate from the footer), covering DataTable's setLimit handler.
    renderHarness({ mode: "infinite" });
    const select = screen.getByLabelText("Rows per page");
    fireEvent.change(select, { target: { value: "50" } });
    expect(adapter.getSearch()).toContain("limit=50");
  });
});
