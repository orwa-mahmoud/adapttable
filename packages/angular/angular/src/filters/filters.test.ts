import { defaultLabels, type FilterDef } from "@adapttable/core";
import { Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import type { ColumnDef } from "../columnDef";
import { injectFrontendData } from "../source/frontendData";
import {
  booleanFilterFor,
  filterChipsFor,
  filterOptionsFor,
  filterRuntimeFor,
  rangeFilterFor,
  textFilterFor,
} from "./filters";

interface Person {
  id: string;
  name: string;
  age: number;
  active: boolean;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", age: 36, active: true },
  { id: "2", name: "Grace", age: 28, active: false },
  { id: "3", name: "Linus", age: 54, active: true },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", accessor: (row) => row.name },
  { key: "age", accessor: (row) => row.age },
];

const DEFS: FilterDef<Person>[] = [
  { key: "name", type: "text" },
  { key: "age", type: "numberRange" },
  { key: "active", type: "boolean" },
];

function table() {
  return TestBed.runInInjectionContext(() => {
    const filters = filterRuntimeFor<Person>({
      columns: COLUMNS,
      defs: DEFS,
      data: PEOPLE,
      locale: signal(undefined),
      featureHost: signal(undefined),
    });
    const source = injectFrontendData<Person>({
      data: PEOPLE,
      columns: COLUMNS,
      urlSync: false,
      filterFn: filters.filterFn,
      filterTreeFn: filters.filterTreeFn,
      arrayExtraKeys: filters.arrayExtraKeys,
      numberExtraKeys: filters.numberExtraKeys,
    });
    const extra = signal([
      { key: "own", label: "Own", onRemove: () => undefined },
    ]);
    const chips = filterChipsFor(
      source,
      filters.runtime,
      signal(defaultLabels),
      extra
    );
    return { filters, source, chips };
  });
}

const names = (source: ReturnType<typeof table>["source"]) =>
  source().rows.map((row) => row.name);

describe("filterRuntimeFor and filterChipsFor", () => {
  it("filters by the bag, and shows a chip per active filter", () => {
    const { filters, source, chips } = table();
    expect(filters.numberExtraKeys.length).toBeGreaterThan(0);
    expect(chips().count).toBe(1);
    source().setExtra("name", "a");
    expect(names(source)).toEqual(["Ada", "Grace"]);
    expect(chips().count).toBe(2);
    const chip = chips().chips.find((entry) => entry.key !== "own");
    chip?.onRemove();
    expect(names(source)).toHaveLength(3);
  });

  it("filters by the tree, and removes a condition from its chip", () => {
    const { source, chips } = table();
    source().setFilterTree?.({
      combinator: "and",
      conditions: [{ key: "name", op: "contains", value: "in" }],
    });
    expect(names(source)).toEqual(["Linus"]);
    const chip = chips().chips.find((entry) => entry.key.startsWith("ft:"));
    expect(chip?.label).toContain("in");
    chip?.onRemove();
    expect(names(source)).toHaveLength(3);
  });

  it("takes the host's chips as a plain list too", () => {
    const { filters, source } = table();
    const chips = TestBed.runInInjectionContext(() =>
      filterChipsFor(source, filters.runtime, signal(defaultLabels))
    );
    expect(chips().count).toBe(0);
  });
});

describe("the field widgets", () => {
  it("writes a text filter, keeping the chosen operator", () => {
    const { source } = table();
    const text = textFilterFor(signal(DEFS[0]!), source);
    text().setOp("eq");
    expect(text().op).toBe("eq");
    text().write("eq", "Ada");
    expect(names(source)).toEqual(["Ada"]);
    expect(text().value).toBe("Ada");
  });

  it("writes a range filter, and clears its operator", () => {
    const { source } = table();
    const range = rangeFilterFor(DEFS[1]!, source);
    const op = range().ops[0];
    range().setOp(op);
    expect(range().op).toBe(op);
    range().write("between", "30", "40");
    expect(names(source)).toEqual(["Ada"]);
    range().setOp(undefined);
    expect(range().op).toBeUndefined();
  });

  it("writes a yes/no filter", () => {
    const { source } = table();
    const yes = booleanFilterFor(DEFS[2]!, source);
    yes().write("false");
    expect(yes().choice).toBe("false");
    expect(names(source)).toEqual(["Grace"]);
  });
});

type Options = { value: string; label: string }[];

function deferred() {
  const settle: {
    resolve?: (value: Options) => void;
    reject?: (error: Error) => void;
  } = {};
  const promise = new Promise<Options>((resolve, reject) => {
    settle.resolve = resolve;
    settle.reject = reject;
  });
  return {
    promise,
    resolve: (value: Options) => settle.resolve?.(value),
    reject: (error: Error) => settle.reject?.(error),
  };
}

describe("filterOptionsFor", () => {
  const injector = () => TestBed.inject(Injector);

  it("follows same-key replacements without restarting unchanged loaders", async () => {
    const first = deferred();
    const load = vi.fn(() => first.promise);
    const def = signal<FilterDef<Person>>({
      key: "k",
      type: "select",
      options: load,
    });
    const choices = filterOptionsFor(def, injector());
    TestBed.tick();
    def.update((value) => ({ ...value, label: "Renamed" }));
    TestBed.tick();
    expect(load).toHaveBeenCalledTimes(1);
    const options = [{ value: "current", label: "Current" }];
    def.update((value) => ({ ...value, options }));
    // A replaced loader must not publish even before the effect runs.
    first.resolve([{ value: "stale", label: "Stale" }]);
    await Promise.resolve();
    expect(choices().options).not.toContainEqual({
      value: "stale",
      label: "Stale",
    });
    TestBed.tick();
    expect(choices()).toEqual({ options, loading: false });
    def.update((value) => ({ ...value, options: undefined }));
    TestBed.tick();
    expect(choices()).toEqual({ options: [], loading: false });
  });

  it("switches loaders and suppresses failures from a replaced definition", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const stale = deferred();
    const current = deferred();
    const def = signal<FilterDef<Person>>({
      key: "replaced-options",
      type: "multiSelect",
      options: () => stale.promise,
    });
    const choices = filterOptionsFor(def, injector());
    TestBed.tick();
    def.update((value) => ({ ...value, options: () => current.promise }));
    TestBed.tick();
    current.resolve([{ value: "new", label: "New" }]);
    await Promise.resolve();
    stale.reject(new Error("obsolete"));
    await Promise.resolve();
    expect(choices()).toEqual({
      options: [{ value: "new", label: "New" }],
      loading: false,
    });
    expect(warn).not.toHaveBeenCalled();
    def.update((value) => ({ ...value, options: "auto" }));
    TestBed.tick();
    expect(choices()).toEqual({ options: [], loading: false });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("hands a static list straight over", () => {
    const options = [{ value: "a", label: "A" }];
    expect(filterOptionsFor({ key: "k", options }, injector())()).toEqual({
      options,
      loading: false,
    });
  });

  it("has none for auto, with a warning, or for no options", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(
      filterOptionsFor({ key: "k", options: "auto" }, injector())().options
    ).toEqual([]);
    expect(filterOptionsFor({ key: "k" }, injector())().options).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("loads a loader's options, and survives one that fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const loaded = filterOptionsFor(
      {
        key: "k",
        options: () => Promise.resolve([{ value: "a", label: "A" }]),
      },
      injector()
    );
    const failed = filterOptionsFor(
      { key: "f", options: () => Promise.reject(new Error("down")) },
      injector()
    );
    expect(loaded().loading).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loaded()).toEqual({
      options: [{ value: "a", label: "A" }],
      loading: false,
    });
    expect(failed()).toEqual({ options: [], loading: false });
    expect(warn).toHaveBeenCalled();
  });

  it("drops a load that settles after its owner is gone", async () => {
    const late = deferred();
    const failing = deferred();
    const kept = filterOptionsFor(
      { key: "k", options: () => late.promise },
      injector()
    );
    const lost = filterOptionsFor(
      { key: "l", options: () => failing.promise },
      injector()
    );
    TestBed.resetTestingModule();
    late.resolve([{ value: "a", label: "A" }]);
    failing.reject(new Error("late"));
    await new Promise((done) => setTimeout(done, 0));
    expect(kept().loading).toBe(true);
    expect(lost().loading).toBe(true);
  });
});
