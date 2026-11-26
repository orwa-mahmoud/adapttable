import { describe, expect, it } from "vitest";

import {
  applyRowPatches,
  applyRowPatchesWithLog,
  rekeyRow,
  removeRow,
  RowIdConflictError,
  rowRekeys,
  updateRow,
} from "./patch";

interface Row {
  readonly id: string;
  readonly name: string;
}

const getRowId = (row: Row): string => row.id;
const ROWS: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
  { id: "c", name: "Cy" },
];

describe("rekeyRow", () => {
  it("gives the row a new id in place, and later patches find it by that id", () => {
    const rows = applyRowPatches(
      ROWS,
      [rekeyRow<Row>("b", { id: "b2" }), updateRow<Row>("b2", { name: "Bo" })],
      getRowId
    );
    expect(rows).toEqual([
      { id: "a", name: "Ada" },
      { id: "b2", name: "Bo" },
      { id: "c", name: "Cy" },
    ]);
    expect(rows[0]).toBe(ROWS[0]);
  });

  it("refuses an id another row holds and leaves the rows as they were", () => {
    let thrown: unknown;
    try {
      applyRowPatches(
        ROWS,
        [updateRow<Row>("a", { name: "Al" }), rekeyRow<Row>("b", { id: "c" })],
        getRowId
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(RowIdConflictError);
    expect(thrown).toMatchObject({ from: "b", to: "c" });
    expect(ROWS).toEqual([
      { id: "a", name: "Ada" },
      { id: "b", name: "Bea" },
      { id: "c", name: "Cy" },
    ]);
  });

  it("does nothing for an id no row holds", () => {
    expect(
      applyRowPatches(ROWS, [rekeyRow<Row>("z", { id: "y" })], getRowId)
    ).toBe(ROWS);
  });

  it("is an ordinary update when the changes keep the id", () => {
    const log = applyRowPatchesWithLog(
      ROWS,
      [rekeyRow<Row>("a", { name: "Al" })],
      getRowId
    );
    expect(log.events).toEqual([
      expect.objectContaining({ type: "update", id: "a" }),
    ]);
    expect(log.events[0]).not.toHaveProperty("from");
  });
});

describe("an update that changes the id", () => {
  it("is refused, naming rekeyRow", () => {
    expect(() =>
      applyRowPatches(ROWS, [updateRow<Row>("a", { id: "a2" })], getRowId)
    ).toThrow(/rekeyRow\("a"/);
  });

  it("reads as a rekey with rekeyUpdates, conflicts included", () => {
    expect(
      applyRowPatches(ROWS, [updateRow<Row>("a", { id: "a2" })], getRowId, {
        rekeyUpdates: true,
      })[0]
    ).toEqual({ id: "a2", name: "Ada" });
    expect(() =>
      applyRowPatches(ROWS, [updateRow<Row>("a", { id: "b" })], getRowId, {
        rekeyUpdates: true,
      })
    ).toThrow(RowIdConflictError);
  });
});

describe("rowRekeys", () => {
  it("maps each row's id before the log to its id after it", () => {
    const log = applyRowPatchesWithLog(
      ROWS,
      [
        rekeyRow<Row>("a", { id: "a2" }),
        rekeyRow<Row>("a2", { id: "a3" }),
        rekeyRow<Row>("b", { id: "b2" }),
        rekeyRow<Row>("b2", { id: "b" }),
        rekeyRow<Row>("c", { id: "c2" }),
        removeRow("c2"),
      ],
      getRowId
    );
    expect([...rowRekeys(log)]).toEqual([["a", "a3"]]);
  });
});
