/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import { createTableEngine } from "./createTableEngine";
import { createNeutralTable } from "./neutralTable";

interface Person {
  id: string;
  name: string;
  team: string;
  spend: number;
}

const people: Person[] = [
  { id: "1", name: "Ada", team: "eng", spend: 30 },
  { id: "2", name: "Alan", team: "ops", spend: 10 },
  { id: "3", name: "Grace", team: "eng", spend: 20 },
];

const columns: ColumnModel<Person>[] = [
  { key: "name", sortable: true },
  { key: "team", sortable: true },
  { key: "spend", sortable: true, sortValue: (row) => row.spend },
];

describe("createTableEngine", () => {
  it("sorts, filters, pages and resolves cell values without React", () => {
    const engine = createTableEngine({
      data: people,
      columns,
      rowKey: (row) => row.id,
      defaults: { limit: 2, sortBy: "spend", sortDir: "asc" },
      filterFn: (row, extra) =>
        extra.team === undefined || row.team === extra.team,
    });

    expect(engine.rows("page").map((row) => row.id)).toEqual(["2", "3"]);
    expect(engine.cellValue(people[0]!, "spend")).toBe(30);
    expect(engine.snapshot().total).toBe(3);

    engine.dispatch({ type: "setFilters", filters: { team: "eng" } });
    expect(engine.rows("page").map((row) => row.id)).toEqual(["3", "1"]);
    expect(engine.snapshot().total).toBe(2);

    engine.dispatch({ type: "setSearch", search: "ada" });
    expect(engine.rows("full").map((row) => row.id)).toEqual(["1"]);
    expect(engine.rows("page").map((row) => row.id)).toEqual(["1"]);

    engine.dispatch({ type: "setSearch", search: "" });
    engine.dispatch({ type: "setFilters", filters: {} });
    engine.dispatch({ type: "setSort", key: "name", dir: "desc" });
    expect(engine.rows("page").map((row) => row.name)).toEqual([
      "Grace",
      "Alan",
    ]);
    engine.dispose();
  });

  it("notifies only subscribed axes and refuses work after dispose", () => {
    const engine = createTableEngine({
      data: people,
      columns,
      rowKey: (row) => row.id,
    });
    const seen: string[] = [];
    const stopView = engine.subscribe(["view"], () => {
      seen.push("view");
    });
    const stopData = engine.subscribe(["data"], () => {
      seen.push("data");
    });
    engine.dispatch({ type: "setSearch", search: "g" });
    expect(seen).toEqual(["view"]);
    engine.invalidate(["data"], { data: [...people] });
    expect(seen).toEqual(["view", "data"]);
    stopView();
    stopData();
    engine.dispatch({ type: "setPage", page: 2 });
    expect(seen).toEqual(["view", "data"]);
    engine.dispose();
    expect(() => engine.snapshot()).toThrow(/disposed/);
  });

  it("looks up rows by key and follows i18n paths", () => {
    const engine = createTableEngine({
      data: [{ id: "1", nameEn: "Ada", nameAr: "آدا" }],
      columns: [{ key: "nameEn", i18n: { ar: "nameAr" } }],
      rowKey: (row) => row.id,
      locale: "ar",
    });
    const row = engine.rowByKey("1");
    expect(row).toBeDefined();
    expect(engine.cellValue(row!, "nameEn")).toBe("آدا");
    engine.dispose();
  });

  it("isolates two engines and exposes NeutralTable operations", () => {
    const left = createTableEngine({
      data: people,
      columns,
      rowKey: (row) => row.id,
      tableId: "left",
      defaults: { sortBy: "name", sortDir: "asc", limit: 10 },
    });
    const right = createTableEngine({
      data: people,
      columns,
      rowKey: (row) => row.id,
      tableId: "right",
      defaults: { sortBy: "name", sortDir: "desc", limit: 10 },
    });
    expect(left.rows("full").map((row) => row.name)[0]).toBe("Ada");
    expect(right.rows("full").map((row) => row.name)[0]).toBe("Grace");
    left.dispatch({ type: "setSearch", search: "alan" });
    expect(left.rows("full").map((row) => row.id)).toEqual(["2"]);
    expect(right.rows("full")).toHaveLength(3);
    const table = createNeutralTable(left, left.tableId);
    expect(table.tableId).toBe("left");
    expect(table.operations.setSort).toBe(true);
    expect(table.rows("full").map((row) => row.id)).toEqual(["2"]);
    left.dispose();
    right.dispose();
  });

  it("bumps revisions on silent invalidate without notifying listeners", () => {
    const engine = createTableEngine({
      data: people,
      columns,
      rowKey: (row) => row.id,
    });
    const seen: string[] = [];
    engine.subscribe(["data"], () => {
      seen.push("data");
    });
    const before = engine.snapshot().revisions.data;
    engine.invalidate(["data"], { data: [...people] }, { silent: true });
    expect(engine.snapshot().revisions.data).toBe(before + 1);
    expect(seen).toEqual([]);
    engine.dispose();
  });

  it("uses dispatch search after configure and clears sort with undefined", () => {
    const engine = createTableEngine({
      data: people,
      columns,
      rowKey: (row) => row.id,
      defaults: { sortBy: "name", sortDir: "asc" },
    });
    engine.configure({ search: "Ada" });
    expect(engine.snapshot().search).toBe("Ada");
    expect(engine.rows("full").map((row) => row.id)).toEqual(["1"]);

    engine.dispatch({ type: "setSearch", search: "Grace" });
    expect(engine.snapshot().search).toBe("Grace");
    expect(engine.rows("full").map((row) => row.id)).toEqual(["3"]);

    engine.configure({ sortBy: undefined, sortDir: undefined });
    expect(engine.snapshot().sortBy).toBeUndefined();
    expect(engine.snapshot().sortDir).toBeUndefined();

    engine.configure({ groupBy: "team" });
    expect(engine.snapshot().groupBy).toBe("team");
    engine.configure({ groupBy: undefined });
    expect(engine.snapshot().groupBy).toBeUndefined();
    engine.dispose();
  });

  it("reports the page it is showing and remembers the one requested", () => {
    const engine = createTableEngine({
      data: people,
      columns,
      rowKey: (row) => row.id,
      defaults: { limit: 1 },
    });
    engine.dispatch({ type: "setPage", page: 3 });
    expect(engine.snapshot().page).toBe(3);
    expect(engine.rows("page").map((row) => row.id)).toEqual(["3"]);

    // Shrinking the data leaves page 3 past the end.
    engine.invalidate(["data"], { data: [people[0]!] });
    const shrunk = engine.snapshot();
    expect(shrunk.total).toBe(1);
    expect(shrunk.lastPage).toBe(1);
    expect(shrunk.page).toBe(1);
    expect(shrunk.requestedPage).toBe(3);
    expect(engine.rows("page").map((row) => row.id)).toEqual(["1"]);

    // The request survives, so restoring the rows restores the page.
    engine.invalidate(["data"], { data: people });
    expect(engine.snapshot().page).toBe(3);
    expect(engine.rows("page").map((row) => row.id)).toEqual(["3"]);
    engine.dispose();
  });

  it("commits page and limit as one configure transaction", () => {
    const engine = createTableEngine({
      data: people,
      columns,
      rowKey: (row) => row.id,
      defaults: { limit: 1, page: 3 },
    });
    const seen: number[] = [];
    engine.subscribe(["view"], () => {
      seen.push(engine.snapshot().page);
    });

    // setLimit alone is a user action: it returns to page 1.
    engine.dispatch({ type: "setLimit", limit: 2 });
    expect(engine.snapshot().page).toBe(1);

    // configure replays controlled state without that reset.
    engine.configure({ page: 2, limit: 1 });
    expect(engine.snapshot().page).toBe(2);
    expect(engine.snapshot().limit).toBe(1);
    expect(seen).toEqual([1, 2]);

    // An unchanged transaction notifies nobody.
    engine.configure({ page: 2, limit: 1 });
    expect(seen).toEqual([1, 2]);
    engine.dispose();
  });

  it("moves the window on page or limit without re-deriving rows", () => {
    const engine = createTableEngine({
      data: people,
      columns,
      rowKey: (row) => row.id,
      defaults: { limit: 1, sortBy: "spend", sortDir: "asc" },
    });
    const derivedBefore = engine.rows("full");
    engine.configure({ page: 2 });
    // Paging slices an existing derivation; it never rebuilds it.
    expect(engine.rows("full")).toBe(derivedBefore);
    expect(engine.rows("page").map((row) => row.id)).toEqual(["3"]);
    engine.dispose();
  });

  it("applies a changed locale, pagination mode and row identity", () => {
    const engine = createTableEngine({
      data: [
        { id: "1", ref: "a", nameEn: "Ada", nameAr: "آدا" },
        { id: "2", ref: "b", nameEn: "Alan", nameAr: "آلان" },
      ],
      columns: [{ key: "nameEn", i18n: { ar: "nameAr" } }],
      rowKey: (row) => row.id,
      locale: "en",
      defaults: { limit: 1 },
    });
    const first = engine.rowByKey("1");
    expect(engine.cellValue(first!, "nameEn")).toBe("Ada");

    engine.configure({ locale: "ar" });
    expect(engine.cellValue(first!, "nameEn")).toBe("آدا");
    expect(engine.snapshot().revisions.schema).toBeGreaterThan(1);

    engine.configure({ paginationMode: "infinite" });
    engine.dispatch({ type: "setPage", page: 2 });
    expect(engine.rows("page")).toHaveLength(2);

    engine.configure({ getRowId: (row) => row.ref });
    expect(engine.rowByKey("1")).toBeUndefined();
    expect(engine.rowByKey("a")).toBeDefined();
    expect(engine.rowKey(first!)).toBe("a");
    engine.dispose();
  });

  it("re-derives on a bare data invalidate after an in-place mutation", () => {
    const rows = [
      { id: "1", name: "Ada", team: "eng", spend: 30 },
      { id: "2", name: "Alan", team: "ops", spend: 10 },
    ];
    const engine = createTableEngine({
      data: rows,
      columns,
      rowKey: (row) => row.id,
      defaults: { search: "ada" },
    });
    expect(engine.rows("full").map((row) => row.id)).toEqual(["1"]);

    rows[1]!.name = "Adalyn";
    engine.invalidate(["data"]);
    expect(engine.rows("full").map((row) => row.id)).toEqual(["1", "2"]);
    engine.dispose();
  });
});
