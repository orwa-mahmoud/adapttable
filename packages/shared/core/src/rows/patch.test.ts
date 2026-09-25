/**
 * Row patches.
 *
 * The behaviour worth pinning is not that an update changes a field — it is
 * what the function refuses to disturb: untouched rows keep their identity,
 * and a patch that changes nothing hands back the array it was given.
 */
import { describe, expect, it } from "vitest";

import {
  applyRowPatches,
  applyRowPatchesWithLog,
  insertRow,
  removeRow,
  rowPatchLog,
  updateRow,
  upsertRow,
} from "./patch";

interface Person {
  id: string;
  name: string;
  team: string;
}

const ADA: Person = { id: "1", name: "Ada", team: "Core" };
const ALAN: Person = { id: "2", name: "Alan", team: "Web" };
const GRACE: Person = { id: "3", name: "Grace", team: "Core" };
const ROWS: readonly Person[] = [ADA, ALAN, GRACE];

const byId = (row: Person) => row.id;
const apply = (patches: Parameters<typeof applyRowPatches<Person>>[1]) =>
  applyRowPatches(ROWS, patches, byId);

describe("applyRowPatches", () => {
  it("updates one row by id", () => {
    const next = apply([updateRow("2", { team: "Core" })]);
    expect(next.map((r) => r.team)).toEqual(["Core", "Core", "Core"]);
  });

  it("leaves untouched rows as the very same objects", () => {
    const next = apply([updateRow("2", { team: "Core" })]);
    // React reconciles these as unchanged, and per-row memos stay valid.
    expect(next[0]).toBe(ADA);
    expect(next[2]).toBe(GRACE);
    expect(next[1]).not.toBe(ALAN);
  });

  it("returns the same array when an update changes nothing", () => {
    // Ada is already on Core, so there is nothing to do.
    expect(apply([updateRow("1", { team: "Core" })])).toBe(ROWS);
  });

  it("returns the same array when the id is not there", () => {
    expect(apply([updateRow("nope", { team: "Core" })])).toBe(ROWS);
    expect(apply([removeRow("nope")])).toBe(ROWS);
  });

  it("returns the same array for an empty patch list", () => {
    expect(apply([])).toBe(ROWS);
  });

  it("never mutates the array it was given", () => {
    apply([removeRow("1"), insertRow({ id: "9", name: "New", team: "Web" })]);
    expect(ROWS).toHaveLength(3);
    expect(ROWS[0]).toBe(ADA);
  });

  it("appends an insert by default", () => {
    const next = apply([insertRow({ id: "4", name: "Radia", team: "Net" })]);
    expect(next.map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("inserts at a position", () => {
    const next = apply([insertRow({ id: "0", name: "First", team: "Net" }, 0)]);
    expect(next.map((r) => r.id)).toEqual(["0", "1", "2", "3"]);
  });

  it("counts a negative position from the end", () => {
    const next = apply([insertRow({ id: "x", name: "Late", team: "Net" }, -1)]);
    expect(next.map((r) => r.id)).toEqual(["1", "2", "x", "3"]);
  });

  it("clamps a position past the end instead of leaving a hole", () => {
    const next = apply([insertRow({ id: "x", name: "Late", team: "Net" }, 99)]);
    expect(next.map((r) => r.id)).toEqual(["1", "2", "3", "x"]);
    expect(next.every(Boolean)).toBe(true);
  });

  it("removes by id", () => {
    expect(apply([removeRow("2")]).map((r) => r.id)).toEqual(["1", "3"]);
  });

  it("replaces an existing row on upsert, in place", () => {
    const next = apply([upsertRow({ id: "2", name: "Alan M.", team: "Web" })]);
    expect(next.map((r) => r.id)).toEqual(["1", "2", "3"]);
    expect(next[1]?.name).toBe("Alan M.");
  });

  it("returns the same array when upserting the row already in place", () => {
    // Re-emitting a row from a socket that changed nothing must not churn.
    expect(apply([upsertRow(ALAN)])).toBe(ROWS);
  });

  it("appends an unknown row on upsert", () => {
    const next = apply([upsertRow({ id: "7", name: "New", team: "Web" })]);
    expect(next.map((r) => r.id)).toEqual(["1", "2", "3", "7"]);
  });

  it("applies a batch in order", () => {
    const next = apply([
      removeRow("1"),
      insertRow({ id: "4", name: "Radia", team: "Net" }, 0),
      updateRow("2", { name: "Alan T." }),
      upsertRow({ id: "3", name: "Grace H.", team: "Core" }),
    ]);
    expect(next.map((r) => r.id)).toEqual(["4", "2", "3"]);
    expect(next.map((r) => r.name)).toEqual(["Radia", "Alan T.", "Grace H."]);
  });

  it("lets a later patch act on what an earlier one did", () => {
    const next = apply([
      insertRow({ id: "5", name: "Temp", team: "Net" }),
      updateRow("5", { name: "Renamed" }),
    ]);
    expect(next.at(-1)).toEqual({ id: "5", name: "Renamed", team: "Net" });
  });

  it("attaches a log to a changing result and not to a no-op", () => {
    const changed = apply([updateRow("2", { team: "Core" })]);
    expect(rowPatchLog(changed)?.events).toEqual([
      expect.objectContaining({ type: "update", id: "2" }),
    ]);
    expect(
      rowPatchLog(apply([updateRow("1", { team: "Core" })]))
    ).toBeUndefined();
    expect(applyRowPatchesWithLog(ROWS, [], byId).events).toEqual([]);
  });

  it("keeps a selection valid, because ids never move under it", () => {
    const selected = new Set(["1", "3"]);
    const next = apply([updateRow("2", { team: "Core" }), removeRow("nope")]);
    const stillThere = next.filter((row) => selected.has(row.id));
    expect(stillThere.map((r) => r.id)).toEqual(["1", "3"]);
  });
});
