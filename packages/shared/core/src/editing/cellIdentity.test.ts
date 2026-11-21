import { describe, expect, it } from "vitest";

import type { EditableCellEditing } from "../rows/rowEditingDigest";
import { rowEditingSignature } from "../rows/rowPresentation";
import { batchEditingView, createBatchEditStore } from "./batchEditing";
import {
  createDirtyCellStore,
  dirtyCellKey,
  dirtyCellView,
} from "./dirtyCells";
import { cellSaveView } from "./editableCell";
import {
  contestedCellKey,
  type ContestedEditCell,
  contestedRowSignature,
  type EditConflictSnapshot,
} from "./editConflict";
import {
  cellSaveKey,
  cellSaveStatus,
  createCellSaveStore,
} from "./editSession";
import {
  type EditValidationSnapshot,
  rowHasValidationError,
  validationKey,
} from "./editValidation";

interface Row {
  id: string;
  note: string;
}

/** Two cells whose row id and column key share a space at the seam. */
const SPACED = { rowId: "client east", columnKey: "name" } as const;
const SHIFTED = { rowId: "client", columnKey: "east name" } as const;

/** Every cell key helper, for the pairs that would collide. */
const KEYS = [
  ["dirtyCellKey", dirtyCellKey],
  ["cellSaveKey", cellSaveKey],
  ["validationKey", validationKey],
  ["contestedCellKey", contestedCellKey],
] as const;

describe("cell identity on every edit path", () => {
  it("gives two cells two keys whatever their ids contain", () => {
    const pairs: readonly (readonly [string, string, string, string])[] = [
      [SPACED.rowId, SPACED.columnKey, SHIFTED.rowId, SHIFTED.columnKey],
      ["a\u0000b", "c", "a", "b\u0000c"],
      ['a","b', "c", "a", 'b","c'],
      ["a:b", "c", "a", "b:c"],
    ];
    for (const [name, key] of KEYS) {
      for (const [rowA, colA, rowB, colB] of pairs) {
        expect(key(rowA, colA), `${name} ${rowA}/${colA}`).not.toBe(
          key(rowB, colB)
        );
      }
    }
  });

  it("keeps one cell's dirty mark when another cell is confirmed", () => {
    const store = createDirtyCellStore({ enabled: true });
    store.mark(SPACED.rowId, SPACED.columnKey);
    store.mark(SHIFTED.rowId, SHIFTED.columnKey);
    expect(store.getSnapshot().cells.size).toBe(2);
    store.confirm(SHIFTED.rowId, SHIFTED.columnKey);
    const view = dirtyCellView(store, store.getSnapshot());
    expect(view.isDirty(SPACED.rowId, SPACED.columnKey)).toBe(true);
    expect(view.isDirty(SHIFTED.rowId, SHIFTED.columnKey)).toBe(false);
  });

  it("scopes a row's dirty marks to that row", () => {
    const store = createDirtyCellStore({ enabled: true });
    store.mark(SPACED.rowId, SPACED.columnKey);
    const view = dirtyCellView(store, store.getSnapshot());
    expect(view.isRowDirty(SPACED.rowId)).toBe(true);
    expect(view.isRowDirty(SHIFTED.rowId)).toBe(false);
    store.confirmRow(SHIFTED.rowId);
    expect(
      dirtyCellView(store, store.getSnapshot()).isDirty(
        SPACED.rowId,
        SPACED.columnKey
      )
    ).toBe(true);
  });

  it("keeps one cell's save state off another cell", () => {
    const store = createCellSaveStore<Row>();
    void store.track({
      ...SPACED,
      previous: { id: SPACED.rowId, note: "" },
      attempted: "x",
      result: new Promise<void>(() => undefined),
    });
    const snapshot = store.getSnapshot();
    expect(cellSaveStatus(snapshot, SPACED.rowId, SPACED.columnKey)).toBe(
      "saving"
    );
    expect(
      cellSaveStatus(snapshot, SHIFTED.rowId, SHIFTED.columnKey)
    ).toBeUndefined();
  });

  it("scopes a row's validation messages to that row", () => {
    const snapshot: EditValidationSnapshot = {
      cellErrors: new Map([[validationKey("a\u0000b", "c"), "Too short"]]),
      rowErrors: new Map(),
      validating: new Set(),
    };
    expect(rowHasValidationError(snapshot, "a\u0000b")).toBe(true);
    expect(rowHasValidationError(snapshot, "a")).toBe(false);
  });

  it("tells contested cells apart whatever their incoming values contain", () => {
    const cell = (incoming: string): ContestedEditCell<Row> => ({
      row: { id: "r1", note: "" },
      incoming,
      accept: () => undefined,
      take: () => undefined,
    });
    const snapshot = (
      cells: readonly (readonly [string, string])[]
    ): EditConflictSnapshot<Row> => ({
      current: null,
      contested: new Map(
        cells.map(([columnKey, incoming]) => [
          contestedCellKey("r1", columnKey),
          cell(incoming),
        ])
      ),
    });
    expect(contestedRowSignature(snapshot([["a", "x|b=y"]]), "r1")).not.toBe(
      contestedRowSignature(
        snapshot([
          ["a", "x"],
          ["b", "y"],
        ]),
        "r1"
      )
    );
  });
});

describe("rowEditingSignature", () => {
  const columns = [{ key: "note", editable: true }];
  const batchEditing = (value: string): EditableCellEditing<Row> => {
    const store = createBatchEditStore<Row>({ enabled: true, columns });
    store.setDraft({ id: "r1", note: "" }, "r1", "note", value);
    return {
      state: {},
      batch: batchEditingView(store, store.getSnapshot(), { columns }),
    };
  };

  it("changes when a batch draft changes after a semicolon", () => {
    expect(
      rowEditingSignature(batchEditing("part one;first suffix"), "r1")
    ).not.toBe(
      rowEditingSignature(batchEditing("part one;second suffix"), "r1")
    );
  });

  it("reads only this row's marks and saves", () => {
    const dirty = createDirtyCellStore({ enabled: true });
    const saving = createCellSaveStore<Row>();
    const editing = (): EditableCellEditing<Row> => ({
      state: {},
      dirty: dirtyCellView(dirty, dirty.getSnapshot()),
      saving: cellSaveView(saving, saving.getSnapshot(), false),
    });
    const before = rowEditingSignature(editing(), "a");
    dirty.mark("ba", "x");
    void saving.track({
      rowId: "ba",
      columnKey: "x",
      previous: { id: "ba", note: "" },
      attempted: "y",
      result: new Promise<void>(() => undefined),
    });
    expect(rowEditingSignature(editing(), "a")).toBe(before);
    dirty.mark("a", "x");
    expect(rowEditingSignature(editing(), "a")).not.toBe(before);
  });
});
