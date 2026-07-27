/**
 * classNames ↔ data-adapttable-part parity: every rendered part carries the
 * class of its camelCased key, and every key's class shows up in at least
 * one rendered state — the two surfaces can never drift apart again.
 */
import type * as CoreModule from "@adapttable/core";
import {
  createMemoryAdapter,
  type FilterDef,
  useChromeBodyData,
  useFrontendData,
} from "@adapttable/core";
import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef, DataTableClassNames } from "./index";

vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreModule>();
  return { ...actual, useChromeBodyData: vi.fn(actual.useChromeBodyData) };
});

const actualCore = await vi.importActual<typeof CoreModule>("@adapttable/core");

beforeEach(() => {
  vi.mocked(useChromeBodyData).mockImplementation(actualCore.useChromeBodyData);
});

interface Row {
  id: string;
  name: string;
  team: string;
  qty: number;
}

const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  name: `Item ${String(i + 1).padStart(2, "0")}`,
  team: i % 2 ? "Core" : "Web",
  qty: i,
}));

const columns: ColumnDef<Row>[] = [
  {
    key: "name",
    header: "Name",
    accessor: (r) => r.name,
    sortable: true,
    group: "Identity",
    editable: true,
    editor: "text",
  },
  {
    key: "team",
    header: "Team",
    accessor: (r) => r.team,
    sortable: true,
    group: "Identity",
    filter: { type: "select", options: "auto" },
  },
  {
    key: "qty",
    header: "Qty",
    accessor: (r) => String(r.qty),
    sortValue: (r) => r.qty,
    sortable: true,
    group: "Facts",
  },
];

const filters: FilterDef<Row>[] = [
  { key: "name", type: "text", label: "Name" },
  { key: "qty", type: "numberRange", label: "Qty" },
  {
    key: "tag",
    type: "multiSelect",
    label: "Tag",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  },
  {
    key: "state",
    type: "multiSelect",
    label: "State",
    options: () =>
      new Promise((resolve) =>
        setTimeout(() => resolve([{ value: "x", label: "X" }]), 60_000)
      ),
  },
];

/** camelCase a kebab-case part name. */
const camel = (part: string): string =>
  part.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Every data-adapttable-part currently in the DOM (portals included). */
function collectParts(): Map<string, Element[]> {
  const map = new Map<string, Element[]>();
  for (const el of document.body.querySelectorAll("[data-adapttable-part]")) {
    const part = el.getAttribute("data-adapttable-part")!;
    map.set(part, [...(map.get(part) ?? []), el]);
  }
  return map;
}

function Harness(props: {
  mode?: "paged" | "infinite";
  isMobile?: boolean;
  data?: readonly Row[];
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  url?: string;
  limit?: number;
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}) {
  const source = useFrontendData<Row>({
    data: props.data ?? ROWS,
    urlAdapter: createMemoryAdapter(props.url ?? ""),
    columns,
    paginationMode: props.mode ?? "paged",
    isLoading: props.isLoading,
    isFetching: props.isFetching,
    error: props.error ?? null,
    refetch: () => undefined,
    defaults: { limit: props.limit ?? 10 },
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      forceMobile={props.isMobile}
      filters={filters}
      bulkActions={[
        {
          key: "del",
          label: "Delete",
          onClick: () => Promise.reject(new Error("bulk boom")),
        },
      ]}
      rowActions={[{ key: "open", label: "Open", onClick: vi.fn() }]}
      savedViews={{ storageKey: "parity" }}
      exportCsv
      enableColumnMenu
      resizableColumns
      multiSort
      summaryRow={() => ({ qty: "sum" })}
      groupAggregates={() => ({ qty: "agg" })}
      renderRowDetail={(r) => <div>{r.name}</div>}
      onCellEdit={vi.fn()}
      {...props.override}
    />
  );
}

const part = (name: string): Element | null =>
  document.body.querySelector(`[data-adapttable-part="${name}"]`);

/** Mount every state the table can render and union the parts seen. */
async function renderAllStates(classNames?: DataTableClassNames) {
  const seen = new Map<string, Element[]>();
  const absorb = () => {
    for (const [name, els] of collectParts()) {
      seen.set(name, [...(seen.get(name) ?? []), ...els]);
    }
  };
  const mount = (props: Parameters<typeof Harness>[0]) => {
    const view = render(
      <Harness {...props} override={{ classNames, ...props.override }} />
    );
    absorb();
    return view;
  };

  // Desktop kitchen sink: open filters, select rows, menus, detail, edit.
  const desktop = mount({});
  fireEvent.click(part("filters-button")!);
  absorb();
  fireEvent.click(part("selection-cell")!.querySelector("input")!);
  absorb();
  // Bulk failure surfaces the bulk error message.
  await act(async () => {
    fireEvent.click(part("bulk-button")!);
    await Promise.resolve();
  });
  absorb();
  const headerBox = part("selection-header")?.querySelector("input");
  if (headerBox) {
    fireEvent.click(headerBox);
    absorb();
  }
  fireEvent.click(part("column-menu-button")!);
  absorb();
  // Saved views: open, name one, save — the list + delete render.
  fireEvent.click(part("views-button")!);
  absorb();
  fireEvent.change(part("views-input")!, { target: { value: "Mine" } });
  fireEvent.click(part("views-save")!);
  absorb();
  const expand = part("expand-button");
  if (expand) {
    fireEvent.click(expand);
    absorb();
  }
  const editable = part("edit-cell-activate");
  if (editable) {
    fireEvent.doubleClick(editable);
    absorb();
  }
  // Multi-sort chain → sort-index badges.
  const sortButtons = document.body.querySelectorAll(
    '[data-adapttable-part="sort-button"]'
  );
  fireEvent.click(sortButtons[0]!, { shiftKey: true });
  fireEvent.click(sortButtons[1]!, { shiftKey: true });
  absorb();
  desktop.unmount();

  // Drawer filters mode (panel, header, footer, close, done, backdrop) with
  // an active filter (count badge + chips + chip remove).
  const drawer = mount({
    url: "f_name=Item",
    override: { filtersMode: "drawer" },
  });
  fireEvent.click(part("filters-button")!);
  absorb();
  drawer.unmount();

  // Row grouping (desktop + mobile cards).
  mount({ url: "groupBy=team" }).unmount();
  const groupedMobile = mount({ url: "groupBy=team", isMobile: true });
  absorb();
  groupedMobile.unmount();

  // Mobile cards with an expanded card detail.
  const mobile = mount({ isMobile: true });
  const cardExpand = part("expand-button");
  if (cardExpand) {
    fireEvent.click(cardExpand);
    absorb();
  }
  mobile.unmount();

  // Infinite mode (load-more + toolbar rows-per-page), both layouts.
  mount({ mode: "infinite" }).unmount();
  mount({ mode: "infinite", isMobile: true }).unmount();

  // Deep pager → ellipsis.
  mount({ limit: 1 }).unmount();

  // Background refresh → the non-blocking progress indicator.
  mount({ isFetching: true }).unmount();

  // Loading skeletons, error + retry, empty, and no-results + clear.
  mount({ data: [], isLoading: true }).unmount();
  mount({ data: [], isLoading: true, isMobile: true }).unmount();
  mount({ data: [], error: new Error("boom") }).unmount();
  mount({ data: [] }).unmount();
  mount({ data: [], url: "q=zzz" }).unmount();

  // Virtualized window → spacers (desktop rows and mobile cards).
  vi.mocked(useChromeBodyData).mockImplementation((chrome) => ({
    virtualization: {
      enabled: true,
      rows: chrome.editingRows
        .slice(0, 2)
        .map((row, index) => ({ row, index, key: String(index) })),
      paddingTop: 40,
      paddingBottom: 40,
      measureElement: () => undefined,
    },
    loadMoreRef: { current: null },
    canLoadMore: false,
    virtualScrollRef: () => undefined,
  }));
  mount({ mode: "infinite", override: { virtualize: true } }).unmount();
  mount({
    mode: "infinite",
    isMobile: true,
    override: { virtualize: true },
  }).unmount();
  vi.mocked(useChromeBodyData).mockImplementation(actualCore.useChromeBodyData);

  return seen;
}

describe("classNames \u2194 part parity (unstyled)", () => {
  // TS enforces this fixture in BOTH directions: `satisfies` rejects any
  // missing key, and Exclude proves no extra key exists — so the list below
  // is always exactly the DataTableClassNames surface.
  const KEYS = [
    "root",
    "toolbar",
    "search",
    "searchField",
    "searchIcon",
    "sortSelect",
    "rowsPerPage",
    "filtersButton",
    "filtersIcon",
    "filtersCount",
    "exportCsvButton",
    "filtersAnchor",
    "filtersBackdrop",
    "filtersPopover",
    "filtersPanel",
    "filtersHeader",
    "filtersTitle",
    "filtersClose",
    "filtersBody",
    "filtersFooter",
    "filtersClear",
    "filtersDone",
    "filterField",
    "filterLabel",
    "filterInput",
    "filterSelect",
    "filterOperator",
    "filterCheckboxGroup",
    "filterCheckbox",
    "filterOptionsLoading",
    "chips",
    "chip",
    "chipRemove",
    "columnMenu",
    "columnMenuButton",
    "columnMenuPanel",
    "columnMenuHeader",
    "columnMenuTitle",
    "columnMenuItem",
    "columnMenuGrip",
    "columnMenuLabel",
    "columnMenuVisibility",
    "columnMenuPin",
    "columnMenuSeparator",
    "columnMenuReset",
    "viewsMenu",
    "viewsButton",
    "viewsPanel",
    "viewsItem",
    "viewsDelete",
    "viewsInput",
    "viewsSave",
    "viewsDivider",
    "resizeHandle",
    "bulkBar",
    "bulkButton",
    "bulkError",
    "selectAllBanner",
    "selectAllText",
    "selectAllButton",
    "table",
    "thead",
    "headerRow",
    "headerCell",
    "headerGroupRow",
    "headerGroupCell",
    "sortButton",
    "sortIndex",
    "tbody",
    "row",
    "cell",
    "expandHeader",
    "expandCell",
    "expandButton",
    "detailRow",
    "detailCell",
    "cardDetail",
    "actionsHeader",
    "actionsCell",
    "actionButton",
    "selectionHeader",
    "selectionCell",
    "checkbox",
    "loadMore",
    "loadMoreButton",
    "groupRow",
    "groupCell",
    "groupCard",
    "groupToggle",
    "groupSelect",
    "groupLabel",
    "groupCount",
    "groupAggregate",
    "editCellActivate",
    "editCellEditor",
    "cards",
    "card",
    "cardActions",
    "cardRow",
    "cardLabel",
    "cardValue",
    "scrollBox",
    "virtualSpacer",
    "summary",
    "summaryRow",
    "summaryCell",
    "summaryCard",
    "footer",
    "pager",
    "pagePrev",
    "pageNext",
    "pageNumber",
    "pageEllipsis",
    "empty",
    "emptyClear",
    "loading",
    "loadingTable",
    "loadingHeaderRow",
    "loadingHeaderCell",
    "loadingRow",
    "loadingCell",
    "loadingLine",
    "loadingCards",
    "loadingCard",
    "refreshIndicator",
    "error",
    "retryButton",
  ] as const;
  type Key = (typeof KEYS)[number];
  type MissingFromFixture = Exclude<keyof DataTableClassNames, Key>;
  type ExtraInFixture = Exclude<Key, keyof DataTableClassNames>;
  // Compile-time completeness in both directions; asserted below so the
  // values are used rather than discarded.
  const missingNone: MissingFromFixture extends never ? true : never = true;
  const extraNone: ExtraInFixture extends never ? true : never = true;

  const FIXTURE = Object.fromEntries(
    KEYS.map((key) => [key, `cn-${key}`])
  ) as Record<Key, string> satisfies Required<DataTableClassNames>;

  it("every rendered part carries its key's class, and every key renders", async () => {
    expect(missingNone).toBe(true);
    expect(extraNone).toBe(true);
    window.localStorage.clear();
    const seen = await renderAllStates(FIXTURE);

    // Direction 1 — part → key: each rendered part maps to a declared key
    // and every element of that part carries the key's class.
    const unmappedParts: string[] = [];
    const unclassed: string[] = [];
    for (const [name, els] of seen) {
      const key = camel(name) as Key;
      if (!KEYS.includes(key)) {
        unmappedParts.push(name);
        continue;
      }
      if (!els.every((el) => el.classList.contains(`cn-${key}`))) {
        unclassed.push(name);
      }
    }
    expect(unmappedParts).toEqual([]);
    expect(unclassed).toEqual([]);

    // Direction 2 — key → part: every declared key showed up as a rendered
    // part in at least one state.
    const renderedKeys = new Set([...seen.keys()].map(camel));
    const neverRendered = KEYS.filter((key) => !renderedKeys.has(key));
    expect(neverRendered).toEqual([]);
  });
});
