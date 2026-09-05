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
});
