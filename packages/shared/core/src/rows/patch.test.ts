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
  type InsertPatch,
  insertRow,
  type RemovePatch,
  removeRow,
  type RowPatch,
  type RowPatchEvent,
  type RowPatchLog,
  rowPatchLog,
  rowPatchLogStartsAt,
  type UpdatePatch,
  updateRow,
  type UpsertPatch,
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

  it("recognizes only a log's exact input array without changing its public shape", () => {
    const first = applyRowPatchesWithLog(
      ROWS,
      [updateRow("1", { name: "Augusta" })],
      byId
    );
    const second = applyRowPatchesWithLog(
      first.rows,
      [updateRow("2", { name: "Alan T." })],
      byId
    );
    expect(rowPatchLogStartsAt(first, ROWS)).toBe(true);
    expect(rowPatchLogStartsAt(second, first.rows)).toBe(true);
    expect(rowPatchLogStartsAt(second, ROWS)).toBe(false);
    expect(rowPatchLogStartsAt(first, [...ROWS])).toBe(false);
    expect(rowPatchLogStartsAt({ ...first }, ROWS)).toBe(false);
    expect(Object.keys(first)).toEqual(["rows", "events"]);
  });

  it("keeps the changing log and its base after a no-op on its result", () => {
    const changed = applyRowPatchesWithLog(
      ROWS,
      [updateRow("1", { name: "Augusta" })],
      byId
    );
    const noOp = applyRowPatchesWithLog(
      changed.rows,
      [updateRow("1", { name: "Augusta" })],
      byId
    );
    expect(noOp.rows).toBe(changed.rows);
    expect(rowPatchLog(noOp.rows)).toBe(changed);
    expect(rowPatchLogStartsAt(changed, ROWS)).toBe(true);
    expect(rowPatchLogStartsAt(noOp, changed.rows)).toBe(false);
  });
});

describe("applyRowPatchesWithLog id lookup", () => {
  interface Item {
    id: string;
    v: number;
  }
  const items = (n: number): Item[] =>
    Array.from({ length: n }, (_, i) => ({ id: String(i), v: i }));

  type Event = RowPatchEvent<Item> | undefined;

  /** Where the first row with this id sits, by walking the list. */
  const find = (list: Item[], id: string) =>
    list.findIndex((row) => row.id === id);

  /** Inserts where `Array#splice` puts a row, and reports where it went. */
  function referenceInsert(list: Item[], patch: InsertPatch<Item>): Event {
    list.splice(patch.at ?? list.length, 0, patch.row);
    const index = list.indexOf(patch.row);
    return { type: "insert", id: patch.row.id, row: patch.row, index };
  }

  function referenceRemove(list: Item[], patch: RemovePatch): Event {
    const index = find(list, patch.id);
    if (index === -1) return undefined;
    const [row] = list.splice(index, 1);
    return { type: "remove", id: patch.id, row: row!, index };
  }

  function referenceUpsert(list: Item[], patch: UpsertPatch<Item>): Event {
    const { row } = patch;
    const index = find(list, row.id);
    if (index === -1) {
      list.push(row);
      return { type: "insert", id: row.id, row, index: list.length - 1 };
    }
    const prev = list[index]!;
    if (prev === row) return undefined;
    list[index] = row;
    return { type: "update", id: row.id, prev, next: row, index };
  }

  function referenceUpdate(list: Item[], patch: UpdatePatch<Item>): Event {
    const index = find(list, patch.id);
    const prev = list[index];
    if (!prev) return undefined;
    const keys = Object.keys(patch.changes) as (keyof Item)[];
    if (keys.every((key) => Object.is(prev[key], patch.changes[key])))
      return undefined;
    const next = { ...prev, ...patch.changes };
    list[index] = next;
    return { type: "update", id: patch.id, prev, next, index };
  }

  function referenceOne(list: Item[], patch: RowPatch<Item>): Event {
    if (patch.type === "insert") return referenceInsert(list, patch);
    if (patch.type === "remove") return referenceRemove(list, patch);
    if (patch.type === "upsert") return referenceUpsert(list, patch);
    return referenceUpdate(list, patch);
  }

  /** The linear search every patch ran before ids were cached per batch. */
  function reference(
    rows: readonly Item[],
    patches: readonly RowPatch<Item>[]
  ): RowPatchLog<Item> {
    const list = [...rows];
    const events = patches
      .map((patch) => referenceOne(list, patch))
      .filter((event): event is RowPatchEvent<Item> => event !== undefined);
    return { rows: events.length > 0 ? list : rows, events };
  }

  /** A small seeded generator, so a failing batch reproduces. */
  function random(seed: number) {
    let state = seed;
    return (max: number) => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state % max;
    };
  }

  /** Positions that are not whole numbers, which splice still accepts. */
  const ODD_POSITIONS = [Number.NaN, 1.5, -1.5, Infinity, -Infinity, 0.4];

  function batch(next: (max: number) => number, size: number) {
    const id = () => String(next(size + 8));
    const position = () =>
      next(4) === 0
        ? ODD_POSITIONS[next(ODD_POSITIONS.length)]
        : next(size + 4) - 2;
    const patches: RowPatch<Item>[] = [];
    for (let i = 0; i < size; i++) {
      const kind = next(6);
      if (kind === 0) patches.push(insertRow({ id: id(), v: -i }, position()));
      else if (kind === 1) patches.push(removeRow(id()));
      else if (kind === 2) patches.push(upsertRow({ id: id(), v: i }));
      else if (kind === 3) patches.push(updateRow(id(), { id: id() }));
      else if (kind === 4) patches.push(updateRow(id(), { v: next(3) }));
      else patches.push(insertRow({ id: id(), v: i }));
    }
    return patches;
  }

  it("matches the linear search on random mixed batches", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const next = random(seed);
      const rows = items(next(12));
      const patches = batch(next, 24);
      const log = applyRowPatchesWithLog(rows, patches, (row) => row.id);
      const expected = reference(rows, patches);
      expect(log.rows, `seed ${seed}`).toEqual(expected.rows);
      expect(log.events, `seed ${seed}`).toEqual(expected.events);
      expect(log.rows === rows, `seed ${seed}`).toBe(expected.rows === rows);
      // Untouched rows keep their object identity, exactly where the
      // linear search kept it.
      const original = (row: Item) => rows.includes(row);
      expect(log.rows.map(original), `seed ${seed}`).toEqual(
        expected.rows.map(original)
      );
    }
  });

  it.each([
    ["NaN", Number.NaN, 0, ["x", "0", "2"]],
    ["a fraction", 1.5, 1, ["0", "x", "2"]],
    ["a negative fraction", -1.5, 2, ["0", "x", "2"]],
    ["Infinity", Infinity, 3, ["0", "2", "x"]],
    ["-Infinity", -Infinity, 0, ["x", "0", "2"]],
  ])(
    "inserts at %s where splice does and still removes the right row",
    (_, at, index, order) => {
      const rows = items(3);
      const added = { id: "x", v: 9 };
      const log = applyRowPatchesWithLog(
        rows,
        [
          updateRow<Item>("2", { v: 20 }),
          updateRow<Item>("1", { v: 10 }),
          insertRow(added, at),
          removeRow("1"),
        ],
        (row) => row.id
      );
      expect(log.rows.map((row) => row.id)).toEqual(order);
      expect(log.events[2]).toEqual({
        type: "insert",
        id: "x",
        row: added,
        index,
      });
    }
  );

  it("reads ids in proportion to rows plus updates for a burst at the end", () => {
    const rows = items(20_000);
    const patches = Array.from({ length: 200 }, (_, i) =>
      updateRow<Item>(String(19_800 + i), { v: -1 })
    );
    let calls = 0;
    const log = applyRowPatchesWithLog(rows, patches, (row) => {
      calls += 1;
      return row.id;
    });
    expect(log.rows).toEqual(reference(rows, patches).rows);
    expect(log.events).toHaveLength(200);
    // The first lookup walks the list as a single patch does; the rest read
    // each row once more, and each updated row once for the id it now has.
    expect(calls).toBeLessThanOrEqual(2 * 20_000 + 200);
    expect(log.rows[0]).toBe(rows[0]);
  });

  it("stops at the first match, as the linear search did", () => {
    let calls = 0;
    applyRowPatchesWithLog(items(20_000), [removeRow("2")], (row) => {
      calls += 1;
      return row.id;
    });
    expect(calls).toBe(3);
  });

  it("finds a row by the id an earlier update gave it", () => {
    const rows = items(5);
    const log = applyRowPatchesWithLog(
      rows,
      [updateRow<Item>("3", { id: "x" }), updateRow<Item>("x", { v: 9 })],
      (row) => row.id
    );
    expect(log.rows[3]).toEqual({ id: "x", v: 9 });
    expect(log.events.map((event) => event.index)).toEqual([3, 3]);
  });

  it("acts on the first of two rows that share an id", () => {
    const rows: Item[] = [
      { id: "a", v: 1 },
      { id: "b", v: 2 },
      { id: "a", v: 3 },
    ];
    const log = applyRowPatchesWithLog(
      rows,
      [removeRow("a"), updateRow<Item>("a", { v: 0 })],
      (row) => row.id
    );
    expect(log.rows).toEqual([
      { id: "b", v: 2 },
      { id: "a", v: 0 },
    ]);
  });
});

describe("patch provenance across module copies", () => {
  // An application can load the ESM and the CommonJS build side by side: a
  // patch produced by one copy must still read as a patch to the other.
  it("reads a log and its base that another copy of this module recorded", async () => {
    const { vi } = await import("vitest");
    const first = await import("./patch");
    vi.resetModules();
    const second = await import("./patch");
    expect(second).not.toBe(first);
    const rows = [
      { id: "a", n: 1 },
      { id: "b", n: 2 },
    ];
    const next = first.applyRowPatches(
      rows,
      [{ type: "upsert", row: { id: "b", n: 3 } }],
      (row) => row.id
    );
    const log = second.rowPatchLog(next);
    expect(log?.events).toHaveLength(1);
    expect(log && second.rowPatchLogStartsAt(log, rows)).toBe(true);
    expect(log && second.rowPatchLogStartsAt(log, [...rows])).toBe(false);
  });
});
