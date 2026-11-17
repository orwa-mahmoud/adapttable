/**
 * A patch batch costs the rows it touched, in both engines.
 *
 * The filter and the search text run once per row the batch leaves changed,
 * and the sort value once per such row the filter keeps — never for a row it
 * did not touch, however many rows the table holds — and the rows land where
 * a build from nothing puts them.
 */
import { describe, expect, it } from "vitest";

import {
  applyRowPatches,
  insertRow,
  removeRow,
  updateRow,
} from "../rows/patch";
import { createBasicTableEngine } from "./basicTableEngine";
import {
  createTableEngine,
  type CreateTableEngineOptions,
  type TableEngine,
} from "./createTableEngine";

interface Row {
  id: string;
  name: string;
  team: string;
  score: number;
}

interface Calls {
  filter: number;
  search: number;
  sort: number;
}

const ENGINES: readonly [
  string,
  (options: CreateTableEngineOptions<Row>) => TableEngine<Row>,
][] = [
  ["basic", createBasicTableEngine],
  ["full", createTableEngine],
];

function rows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    name: `Name ${String(index)}`,
    team: `t${String(index % 7)}`,
    score: (index * 37) % 101,
  }));
}

/** Options whose filter, search text and sort value count their calls. */
function counted(
  data: readonly Row[],
  calls: Calls
): CreateTableEngineOptions<Row> {
  return {
    data,
    rowKey: (row) => row.id,
    columns: [
      { key: "name", header: "Name" },
      {
        key: "score",
        header: "Score",
        sortable: true,
        sortValue: (row) => (calls.sort++, row.score),
      },
    ],
    filterFn: (row) => (calls.filter++, row.score % 3 !== 0),
    getSearchText: (row) => (calls.search++, row.name),
    defaults: { search: "name", sortBy: "score", sortDir: "desc", limit: 20 },
  };
}

/** Seven changed rows: updates that move, stay, leave and enter, an insert and a remove. */
function batch(data: readonly Row[]): readonly Row[] {
  return applyRowPatches(
    data,
    [
      updateRow<Row>("3", { score: 100 }),
      updateRow<Row>("10", { score: 99 }),
      updateRow<Row>("11", { score: 7 }),
      updateRow<Row>("12", { name: "Name twelve" }),
      updateRow<Row>("13", { score: 4 }),
      insertRow<Row>({ id: "new", name: "Name new", team: "t1", score: 50 }, 5),
      removeRow("20"),
      updateRow<Row>("14", { score: 2 }),
    ],
    (row) => row.id
  );
}

const ids = (list: readonly Row[]) => list.map((row) => row.id);

describe.each(ENGINES)("a patch on the %s engine", (_name, create) => {
  it.each([500, 5000])(
    "calls the filter, search text and sort value once per changed row (%i rows)",
    (count) => {
      const data = rows(count);
      const calls: Calls = { filter: 0, search: 0, sort: 0 };
      const engine = create(counted(data, calls));
      engine.rows("full");
      Object.assign(calls, { filter: 0, search: 0, sort: 0 });

      engine.invalidate(["data"], { data: batch(data) });
      engine.rows("full");

      // Seven rows the batch leaves changed: six updates and the insert. Row
      // 10 now fails the filter, so only the other six need a sort value.
      expect(calls).toEqual({ filter: 7, search: 7, sort: 6 });
    }
  );

  it("places the rows where a build from nothing does", () => {
    const data = rows(400);
    const next = batch(data);
    const patched = create(counted(data, { filter: 0, search: 0, sort: 0 }));
    patched.rows("full");
    patched.invalidate(["data"], { data: next });
    const built = create(counted(next, { filter: 0, search: 0, sort: 0 }));

    expect(ids(patched.rows("full"))).toEqual(ids(built.rows("full")));
    expect(ids(patched.rows("page"))).toEqual(ids(built.rows("page")));
  });

  it("agrees with a build when a batch changes a large share of the rows", () => {
    const data = rows(2048);
    const next = applyRowPatches(
      data,
      data
        .filter((_, index) => index % 5 === 0)
        .map((row) =>
          updateRow<Row>(row.id, { score: (row.score + 50) % 101 })
        ),
      (row) => row.id
    );
    const patched = create(counted(data, { filter: 0, search: 0, sort: 0 }));
    patched.rows("full");
    patched.invalidate(["data"], { data: next });
    const built = create(counted(next, { filter: 0, search: 0, sort: 0 }));

    expect(ids(patched.rows("full"))).toEqual(ids(built.rows("full")));
  });

  it("orders equal sort values by source order after a patch", () => {
    const data = rows(60).map((row) => ({ ...row, score: row.score % 2 }));
    const engine = create({
      ...counted(data, { filter: 0, search: 0, sort: 0 }),
      filterFn: undefined,
      defaults: { sortBy: "score", sortDir: "asc", limit: 100 },
    });
    engine.rows("full");
    const next = applyRowPatches(
      data,
      [
        insertRow<Row>({ id: "front", name: "front", team: "t0", score: 0 }, 0),
        updateRow<Row>("30", { score: 0 }),
      ],
      (row) => row.id
    );
    engine.invalidate(["data"], { data: next });
    const built = create({
      ...counted(next, { filter: 0, search: 0, sort: 0 }),
      filterFn: undefined,
      defaults: { sortBy: "score", sortDir: "asc", limit: 100 },
    });

    expect(ids(engine.rows("full"))).toEqual(ids(built.rows("full")));
  });
});
