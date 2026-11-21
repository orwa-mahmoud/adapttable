/**
 * Folding, paging and footers change only how the groups are laid out. The
 * stage keeps the buckets and the totals across those changes, and what it
 * lays out must be exactly what a table built fresh with the same settings
 * shows.
 */
import { describe, expect, it } from "vitest";

import {
  applyRowPatchLogToView,
  configureIncrementalView,
  createIncrementalView,
  type IncrementalViewConfig,
} from "./incremental";
import { applyRowPatches, rowPatchLog } from "./patch";

interface Row {
  id: string;
  region: string;
  team: string;
  amount: number;
}

const ROWS: Row[] = Array.from({ length: 600 }, (_, index) => ({
  id: String(index),
  region: `r${index % 5}`,
  team: `t${index % 12}`,
  amount: index % 17,
}));

function counted() {
  const counts = { ids: 0, reads: 0 };
  const config: IncrementalViewConfig<Row> = {
    columns: [{ key: "region" }, { key: "team" }, { key: "amount" }],
    getRowId: (row) => {
      counts.ids += 1;
      return row.id;
    },
    groupAggregates: (rows) => {
      counts.reads += rows.length;
      return { amount: String(rows.reduce((sum, row) => sum + row.amount, 0)) };
    },
    groupFooters: true,
    collapsedGroupIds: new Set(),
  };
  return { counts, config };
}

/** The top-level group keys a table grouped this way shows, in order. */
function topKeys(groupBy: string[]): string[] {
  const { config } = counted();
  const view = createIncrementalView(ROWS, { ...config, groupBy });
  return (view.groups ?? [])
    .filter((entry) => entry.kind === "group" && entry.level === 0)
    .map((entry) => entry.key);
}

function layouts(groupBy: string[]): Partial<IncrementalViewConfig<Row>>[] {
  const [first = "", second = ""] = topKeys(groupBy);
  return [
    { collapsedGroupIds: new Set([first]) },
    { collapsedGroupIds: new Set() },
    { groupPageSize: 2 },
    { rowPageSize: 3 },
    { groupFooters: false },
    { paging: { groups: 1, rows: { [second]: 2 } } },
    { collapsedGroupIds: new Set([second]) },
  ];
}

describe("a layout-only change", () => {
  for (const groupBy of [["region"], ["region", "team"]]) {
    it(`lays out what a fresh build would, grouped by ${groupBy.join(", ")}`, () => {
      const { config } = counted();
      let settings: IncrementalViewConfig<Row> = { ...config, groupBy };
      let view = createIncrementalView(ROWS, settings);
      for (const layout of layouts(groupBy)) {
        settings = { ...settings, ...layout };
        view = configureIncrementalView(view, layout);
        const fresh = createIncrementalView(ROWS, settings);
        expect(view.groups, JSON.stringify(layout)).toEqual(fresh.groups);
      }
    });
  }

  it("folds and unfolds without reading a row or an id", () => {
    const { counts, config } = counted();
    const view = createIncrementalView(ROWS, {
      ...config,
      groupBy: ["region", "team"],
    });
    const first = view.groups?.[0]?.key ?? "";
    counts.ids = 0;
    counts.reads = 0;
    const folded = configureIncrementalView(view, {
      collapsedGroupIds: new Set([first]),
    });
    expect(folded.groups?.[0]).toMatchObject({ collapsed: true });
    const unfolded = configureIncrementalView(folded, {
      collapsedGroupIds: new Set(),
    });
    expect(unfolded.groups).toEqual(view.groups);
    expect(counts).toEqual({ ids: 0, reads: 0 });
  });

  it("still totals a patched row after the layout changed", () => {
    const { config } = counted();
    const [, second = ""] = topKeys(["region"]);
    const view = createIncrementalView(ROWS, {
      ...config,
      groupBy: ["region"],
    });
    const folded = configureIncrementalView(view, {
      collapsedGroupIds: new Set([second]),
    });
    expect(folded.groups?.find((entry) => entry.key === second)).toMatchObject({
      collapsed: true,
    });
    const next = applyRowPatches(
      ROWS,
      [{ type: "upsert", row: { ...ROWS[0]!, amount: 1000 } }],
      (row) => row.id
    );
    const patched = applyRowPatchLogToView(folded, rowPatchLog(next)!);
    const fresh = createIncrementalView(next, {
      ...config,
      groupBy: ["region"],
      collapsedGroupIds: new Set([second]),
    });
    expect(patched.groups).toEqual(fresh.groups);
  });
});
