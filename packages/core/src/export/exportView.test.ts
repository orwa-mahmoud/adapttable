/**
 * Grouped and tree-shaped exports: the view the file writes, and the
 * pruning a scope applies so a selected subset does not keep empty groups.
 */
import { describe, expect, it } from "vitest";

import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { TreeEntry } from "../tree/treeRows";
import {
  exportableValue,
  exportViewFromChrome,
  filterExportView,
  summaryExportValues,
  viewFromGroupedEntries,
  viewFromTreeEntries,
} from "./exportView";

interface Row {
  id: string;
  name: string;
  team: string;
  budget: number;
}

const ada: Row = { id: "1", name: "Ada", team: "Core", budget: 10 };
const grace: Row = { id: "2", name: "Grace", team: "Core", budget: 20 };
const linus: Row = { id: "3", name: "Linus", team: "Edge", budget: 5 };

const GROUPED: GroupedFlatEntry<Row>[] = [
  {
    kind: "group",
    key: "g:Core",
    value: "Core",
    label: "Core",
    level: 0,
    groupBy: "team",
    path: ["Core"],
    leafRows: [ada, grace],
    leafIds: ["1", "2"],
    collapsed: false,
    aggregateCells: { budget: 30 },
  },
  { kind: "row", key: "1", row: ada, index: 0, groupKey: "g:Core" },
  { kind: "row", key: "2", row: grace, index: 1, groupKey: "g:Core" },
  {
    kind: "groupFooter",
    key: "g:Core:footer",
    groupKey: "g:Core",
    level: 0,
    groupBy: "team",
    label: "Core",
    leafRows: [ada, grace],
    leafIds: ["1", "2"],
    aggregateCells: { budget: 30 },
  },
  {
    kind: "group",
    key: "g:Edge",
    value: "Edge",
    label: "Edge",
    level: 0,
    groupBy: "team",
    path: ["Edge"],
    leafRows: [linus],
    leafIds: ["3"],
    collapsed: false,
  },
  { kind: "row", key: "3", row: linus, index: 2, groupKey: "g:Edge" },
];

describe("exportableValue", () => {
  it("keeps primitives and dates, drops JSX", () => {
    expect(exportableValue(12)).toBe(12);
    expect(exportableValue(true)).toBe(true);
    expect(exportableValue("Ada")).toBe("Ada");
    const day = new Date("2026-08-15T00:00:00.000Z");
    expect(exportableValue(day)).toBe(day);
    expect(exportableValue({ type: "span" })).toBeUndefined();
    expect(exportableValue(Number.NaN)).toBeUndefined();
    expect(exportableValue(new Date(Number.NaN))).toBeUndefined();
  });
});

describe("viewFromGroupedEntries", () => {
  it("emits headers, leaves one level deeper, and footers", () => {
    const view = viewFromGroupedEntries(GROUPED, (label) => `${label} total`);
    expect(view).toEqual([
      {
        role: "group",
        label: "Core",
        level: 0,
        labelKey: "team",
        values: { budget: 30 },
      },
      { role: "data", row: ada, level: 1 },
      { role: "data", row: grace, level: 1 },
      {
        role: "aggregate",
        label: "Core total",
        level: 0,
        labelKey: "team",
        values: { budget: 30 },
      },
      {
        role: "group",
        label: "Edge",
        level: 0,
        labelKey: "team",
        values: undefined,
      },
      { role: "data", row: linus, level: 1 },
    ]);
  });

  it("skips load-more and extra rows — they are render chrome", () => {
    const view = viewFromGroupedEntries([
      {
        kind: "group",
        key: "g:Core",
        value: "Core",
        label: "Core",
        level: 0,
        groupBy: "team",
        path: ["Core"],
        leafRows: [ada],
        leafIds: ["1"],
        collapsed: false,
      },
      { kind: "row", key: "1", row: ada, index: 0, groupKey: "g:Core" },
      {
        kind: "groupMore",
        key: "g:Core:more",
        groupKey: "g:Core",
        level: 1,
        scope: "rows",
        remaining: 2,
        leafRows: [],
        leafIds: [],
        label: "2 more",
      },
      { kind: "separator", key: "sep" },
    ]);
    expect(view.map((entry) => entry.role)).toEqual(["group", "data"]);
    expect(
      view.some((entry) => "label" in entry && entry.label === "2 more")
    ).toBe(false);
  });

  it("keeps a collapsed header without its leaves, unless asked to unfold", () => {
    const collapsed: GroupedFlatEntry<Row>[] = [
      {
        kind: "group",
        key: "g:Core",
        value: "Core",
        label: "Core",
        level: 0,
        groupBy: "team",
        path: ["Core"],
        leafRows: [ada, grace],
        leafIds: ["1", "2"],
        collapsed: true,
        aggregateCells: { budget: 30 },
      },
    ];
    const folded = viewFromGroupedEntries(collapsed);
    expect(folded).toEqual([
      {
        role: "group",
        label: "Core",
        level: 0,
        labelKey: "team",
        values: { budget: 30 },
      },
    ]);
    const opened = viewFromGroupedEntries(collapsed, undefined, true);
    expect(opened.map((entry) => entry.role)).toEqual([
      "group",
      "data",
      "data",
    ]);
    expect(opened[1]).toMatchObject({ role: "data", row: ada, level: 1 });
    expect(opened[2]).toMatchObject({ role: "data", row: grace, level: 1 });
  });

  it("dumps every leaf of a paged group when unfolding, not only the visible page", () => {
    const paged: GroupedFlatEntry<Row>[] = [
      {
        kind: "group",
        key: "g:Core",
        value: "Core",
        label: "Core",
        level: 0,
        groupBy: "team",
        path: ["Core"],
        leafRows: [ada, grace],
        leafIds: ["1", "2"],
        collapsed: false,
      },
      { kind: "row", key: "1", row: ada, index: 0, groupKey: "g:Core" },
      {
        kind: "groupMore",
        key: "more",
        groupKey: "g:Core",
        level: 1,
        scope: "rows",
        remaining: 1,
        leafRows: [],
        leafIds: [],
        label: "1 more",
      },
    ];
    const view = viewFromGroupedEntries(paged, undefined, true);
    expect(
      view.map((entry) => (entry.role === "data" ? entry.row.id : entry.role))
    ).toEqual(["group", "1", "2"]);
  });

  it("still nests an open parent when unfolding — only leaf groups dump", () => {
    const nested: GroupedFlatEntry<Row>[] = [
      {
        kind: "group",
        key: "g:Core",
        value: "Core",
        label: "Core",
        level: 0,
        groupBy: "team",
        path: ["Core"],
        leafRows: [ada],
        leafIds: ["1"],
        collapsed: false,
      },
      {
        kind: "group",
        key: "g:Core/A",
        value: "A",
        label: "A",
        level: 1,
        groupBy: "name",
        path: ["Core", "A"],
        leafRows: [ada],
        leafIds: ["1"],
        collapsed: false,
      },
      { kind: "row", key: "1", row: ada, index: 0, groupKey: "g:Core/A" },
    ];
    const view = viewFromGroupedEntries(nested, undefined, true);
    expect(view).toEqual([
      {
        role: "group",
        label: "Core",
        level: 0,
        labelKey: "team",
        values: undefined,
      },
      {
        role: "group",
        label: "A",
        level: 1,
        labelKey: "name",
        values: undefined,
      },
      { role: "data", row: ada, level: 2 },
    ]);
  });
});

describe("a column's formatAggregate and the file", () => {
  it("exports the value the aggregate returned, not the one on screen", () => {
    // Formatting happens where the cell is drawn. A file that carried
    // "$30" instead of 30 could not be summed by the spreadsheet opening it.
    const view = viewFromGroupedEntries(GROUPED, (label) => `${label} total`);
    const groups = view.filter((entry) => entry.role === "group");
    expect(groups[0]).toMatchObject({ values: { budget: 30 } });
  });
});

describe("viewFromTreeEntries", () => {
  it("keeps each row at its tree depth", () => {
    const entries: TreeEntry<Row>[] = [
      {
        row: ada,
        key: "1",
        level: 0,
        hasChildren: true,
        expanded: true,
        path: [],
        descendantIds: ["2"],
      },
      {
        row: grace,
        key: "2",
        level: 1,
        hasChildren: false,
        expanded: false,
        path: ["1"],
        descendantIds: [],
      },
    ];
    expect(viewFromTreeEntries(entries)).toEqual([
      { role: "data", row: ada, level: 0 },
      { role: "data", row: grace, level: 1 },
    ]);
  });
});

describe("exportViewFromChrome — a folded tree", () => {
  /** What the table renders with Ada's folder shut: Grace is not there. */
  const rendered: TreeEntry<Row>[] = [
    {
      row: ada,
      key: "1",
      level: 0,
      hasChildren: true,
      expanded: false,
      path: [],
      descendantIds: ["2"],
    },
  ];
  /** The same hierarchy with every node open. */
  const unfolded: TreeEntry<Row>[] = [
    { ...rendered[0]!, expanded: true },
    {
      row: grace,
      key: "2",
      level: 1,
      hasChildren: false,
      expanded: false,
      path: ["1"],
      descendantIds: [],
    },
  ];

  it("writes what is on screen for a page-scoped export", () => {
    const view = exportViewFromChrome({
      tree: { entries: rendered, allEntries: unfolded },
    });
    expect(view).toEqual([{ role: "data", row: ada, level: 0 }]);
  });

  it("writes the folded rows too when the scope unfolds", () => {
    const view = exportViewFromChrome({
      tree: { entries: rendered, allEntries: unfolded },
      includeHiddenLeaves: true,
    });
    // Grace matched the filters; the folder being shut is display state.
    expect(view).toEqual([
      { role: "data", row: ada, level: 0 },
      { role: "data", row: grace, level: 1 },
    ]);
  });

  it("falls back to the rendered entries when no unfolded tree is supplied", () => {
    const view = exportViewFromChrome({
      tree: { entries: rendered },
      includeHiddenLeaves: true,
    });
    expect(view).toEqual([{ role: "data", row: ada, level: 0 }]);
  });
});

describe("filterExportView", () => {
  it("drops a group that has no remaining leaves, and keeps its footer when it does", () => {
    const view = viewFromGroupedEntries(GROUPED, (label) => `${label} total`);
    const kept = filterExportView(view, new Set(["1"]), (row) => row.id);
    expect(kept.map((entry) => entry.role)).toEqual([
      "group",
      "data",
      "aggregate",
    ]);
    expect(kept[1]).toMatchObject({ role: "data", row: ada });
  });

  it("keeps a nested parent when only an inner leaf stays", () => {
    const view = viewFromGroupedEntries([
      {
        kind: "group",
        key: "g:Core",
        value: "Core",
        label: "Core",
        level: 0,
        groupBy: "team",
        path: ["Core"],
        leafRows: [ada, grace],
        leafIds: ["1", "2"],
        collapsed: false,
      },
      {
        kind: "group",
        key: "g:Core/A",
        value: "A",
        label: "A",
        level: 1,
        groupBy: "name",
        path: ["Core", "A"],
        leafRows: [ada],
        leafIds: ["1"],
        collapsed: false,
      },
      { kind: "row", key: "1", row: ada, index: 0, groupKey: "g:Core/A" },
      {
        kind: "groupFooter",
        key: "g:Core/A:footer",
        groupKey: "g:Core/A",
        level: 1,
        groupBy: "name",
        label: "A",
        leafRows: [ada],
        leafIds: ["1"],
      },
      {
        kind: "group",
        key: "g:Core/B",
        value: "B",
        label: "B",
        level: 1,
        groupBy: "name",
        path: ["Core", "B"],
        leafRows: [grace],
        leafIds: ["2"],
        collapsed: false,
      },
      { kind: "row", key: "2", row: grace, index: 1, groupKey: "g:Core/B" },
    ]);
    const kept = filterExportView(view, new Set(["1"]), (row) => row.id);
    expect(
      kept.map((entry) =>
        entry.role === "data" ? entry.row.id : `${entry.role}:${entry.label}`
      )
    ).toEqual(["group:Core", "group:A", "1", "aggregate:A"]);
  });
});

describe("exportViewFromChrome", () => {
  it("prefers a tree over grouping", () => {
    const tree = viewFromTreeEntries([
      {
        row: ada,
        key: "1",
        level: 0,
        hasChildren: false,
        expanded: false,
        path: [],
        descendantIds: [],
      },
    ]);
    expect(
      exportViewFromChrome({
        grouping: { entries: GROUPED },
        tree: {
          entries: [
            {
              row: ada,
              key: "1",
              level: 0,
              hasChildren: false,
              expanded: false,
              path: [],
              descendantIds: [],
            },
          ],
        },
      })
    ).toEqual(tree);
  });

  it("is absent when neither model is armed", () => {
    expect(exportViewFromChrome({})).toBeUndefined();
  });

  it("uses grouping when there is no tree", () => {
    const view = exportViewFromChrome({ grouping: { entries: GROUPED } });
    expect(view?.some((entry) => entry.role === "group")).toBe(true);
  });

  it("unfolds collapsed leaves when asked", () => {
    const view = exportViewFromChrome({
      grouping: {
        entries: [
          {
            kind: "group",
            key: "g:Core",
            value: "Core",
            label: "Core",
            level: 0,
            groupBy: "team",
            path: ["Core"],
            leafRows: [ada],
            leafIds: ["1"],
            collapsed: true,
          },
        ],
      },
      includeHiddenLeaves: true,
    });
    expect(view?.some((entry) => entry.role === "data")).toBe(true);
  });
});

describe("summaryExportValues", () => {
  it("keeps primitives and drops empty records", () => {
    expect(summaryExportValues({ age: 12, note: "ok" })).toEqual({
      age: 12,
      note: "ok",
    });
    expect(summaryExportValues(undefined)).toBeUndefined();
  });

  it("keeps a Date and drops JSX, so a total cell is never [object Object]", () => {
    const day = new Date("2026-08-15T00:00:00.000Z");
    expect(
      summaryExportValues({
        due: day,
        label: { type: "span", props: { children: "Total" } },
      })
    ).toEqual({ due: day });
    expect(summaryExportValues({ label: { type: "span" } })).toBeUndefined();
  });
});

describe("filterExportView — orphan footer", () => {
  it("drops a footer that has no group to close", () => {
    const view = filterExportView(
      [{ role: "aggregate", label: "Total", level: 0, labelKey: "name" }],
      new Set<string>(),
      (row: Row) => row.id
    );
    expect(view).toEqual([]);
  });

  it("drops a nested footer that closes no group at its own level", () => {
    const view = filterExportView(
      [
        { role: "group", label: "Core", level: 0, labelKey: "team" },
        { role: "aggregate", label: "Inner", level: 1, labelKey: "name" },
      ],
      new Set<string>(),
      (row: Row) => row.id
    );
    expect(view).toEqual([]);
  });
});
