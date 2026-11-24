import { describe, expect, it, vi } from "vitest";

import { applyRowPatchesWithLog, rekeyRow, updateRow } from "../rows/patch";
import {
  commitRowRekeys,
  onRowRekeyMoves,
  onRowRekeys,
  rekeyedIds,
  rekeyIdList,
  rekeyIdRecord,
  rekeyIdSet,
  rekeyRowIdSet,
  rekeyRowPins,
  rekeyTableRows,
} from "./rowRekeys";
import { createTableStore, defineSlice } from "./tableStore";

interface Row {
  readonly id: string;
  readonly ref: string;
}

const getRowId = (row: Row): string => row.id;
const ROWS: readonly Row[] = [
  { id: "a", ref: "ra" },
  { id: "b", ref: "rb" },
];

describe("row rekeys in a table's state", () => {
  it("remaps every registered piece of state in one change", () => {
    const store = createTableStore();
    const selected = defineSlice<ReadonlySet<string>>(
      "selected",
      () => new Set(["a", "b"])
    );
    const pinned = defineSlice<readonly string[]>("pinned", () => ["a"]);
    onRowRekeys<Row>(store, (log) => {
      store.batch((writer) =>
        writer.update(selected, (ids) =>
          rekeyIdSet(ids, rekeyedIds(log, getRowId))
        )
      );
    });
    onRowRekeys<Row>(store, (log) => {
      store.batch((writer) =>
        writer.update(pinned, (ids) =>
          rekeyIdList(ids, rekeyedIds(log, getRowId))
        )
      );
    });
    const heardSelected = vi.fn();
    const heardPinned = vi.fn();
    store.slice(selected).subscribe(heardSelected);
    store.slice(pinned).subscribe(heardPinned);
    const log = applyRowPatchesWithLog(
      ROWS,
      [rekeyRow<Row>("a", { id: "a2" })],
      getRowId
    );
    rekeyTableRows(store, log);
    expect([...store.read(selected)]).toEqual(["a2", "b"]);
    expect(store.read(pinned)).toEqual(["a2"]);
    expect(heardSelected).toHaveBeenCalledTimes(1);
    expect(heardPinned).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a log that rekeyed no row, and stops calling a released handler", () => {
    const store = createTableStore();
    const handler = vi.fn();
    const release = onRowRekeys(store, handler);
    rekeyTableRows(
      store,
      applyRowPatchesWithLog(
        ROWS,
        [updateRow<Row>("a", { ref: "x" })],
        getRowId
      )
    );
    expect(handler).not.toHaveBeenCalled();
    release();
    rekeyTableRows(
      store,
      applyRowPatchesWithLog(ROWS, [rekeyRow<Row>("a", { id: "a2" })], getRowId)
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it("commits the rekeys of new data whose log continues from the previous data", () => {
    const store = createTableStore();
    const handler = vi.fn();
    onRowRekeys(store, handler);
    const log = applyRowPatchesWithLog(
      ROWS,
      [rekeyRow<Row>("b", { id: "b2" })],
      getRowId
    );
    commitRowRekeys(store, [...ROWS], log.rows);
    expect(handler).not.toHaveBeenCalled();
    commitRowRekeys(store, ROWS, log.rows);
    expect(handler).toHaveBeenCalledTimes(1);
    commitRowRekeys(store, log.rows, log.rows);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("hands a registered target the rekey map", () => {
    const store = createTableStore();
    const target = { rekey: vi.fn() };
    onRowRekeyMoves(store, target);
    rekeyTableRows(
      store,
      applyRowPatchesWithLog(ROWS, [rekeyRow<Row>("a", { id: "a2" })], getRowId)
    );
    expect(target.rekey).toHaveBeenCalledWith({
      ids: new Map([["a", "a2"]]),
      rows: new Map([["a2", { id: "a2", ref: "ra" }]]),
    });
  });
});

describe("rekeyedIds", () => {
  it("maps an id another function derives, which a row-id rekey may leave alone", () => {
    const log = applyRowPatchesWithLog(
      ROWS,
      [
        rekeyRow<Row>("a", { id: "a2" }),
        rekeyRow<Row>("b", { id: "b2", ref: "rb2" }),
      ],
      getRowId
    );
    expect([...rekeyedIds(log, (row: Row) => row.ref)]).toEqual([
      ["rb", "rb2"],
    ]);
    expect([...rekeyedIds(log, getRowId)]).toEqual([
      ["a", "a2"],
      ["b", "b2"],
    ]);
  });
});

describe("the remappers", () => {
  const map = new Map([["a", "a2"]]);
  it("hand back the same value when no id moved", () => {
    const set = new Set(["x"]);
    const list = ["x"];
    const record = { x: 1 };
    expect(rekeyIdSet(set, map)).toBe(set);
    expect(rekeyIdList(list, map)).toBe(list);
    expect(rekeyIdRecord(record, map)).toBe(record);
  });
  it("move each id to its new key and keep the rest in place", () => {
    expect([...rekeyIdSet(new Set(["a", "b"]), map)]).toEqual(["a2", "b"]);
    expect(rekeyIdList(["b", "a"], map)).toEqual(["b", "a2"]);
    expect(rekeyIdRecord({ a: 1, b: 2 }, map)).toEqual({ a2: 1, b: 2 });
  });
});

describe("the row-id recipes", () => {
  const log = applyRowPatchesWithLog(
    ROWS,
    [rekeyRow<Row>("a", { id: "a2" })],
    getRowId
  ) as Parameters<typeof rekeyRowIdSet>[1];
  it("move an open row and a pinned row, keeping the pin's side and place", () => {
    expect([...rekeyRowIdSet(new Set(["a", "b"]), log)]).toEqual(["a2", "b"]);
    expect(rekeyRowPins({ top: ["b", "a"], bottom: [] }, log)).toEqual({
      top: ["b", "a2"],
      bottom: [],
    });
    const untouched = { top: ["b"], bottom: [] };
    expect(rekeyRowPins(untouched, log)).toBe(untouched);
  });
});
