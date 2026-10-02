/**
 * The live tree: the hierarchy walked from the rows, opening and closing
 * nodes, children fetched as a node opens, and where the chevron goes.
 */
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import type { AdaptTableFeature } from "../featureHost";
import { injectFrontendData } from "../source/frontendData";
import { injectTree, tree, type TreeFeatureOptions } from "./tree";

interface Person {
  id: string;
  name: string;
  parentId?: string;
  reports?: Person[];
}

const NESTED: Person[] = [
  {
    id: "1",
    name: "Ada",
    reports: [
      { id: "2", name: "Grace", reports: [{ id: "3", name: "Linus" }] },
    ],
  },
  { id: "4", name: "Alan" },
];

const COLUMNS: ColumnDef<Person>[] = [{ key: "name" }, { key: "team" }];

function treeWith(
  features: readonly AdaptTableFeature[],
  rows: readonly Person[] = NESTED
) {
  return TestBed.runInInjectionContext(() => {
    const source = injectFrontendData<Person>({
      data: signal(rows),
      getRowId: (row) => row.id,
      urlSync: false,
    });
    const model = injectTree<Person>({
      table: { columns: signal(COLUMNS), rowKey: (row) => row.id },
      source,
      features,
    });
    return { model, source };
  });
}

const keys = (model: ReturnType<typeof treeWith>["model"]) =>
  model?.()?.entries.map((entry) => entry.key);

const nested: TreeFeatureOptions<Person> = {
  getChildren: (row) => row.reports,
};

describe("tree()", () => {
  it("writes the hierarchy accessors", () => {
    const getChildren = vi.fn();
    const built = tree<Person>({ getChildren, treeColumn: "name" });
    expect(built.id).toBe("tree");
    expect(built.apply?.({})).toEqual({ getChildren, treeColumn: "name" });
  });
});

describe("injectTree", () => {
  it("is absent while the tree is not composed, and empty while rows are flat", () => {
    expect(treeWith([]).model).toBeUndefined();
    expect(treeWith([tree<Person>()]).model?.()).toBeUndefined();
  });

  it("starts folded and opens a node to show its children", () => {
    const { model } = treeWith([tree(nested)]);
    expect(keys(model)).toEqual(["1", "4"]);
    const first = model!()!.entries[0]!;
    expect(first).toMatchObject({
      level: 0,
      hasChildren: true,
      expanded: false,
    });

    model!()!.expansion.toggle("1");
    expect(keys(model)).toEqual(["1", "2", "4"]);
    expect(model!()!.entries[1]).toMatchObject({ level: 1, parentId: "1" });
    // The export walk opens every loaded node.
    expect(model!()!.allEntries.map((entry) => entry.key)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("walks flat rows by their parent ids", () => {
    const flat: Person[] = [
      { id: "1", name: "Ada" },
      { id: "2", name: "Grace", parentId: "1" },
    ];
    const { model } = treeWith(
      [tree<Person>({ getParentId: (row) => row.parentId })],
      flat
    );
    expect(keys(model)).toEqual(["1"]);
    model!()!.expansion.toggle("1");
    expect(keys(model)).toEqual(["1", "2"]);
  });

  it("puts the chevron in the first shown column unless one is named", () => {
    expect(treeWith([tree(nested)]).model!()!.columnKey).toBe("name");
    expect(
      treeWith([tree({ ...nested, treeColumn: "team" })]).model!()!.columnKey
    ).toBe("team");
  });

  it("fetches a node's children as it opens, and shows the node loading", async () => {
    let resolve!: () => void;
    const onLoadChildren = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        })
    );
    const { model } = treeWith(
      [
        tree<Person>({
          getChildren: (row) => row.reports,
          hasChildren: (row) => row.id === "4",
          onLoadChildren,
        }),
      ],
      [{ id: "4", name: "Alan" }]
    );
    model!()!.expansion.toggle("4");
    expect(onLoadChildren).toHaveBeenCalledWith({ id: "4", name: "Alan" });
    expect(model!()!.loadingIds.has("4")).toBe(true);
    expect(model!()!.entries[0]).toMatchObject({
      expanded: true,
      loading: true,
    });
    resolve();
    await vi.waitFor(() => {
      expect(model!()!.loadingIds.has("4")).toBe(false);
    });
  });

  it("closes a node whose children failed to arrive, so a click retries", async () => {
    const onLoadChildren = vi.fn(() => Promise.reject(new Error("offline")));
    const { model } = treeWith(
      [
        tree<Person>({
          getChildren: (row) => row.reports,
          hasChildren: () => true,
          onLoadChildren,
        }),
      ],
      [{ id: "4", name: "Alan" }]
    );
    model!()!.expansion.toggle("4");
    await vi.waitFor(() => {
      expect(model!()!.failedIds.has("4")).toBe(true);
    });
    expect(model!()!.expansion.isExpanded("4")).toBe(false);
    model!()!.expansion.toggle("4");
    expect(onLoadChildren).toHaveBeenCalledTimes(2);
  });

  it("tells the host that holds the open set", () => {
    const onExpandedIdsChange = vi.fn();
    const { model } = treeWith([
      tree({ ...nested, expandedIds: ["1"], onExpandedIdsChange }),
    ]);
    expect(keys(model)).toEqual(["1", "2", "4"]);
    model!()!.expansion.toggle("2");
    expect(onExpandedIdsChange).toHaveBeenCalledWith(["1", "2"]);
    expect(keys(model)).toEqual(["1", "2", "4"]);
  });

  it("follows the host's signal through callbacks, replacement and clear", () => {
    const expandedIds = signal<readonly string[]>(["1"]);
    const onExpandedIdsChange = vi.fn((ids: string[]) => {
      expandedIds.set(ids);
    });
    const { model } = treeWith([
      tree({ ...nested, expandedIds, onExpandedIdsChange }),
    ]);
    expect(keys(model)).toEqual(["1", "2", "4"]);
    model!()!.expansion.toggle("2");
    expect(onExpandedIdsChange).toHaveBeenLastCalledWith(["1", "2"]);
    expect(keys(model)).toEqual(["1", "2", "3", "4"]);

    expandedIds.set(["1"]);
    expect(keys(model)).toEqual(["1", "2", "4"]);
    model!()!.expansion.toggle("1");
    expect(onExpandedIdsChange).toHaveBeenLastCalledWith([]);
    expect(keys(model)).toEqual(["1", "4"]);

    expandedIds.set(["1", "2"]);
    expect(keys(model)).toEqual(["1", "2", "3", "4"]);
    expandedIds.set([]);
    expect(keys(model)).toEqual(["1", "4"]);
    expect(onExpandedIdsChange).toHaveBeenCalledTimes(2);
  });
});
