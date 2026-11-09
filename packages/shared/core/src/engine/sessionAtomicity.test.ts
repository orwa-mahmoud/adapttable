/**
 * One table, one coherent state for every reader.
 *
 * A staged candidate stays private until it is committed, a commit tells
 * subscribers about every axis the candidate changed, and a write whose
 * evaluation throws leaves the committed table exactly as it was.
 */
import { describe, expect, it, vi } from "vitest";

import { applyRowPatches, updateRow } from "../rows/patch";
import { createBasicTableEngine } from "./basicTableEngine";
import {
  createTableEngine,
  type CreateTableEngineOptions,
  type TableEngine,
} from "./createTableEngine";

interface Row {
  id: string;
  code: string;
  name: string;
  score: number;
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
    code: `c${String(index)}`,
    name: `Name ${String(index)}`,
    score: index,
  }));
}

function optionsFor(data: Row[]): CreateTableEngineOptions<Row> {
  return {
    data,
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "score", header: "Score", sortable: true },
    ],
    rowKey: (row) => row.id,
    defaults: { limit: 10 },
  };
}

describe.each(ENGINES)("the %s engine", (_name, create) => {
  it("keeps row identity committed until the candidate is", () => {
    const data = rows(3);
    const engine = create(optionsFor(data));
    const row = data[1]!;

    engine.stageCandidate({ getRowId: (entry) => entry.code });

    expect(engine.rowKey(row)).toBe("1");
    expect(engine.rowByKey("1")).toBe(row);
    expect(engine.candidate.rowByKey("c1")).toBe(row);

    engine.commitCandidate();

    expect(engine.rowKey(row)).toBe("c1");
    expect(engine.rowByKey("c1")).toBe(row);
  });

  it("tells subscribers when a committed filter changes the rows", () => {
    const engine = create({
      ...optionsFor(rows(1000)),
      filterFn: (row, extra) =>
        extra.only === undefined || row.id === extra.only,
    });
    const woken = vi.fn();
    engine.subscribe(["view"], woken);

    engine.stageCandidate({ extra: { only: "7" } });
    expect(engine.rows("full")).toHaveLength(1000);
    engine.commitCandidate();

    expect(engine.rows("full").map((row) => row.id)).toEqual(["7"]);
    expect(woken).toHaveBeenCalledTimes(1);
  });

  it("publishes what a callback refresh changes on a pending candidate", () => {
    const engine = create(optionsFor(rows(1000)));
    const woken = vi.fn();
    engine.subscribe(["view"], woken);

    // A source stages its frame, then refreshes the callbacks it read.
    engine.stageCandidate({});
    engine.refreshCallbacks({ filterFn: (row) => row.id === "7" });
    expect(engine.rows("full")).toHaveLength(1000);
    expect(engine.candidate.rows("full")).toHaveLength(1);
    engine.commitCandidate();

    expect(engine.rows("full").map((row) => row.id)).toEqual(["7"]);
    expect(woken).toHaveBeenCalledTimes(1);
  });

  it("leaves the table as it was when a search throws", () => {
    let failing = false;
    const engine = create({
      ...optionsFor(rows(20)),
      getSearchText: (row) => {
        if (failing) throw new Error("search text failed");
        return row.name;
      },
    });
    const before = engine.snapshot();
    const shown = engine.rows("full");
    const woken = vi.fn();
    engine.subscribe("all", woken);

    failing = true;
    expect(() => {
      engine.dispatch({ type: "setSearch", search: "Name 3" });
    }).toThrow("search text failed");

    expect(engine.snapshot().search).toBe(before.search);
    expect(engine.snapshot().revisions).toEqual(before.revisions);
    expect(engine.rows("full")).toEqual(shown);
    expect(woken).not.toHaveBeenCalled();

    failing = false;
    engine.dispatch({ type: "setSearch", search: "Name 3" });
    expect(engine.snapshot().search).toBe("Name 3");
    expect(engine.rows("full").map((row) => row.id)).toEqual(["3"]);
  });

  it("leaves the committed table as it was when a staged search throws", () => {
    let failing = false;
    const engine = create({
      ...optionsFor(rows(20)),
      getSearchText: (row) => {
        if (failing) throw new Error("search text failed");
        return row.name;
      },
    });
    const before = engine.snapshot();

    failing = true;
    expect(() => {
      engine.stageCandidate({ search: "Name 3" });
    }).toThrow("search text failed");
    engine.commitCandidate();

    expect(engine.snapshot().search).toBe(before.search);
    expect(engine.snapshot().revisions).toEqual(before.revisions);
    expect(engine.rows("full")).toHaveLength(20);
  });

  it("filters only the patched row when one row changes", () => {
    const data = rows(1000);
    const filter = vi.fn((row: Row) => row.score % 2 === 0);
    const engine = create({ ...optionsFor(data), filterFn: filter });
    filter.mockClear();

    const next = applyRowPatches(
      data,
      [updateRow<Row>("4", { score: 5 })],
      (row) => row.id
    );
    engine.invalidate(["data"], { data: next });

    expect(filter).toHaveBeenCalledTimes(1);
    expect(engine.rows("full")).toHaveLength(499);
    expect(engine.rowByKey("4")?.score).toBe(5);
  });

  it("reuses the derived rows for a page-only stage", () => {
    const engine = create(optionsFor(rows(100)));
    const committed = engine.rows("full");

    engine.stageCandidate({ page: 3 });

    expect(engine.candidate.rows("full")).toBe(committed);
    expect(engine.candidate.snapshot().page).toBe(3);
    expect(engine.snapshot().page).toBe(1);
  });
});
