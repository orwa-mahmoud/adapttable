/**
 * A patch may give a row a new id. What the incremental view keeps after a
 * batch that renames rows and then updates, renames again or deletes them must
 * be exactly what a view built from the patched rows shows.
 */
import { describe, expect, it } from "vitest";

import {
  applyRowPatchLogToView,
  createIncrementalView,
  type IncrementalViewConfig,
} from "./incremental";
import { applyRowPatchesWithLog, type RowPatch } from "./patch";

interface Row {
  id: string;
  team: string;
  amount: number;
}

// Enough rows that a small batch takes the incremental path, not a rebuild.
const ROWS: Row[] = Array.from({ length: 2000 }, (_, index) => ({
  id: `r${index}`,
  team: `t${index % 7}`,
  amount: (index * 37) % 1000,
}));

const getRowId = (row: Row) => row.id;

const VIEWS: Record<string, IncrementalViewConfig<Row>> = {
  sorted: {
    getRowId,
    columns: [{ key: "amount" }],
    sortBy: "amount",
    sortDir: "asc",
  },
  filtered: {
    getRowId,
    columns: [{ key: "amount" }],
    sortBy: "amount",
    sortDir: "desc",
    filterFn: (row) => row.amount % 3 !== 0,
  },
  grouped: {
    getRowId,
    columns: [{ key: "team" }, { key: "amount" }],
    groupBy: "team",
    sortBy: "amount",
    sortDir: "asc",
    groupAggregates: (rows) => ({
      amount: String(rows.reduce((sum, row) => sum + row.amount, 0)),
    }),
  },
};

const BATCHES: Record<string, RowPatch<Row>[]> = {
  "rename then update the new id": [
    { type: "update", id: "r1", changes: { id: "n1" } },
    { type: "update", id: "n1", changes: { amount: 5 } },
  ],
  "rename then delete the new id": [
    { type: "update", id: "r2", changes: { id: "n2" } },
    { type: "remove", id: "n2" },
  ],
  "chained renames": [
    { type: "update", id: "r3", changes: { id: "n3" } },
    { type: "update", id: "n3", changes: { id: "m3", amount: 999 } },
    { type: "update", id: "m3", changes: { team: "t9" } },
  ],
  "several events on one row": [
    { type: "update", id: "r4", changes: { amount: 1 } },
    { type: "update", id: "r4", changes: { id: "n4" } },
    { type: "upsert", row: { id: "n4", team: "t2", amount: 2 } },
  ],
};

describe("a batch that renames rows", () => {
  for (const [viewName, config] of Object.entries(VIEWS)) {
    for (const [batchName, patches] of Object.entries(BATCHES)) {
      it(`${viewName}: ${batchName}`, () => {
        const view = createIncrementalView(ROWS, config);
        const log = applyRowPatchesWithLog(ROWS, patches, getRowId);
        const patched = applyRowPatchLogToView(view, log);
        const fresh = createIncrementalView(log.rows, config);
        expect(patched.sorted.map(getRowId)).toEqual(
          fresh.sorted.map(getRowId)
        );
        expect(patched.filtered).toHaveLength(fresh.filtered.length);
        expect(patched.groups).toEqual(fresh.groups);
      });
    }
  }
});
