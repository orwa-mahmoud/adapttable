/**
 * Branch-coverage fill: both sides of the toolbar column-menu gate
 * (desktop/mobile), the search-placeholder prop, the empty sort-option reset,
 * the bounded-height scroll box, mobile virtual bottom-spacer, the skeleton
 * actions column, the non-string resize-handle header label, the enabled
 * row-action click path, the non-Escape keydown in the filter drawer, the
 * sticky header inside a bounded scroll box, the fixed-width table min-width,
 * the right-pinned actions edge, and the clickable mobile card.
 */
import {
  createMemoryAdapter,
  useChromeBodyData,
  useFrontendData,
  type VirtualTableRow,
} from "@adapttable/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
    adapter,
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

describe("<DataTable> (unstyled) branch coverage", () => {
  // DataTable.tsx:190 — `enableColumnMenu && !isMobile`, true side.
  it("renders the column menu on desktop when enableColumnMenu is set", () => {
    renderHarness({ override: { enableColumnMenu: true } });
    expect(
      screen.getByRole("button", { name: /columns/i })
    ).toBeInTheDocument();
  });

  // DataTable.tsx:190 — same gate, the `!isMobile` short-circuit (false side):
  // enableColumnMenu is on but mobile hides the menu (no clickable headers).
  it("hides the column menu on mobile even when enableColumnMenu is set", () => {
    renderHarness({ isMobile: true, override: { enableColumnMenu: true } });
    expect(screen.queryByRole("button", { name: /columns/i })).toBeNull();
  });

  // DataTable.tsx:175 — `searchPlaceholder ? {...} : undefined`, truthy side.
  it("applies a custom search placeholder when provided", () => {
    renderHarness({ override: { searchPlaceholder: "Find a row…" } });
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Find a row…"
    );
  });

  // DataTable.tsx:215 — `e.currentTarget.value || undefined`, the empty side:
  // picking the "—" option clears the sort (value === "" → undefined).
  it("clears the sort when the empty sort option is selected", () => {
    renderHarness(
      { override: { sortByOptions: [{ value: "name", label: "Name" }] } },
      "sortBy=name&sortDir=asc"
    );
    const select = screen.getByLabelText("Sort by");
    fireEvent.change(select, { target: { value: "" } });
    expect(adapter.getSearch()).not.toContain("sortBy=name");
  });

  // tables.tsx scroll-box — the wrapper always renders (the overflow hook
  // needs an element to measure), but a plain fitting table leaves it with NO
  // overflow style at all (no style attribute), so `overflow-y` stays
  // `visible` and a page-scroll sticky header is not trapped in the box.
  it("leaves the scroll box of a plain fitting table free of overflow styles", () => {
    const { container } = renderHarness();
    const box = container.querySelector('[data-adapttable-part="scroll-box"]');
    expect(box).toBeInTheDocument();
    expect(box).not.toHaveAttribute("style");
    expect(box).toContainElement(
      container.querySelector<HTMLElement>('[data-adapttable-part="table"]')
    );
  });

  // tables.tsx scroll-box — with nothing pinned and no maxHeight, the wrapper
  // becomes a horizontal scroller exactly while the measured table is wider
  // than it (many visible columns must scroll sideways, not bleed over the
  // card border), and drops the style again once the table fits.
  it("scrolls sideways only while the measured table overflows the wrapper", () => {
    let measure: (() => void) | undefined;
    class FakeResizeObserver {
      constructor(cb: () => void) {
        measure = cb;
      }
      observe() {
        // measurement is driven manually via `measure`
      }
      disconnect() {
        // nothing to tear down in the fake
      }
      unobserve() {
        // not used by the hook
      }
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const scrollWidth = vi
      .spyOn(Element.prototype, "scrollWidth", "get")
      .mockReturnValue(900);
    const clientWidth = vi
      .spyOn(Element.prototype, "clientWidth", "get")
      .mockReturnValue(600);
    try {
      const { container } = renderHarness();
      const box = container.querySelector(
        '[data-adapttable-part="scroll-box"]'
      );
      expect(box).toHaveStyle({ overflowX: "auto" });
      // Sideways ONLY — overflow-y must stay visible for sticky headers.
      expect(box?.getAttribute("style")).not.toContain("overflow-y");
      // The table fits again (columns hidden/resized): the ResizeObserver
      // re-measure clears every overflow style from the wrapper.
      scrollWidth.mockReturnValue(600);
      act(() => measure?.());
      expect(box?.getAttribute("style") ?? "").not.toContain("overflow");
    } finally {
      scrollWidth.mockRestore();
      clientWidth.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("wraps in a sideways-scrolling box when a column is pinned", () => {
    const { container } = renderHarness({
      override: { defaultColumnLayout: { pinned: { name: "start" } } },
    });
    const box = container.querySelector('[data-adapttable-part="scroll-box"]');
    expect(box).toBeInTheDocument();
    expect(box).toHaveStyle({ overflowX: "auto" });
  });

  // tables.tsx sticky top — inside a maxHeight scroll box the box itself is
  // the sticky context, so the header pins to ITS top: a viewport offset
  // Measured overflow makes the wrapper a scroll container too — the sticky
  // header must then pin to the BOX top, not the viewport offset, or it
  // floats down over the first rows.
  it("re-binds a page-sticky header to the box top once the table overflows", () => {
    let measure: (() => void) | undefined;
    class FakeResizeObserver {
      constructor(cb: () => void) {
        measure = cb;
      }
      observe() {
        // measurement is driven manually via `measure`
      }
      disconnect() {
        // nothing to tear down in the fake
      }
      unobserve() {
        // not used by the hook
      }
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const scrollWidth = vi
      .spyOn(Element.prototype, "scrollWidth", "get")
      .mockReturnValue(900);
    const clientWidth = vi
      .spyOn(Element.prototype, "clientWidth", "get")
      .mockReturnValue(600);
    try {
      renderHarness({ override: { stickyHeader: true, stickyTop: 120 } });
      act(() => measure?.());
      const th = screen.getByRole("columnheader", { name: /name/i });
      expect(th).toHaveStyle({ top: "0" });
    } finally {
      scrollWidth.mockRestore();
      clientWidth.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  // (stickyTop) would float the header mid-box and must be ignored.
  it("pins a sticky header to the scroll-box top, ignoring stickyTop", () => {
    renderHarness({
      override: { stickyHeader: true, stickyTop: 64, maxHeight: 240 },
    });
    const th = screen.getByText("Name").closest("th");
    expect(th).toHaveStyle({ position: "sticky", top: "0px" });
  });

  // tables.tsx min-width — fixed-width columns sum to a real table min-width
  // so the table overflows and scrolls horizontally instead of squishing.
  it("gives the table a min-width equal to the fixed column widths", () => {
    const { container } = renderHarness({
      override: {
        columns: [
          { key: "name", header: "Name", accessor: (r) => r.name, width: 200 },
        ],
      },
    });
    expect(
      container.querySelector('[data-adapttable-part="table"]')
    ).toHaveStyle({ minWidth: "200px" });
  });

  it("bounds the scroll box height when maxHeight is set", () => {
    const { container } = renderHarness({ override: { maxHeight: 300 } });
    const box = container.querySelector('[data-adapttable-part="scroll-box"]');
    expect(box).toBeInTheDocument();
    expect(box).toHaveStyle({
      maxHeight: "300px",
      overflowX: "auto",
      overflowY: "auto",
    });
  });

  // tables.tsx:128 — `typeof header === "string" ? header : key`, the false
  // side: a non-string header with the resize handle on falls back to the key
  // when building the resize aria-label (columnName is only used there).
  it("labels the desktop resize handle with the key for a non-string header", () => {
    renderHarness({
      override: {
        resizableColumns: true,
        columns: [
          {
            key: "name",
            header: <strong>Name</strong>,
            accessor: (r) => r.name,
          },
        ],
      },
    });
    expect(
      screen.getByRole("button", { name: /resize column: name/i })
    ).toBeInTheDocument();
  });

  // tables.tsx:128 — same conditional, the true side: a string header is used
  // verbatim in the resize aria-label.
  it("labels the desktop resize handle with a string header verbatim", () => {
    renderHarness({
      override: {
        resizableColumns: true,
        columns: [
          { key: "name", header: "Full Name", accessor: (r) => r.name },
        ],
      },
    });
    expect(
      screen.getByRole("button", { name: /resize column: full name/i })
    ).toBeInTheDocument();
  });

  // tables.tsx:400 — mobile `paddingBottom > 0`, truthy side: a virtualized
  // mobile list with a trailing spacer.
  it("renders a trailing virtual spacer in mobile cards", () => {
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: true,
        rows: [
          { row: ROWS[1]!, index: 1, key: "b" } satisfies VirtualTableRow<Row>,
        ],
        paddingTop: 0,
        paddingBottom: 120,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: true,
      virtualScrollRef: () => undefined,
    });
    const { container } = renderHarness({
      isMobile: true,
      mode: "infinite",
      override: { virtualize: true, estimateCardSize: 120 },
    });
    const spacers = container.querySelectorAll(
      '[data-adapttable-part="virtual-spacer"]'
    );
    expect(spacers).toHaveLength(1);
    expect(spacers[0]).toHaveStyle({ height: "120px" });
  });

  // chrome.tsx:242 — `hasActions ? 1 : 0`, truthy side: the skeleton adds an
  // extra column for the row-actions header while loading.
  it("adds an actions column to the loading skeleton when rowActions exist", () => {
    adapter = createMemoryAdapter("");
    function LoadingHarness() {
      const source = useFrontendData<Row>({
        data: [],
        adapter,
        columns,
        paginationMode: "paged",
        isLoading: true,
      });
      return (
        <DataTable
          source={source}
          columns={columns}
          rowKey={(r) => r.id}
          rowActions={[{ key: "e", label: "Edit", onClick: vi.fn() }]}
        />
      );
    }
    const { container } = render(<LoadingHarness />);
    // 1 data column + 1 actions column = 2 skeleton header cells.
    expect(
      container.querySelectorAll('[data-adapttable-part="loading-header-cell"]')
    ).toHaveLength(2);
  });

  // tables.tsx:66 — `if (!disabled) runRowAction(...)`, the true side via an
  // enabled desktop action button.
  it("runs an enabled desktop row action on click", () => {
    const onClick = vi.fn();
    renderHarness({
      override: { rowActions: [{ key: "e", label: "Edit", onClick }] },
    });
    fireEvent.click(screen.getAllByLabelText("Edit")[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  // tables.tsx actions edge pin — when a data column is pinned right, the
  // trailing actions column pins to the same edge (header AND body cells) so
  // it stays flush with the pinned column on horizontal scroll.
  it("pins the actions column alongside a right-pinned data column", () => {
    const { container } = renderHarness({
      override: {
        rowActions: [{ key: "e", label: "Edit", onClick: vi.fn() }],
        defaultColumnLayout: { pinned: { name: "end" } },
      },
    });
    const header = container.querySelector(
      '[data-adapttable-part="actions-header"]'
    );
    expect(header).toHaveAttribute("data-pinned", "end");
    expect(header).toHaveStyle({ position: "sticky" });
    const cell = container.querySelector(
      '[data-adapttable-part="actions-cell"]'
    );
    expect(cell).toHaveAttribute("data-pinned", "end");
    expect(cell).toHaveStyle({ position: "sticky" });
  });

  // tables.tsx mobile cards — onRowClick makes each card clickable: it gains
  // the `data-clickable` styling hook and activates the handler on click.
  it("makes mobile cards clickable when onRowClick is set", () => {
    const onRowClick = vi.fn();
    const { container } = renderHarness({
      isMobile: true,
      override: { onRowClick },
    });
    const card = container.querySelector('[data-adapttable-part="card"]');
    expect(card).toHaveAttribute("data-clickable");
    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alice" })
    );
  });

  // FilterPanel.tsx:43 — `if (event.key === "Escape")`, the false side: any
  // other key while the drawer is open must not close it.
  it("ignores non-Escape keys while the filter drawer is open", () => {
    renderHarness({
      override: { filters: <div>filter body</div>, filtersMode: "drawer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
  });
});
