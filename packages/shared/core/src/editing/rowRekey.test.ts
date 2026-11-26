/**
 * A rekey carries a row's editing state to its new id: drafts, the open
 * editor, saves (one still in flight included), validation errors, dirty
 * marks and open conflict questions.
 */
import { describe, expect, it, vi } from "vitest";

import { applyRowPatchesWithLog, rekeyRow, updateRow } from "../rows/patch";
import { rowRekeyMoves } from "../state/rowRekeys";
import { createBatchEditStore } from "./batchEditing";
import type { EditableColumnLike } from "./cellEditing";
import { EDIT_CONFLICT_TOOLS } from "./deferredEditConflict";
import { createDirtyCellStore } from "./dirtyCells";
import { editConflictStoreWith } from "./editConflict";
import { createCellEditSession, createCellSaveStore } from "./editSession";
import { createEditValidationStore, validationKey } from "./editValidation";
import { createRowEditStore } from "./rowEditing";

interface Row {
  readonly id: string;
  readonly title: string;
}

const getRowId = (row: Row): string => row.id;
const ROWS: readonly Row[] = [
  { id: "a", title: "Ada" },
  { id: "b", title: "Bea" },
];
const TITLE: EditableColumnLike<Row> = { key: "title", editable: true };
const log = applyRowPatchesWithLog(
  ROWS,
  [rekeyRow<Row>("a", { id: "a2" }), updateRow<Row>("a2", { title: "Al" })],
  getRowId
);
const moves = rowRekeyMoves(log);
const A2 = log.rows[0]!;

describe("rowRekeyMoves", () => {
  it("names each moved id and the row now under it", () => {
    expect([...moves.ids]).toEqual([["a", "a2"]]);
    expect(moves.rows.get("a2")).toEqual({ id: "a2", title: "Al" });
  });

  it("is empty for a log that rekeyed nothing", () => {
    const plain = rowRekeyMoves(
      applyRowPatchesWithLog(
        ROWS,
        [updateRow<Row>("a", { title: "x" })],
        getRowId
      )
    );
    expect(plain.ids.size).toBe(0);
    expect(plain.rows.size).toBe(0);
  });
});

describe("editing state after a rekey", () => {
  it("moves a batch's pending row and saves it under the new id with the new row", () => {
    const onBatchEdit = vi.fn();
    const store = createBatchEditStore<Row>({
      enabled: true,
      columns: [TITLE],
      onBatchEdit,
    });
    store.setDraft(ROWS[0]!, "a", "title", "Typed");
    store.rekey(moves);
    expect(Object.keys(store.getSnapshot().pending)).toEqual(["a2"]);
    store.saveAll();
    expect(onBatchEdit).toHaveBeenCalledWith([
      { row: A2, rowId: "a2", patch: { title: "Typed" } },
    ]);
  });

  it("moves an open row form and hands its save the new row", () => {
    const onRowEdit = vi.fn();
    const store = createRowEditStore<Row>({
      enabled: true,
      columns: [TITLE],
      onRowEdit,
    });
    store.begin(ROWS[0]!, "a");
    store.setDraft("title", "Typed");
    store.rekey(moves);
    expect(store.getSnapshot().activeRowId).toBe("a2");
    expect(store.getSnapshot().drafts).toEqual({ title: "Typed" });
    store.save();
    expect(onRowEdit).toHaveBeenCalledWith(A2, { title: "Typed" });
  });

  it("moves an open cell editor with its draft, so the row is not seen as gone", () => {
    const session = createCellEditSession<Row>();
    session.begin("a", "title", "Ada", ROWS[0]);
    session.setDraft("Typed");
    session.rekey(moves);
    expect(session.getSnapshot()).toEqual({
      active: { rowId: "a2", columnKey: "title" },
      draft: "Typed",
    });
    session.discardIfRowMissing(log.rows, (row) => getRowId(row as Row));
    expect(session.getSnapshot().active?.rowId).toBe("a2");
    expect(session.openedRow()).toBe(A2);
  });

  it("settles a save in flight under the row's new id", async () => {
    const onEditError = vi.fn();
    const store = createCellSaveStore<Row>({ onEditError });
    let reject: ((error: Error) => void) | undefined;
    const saved = store.track({
      rowId: "a",
      columnKey: "title",
      previous: ROWS[0]!,
      attempted: "Typed",
      result: new Promise<void>((_, fail) => {
        reject = fail;
      }),
    });
    store.rekey(moves);
    expect([...store.getSnapshot().saving]).toEqual([
      validationKey("a2", "title"),
    ]);
    reject?.(new Error("offline"));
    expect(await saved).toBe(false);
    expect(store.getSnapshot().saving.size).toBe(0);
    expect([...store.getSnapshot().failures.keys()]).toEqual([
      validationKey("a2", "title"),
    ]);
    expect(onEditError).toHaveBeenCalledWith(
      expect.objectContaining({ rowId: "a2", columnKey: "title" })
    );
  });

  it("moves validation errors and drops a check still running for the row", async () => {
    let finish: ((message: string) => void) | undefined;
    const store = createEditValidationStore<Row>();
    await store.check({
      target: { rowId: "b", columnKey: "title" },
      value: "",
      row: ROWS[1]!,
      validateCell: () => "Required",
    });
    const running = store.check({
      target: { rowId: "a", columnKey: "title" },
      value: "",
      row: ROWS[0]!,
      validateCell: () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    });
    store.rekey(
      rowRekeyMoves(
        applyRowPatchesWithLog(
          ROWS,
          [rekeyRow<Row>("a", { id: "a2" }), rekeyRow<Row>("b", { id: "b2" })],
          getRowId
        )
      )
    );
    expect([...store.getSnapshot().cellErrors]).toEqual([
      [validationKey("b2", "title"), "Required"],
    ]);
    expect(store.getSnapshot().validating.size).toBe(0);
    finish?.("Too short");
    expect(await running).toEqual({ allowed: false });
    expect(
      store.getSnapshot().cellErrors.has(validationKey("a", "title"))
    ).toBe(false);
  });

  it("moves dirty marks", () => {
    const store = createDirtyCellStore({ enabled: true });
    store.mark("a", "title");
    store.mark("b", "title");
    store.rekey(moves);
    expect([...store.getSnapshot().cells]).toEqual([
      validationKey("a2", "title"),
      validationKey("b", "title"),
    ]);
  });

  it("moves an open conflict question to the row's new id", () => {
    const store = editConflictStoreWith(EDIT_CONFLICT_TOOLS)<Row>();
    store.reconcile({
      active: { rowId: "a", columnKey: "title" },
      openedRow: ROWS[0]!,
      draft: "Typed",
      rows: [{ id: "a", title: "Arrived" }],
      columns: [TITLE],
      rowKey: getRowId,
      policy: "ask",
      keep: vi.fn(),
      take: vi.fn(),
    });
    expect(store.getSnapshot().current?.rowId).toBe("a");
    store.rekey(moves);
    expect(store.getSnapshot().current).toMatchObject({
      rowId: "a2",
      row: A2,
    });
  });
});
