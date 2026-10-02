import {
  createMemoryAdapter,
  createTableViewStore,
  type TableSource,
} from "@adapttable/core";
import { ApplicationRef, Injector, type Signal, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptCellTemplate } from "./cell";
import { type ColumnDef, resolveColumns } from "./columnDef";
import { injectDataTable } from "./dataTable";
import { injectIsMobile } from "./hooks/isMobile";
import { injectRowSelection } from "./selection/selection";
import { injectFrontendData } from "./source/frontendData";
import { fromStore } from "./store";
import {
  ADAPTTABLE_URL_ADAPTER,
  injectTableUrlState,
} from "./url/tableUrlState";

interface Row {
  id: string;
  name: string;
  label?: { en: string; ar: string };
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", label: { en: "One", ar: "واحد" } },
  { id: "2", name: "Bo", label: { en: "Two", ar: "اثنان" } },
  { id: "3", name: "Cy", label: { en: "Three", ar: "ثلاثة" } },
];

/** A child injector of the test module that can be destroyed on its own. */
function childInjector(
  providers: Parameters<typeof Injector.create>[0]["providers"] = []
) {
  const injector = Injector.create({
    providers,
    parent: TestBed.inject(Injector),
  });
  return injector as Injector & { destroy: () => void };
}

function run<T>(fn: () => T): T {
  return TestBed.runInInjectionContext(fn);
}

describe("fromStore", () => {
  it("follows the store and stops when its injector is destroyed", () => {
    const store = createTableViewStore({ adapter: createMemoryAdapter() });
    const injector = childInjector();
    const state = fromStore(store, { injector });
    store.setSearch("ada");
    expect(state().search).toBe("ada");
    injector.destroy();
    store.setSearch("bo");
    expect(state().search).toBe("ada");
  });

  it("uses the injection context when no injector is given", () => {
    const store = createTableViewStore({ adapter: createMemoryAdapter() });
    const state = run(() => fromStore(store));
    store.setPage(4);
    expect(state().page).toBe(4);
  });

  it("refuses to run outside an injection context", () => {
    const store = createTableViewStore({ adapter: createMemoryAdapter() });
    expect(() => fromStore(store)).toThrow();
  });
});

describe("injectTableUrlState", () => {
  it("reads and writes the adapter it is given", () => {
    const adapter = createMemoryAdapter("q=ada");
    const url = run(() => injectTableUrlState({ urlAdapter: adapter }));
    expect(url.state().search).toBe("ada");
    url.setPage(2);
    expect(adapter.getSearch()).toContain("page=2");
  });

  it("uses the provided adapter, namespaced by urlKey", () => {
    const adapter = createMemoryAdapter();
    const injector = childInjector([
      { provide: ADAPTTABLE_URL_ADAPTER, useValue: adapter },
    ]);
    const url = injectTableUrlState({ injector, urlKey: "left" });
    url.setSearch("bo");
    expect(adapter.getSearch()).toContain("left.q=bo");
    injector.destroy();
  });

  it("keeps state in memory when urlSync is off", () => {
    const adapter = createMemoryAdapter();
    const injector = childInjector([
      { provide: ADAPTTABLE_URL_ADAPTER, useValue: adapter },
    ]);
    const url = injectTableUrlState({ injector, urlSync: false });
    url.setSearch("cy");
    expect(url.state().search).toBe("cy");
    expect(adapter.getSearch()).toBe("");
  });
});

describe("injectIsMobile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false without matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(run(() => injectIsMobile())()).toBe(false);
  });

  it("follows the media query until its injector is destroyed", () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    const query = {
      matches: true,
      addEventListener: vi.fn((_type: string, next: typeof listener) => {
        listener = next;
      }),
      removeEventListener: vi.fn(),
    };
    const matchMedia = vi.fn(() => query);
    vi.stubGlobal("matchMedia", matchMedia);
    const injector = childInjector();
    const mobile = injectIsMobile({ injector, breakpoint: 500 });
    expect(matchMedia).toHaveBeenCalledWith("(max-width: 500px)");
    expect(mobile()).toBe(true);
    listener?.({ matches: false } as MediaQueryListEvent);
    expect(mobile()).toBe(false);
    injector.destroy();
    expect(query.removeEventListener).toHaveBeenCalledWith("change", listener);
  });
});

describe("resolveColumns", () => {
  it("leaves a complete column as it is", () => {
    const column: ColumnDef<Row> = {
      key: "name",
      header: "Name",
      accessor: (row) => row.name,
    };
    expect(resolveColumns([column])[0]).toBe(column);
  });

  it("reads a column without an accessor by its localized path", () => {
    const [column] = resolveColumns<Row>(
      [{ key: "label", i18n: { en: "label.en", ar: "label.ar" } }],
      "ar"
    );
    expect(column?.header).toBe("Label");
    expect(column?.accessor?.(ROWS[0]!)).toBe("واحد");
    const [objectColumn] = resolveColumns<Row>([{ key: "label" }]);
    expect(objectColumn?.accessor?.(ROWS[0]!)).toBeNull();
  });
});

describe("AdaptCellTemplate", () => {
  it("types its template context", () => {
    expect(
      AdaptCellTemplate.ngTemplateContextGuard({} as AdaptCellTemplate, {})
    ).toBe(true);
  });
});

describe("injectFrontendData", () => {
  it("loads the next page when there is one, and nothing past the end", () => {
    const source = run(() =>
      injectFrontendData<Row>({
        data: ROWS,
        urlSync: false,
        paginationMode: "infinite",
        defaults: { limit: 2 },
        locale: signal<string | undefined>("en"),
        forceMobile: false,
      })
    );
    expect(source().rows).toHaveLength(2);
    expect(source().hasNextPage).toBe(true);
    source().fetchNextPage();
    expect(source().page).toBe(2);
    expect(source().rows).toHaveLength(3);
    expect(source().hasNextPage).toBe(false);
    source().fetchNextPage();
    expect(source().page).toBe(2);
  });

  it("refuses to run outside an injection context", () => {
    expect(() => injectFrontendData({ data: [] })).toThrow();
  });
});

function table(
  options: Partial<Parameters<typeof injectDataTable<Row>>[0]> = {},
  source?: Signal<TableSource<Row>>
) {
  return run(() =>
    injectDataTable<Row>({
      source:
        source ??
        injectFrontendData<Row>({
          data: ROWS,
          urlSync: false,
          paginationMode: "paged",
        }),
      columns: [
        { key: "name", sortable: true },
        { key: "id", hideOnMobile: true },
      ],
      rowKey: (row) => row.id,
      ...options,
    })
  );
}

describe("injectDataTable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("derives labels, direction, sort options and cell values", () => {
    const dataTable = table({
      labels: signal({ table: "Tableau", sortBy: "Trier par" }),
      dir: "rtl",
    });
    expect(dataTable.labels().table).toBe("Tableau");
    expect(dataTable.dir()).toBe("rtl");
    expect(dataTable.tableAttrs()["aria-label"]).toBe("Tableau");
    expect(dataTable.tableAttrs().dir).toBe("rtl");
    expect(dataTable.sortByOptions().map((option) => option.value)).toEqual([
      "name",
    ]);
    const [name] = dataTable.columns();
    expect(dataTable.cellValue(name!, ROWS[1]!)).toBe("Bo");
    expect(dataTable.cellValue({ key: "none" }, ROWS[1]!)).toBeNull();
    expect(dataTable.sortButtonAttrs(name!)["aria-label"]).toBe(
      "Trier par: Name"
    );
  });

  it("hides mobile-hidden columns in the mobile layout", () => {
    expect(
      table({ forceMobile: true })
        .columns()
        .map((c) => c.key)
    ).toEqual(["name"]);
    expect(
      table()
        .columns()
        .map((c) => c.key)
    ).toEqual(["name", "id"]);
  });

  it("sizes cells from user widths", () => {
    const dataTable = table({
      fitColumns: true,
      columnWidths: signal({ name: 120 }),
    });
    const [name] = dataTable.columns();
    const style = dataTable.cellAttrs(name!).style as
      Record<string, unknown> | undefined;
    expect(style).toEqual({ textAlign: "start", width: 120 });
  });

  it("changes the search, page size and multi-column sort", () => {
    const dataTable = table({ multiSort: true, searchDebounceMs: 0 });
    dataTable.setSearch("  ada ");
    expect(dataTable.search()).toBe("ada");
    expect(dataTable.searchValue()).toBe("ada");
    dataTable.setSearch("");
    dataTable.setLimit(1);
    expect(dataTable.pagination().totalPages).toBe(3);
    const [name] = dataTable.columns();
    const onClick = dataTable.sortButtonAttrs(name!).onClick as (event?: {
      shiftKey?: boolean;
    }) => void;
    onClick({ shiftKey: true });
    expect(dataTable.source().sortLevels.map((level) => level.key)).toEqual([
      "name",
    ]);
    const headerAttrs = dataTable.headerCellAttrs(name!);
    expect(headerAttrs["aria-sort"]).toBe("ascending");
  });

  it("reports an empty table", () => {
    const empty = table(
      {},
      run(() => injectFrontendData<Row>({ data: [], urlSync: false }))
    );
    expect(empty.isEmpty()).toBe(true);
    expect(table().isEmpty()).toBe(false);
  });

  it("keeps a column's own cell over a declared template", () => {
    const own = {} as ColumnDef<Row>["cell"];
    const template = {
      key: () => "name",
      template: {},
    } as unknown as AdaptCellTemplate;
    const dataTable = table({
      columns: [{ key: "name", cell: own }, { key: "id" }],
      cellTemplates: signal([template]),
    });
    const [name, id] = dataTable.columns();
    expect(name?.cell).toBe(own);
    expect(id?.cell).toBeUndefined();
  });

  it("warns about a duplicate column key", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    table({ columns: [{ key: "name" }, { key: "name" }] });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('duplicate column key "name"')
    );
  });

  it("refuses to run outside an injection context", () => {
    expect(() =>
      injectDataTable<Row>({
        source: signal({} as TableSource<Row>),
        columns: [],
        rowKey: (row) => row.id,
      })
    ).toThrow();
  });
});

describe("injectRowSelection", () => {
  it("selects across pages, a group's leaves, and a replacement set", () => {
    const changes: string[][] = [];
    const selection = run(() =>
      injectRowSelection<Row>({
        rows: signal(ROWS.slice(0, 2)),
        rowKey: (row) => row.id,
        onSelectionChange: (ids) => changes.push(ids),
      })
    );
    selection.toggleAll();
    selection.selectAllMatching();
    expect(selection.allMatching()).toBe(true);
    expect(selection.state().allMatching).toBe(true);
    selection.toggleGroupLeaves(["3"]);
    expect(selection.allMatching()).toBe(false);
    expect([...selection.selectedIds()]).toEqual(["1", "2", "3"]);
    selection.replace(["2"]);
    expect([...selection.selectedIds()]).toEqual(["2"]);
    selection.replace(undefined);
    expect(selection.selectedCount()).toBe(0);
    expect(changes).toHaveLength(4);
  });
});

describe("column auto-size", () => {
  it("fits every column, or one, to its clipped content", () => {
    const dataTable = table({ columnLayout: undefined });
    const root = document.createElement("div");
    // A cell whose content overflows it: 180px of content in a 100px cell.
    const cell = (key: string, scroll: number) => {
      const node = document.createElement("div");
      node.setAttribute("data-column-key", key);
      Object.defineProperty(node, "scrollWidth", { value: scroll });
      Object.defineProperty(node, "clientWidth", { value: 100 });
      root.append(node);
    };
    cell("name", 180);
    cell("id", 140);
    dataTable.autoSizeColumns(root);
    // The widest cell, plus 24px of breathing room.
    expect(dataTable.layout().state.widths).toEqual({ name: 204, id: 164 });

    root.replaceChildren();
    cell("name", 300);
    dataTable.autoSizeColumn(root, "name");
    expect(dataTable.layout().state.widths).toEqual({ name: 324, id: 164 });
  });
});
