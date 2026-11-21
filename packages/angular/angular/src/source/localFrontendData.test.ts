import { ApplicationRef, Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { injectLocalTableViewState } from "../url/localTableViewState";
import { injectFrontendData } from "./frontendData";
import { injectLocalFrontendData } from "./localFrontendData";

interface Row {
  id: string;
  name: string;
  count: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", count: 3 },
  { id: "b", name: "Bob", count: 7 },
  { id: "c", name: "Charlie", count: 1 },
];
const columns = [
  { key: "name", accessor: (row: Row) => row.name },
  { key: "count", sortValue: (row: Row) => row.count },
];

function run<T>(fn: () => T): T {
  return TestBed.runInInjectionContext(fn);
}

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("injectLocalFrontendData", () => {
  it("returns the same rows as injectFrontendData for the same data", () => {
    const [local, url] = run(() => [
      injectLocalFrontendData<Row>({
        data: ROWS,
        columns,
        paginationMode: "paged",
      }),
      injectFrontendData<Row>({
        data: ROWS,
        columns,
        paginationMode: "paged",
        urlSync: false,
      }),
    ]);
    expect(local().rows).toEqual(url().rows);
    expect(local().total).toBe(3);
  });

  it("searches, sorts and pages in memory and never writes the URL", () => {
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    const source = run(() =>
      injectLocalFrontendData<Row>({
        data: ROWS,
        columns,
        paginationMode: "paged",
        defaults: { limit: 2 },
      })
    );
    source().setSort("count", "desc");
    expect(source().rows.map((row) => row.id)).toEqual(["b", "a"]);
    source().setPage(2);
    expect(source().rows.map((row) => row.id)).toEqual(["c"]);
    source().setSearch("ali");
    expect(source().rows.map((row) => row.id)).toEqual(["a"]);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("follows new data", async () => {
    const data = signal<readonly Row[]>(ROWS);
    const source = run(() =>
      injectLocalFrontendData<Row>({ data, columns, paginationMode: "paged" })
    );
    data.set([...ROWS, { id: "d", name: "Dee", count: 9 }]);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(source().total).toBe(4);
  });

  it("refuses to run outside an injection context", () => {
    expect(() => injectLocalFrontendData({ data: [] })).toThrow();
  });
});

describe("injectLocalTableViewState", () => {
  it("applies defaults and stops following the store once destroyed", () => {
    const injector = Injector.create({
      providers: [],
      parent: TestBed.inject(Injector),
    }) as Injector & { destroy: () => void };
    const view = injectLocalTableViewState({
      injector,
      defaults: { limit: 5 },
    });
    expect(view.state().limit).toBe(5);
    view.setSearch("ada");
    expect(view.state().search).toBe("ada");
    injector.destroy();
    view.setSearch("bo");
    expect(view.state().search).toBe("ada");
  });
});

describe("injectFrontendData column value inputs", () => {
  it("re-sorts when a localized column's data path changes under the same key", () => {
    interface Localized {
      id: string;
      label: string;
      labelAr: string;
      labelAlt: string;
    }
    const localized = signal([{ key: "label", i18n: { ar: "labelAr" } }]);
    const source = run(() =>
      injectFrontendData<Localized>({
        data: [
          { id: "1", label: "a", labelAr: "ab", labelAlt: "ba" },
          { id: "2", label: "b", labelAr: "a", labelAlt: "z" },
        ],
        columns: localized,
        locale: "ar",
        paginationMode: "paged",
        urlSync: false,
        defaults: { sortBy: "label", sortDir: "asc" },
      })
    );
    expect(source().rows.map((row) => row.id)).toEqual(["2", "1"]);
    localized.set([{ key: "label", i18n: { ar: "labelAlt" } }]);
    expect(source().rows.map((row) => row.id)).toEqual(["1", "2"]);
  });
});
