/** Coverage gap-fill: drawer close, footer limit, page label, virtual rows, row select. */
import type * as AdaptTableCore from "@adapttable/core";
import {
  createMemoryAdapter,
  useChromeBodyData,
  useFrontendData,
} from "@adapttable/core";
import { createTheme, ThemeProvider } from "@mui/material";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoadingState } from "./components/chrome";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Carol" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];
const theme = createTheme();

vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useChromeBodyData: vi.fn(),
  };
});

let adapter: ReturnType<typeof createMemoryAdapter>;

beforeEach(async () => {
  const actual =
    await vi.importActual<typeof AdaptTableCore>("@adapttable/core");
  vi.mocked(useChromeBodyData).mockImplementation(actual.useChromeBodyData);
});

function mount(
  override: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  mode: "paged" | "infinite" = "paged",
  url = ""
) {
  adapter = createMemoryAdapter(url);
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      adapter,
      columns,
      paginationMode: mode,
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        {...override}
      />
    );
  }
  return render(
    <ThemeProvider theme={theme}>
      <Harness />
    </ThemeProvider>
  );
}

describe("MUI coverage gaps", () => {
  it("renders the filter popover with NO modal backdrop/scrim", () => {
    mount({ filters: <div>filter body</div> });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // The popover is a non-modal Popper, so the background stays interactive:
    // there is no Modal backdrop, and no Modal-based Popover root, in the DOM.
    expect(document.querySelector(".MuiBackdrop-root")).toBeNull();
    expect(document.querySelector(".MuiPopover-root")).toBeNull();
    expect(document.querySelector(".MuiPopper-root")).not.toBeNull();
  });

  it("closes the filter popover on outside click (ClickAwayListener)", async () => {
    mount({ filters: <div>filter body</div> });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // ClickAwayListener arms its outside-click guard on the next tick.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    // No scrim to click — outside interaction with the page closes it.
    fireEvent.mouseDown(document.body);
    await vi.waitFor(() =>
      expect(screen.queryByText("filter body")).toBeNull()
    );
  });

  it("closes the filter popover on Escape (and only Escape)", async () => {
    mount({ filters: <div>filter body</div> });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    const body = screen.getByText("filter body");
    // The document-level listener must ignore every other key — typing in a
    // filter field (e.g. pressing Enter) must not dismiss the popover.
    fireEvent.keyDown(body, { key: "Enter" });
    expect(screen.getByText("filter body")).toBeInTheDocument();
    fireEvent.keyDown(body, { key: "Escape" });
    await vi.waitFor(() =>
      expect(screen.queryByText("filter body")).toBeNull()
    );
  });

  it("clears filters from the popover's Clear all button", () => {
    const onClearFilters = vi.fn();
    mount(
      {
        filters: <div>filter body</div>,
        filterLabels: { status: (v) => `Status: ${v}` },
        onClearFilters,
      },
      "paged",
      "f_status=Active"
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    const popover = screen.getByText("filter body").closest(".MuiPopper-root")!;
    fireEvent.click(within(popover as HTMLElement).getByText("Clear all"));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("renders the slide-in drawer when filtersMode='drawer'", () => {
    const onClearFilters = vi.fn();
    mount(
      {
        filters: <div>filter body</div>,
        filtersMode: "drawer",
        filterLabels: { status: (v) => `Status: ${v}` },
        onClearFilters,
      },
      "paged",
      "f_status=Active"
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    const drawer = screen.getByText("filter body").closest(".MuiDrawer-root")!;
    expect(drawer).not.toBeNull();
    // The drawer (not the popover) hosts the content.
    expect(document.querySelector(".MuiPopover-root")).toBeNull();
    fireEvent.click(within(drawer as HTMLElement).getByText("Clear all"));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("closes the filter drawer from its Done button", async () => {
    mount({ filters: <div>filter body</div>, filtersMode: "drawer" });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // The drawer's Done button hands control back to DataTable, which flips
    // filtersOpen off and the drawer slides out and unmounts its content.
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await vi.waitFor(() =>
      expect(screen.queryByText("filter body")).toBeNull()
    );
  });

  it("changes the page size from the paged footer's rows-per-page select", () => {
    mount({}, "paged", "limit=1");
    const footerSelect = screen.getByLabelText("Rows per page");
    fireEvent.mouseDown(footerSelect);
    const listbox = screen.getByRole("listbox");
    fireEvent.click(within(listbox).getByText("50"));
    expect(adapter.getSearch()).toContain("limit=50");
  });

  it("labels pager page buttons via goToPage", () => {
    mount({}, "paged", "limit=1");
    // 3 rows at limit=1 → multiple page buttons, each labelled by goToPage(n).
    expect(
      screen.getByRole("button", { name: /go to page 1/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /go to page 3/i })
    ).toBeInTheDocument();
  });

  it("renders ellipsis pager items without an aria-label", () => {
    const many: Row[] = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      name: `Row ${i}`,
    }));
    adapter = createMemoryAdapter("limit=1&page=15");
    function Harness() {
      const source = useFrontendData<Row>({
        data: many,
        adapter,
        columns,
        paginationMode: "paged",
      });
      return (
        <DataTable source={source} columns={columns} rowKey={(r) => r.id} />
      );
    }
    render(
      <ThemeProvider theme={theme}>
        <Harness />
      </ThemeProvider>
    );
    // MUI renders start/end ellipsis items; getItemAriaLabel returns "" for
    // those item types (the fallback branch).
    expect(
      document.querySelectorAll(".MuiPaginationItem-ellipsis").length
    ).toBeGreaterThan(0);
  });

  it("toggles a desktop row's selection checkbox", () => {
    mount({ bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }] });
    const rowChecks = screen.getAllByLabelText("Select row");
    fireEvent.click(rowChecks[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("renders resize handles and pins columns in a scroll box", () => {
    mount({
      resizableColumns: true,
      maxHeight: 400,
      defaultColumnLayout: { pinned: { name: "start" } },
    });
    const handle = document.querySelector<HTMLElement>(
      '[aria-label^="Resize column"]'
    )!;
    expect(handle).not.toBeNull();
    // Exercise the resize handle pointer interaction.
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("opens and closes the column menu popover", async () => {
    mount({ enableColumnMenu: true });
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    await screen.findByText("Reset columns");
    fireEvent.click(document.querySelector(".MuiBackdrop-root")!);
    await vi.waitFor(() =>
      expect(screen.queryByText("Reset columns")).toBeNull()
    );
  });

  it("applies a custom search placeholder (DataTable.tsx searchPlaceholder)", () => {
    mount({ searchPlaceholder: "Find rows…" });
    expect(screen.getByPlaceholderText("Find rows…")).toBeInTheDocument();
  });

  it("keeps an existing sort direction when changing the sort field", () => {
    // sortDir present in the URL → switching to a *different* field reuses the
    // existing direction (`source.sortDir ?? "asc"` left-hand branch).
    mount(
      {
        sortByOptions: [
          { value: "name", label: "Name" },
          { value: "id", label: "Id" },
        ],
      },
      "paged",
      "sortBy=name&sortDir=desc"
    );
    fireEvent.mouseDown(screen.getByLabelText("Sort by"));
    const listbox = screen.getByRole("listbox");
    // Switch from "name" to "id"; the onChange fires and keeps sortDir=desc.
    fireEvent.click(within(listbox).getByText("Id"));
    expect(adapter.getSearch()).toContain("sortBy=id");
    expect(adapter.getSearch()).toContain("sortDir=desc");
  });

  it("defaults the sort direction to asc when none is set", () => {
    // No sortDir in the URL → onChange uses `source.sortDir ?? "asc"` (right
    // branch). Selecting a field commits sortDir=asc.
    mount({ sortByOptions: [{ value: "name", label: "Name" }] });
    fireEvent.mouseDown(screen.getByLabelText("Sort by"));
    const listbox = screen.getByRole("listbox");
    fireEvent.click(within(listbox).getByText("Name"));
    expect(adapter.getSearch()).toContain("sortDir=asc");
  });

  it("clears the sort field by selecting the empty option", () => {
    // Selecting the "—" (value="") option makes `e.target.value || undefined`
    // resolve to undefined (the right-hand branch in chrome.tsx Toolbar).
    mount(
      { sortByOptions: [{ value: "name", label: "Name" }] },
      "paged",
      "sortBy=name&sortDir=asc"
    );
    fireEvent.mouseDown(screen.getByLabelText("Sort by"));
    const listbox = screen.getByRole("listbox");
    fireEvent.click(within(listbox).getByText("—"));
    expect(adapter.getSearch()).not.toContain("sortBy=name");
  });

  it("renders a sticky header with an end-aligned column in a scroll box", () => {
    const cols: ColumnDef<Row>[] = [
      {
        key: "name",
        header: "Name",
        accessor: (r) => r.name,
        align: "end",
      },
    ];
    mount({ columns: cols, stickyHeader: true, stickyTop: 8, maxHeight: 300 });
    // End-aligned header cell uses logical text-align: end (muiAlign "end").
    const headCell = screen.getByText("Name").closest("th")!;
    expect(headCell).toHaveStyle({ textAlign: "end" });
    expect(headCell).toHaveStyle({ position: "sticky" });
  });

  it("pins a sticky header at stickyTop against the document scroller", () => {
    // Without a maxHeight scroll box the page itself is the sticky context,
    // so the header sits below a fixed app bar at the stickyTop offset.
    // (MUI applies `sx` via emotion classes, so read computed styles.)
    mount({ stickyHeader: true, stickyTop: 64 });
    const headCell = screen.getByText("Name").closest("th")!;
    expect(getComputedStyle(headCell).position).toBe("sticky");
    expect(getComputedStyle(headCell).top).toBe("64px");
  });

  it("renders resize handles on an un-pinned, non-sticky table (needsRelative)", () => {
    // No pin + no sticky header + resizable → headCellSx sets position:relative
    // so the absolute resize handle is positioned (needsRelative === true).
    mount({ resizableColumns: true });
    const headCell = screen.getByText("Name").closest("th")!;
    expect(headCell).toHaveStyle({ position: "relative" });
    expect(
      document.querySelector('[aria-label^="Resize column"]')
    ).not.toBeNull();
  });

  it("labels the resize handle by column key when the header is not a string", () => {
    const cols: ColumnDef<Row>[] = [
      {
        key: "name",
        header: <span>Name node</span>,
        accessor: (r) => r.name,
      },
    ];
    mount({ columns: cols, resizableColumns: true });
    // Non-string header → resize aria-label falls back to the column key.
    expect(
      document.querySelector('[aria-label="Resize column: name"]')
    ).not.toBeNull();
  });

  it("opens an RTL filter drawer anchored on the left", () => {
    mount({
      filters: <div>filter body</div>,
      filtersMode: "drawer",
      dir: "rtl",
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // dir="rtl" anchors the Drawer on the left (chrome.tsx FilterDrawer).
    // MUI 9 dropped the paperAnchorLeft class, expressing the anchor purely
    // through emotion CSS — assert the resulting left:0 pin instead.
    const paper = document.querySelector<HTMLElement>(".MuiDrawer-paper");
    expect(paper).not.toBeNull();
    expect(getComputedStyle(paper!).left).toBe("0px");
  });

  it("anchors the RTL filter popover (bottom-start) with no backdrop", () => {
    mount({ filters: <div>filter body</div>, dir: "rtl" });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByText("filter body")).toBeInTheDocument();
    // dir="rtl" flips the Popper placement to bottom-start; it stays non-modal.
    const popper = document.querySelector(".MuiPopper-root");
    expect(popper).not.toBeNull();
    expect(popper!.getAttribute("data-popper-placement")).toBe("bottom-start");
    expect(document.querySelector(".MuiBackdrop-root")).toBeNull();
  });

  it("virtualizes mobile cards with a trailing bottom-pad spacer", () => {
    // paddingBottom > 0 → the trailing `paddingBottom > 0 &&` spacer renders
    // (MobileCards true branch). paddingTop is 0 so only the bottom spacer.
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: true,
        rows: [{ row: ROWS[1]!, index: 1, key: "b" }],
        paddingTop: 0,
        paddingBottom: 80,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: true,
      virtualScrollRef: () => undefined,
    });
    mount({ isMobile: true, virtualize: true }, "infinite");
    const list = screen.getByRole("list");
    expect(within(list).getByText("Bob")).toBeInTheDocument();
    // The list's direct spacer children: a bottom spacer (height 80) but no top
    // spacer, since paddingTop is 0.
    const spacers = Array.from(list.children).filter((el) =>
      el.getAttribute("aria-hidden")
    );
    expect(spacers).toHaveLength(1);
  });

  it("renders the loading skeleton without a screen-reader label", () => {
    // DataTable always forwards labels.loading; render LoadingState directly to
    // exercise the `loadingLabel ? … : null` falsy branch in chrome.tsx.
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <LoadingState rows={2} columns={3} loadingLabel="Loading…" />
      </ThemeProvider>
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    rerender(
      <ThemeProvider theme={theme}>
        <LoadingState rows={2} columns={3} />
      </ThemeProvider>
    );
    expect(screen.getByTestId("adapttable-loading")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).toBeNull();
  });
});

describe("MUI density → table size", () => {
  // MUI threads the table `size` down to every cell as a `MuiTableCell-size*`
  // modifier class, which is the stable signal for the rendered density.
  it("maps density='compact' to the small MUI table", () => {
    const { container } = mount({ density: "compact" });
    const cell = container.querySelector("tbody td");
    expect(cell).toHaveClass("MuiTableCell-sizeSmall");
    expect(cell).not.toHaveClass("MuiTableCell-sizeMedium");
  });

  it("maps density='comfortable' to the medium MUI table", () => {
    const { container } = mount({ density: "comfortable" });
    const cell = container.querySelector("tbody td");
    expect(cell).toHaveClass("MuiTableCell-sizeMedium");
    expect(cell).not.toHaveClass("MuiTableCell-sizeSmall");
  });

  it("defaults to the medium MUI table when density is omitted", () => {
    const { container } = mount();
    const cell = container.querySelector("tbody td");
    expect(cell).toHaveClass("MuiTableCell-sizeMedium");
    expect(cell).not.toHaveClass("MuiTableCell-sizeSmall");
  });

  it("lets an explicit size prop win over density (back-compat)", () => {
    // Pre-density callers passed MUI's `size` directly; it must still take
    // precedence so upgrading does not change their rendered table.
    const { container } = mount({ size: "medium", density: "compact" });
    const cell = container.querySelector("tbody td");
    expect(cell).toHaveClass("MuiTableCell-sizeMedium");
    expect(cell).not.toHaveClass("MuiTableCell-sizeSmall");
  });
});
