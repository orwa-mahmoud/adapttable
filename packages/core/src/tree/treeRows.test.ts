/**
 * The tree model.
 *
 * A tree is declared by the data, not derived from values — so what these
 * cover is the shape a host can declare it in, what folding hides, and the two
 * things a tree gets wrong most often: selection over a folded subtree, and
 * filtering that orphans its matches.
 */
import { describe, expect, it } from "vitest";

import {
  bodyRowEntries,
  buildTreeEntries,
  filterTreeRows,
  treeCardStyle,
  treeColumnKey,
  treeIndentStyle,
} from "./treeRows";

interface Node {
  id: string;
  name: string;
  parentId?: string;
  children?: Node[];
}
const NESTED: Node[] = [
  {
    id: "src",
    name: "src",
    children: [
      { id: "index", name: "index.ts" },
      {
        id: "lib",
        name: "lib",
        children: [{ id: "util", name: "util.ts" }],
      },
    ],
  },
  { id: "readme", name: "README.md" },
];
const FLAT: Node[] = [
  { id: "src", name: "src" },
  { id: "index", name: "index.ts", parentId: "src" },
  { id: "lib", name: "lib", parentId: "src" },
  { id: "util", name: "util.ts", parentId: "lib" },
  { id: "readme", name: "README.md" },
];
const getRowId = (row: Node) => row.id;
const shape = { getChildren: (row: Node) => row.children };

const build = (expanded: string[], extra = {}) =>
  buildTreeEntries<Node>({
    rows: NESTED,
    getRowId,
    expandedIds: new Set(expanded),
    ...shape,
    ...extra,
  });
const shown = (entries: ReturnType<typeof build>) =>
  entries.map((entry) => `${"  ".repeat(entry.level)}${entry.row.name}`);

describe("buildTreeEntries", () => {
  it("shows the roots and nothing folded away", () => {
    expect(shown(build([]))).toEqual(["src", "README.md"]);
  });

  it("opens one level at a time", () => {
    expect(shown(build(["src"]))).toEqual([
      "src",
      "  index.ts",
      "  lib",
      "README.md",
    ]);
    expect(shown(build(["src", "lib"]))).toEqual([
      "src",
      "  index.ts",
      "  lib",
      "    util.ts",
      "README.md",
    ]);
  });

  it("says which rows can open at all", () => {
    const [src, readme] = build([]);
    expect(src?.hasChildren).toBe(true);
    expect(readme?.hasChildren).toBe(false);
  });

  it("reads a flat table with a parent column the same way", () => {
    const entries = buildTreeEntries<Node>({
      rows: FLAT,
      getRowId,
      getParentId: (row) => row.parentId,
      expandedIds: new Set(["src", "lib"]),
    });
    expect(shown(entries)).toEqual([
      "src",
      "  index.ts",
      "  lib",
      "    util.ts",
      "README.md",
    ]);
  });

  it("counts a whole subtree for selection, folded or not", () => {
    // Ticking a folder ticks what is inside it — including the part that is
    // currently folded away, which the reader still means to include.
    const [src] = build([]);
    expect(src?.descendantIds).toEqual(["index", "lib", "util"]);
  });

  it("carries each row's ancestry", () => {
    const entries = build(["src", "lib"]);
    const util = entries.find((e) => e.key === "util");
    expect(util?.path).toEqual(["src", "lib"]);
    expect(util?.level).toBe(2);
    expect(util?.parentId).toBe("lib");
    expect(util?.siblingIndex).toBe(0);
    expect(entries.find((entry) => entry.key === "lib")?.siblingIndex).toBe(1);
    expect(
      entries.find((entry) => entry.key === "src")?.parentId
    ).toBeUndefined();
  });

  it("treats a node with unloaded children as openable", () => {
    // A server tree knows there is more before the browser has it.
    const entries = buildTreeEntries<Node>({
      rows: [{ id: "remote", name: "remote" }],
      getRowId,
      expandedIds: new Set(),
      getChildren: () => undefined,
      hasChildren: () => true,
    });
    expect(entries[0]?.hasChildren).toBe(true);
    expect(entries[0]?.expanded).toBe(false);
  });

  it("marks a node whose children are on their way", () => {
    const entries = buildTreeEntries<Node>({
      rows: [{ id: "remote", name: "remote" }],
      getRowId,
      expandedIds: new Set(["remote"]),
      loadingIds: new Set(["remote"]),
      hasChildren: () => true,
    });
    expect(entries[0]?.loading).toBe(true);
  });
});

describe("filterTreeRows", () => {
  const filtered = (query: string) =>
    filterTreeRows<Node>({
      rows: NESTED,
      getChildren: (row) => row.children,
      withChildren: (row, children) => ({ ...row, children: [...children] }),
      match: (row) => row.name.includes(query),
    });

  it("keeps every ancestor of a match", () => {
    // Dropping the folders would leave the file with no path to it, and the
    // reader with a flat list — losing the one thing the tree was for.
    const kept = filtered("util");
    expect(kept.map((row) => row.id)).toEqual(["src"]);
    expect(kept[0]?.children?.[0]?.id).toBe("lib");
    expect(kept[0]?.children?.[0]?.children?.[0]?.id).toBe("util");
  });

  it("keeps a matching row even with nothing under it", () => {
    expect(filtered("README").map((row) => row.id)).toEqual(["readme"]);
  });

  it("keeps a matching branch whole", () => {
    const kept = filtered("");
    expect(kept).toHaveLength(2);
  });

  it("drops what leads nowhere", () => {
    expect(filtered("nothing-matches-this")).toEqual([]);
  });
});

describe("treeIndentStyle", () => {
  it("steps by the same amount grouping steps by", () => {
    expect(treeIndentStyle(0)).toEqual({});
    expect(treeIndentStyle(2)).toEqual({ paddingInlineStart: "3rem" });
  });
});

describe("treeCardStyle", () => {
  it("steps a card in by its depth, logically", () => {
    expect(treeCardStyle(0)).toEqual({});
    expect(treeCardStyle(2)).toEqual({ marginInlineStart: "2.5rem" });
  });
});

describe("treeColumnKey", () => {
  const columns = [
    { key: "name", header: "Name" },
    { key: "size", header: "Size" },
  ];

  it("falls back to the first column", () => {
    expect(treeColumnKey(columns)).toBe("name");
  });

  it("honours the column the host named", () => {
    expect(treeColumnKey(columns, "size")).toBe("size");
  });

  it("has no answer without columns", () => {
    expect(treeColumnKey([])).toBeUndefined();
  });
});

describe("bodyRowEntries", () => {
  const rows = [
    { row: { id: "a" }, index: 4, key: "a" },
    { row: { id: "b" }, index: 5, key: "b" },
  ];

  it("passes the windowed rows through when no tree is armed", () => {
    // The window's own indices survive: they address the source rows, and
    // cell navigation counts on them.
    expect(bodyRowEntries(rows)).toEqual([
      { row: { id: "a" }, index: 4, key: "a" },
      { row: { id: "b" }, index: 5, key: "b" },
    ]);
  });

  it("renders the tree's visible entries, renumbered by position", () => {
    const entries = buildTreeEntries({
      rows: NESTED,
      getRowId: (row) => row.id,
      getChildren: (row) => row.children,
      expandedIds: new Set(["src"]),
    });
    const body = bodyRowEntries(rows, { entries });
    expect(body.map((entry) => entry.key)).toEqual(
      entries.map((entry) => entry.key)
    );
    expect(body.map((entry) => entry.index)).toEqual([0, 1, 2, 3]);
    expect(body[1]?.treeEntry?.level).toBe(1);
  });
});
