/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";

import type { ColumnModel } from "../columnModel";
import { applyRowPatches, updateRow } from "../rows/patch";
import { createTableEngine } from "./createTableEngine";

interface Person {
  id: string;
  name: string;
  spend: number;
}

const PEOPLE: readonly Person[] = [
  { id: "1", name: "Ada", spend: 30 },
  { id: "2", name: "Alan", spend: 10 },
  { id: "3", name: "Grace", spend: 20 },
];
const COLUMNS: ColumnModel<Person>[] = [
  {
    key: "displayName",
    accessor: (row) => row.name,
    sortValue: (row) => row.name,
  },
];
const byId = (row: Person) => row.id;

describe("table engine row patch ancestry", () => {
  it("preserves both coalesced patches, aliased sorting and selection until commit", () => {
    const filterFn = vi.fn((row: Person) => row.spend > 0);
    const engine = createTableEngine({
      data: PEOPLE,
      columns: COLUMNS,
      rowKey: byId,
      defaults: { sortBy: "displayName", sortDir: "asc" },
      filterFn,
    });
    const selectedIds = ["1", "3"];
    engine.dispatch({ type: "setSelection", ids: selectedIds });
    const before = engine.snapshot();
    const listener = vi.fn();
    engine.subscribe("all", listener);
    filterFn.mockClear();

    const first = applyRowPatches(
      PEOPLE,
      [updateRow("1", { name: "Zora", spend: 40 })],
      byId
    );
    const second = applyRowPatches(
      first,
      [updateRow("2", { name: "Abel", spend: 25 })],
      byId
    );
    engine.stageCandidate({}, { data: second });

    expect(engine.candidate.rows("full")).toEqual([
      second[1],
      PEOPLE[2],
      second[0],
    ]);
    expect(engine.candidate.rowByKey("1")).toBe(second[0]);
    expect(engine.candidate.rowByKey("2")).toBe(second[1]);
    expect(engine.candidate.rowByKey("3")).toBe(PEOPLE[2]);
    expect(engine.candidate.snapshot().selectedIds).toBe(selectedIds);
    expect(filterFn).toHaveBeenCalledTimes(PEOPLE.length);
    expect(engine.rows("full")).toEqual(PEOPLE);
    expect(engine.snapshot()).toEqual(before);
    expect(listener).not.toHaveBeenCalled();

    engine.commitCandidate();
    expect(engine.rows("page")).toEqual([second[1], PEOPLE[2], second[0]]);
    expect(engine.snapshot().selectedIds).toBe(selectedIds);
    expect(engine.snapshot().revisions.data).toBe(before.revisions.data + 1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(PEOPLE.map((row) => row.name)).toEqual(["Ada", "Alan", "Grace"]);
    engine.dispose();
  });

  it("re-evaluates only one row for each immediately consumed patch", () => {
    const filterFn = vi.fn((row: Person) => row.spend > 0);
    const engine = createTableEngine({
      data: PEOPLE,
      columns: COLUMNS,
      rowKey: byId,
      filterFn,
    });
    filterFn.mockClear();
    const first = applyRowPatches(
      PEOPLE,
      [updateRow("1", { spend: 40 })],
      byId
    );
    engine.invalidate(["data"], { data: first });
    expect(filterFn.mock.calls.map(([row]) => row.id)).toEqual(["1"]);
    expect(engine.rowByKey("2")).toBe(PEOPLE[1]);

    filterFn.mockClear();
    const second = applyRowPatches(
      first,
      [updateRow("2", { spend: 25 })],
      byId
    );
    engine.stageCandidate({}, { data: second });
    engine.commitCandidate();
    expect(filterFn.mock.calls.map(([row]) => row.id)).toEqual(["2"]);
    expect(engine.rows("full")).toEqual(second);
    engine.dispose();
  });

  it("rebuilds a log based on a different dataset with the same row ids", () => {
    const other = PEOPLE.map((row) => ({ ...row, name: `Local ${row.name}` }));
    const engine = createTableEngine({
      data: other,
      columns: COLUMNS,
      rowKey: byId,
      filterFn: (row) => row.spend > 0,
    });
    const patched = applyRowPatches(
      PEOPLE,
      [updateRow("2", { name: "Remote Alan" })],
      byId
    );
    engine.invalidate(["data"], { data: patched });
    expect(engine.rows("full")).toEqual(patched);
    expect(engine.rowByKey("1")).toBe(PEOPLE[0]);
    expect(engine.rowByKey("3")).toBe(PEOPLE[2]);
    engine.dispose();
  });
});
