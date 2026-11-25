import { describe, expect, it, vi } from "vitest";

import {
  applyRowPatches,
  applyRowPatchesWithLog,
  logForCommit,
  rekeyRow,
  removeRow,
  rowPatchLog,
  rowPatchLogStartsAt,
  updateRow,
} from "../rows/patch";
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

  it("follows a custom selection id to the row's value after a later update", () => {
    const rows: readonly Row[] = [{ id: "a", ref: "x" }];
    const log = applyRowPatchesWithLog(
      rows,
      [
        rekeyRow<Row>("a", { id: "b", ref: "y" }),
        updateRow<Row>("b", { ref: "z" }),
      ],
      getRowId
    );
    expect([...rekeyedIds(log, (row) => row.ref)]).toEqual([["x", "z"]]);
    expect([...rekeyedIds(log, getRowId)]).toEqual([["a", "b"]]);
  });

  it("collapses chained rekeys, drops a rekey back, and omits a removed row", () => {
    const rows: readonly Row[] = [
      { id: "a", ref: "x" },
      { id: "c", ref: "c" },
    ];
    const chained = applyRowPatchesWithLog(
      rows,
      [
        rekeyRow<Row>("a", { id: "b", ref: "y" }),
        rekeyRow<Row>("b", { id: "d", ref: "z" }),
      ],
      getRowId
    );
    expect([...rekeyedIds(chained, (row) => row.ref)]).toEqual([["x", "z"]]);
    expect([...rekeyedIds(chained, getRowId)]).toEqual([["a", "d"]]);
    const back = applyRowPatchesWithLog(
      rows,
      [
        rekeyRow<Row>("a", { id: "b", ref: "y" }),
        rekeyRow<Row>("b", { id: "a", ref: "x" }),
      ],
      getRowId
    );
    expect([...rekeyedIds(back, (row) => row.ref)]).toEqual([]);
    expect([...rekeyedIds(back, getRowId)]).toEqual([]);
    const removed = applyRowPatchesWithLog(
      rows,
      [rekeyRow<Row>("a", { id: "b", ref: "y" }), removeRow("b")],
      getRowId
    );
    expect([...rekeyedIds(removed, (row) => row.ref)]).toEqual([]);
    expect([...rekeyedIds(removed, getRowId)]).toEqual([]);
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

describe("rekeys across separately applied patches", () => {
  const rows: readonly Row[] = [{ id: "a", ref: "x" }];

  function follow(initial: readonly string[], getId: (row: Row) => string) {
    const store = createTableStore();
    let selected = [...initial];
    onRowRekeys<Row>(store, (log) => {
      selected = [...rekeyIdSet(new Set(selected), rekeyedIds(log, getId))];
    });
    return { store, read: () => selected };
  }

  it("moves selection when a later update commits with the rekey", () => {
    const { store, read } = follow(["a"], getRowId);
    const rekeyed = applyRowPatches(
      rows,
      [rekeyRow<Row>("a", { id: "b", ref: "y" })],
      getRowId
    );
    const updated = applyRowPatches(
      rekeyed,
      [updateRow<Row>("b", { ref: "z" })],
      getRowId
    );
    const log = rowPatchLog(updated);
    expect(log && rowPatchLogStartsAt(log, rows)).toBe(false);
    expect(log && rowPatchLogStartsAt(log, rekeyed)).toBe(true);
    expect(log && logForCommit(log, rows)?.events.length).toBe(2);
    commitRowRekeys(store, rows, updated);
    expect(read()).toEqual(["b"]);
    // The commit consumed the chain. A second look at the original does not
    // replay it, and the public log still carries only its own events.
    commitRowRekeys(store, rows, updated);
    expect(read()).toEqual(["b"]);
    expect(log?.events).toHaveLength(1);
    expect(Object.keys(log ?? {})).toEqual(["rows", "events"]);
  });

  it("follows an external id that the second call changes", () => {
    const { store, read } = follow(["x"], (row) => row.ref);
    const rekeyed = applyRowPatches(
      rows,
      [rekeyRow<Row>("a", { id: "b", ref: "y" })],
      getRowId
    );
    const updated = applyRowPatches(
      rekeyed,
      [updateRow<Row>("b", { ref: "z" })],
      getRowId
    );
    commitRowRekeys(store, rows, updated);
    expect(read()).toEqual(["z"]);
  });

  it("collapses a chained rekey that was applied in two calls", () => {
    const { store, read } = follow(["a"], getRowId);
    const first = applyRowPatches(
      rows,
      [rekeyRow<Row>("a", { id: "b" })],
      getRowId
    );
    const second = applyRowPatches(
      first,
      [rekeyRow<Row>("b", { id: "c" })],
      getRowId
    );
    commitRowRekeys(store, rows, second);
    expect(read()).toEqual(["c"]);
  });

  it("keeps each commit incremental when the host commits after every call", () => {
    const { store, read } = follow(["a"], getRowId);
    const rekeyed = applyRowPatches(
      rows,
      [rekeyRow<Row>("a", { id: "b" })],
      getRowId
    );
    commitRowRekeys(store, rows, rekeyed);
    expect(read()).toEqual(["b"]);
    const updated = applyRowPatches(
      rekeyed,
      [updateRow<Row>("b", { ref: "z" })],
      getRowId
    );
    commitRowRekeys(store, rekeyed, updated);
    expect(read()).toEqual(["b"]);
  });

  it("leaves selection on a replacement array that is not a patch", () => {
    const { store, read } = follow(["a"], getRowId);
    commitRowRekeys(store, rows, [{ id: "b", ref: "x" }]);
    expect(read()).toEqual(["a"]);
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
