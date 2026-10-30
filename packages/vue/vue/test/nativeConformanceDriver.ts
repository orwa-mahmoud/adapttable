/** A Vue mount adapter for the unchanged framework-neutral behavioral suite. */
import { defaultLabels, type TableLabels } from "@adapttable/core";
import {
  CONFORMANCE_COLUMNS,
  CONFORMANCE_ROWS,
  type ConformanceDriver,
  type ConformanceMount,
  type ConformanceRow,
  type ConformanceScenario,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { expect, vi } from "vitest";
import { type App, createApp, nextTick, type VNode } from "vue";

import type { CellRange, DataTableProps } from "../src/adapter";
import type {
  cellNavigation,
  editing,
  grouping,
  rowReorder,
  virtualize,
} from "../src/features";
import type { ColumnDef, TableQueryHandler } from "../src/index";

interface NativeKit {
  name: string;
  render: (props: ScenarioProps) => VNode;
  install?: (app: App) => void;
  cellNavigation: typeof cellNavigation;
  editing: typeof editing;
  grouping: typeof grouping;
  rowReorder: typeof rowReorder;
  virtualize: typeof virtualize;
}

// The scenario sends only behavioral options, not a promise about a kit's
// independently typed styling/provider properties.
type ScenarioProps = Pick<
  DataTableProps<ConformanceRow>,
  | "data"
  | "columns"
  | "rowKey"
  | "tableLabel"
  | "dir"
  | "forceMobile"
  | "urlSync"
  | "selectable"
  | "labels"
  | "defaults"
  | "features"
  | "paginationMode"
  | "onRowClick"
  | "isCellFlashing"
  | "searchPlaceholder"
  | "mode"
  | "onQueryChange"
  | "total"
>;

interface NativeScenario extends ConformanceScenario {
  onRangeChange?: (range: CellRange | null) => void;
  onRowClick?: (row: ConformanceRow) => void;
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  searchPlaceholder?: string;
  mode?: "frontend" | "server";
  onQueryChange?: TableQueryHandler;
  total?: number;
  /** Table labels beyond the neutral suite's; they replace `labels`. */
  tableLabels?: TableLabels;
}
interface NativeDriver extends ConformanceDriver {
  mount: (scenario: NativeScenario) => ConformanceMount;
}

export function nativeConformanceDriver(kit: NativeKit): NativeDriver {
  return {
    name: kit.name,
    mount(scenario: NativeScenario) {
      const columns: ColumnDef<ConformanceRow>[] = scenario.columns.map(
        (column) => ({
          key: column.key,
          header: column.header,
          sortable: column.sortable,
          editable: scenario.onCellEdit !== undefined,
          accessor: (row) => row[column.key],
        })
      );
      const { onCellEdit, onRowReorder, groupBy } = scenario;
      const props: ScenarioProps = {
        data: scenario.rows,
        columns,
        rowKey: (row) => row.id,
        tableLabel: scenario.tableLabel,
        dir: scenario.dir,
        forceMobile: scenario.mobile,
        urlSync: false,
        selectable: scenario.selectable,
        labels: scenario.tableLabels ?? scenario.labels,
        defaults:
          scenario.pageSize === undefined
            ? undefined
            : { limit: scenario.pageSize },
        features: [
          ...(scenario.navigable
            ? [kit.cellNavigation({ onRangeChange: scenario.onRangeChange })]
            : []),
          ...(onCellEdit
            ? [
                kit.editing<ConformanceRow>((row, key, value) => {
                  onCellEdit(row.id, key, value);
                }),
              ]
            : []),
          ...(onRowReorder
            ? [
                kit.rowReorder<ConformanceRow>((from, to, row) => {
                  onRowReorder(from, to, row.id);
                }),
              ]
            : []),
          ...(groupBy ? [kit.grouping(groupBy)] : []),
          ...(scenario.virtualize ? [kit.virtualize({ maxHeight: 200 })] : []),
        ],
        ...(scenario.virtualize ? { paginationMode: "infinite" } : {}),
        onRowClick: scenario.onRowClick,
        isCellFlashing: scenario.isCellFlashing,
        searchPlaceholder: scenario.searchPlaceholder,
        mode: scenario.mode,
        onQueryChange: scenario.onQueryChange,
        total: scenario.total,
      };
      const container = document.createElement("div");
      document.body.append(container);
      const app = createApp({ render: () => kit.render(props) });
      kit.install?.(app);
      app.mount(container);
      return {
        container,
        ready: nextTick(),
        unmount: () => {
          app.unmount();
          container.remove();
        },
      };
    },
  };
}

/** Native DOM events plus the runner's retry mechanism; no simulated model. */
export const nativeConformanceHarness = {
  fireEvent: {
    click(element: Element) {
      element.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    },
    keyDown(element: Element, init?: KeyboardEventInit) {
      element.dispatchEvent(
        new KeyboardEvent("keydown", {
          ...init,
          bubbles: true,
          cancelable: true,
        })
      );
    },
  },
  waitFor: <T>(callback: () => T): Promise<T> => vi.waitFor(callback),
};

/** Additional rendered range checks over the same real native mount. */
export function nativeRangeConformanceTests(
  driver: NativeDriver
): readonly ConformanceTest[] {
  return [false, true].map((rtl) => ({
    name: `extends, shrinks and collapses a keyboard cell range (${rtl ? "RTL" : "LTR"})`,
    async run() {
      const report = vi.fn<(range: CellRange | null) => void>();
      const view = driver.mount({
        rows: CONFORMANCE_ROWS,
        columns: CONFORMANCE_COLUMNS,
        tableLabel: "People",
        dir: rtl ? "rtl" : "ltr",
        navigable: true,
        onRangeChange: report,
      });
      try {
        await view.ready;
        const grid = view.container.querySelector<HTMLElement>('[role="grid"]');
        if (!grid) throw new Error("Missing native grid");
        const cell = (row: number, col: number) =>
          view.container.querySelector<HTMLElement>(
            `[data-grid-cell="${row}:${col}"]`
          );
        cell(0, 0)?.focus();
        nativeConformanceHarness.fireEvent.keyDown(grid, {
          key: rtl ? "ArrowLeft" : "ArrowRight",
          shiftKey: true,
        });
        await vi.waitFor(() => expect(document.activeElement).toBe(cell(0, 1)));
        nativeConformanceHarness.fireEvent.keyDown(grid, {
          key: "ArrowDown",
          shiftKey: true,
        });
        await vi.waitFor(() => {
          expect(report).toHaveBeenLastCalledWith({
            anchor: { row: 0, col: 0 },
            head: { row: 1, col: 1 },
          });
          expect(document.activeElement).toBe(cell(1, 1));
          expect(
            view.container.querySelectorAll(
              '[data-grid-cell][aria-selected="true"]'
            )
          ).toHaveLength(4);
          expect(
            view.container.querySelector(
              '[data-adapttable-part="grid-announcer"]'
            )?.textContent
          ).toBe(
            defaultLabels.gridRangeSelection({
              fromRow: 1,
              toRow: 2,
              fromColumn: 1,
              toColumn: 2,
              cells: 4,
            })
          );
        });
        nativeConformanceHarness.fireEvent.keyDown(grid, {
          key: "ArrowUp",
          shiftKey: true,
        });
        await vi.waitFor(() => {
          expect(report).toHaveBeenLastCalledWith({
            anchor: { row: 0, col: 0 },
            head: { row: 0, col: 1 },
          });
          expect(
            view.container.querySelectorAll(
              '[data-grid-cell][aria-selected="true"]'
            )
          ).toHaveLength(2);
        });
        // An unmodified move collapses the rectangle to its destination cell.
        nativeConformanceHarness.fireEvent.keyDown(grid, { key: "ArrowDown" });
        await vi.waitFor(() => {
          // Public range callbacks normalize a single focused cell to null.
          expect(report).toHaveBeenLastCalledWith(null);
          expect(document.activeElement).toBe(cell(1, 1));
          expect(
            view.container.querySelectorAll(
              '[data-grid-cell][aria-selected="true"]'
            )
          ).toHaveLength(0);
        });
      } finally {
        view.unmount();
      }
    },
  }));
}

/** Row activation and changed-cell marks, on desktop rows and phone cards. */
export function nativeRowConformanceTests(
  driver: NativeDriver
): readonly ConformanceTest[] {
  const layout = (mobile: boolean) => (mobile ? "phone cards" : "desktop rows");
  const rowOf = (root: ParentNode, mobile: boolean, id: string) => {
    const row = root.querySelector<HTMLElement>(
      mobile
        ? `[data-adapttable-part="card"][data-row-id="${id}"]`
        : `tr[data-row-id="${id}"]`
    );
    if (!row) throw new Error(`Missing row ${id}`);
    return row;
  };
  return [false, true].flatMap((mobile) => [
    {
      name: `activates a row by click, Enter and Space (${layout(mobile)})`,
      async run() {
        const activate = vi.fn<(row: ConformanceRow) => void>();
        const view = driver.mount({
          rows: CONFORMANCE_ROWS,
          columns: CONFORMANCE_COLUMNS,
          tableLabel: "People",
          mobile,
          onRowClick: activate,
        });
        try {
          await view.ready;
          const row = rowOf(view.container, mobile, "r2");
          expect(row.hasAttribute("data-clickable")).toBe(true);
          expect(rowOf(view.container, mobile, "r1").tabIndex).toBe(0);
          expect(row.tabIndex).toBe(-1);
          const text = [...row.querySelectorAll<HTMLElement>("*")].find(
            (element) => element.textContent.trim() === "Grace"
          );
          nativeConformanceHarness.fireEvent.click(text ?? row);
          nativeConformanceHarness.fireEvent.keyDown(row, { key: "Enter" });
          nativeConformanceHarness.fireEvent.keyDown(row, { key: " " });
          expect(activate.mock.calls.map(([target]) => target.id)).toEqual([
            "r2",
            "r2",
            "r2",
          ]);
        } finally {
          view.unmount();
        }
      },
    },
    {
      name: `leaves rows inert without onRowClick (${layout(mobile)})`,
      async run() {
        const view = driver.mount({
          rows: CONFORMANCE_ROWS,
          columns: CONFORMANCE_COLUMNS,
          tableLabel: "People",
          mobile,
        });
        try {
          await view.ready;
          const row = rowOf(view.container, mobile, "r2");
          expect(row.hasAttribute("data-clickable")).toBe(false);
          expect(row.hasAttribute("data-adapttable-row")).toBe(false);
        } finally {
          view.unmount();
        }
      },
    },
    {
      name: `marks only the cells isCellFlashing names (${layout(mobile)})`,
      async run() {
        const view = driver.mount({
          rows: CONFORMANCE_ROWS,
          columns: CONFORMANCE_COLUMNS,
          tableLabel: "People",
          mobile,
          isCellFlashing: (rowId, columnKey) =>
            rowId === "r2" && columnKey === "age",
        });
        try {
          await view.ready;
          const marked = [
            ...view.container.querySelectorAll<HTMLElement>("[data-flash]"),
          ];
          expect(marked).toHaveLength(1);
          expect(marked[0]?.getAttribute("data-adapttable-part")).toBe(
            mobile ? "card-value" : "cell"
          );
          expect(marked[0]?.textContent.trim()).toBe("28");
          expect(rowOf(view.container, mobile, "r2").contains(marked[0]!)).toBe(
            true
          );
        } finally {
          view.unmount();
        }
      },
    },
  ]);
}

/** The search box's placeholder: the prop, ahead of the `searchPlaceholder` label. */
export function nativeSearchConformanceTests(
  driver: NativeDriver
): readonly ConformanceTest[] {
  const placeholders = (root: ParentNode) =>
    [...root.querySelectorAll<HTMLInputElement>("input[placeholder]")].map(
      (input) => input.placeholder
    );
  return [
    {
      name: "shows searchPlaceholder in the search box, ahead of the label",
      async run() {
        const view = driver.mount({
          rows: CONFORMANCE_ROWS,
          columns: CONFORMANCE_COLUMNS,
          tableLabel: "People",
          tableLabels: { searchPlaceholder: "From labels" },
          searchPlaceholder: "Search names",
        });
        try {
          await view.ready;
          expect(placeholders(view.container)).toContain("Search names");
          expect(placeholders(view.container)).not.toContain("From labels");
        } finally {
          view.unmount();
        }
      },
    },
    {
      name: "falls back to the searchPlaceholder label",
      async run() {
        const view = driver.mount({
          rows: CONFORMANCE_ROWS,
          columns: CONFORMANCE_COLUMNS,
          tableLabel: "People",
          tableLabels: { searchPlaceholder: "From labels" },
        });
        try {
          await view.ready;
          expect(placeholders(view.container)).toContain("From labels");
        } finally {
          view.unmount();
        }
      },
    },
  ];
}

/** The server tier from `data` + `onQueryChange`, and a frontend notice. */
export function nativeServerConformanceTests(
  driver: NativeDriver
): readonly ConformanceTest[] {
  const rowIds = (root: ParentNode) =>
    [...root.querySelectorAll<HTMLElement>('[data-adapttable-part="row"]')].map(
      (row) => row.dataset.rowId
    );
  const sortAge = (root: ParentNode) => {
    const header = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="header-cell"]'
      ),
    ].find((cell) => cell.dataset.columnKey === "age");
    if (!header) throw new Error("Missing age header");
    nativeConformanceHarness.fireEvent.click(
      header.querySelector('button, [role="button"]') ?? header
    );
  };
  return [
    {
      name: "fetches the page from onQueryChange and shows the host's rows",
      async run() {
        const fetch = vi.fn<TableQueryHandler>();
        const view = driver.mount({
          rows: CONFORMANCE_ROWS.slice(0, 2),
          columns: CONFORMANCE_COLUMNS,
          tableLabel: "People",
          pageSize: 1,
          total: 3,
          onQueryChange: fetch,
        });
        try {
          await view.ready;
          await vi.waitFor(() => {
            expect(fetch).toHaveBeenCalledTimes(1);
          });
          expect(fetch.mock.calls[0]?.[0]).toMatchObject({ page: 1, limit: 1 });
          // The host's page is shown as sent: the table neither pages nor
          // sorts it.
          expect(rowIds(view.container)).toEqual(["r1", "r2"]);
          sortAge(view.container);
          await vi.waitFor(() => {
            expect(fetch.mock.lastCall?.[0]).toMatchObject({
              sortBy: "age",
              sortDir: "asc",
            });
          });
          expect(fetch.mock.lastCall?.[1].signal).toBeInstanceOf(AbortSignal);
          expect(fetch.mock.calls[0]?.[1].signal.aborted).toBe(true);
          expect(rowIds(view.container)).toEqual(["r1", "r2"]);
        } finally {
          view.unmount();
        }
      },
    },
    {
      name: 'tells a mode="frontend" table\'s onQueryChange what changed',
      async run() {
        const notice = vi.fn<TableQueryHandler>();
        const view = driver.mount({
          rows: CONFORMANCE_ROWS,
          columns: CONFORMANCE_COLUMNS,
          tableLabel: "People",
          mode: "frontend",
          onQueryChange: notice,
        });
        try {
          await view.ready;
          await nextTick();
          // The mount is not a change.
          expect(notice).not.toHaveBeenCalled();
          sortAge(view.container);
          await vi.waitFor(() => {
            expect(notice).toHaveBeenCalledTimes(1);
          });
          expect(notice.mock.calls[0]?.[0]).toMatchObject({
            sortBy: "age",
            sortDir: "asc",
          });
          // The table still sorts its own rows.
          expect(rowIds(view.container)).toEqual(["r2", "r1", "r3"]);
        } finally {
          view.unmount();
        }
      },
    },
  ];
}
