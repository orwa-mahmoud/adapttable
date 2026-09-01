import { act, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DataTableShellView } from "./features/chromeBodyGate";
import { densityChooser } from "./features/density";
import { editing } from "./features/editing";
import { columnMenu, resizableColumns, savedViews } from "./features/factories";
import { useTableFeatures } from "./features/featureHost";
import { filters } from "./features/filters";
import { grouping } from "./features/grouping";
import { FeatureProviders } from "./features/providers";
import { rowActions } from "./features/row-actions";
import { rowPinning } from "./features/row-pinning";
import { rowReorder } from "./features/row-reorder";
import { applyTableFeatures, type TableFeature } from "./features/tableFeature";
import { virtualize } from "./features/virtualize";
import type { FilterDef } from "./filters/filterDefs";
import { useFrontendData } from "./source/useFrontendData";
import type { ColumnDef, RowAction } from "./types";
import { createMemoryAdapter } from "./url/adapter";
import {
  type DataTableShellProps,
  type DataTableShellResult,
  finishDataTableShell,
  useDataTableShell,
} from "./useDataTableShell";
import { resetDevWarnings } from "./utils/devWarn";
import type { ChromeBodyData } from "./virtual/chromeBodyShared";

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
const rowKey = (r: Row) => r.id;
const noForm = () => null;

function renderLiveShell(
  features: readonly TableFeature<Row>[],
  // The helper always supplies `data`, so it builds a FRONTEND table. Leaving
  // `mode` settable made `extra` a Partial of the whole tier union, and the
  // leaked `"server"` then failed to satisfy the frontend arm it always is.
  extra: Partial<
    Omit<Parameters<typeof useDataTableShell<Row>>[0], "mode">
  > = {},
  renderForm: (
    defs: readonly FilterDef<Row>[],
    source: never,
    registry: never
  ) => ReactNode = noForm
) {
  const props = applyTableFeatures({
    features,
    data: ROWS,
    columns,
    rowKey,
    urlSync: false,
    ...extra,
  });
  return renderShellWith(props, renderForm);
}

/**
 * Mount a shell from already-applied props and keep the finished view.
 *
 * One helper for every case here: the providers have to wrap the component
 * that calls the shell, and the view only exists once the gates below it have
 * run, so capturing it from the render prop is the only way to read it.
 */
function renderShellWith(
  props: object,
  renderForm: (
    defs: readonly FilterDef<Row>[],
    source: never,
    registry: never
  ) => ReactNode = noForm
) {
  let view: DataTableShellResult<Row> | undefined;
  function Probe() {
    const shell = useDataTableShell(props as never, renderForm as never);
    return (
      <DataTableShellView shell={shell}>
        {(next) => {
          view = next as DataTableShellResult<Row>;
          return null;
        }}
      </DataTableShellView>
    );
  }
  render(
    <FeatureProviders props={props}>
      <Probe />
    </FeatureProviders>
  );
  return {
    get current() {
      return view!;
    },
  };
}

interface DensityHarnessProps {
  density?: "comfortable" | "compact";
  onDensityChange?: (next: "comfortable" | "compact") => void;
}

function renderDensityShell(initial: DensityHarnessProps = {}) {
  const features = [densityChooser()];
  let shell: DataTableShellResult<Row> | undefined;

  function Probe({ props }: { props: DataTableShellProps<Row> }) {
    shell = useDataTableShell(props, noForm);
    return null;
  }

  function Harness(control: DensityHarnessProps) {
    const props = useTableFeatures({
      features,
      data: ROWS,
      columns,
      rowKey,
      urlSync: false,
      ...control,
    });
    return (
      <FeatureProviders props={props}>
        <Probe props={props} />
      </FeatureProviders>
    );
  }

  const rendered = render(<Harness {...initial} />);
  return {
    get current() {
      return shell!;
    },
    rerender(next: DensityHarnessProps) {
      rendered.rerender(<Harness {...next} />);
    },
    unmount: rendered.unmount,
  };
}

describe("useDataTableShell", () => {
  it("resolves the frontend tier and builds the prop bundles", () => {
    const { result } = renderHook(() =>
      useDataTableShell({ data: ROWS, columns, rowKey }, noForm)
    );
    expect(result.current.source.rows).toHaveLength(2);
    expect(result.current.hasRowActions).toBe(false);
    expect(result.current.tableProps.setWidth).toBeUndefined();
    expect(result.current.tableProps.rowActions).toBeUndefined();
    expect(result.current.toolbarProps.hasFilters).toBe(false);
    expect(result.current.filtersNode).toBeUndefined();
  });

  it("arms row reorder from the features path", () => {
    // The feature's provider owns the hook, so it has to be mounted above the
    // component that calls the shell — which is what every adapter's
    // `DataTable` does around its `DataTableContent`.
    const props = applyTableFeatures({ features: [rowReorder(vi.fn())] });
    const { result } = renderHook(
      () =>
        useDataTableShell(
          { data: ROWS, columns, rowKey, urlSync: false, ...props },
          noForm
        ),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <FeatureProviders props={props}>{children}</FeatureProviders>
        ),
      }
    );
    expect(result.current.hasRowReorder).toBe(true);
  });

  it("does not arm row reorder without the feature", () => {
    const { result } = renderHook(() =>
      useDataTableShell({ data: ROWS, columns, rowKey, urlSync: false }, noForm)
    );
    expect(result.current.hasRowReorder).toBe(false);
  });

  it("lets the density feature own and report an uncontrolled choice", () => {
    const onDensityChange = vi.fn();
    const view = renderDensityShell({ onDensityChange });
    expect(view.current.density).toBe("comfortable");
    expect(view.current.toolbarProps.density).toBe("comfortable");

    act(() => {
      view.current.toolbarProps.onDensityChange?.("compact");
    });

    expect(onDensityChange).toHaveBeenCalledExactlyOnceWith("compact");
    expect(view.current.density).toBe("compact");
    expect(view.current.toolbarProps.density).toBe("compact");
  });

  it("keeps the density request callback stable as uncontrolled state changes", () => {
    const view = renderDensityShell();
    const request = view.current.toolbarProps.onDensityChange;

    act(() => {
      request("compact");
    });
    expect(view.current.toolbarProps.onDensityChange).toBe(request);

    view.rerender({});
    expect(view.current.toolbarProps.onDensityChange).toBe(request);
  });

  it("waits for a controlled density prop to change", () => {
    const onDensityChange = vi.fn();
    const view = renderDensityShell({
      density: "comfortable",
      onDensityChange,
    });

    act(() => {
      view.current.toolbarProps.onDensityChange?.("compact");
    });
    expect(onDensityChange).toHaveBeenCalledExactlyOnceWith("compact");
    expect(view.current.density).toBe("comfortable");

    view.rerender({ density: "compact", onDensityChange });
    expect(view.current.density).toBe("compact");
    expect(view.current.toolbarProps.density).toBe("compact");
  });

  it("returns an uncontrolled density to comfortable on remount", () => {
    const first = renderDensityShell();
    act(() => {
      first.current.toolbarProps.onDensityChange?.("compact");
    });
    expect(first.current.density).toBe("compact");
    first.unmount();

    const second = renderDensityShell();
    expect(second.current.density).toBe("comfortable");
  });

  it("renders the auto-form for declarative filters", () => {
    const defs: FilterDef<Row>[] = [
      { key: "name", type: "text", label: "Name" },
    ];
    const renderForm = vi.fn(() => <div>form</div>);
    const view = renderLiveShell(
      [filters(defs)],
      { filters: defs },
      renderForm
    );
    expect(renderForm).toHaveBeenCalled();
    expect(view.current.filtersNode).toBeDefined();
    expect(view.current.toolbarProps.hasFilters).toBe(true);
  });

  it("keeps Filters in header mode when the AND/OR tree is on", () => {
    const defs: FilterDef<Row>[] = [
      { key: "name", type: "text", label: "Name" },
    ];
    const view = renderLiveShell(
      [filters(defs)],
      { filters: defs, headerFilters: true },
      () => <div>form</div>
    );
    expect(view.current.toolbarProps.hasFilters).toBe(true);
    expect(view.current.tableProps.closeHeaderFilterOnSelect).toBe(false);
  });

  it("passes hand-drawn JSX filters through untouched", () => {
    const jsx = <div>custom</div>;
    const { result } = renderHook(() =>
      useDataTableShell(
        { data: ROWS, columns, rowKey, urlSync: false, filters: jsx },
        noForm
      )
    );
    expect(result.current.filtersNode).toBe(jsx);
  });

  it("exposes row actions and resizing when provided", () => {
    const actions: RowAction<Row>[] = [
      { key: "x", label: "X", onClick: vi.fn() },
    ];
    const view = renderLiveShell([rowActions(actions), resizableColumns()], {
      rowActions: actions,
      resizableColumns: true,
    });
    expect(view.current.hasRowActions).toBe(true);
    expect(view.current.tableProps.rowActions).toHaveLength(1);
    expect(view.current.tableProps.rowActionsLayout).toBeUndefined();
    expect(view.current.tableProps.renderRowActions).toBeUndefined();
    expect(view.current.tableProps.cellSpanAppearance).toBeUndefined();
    expect(view.current.tableProps.setWidth).toBeTypeOf("function");
  });

  it("forwards the opt-in row-actions layout and custom cell renderer", () => {
    const renderRowActions = vi.fn();
    const { result } = renderHook(() =>
      useDataTableShell(
        {
          data: ROWS,
          columns,
          rowKey,
          urlSync: false,
          rowActions: [{ key: "x", label: "X", onClick: vi.fn() }],
          rowActionsLayout: "menu",
          renderRowActions,
          cellSpanAppearance: "plain",
        },
        noForm
      )
    );
    expect(result.current.tableProps.rowActionsLayout).toBe("menu");
    expect(result.current.tableProps.renderRowActions).toBe(renderRowActions);
    expect(result.current.tableProps.cellSpanAppearance).toBe("plain");
  });

  it("writes uncontrolled pins to the URL and still notifies the host", () => {
    const adapter = createMemoryAdapter("");
    const onPinnedRowIdsChange = vi.fn();
    const props = applyTableFeatures({
      features: [rowPinning({ onPinnedRowIdsChange })],
      data: ROWS,
      columns,
      rowKey,
      urlAdapter: adapter,
      onPinnedRowIdsChange,
    });
    const view = renderShellWith(props);
    act(() => {
      view.current.tableProps.rowPinning?.pin("a", "top");
    });
    expect(onPinnedRowIdsChange).toHaveBeenCalledExactlyOnceWith({
      top: ["a"],
      bottom: [],
    });
    expect(adapter.getSearch()).toContain("rowPin=");
  });

  it("leaves the URL alone when the host owns the pin lists", () => {
    const adapter = createMemoryAdapter("");
    const onPinnedRowIdsChange = vi.fn();
    const props = applyTableFeatures({
      features: [
        rowPinning({
          pinnedRowIds: { top: ["b"], bottom: [] },
          onPinnedRowIdsChange,
        }),
      ],
      data: ROWS,
      columns,
      rowKey,
      urlAdapter: adapter,
      pinnedRowIds: { top: ["b"], bottom: [] },
      onPinnedRowIdsChange,
    });
    const view = renderShellWith(props);
    act(() => {
      view.current.tableProps.rowPinning?.pin("a", "bottom");
    });
    expect(onPinnedRowIdsChange).toHaveBeenCalledExactlyOnceWith({
      top: ["b"],
      bottom: ["a"],
    });
    expect(adapter.getSearch()).toBe("");
  });

  it("forwards a virtual window into tableProps", () => {
    const body: ChromeBodyData<Row> = {
      virtualization: {
        enabled: true,
        rows: [{ row: ROWS[1]!, index: 1, key: "b" }],
        paddingTop: 8,
        paddingBottom: 8,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: true,
      virtualScrollRef: () => undefined,
      pinnedTopRows: [],
      pinnedBottomRows: [],
    };
    const { result } = renderHook(() =>
      useDataTableShell({ data: ROWS, columns, rowKey, urlSync: false }, noForm)
    );
    const view = finishDataTableShell(result.current, body);
    expect(view.tableProps.rowEntries).toHaveLength(1);
    expect(view.tableProps.paddingTop).toBe(8);
    expect(view.toolbarProps.showRowsPerPage).toBe(true);
  });

  it("covers the server tier and the optional pass-through props", () => {
    const { result } = renderHook(() =>
      useDataTableShell(
        {
          data: ROWS,
          columns,
          rowKey,
          urlSync: false,
          onQueryChange: vi.fn(),
          total: 5,
          loading: false,
          locale: "en",
          urlKey: "t",
          stickyHeader: true,
          stickyTop: 12,
          maxHeight: 400,
          onRowClick: vi.fn(),
          rowClassName: () => "x",
          renderRowDetail: () => <div>detail</div>,
          summaryRow: () => ({}),
          sortByOptions: [],
          skeletonRows: 3,
          searchPlaceholder: "Search…",
        },
        noForm
      )
    );
    expect(result.current.source.total).toBe(5);
    expect(result.current.tableProps.stickyHeader).toBe(true);
    expect(result.current.toolbarProps.searchPlaceholder).toBe("Search…");
  });

  it("forwards mode and prefetch (previously dead surface)", () => {
    const onQueryChange = vi.fn();
    const prefetch = vi.fn();
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useDataTableShell(
        {
          data: ROWS,
          mode: "frontend",
          onQueryChange,
          prefetch,
          columns,
          rowKey,
          urlAdapter: adapter,
        },
        noForm
      )
    );
    // mode="frontend" reached useTableData: local processing kept, and
    // the notification did NOT fire on mount (server mode would have).
    expect(result.current.source.rows).toHaveLength(2);
    expect(onQueryChange).not.toHaveBeenCalled();
    // prefetch reaches the table renderer's prop bundle.
    expect(result.current.tableProps.prefetch).toBe(prefetch);
  });

  it("forwards defaults and paginationMode into the resolved source", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useDataTableShell(
        {
          data: ROWS,
          columns,
          rowKey,
          urlAdapter: adapter,
          defaults: { limit: 1, sortBy: "name" },
          paginationMode: "infinite",
        },
        noForm
      )
    );
    // defaults seeded the silent-URL state; the mode reached the source.
    expect(result.current.source.limit).toBe(1);
    expect(result.current.source.sortBy).toBe("name");
    expect(result.current.source.paginationMode).toBe("infinite");
    expect(result.current.source.rows).toHaveLength(1);
  });

  it("forwards searchDebounceMs into the table's search commit", () => {
    vi.useFakeTimers();
    try {
      const adapter = createMemoryAdapter("");
      const { result } = renderHook(() =>
        useDataTableShell(
          {
            data: ROWS,
            columns,
            rowKey,
            urlAdapter: adapter,
            searchDebounceMs: 50,
          },
          noForm
        )
      );
      act(() => result.current.table.setSearchValue("ali"));
      // Committed after the CUSTOM debounce, well before the 300ms default.
      act(() => vi.advanceTimersByTime(50));
      expect(result.current.source.search).toBe("ali");
    } finally {
      vi.useRealTimers();
    }
  });

  it("dev-warns when virtualize is inert on a paged table", () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const adapter = createMemoryAdapter("");
      const props = applyTableFeatures({
        features: [virtualize()],
        data: ROWS,
        columns,
        rowKey,
        urlAdapter: adapter,
        paginationMode: "paged" as const,
      });
      function Probe() {
        const shell = useDataTableShell(props, noForm);
        return (
          <DataTableShellView shell={shell}>{() => null}</DataTableShellView>
        );
      }
      render(
        <FeatureProviders props={props}>
          <Probe />
        </FeatureProviders>
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('paginationMode="infinite"')
      );
    } finally {
      warn.mockRestore();
      resetDevWarnings();
    }
  });

  it("forwards error into the resolved source", () => {
    const boom = new Error("boom");
    const { result } = renderHook(() =>
      useDataTableShell(
        { data: ROWS, columns, rowKey, urlSync: false, error: boom },
        noForm
      )
    );
    expect(result.current.source.error).toBe(boom);
  });

  it("covers a prebuilt source and a live URL adapter", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData({ data: ROWS, columns });
      return useDataTableShell(
        { source, columns, rowKey, urlAdapter: adapter, urlKey: "p" },
        noForm
      );
    });
    expect(result.current.source.rows).toHaveLength(2);
  });

  it("suppresses the virtual window and load-more when off", () => {
    const { result } = renderHook(() =>
      useDataTableShell({ data: ROWS, columns, rowKey, urlSync: false }, noForm)
    );
    expect(result.current.canLoadMore).toBe(false);
    expect(result.current.tableProps.rowEntries).toBeUndefined();
  });
});

describe("useDataTableShell — the scroll box and column sizing", () => {
  it("names the scroll box so both windows can find it", () => {
    // Every kit calls its scroll container something different; core names it,
    // and the row and column windows both read that one element.
    const { result } = renderHook(() =>
      useDataTableShell({ data: ROWS, columns, rowKey }, noForm)
    );
    const box = document.createElement("div");
    result.current.tableProps.virtualScrollRef(box);
    expect(box.getAttribute("data-adapttable-part")).toBe("scroll-box");
  });

  it("leaves a card list named cards so window-offset measurement can find it", () => {
    const { result } = renderHook(() =>
      useDataTableShell({ data: ROWS, columns, rowKey }, noForm)
    );
    const list = document.createElement("ul");
    list.setAttribute("data-adapttable-part", "cards");
    result.current.tableProps.virtualScrollRef(list);
    expect(list.getAttribute("data-adapttable-part")).toBe("cards");
  });

  it("sizes every rendered column to its content", () => {
    const onColumnLayoutChange = vi.fn();
    const props = applyTableFeatures({
      features: [columnMenu()],
      data: ROWS,
      columns,
      rowKey,
      onColumnLayoutChange,
    });
    const view = renderShellWith(props);
    // A root with one measurable cell per column is all the action needs.
    const root = document.createElement("div");
    const cell = document.createElement("div");
    cell.setAttribute("data-column-key", "name");
    Object.defineProperty(cell, "scrollWidth", { value: 200 });
    root.append(cell);
    document.body.append(root);
    view.current.rootRef.current = root;

    act(() => view.current.autoSizeColumns());
    expect(onColumnLayoutChange).toHaveBeenCalledOnce();
    expect(onColumnLayoutChange.mock.calls[0]?.[0].widths).toMatchObject({
      name: 224,
    });
    root.remove();
  });

  it("sizes nothing when there is nothing rendered to measure", () => {
    const onColumnLayoutChange = vi.fn();
    const props = applyTableFeatures({
      features: [columnMenu()],
      data: ROWS,
      columns,
      rowKey,
      onColumnLayoutChange,
    });
    const view = renderShellWith(props);
    act(() => view.current.autoSizeColumns());
    expect(onColumnLayoutChange).not.toHaveBeenCalled();
  });

  it("sizes nothing at all without a layout-owning feature", () => {
    // Column sizing writes to layout state, and that state only exists once a
    // feature owns it. The buttons are still wired — an adapter cannot know
    // which table it is on — so both actions have to be inert, not absent.
    const onColumnLayoutChange = vi.fn();
    const view = renderLiveShell([], { onColumnLayoutChange });

    expect(view.current.autoSizeColumns).toBeTypeOf("function");
    expect(view.current.autoSizeColumn).toBeTypeOf("function");
    act(() => {
      view.current.autoSizeColumns();
      view.current.autoSizeColumn("name");
    });
    expect(onColumnLayoutChange).not.toHaveBeenCalled();
  });

  it("sizes one named column and windows when virtualizeColumns is on", () => {
    const onColumnLayoutChange = vi.fn();
    const props = applyTableFeatures({
      features: [columnMenu()],
      data: ROWS,
      columns,
      rowKey,
      onColumnLayoutChange,
      virtualizeColumns: true,
      cellNavigation: true,
      closeHeaderFilterOnSelect: true,
      columnLayout: {
        hidden: [],
        order: [],
        pinned: { name: "start" as const },
        widths: {},
      },
    });
    const view = renderShellWith(props);
    expect(view.current.tableProps.closeHeaderFilterOnSelect).toBe(true);
    const root = document.createElement("div");
    const cell = document.createElement("div");
    cell.setAttribute("data-column-key", "name");
    Object.defineProperty(cell, "scrollWidth", { value: 200 });
    root.append(cell);
    document.body.append(root);
    view.current.rootRef.current = root;
    act(() => {
      view.current.autoSizeColumn("name");
    });
    expect(onColumnLayoutChange).toHaveBeenCalledOnce();
    const box = document.createElement("div");
    view.current.tableProps.virtualScrollRef(box);
    expect(view.current.tableProps.columnWindow.enabled).toBe(false);
    root.remove();
  });
});

/**
 * The row universe an editable cell resolves its commit against.
 *
 * A grouped body renders the FULL filtered set, not a page of it, so a cell in
 * any row past page one must still find its row when the reader presses Enter.
 * The shell captures this before the gates run, from base chrome — where it is
 * the page slice — so the overlay has to refresh it. When it did not, every
 * off-page row took an edit, closed the editor and threw it away in silence.
 */
describe("the editing row universe survives the gates", () => {
  it("hands editable cells the whole grouped set, not the page slice", () => {
    const many: Row[] = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      name: `Person ${i}`,
    }));
    const props = applyTableFeatures({
      features: [grouping("name"), editing<Row>(vi.fn())],
      data: many,
      columns,
      rowKey,
      urlSync: false,
      paginationMode: "paged" as const,
      defaults: { limit: 5 },
    });
    const view = renderShellWith(props);

    // The page is five rows; the grouped body renders all twelve, so the
    // cell context has to be all twelve too.
    expect(view.current.chrome.source.rows).toHaveLength(many.length);
    expect(view.current.tableProps.rows).toHaveLength(many.length);
  });

  it("is the page slice when nothing widened it", () => {
    const props = applyTableFeatures({
      features: [editing<Row>(vi.fn())],
      data: ROWS,
      columns,
      rowKey,
      urlSync: false,
    });
    const view = renderShellWith(props);

    expect(view.current.tableProps.rows).toHaveLength(ROWS.length);
  });
});

/**
 * A saved view is the whole table state, columns included.
 *
 * Restoring one writes the layout params back, so the feature has to own the
 * layout they land in — otherwise a view changes the search, the sort and the
 * filters, and leaves the columns exactly as they were.
 */
describe("savedViews owns the column layout it restores", () => {
  it("honours a declared default layout", () => {
    const props = applyTableFeatures({
      features: [savedViews({ storageKey: "shell-test", urlSync: false })],
      data: ROWS,
      columns: [
        { key: "name", accessor: (r: Row) => r.name },
        { key: "note", accessor: () => "" },
      ],
      rowKey,
      urlSync: false,
      defaultColumnLayout: { hidden: ["note"] },
    });
    const view = renderShellWith(props);

    expect(
      view.current.chrome.columnLayout.visibleColumns.map((c) => c.key)
    ).toEqual(["name"]);
  });
});
