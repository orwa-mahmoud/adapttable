import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import {
  applyCollapsedColumnGroups,
  type ColumnGroupDef,
  type ColumnInput,
  flattenColumnTree,
  isColumnGroup,
  marriedOrderHolds,
} from "./columnTree";
import {
  COLUMN_GROUP_RENDER_PREFIX,
  COLUMN_GROUP_STUB_PREFIX,
  COLUMN_GROUP_STUB_WIDTH,
  columnGroupId,
} from "./headerGroups";

interface Row {
  id: string;
  email?: string;
}

const leaf = (
  key: string,
  group?: string | readonly string[]
): ColumnModel<Row> => ({
  key,
  header: key,
  group,
});

describe("isColumnGroup", () => {
  it("detects a parent with children", () => {
    const group: ColumnGroupDef<Row> = {
      header: "People",
      children: [leaf("a")],
    };
    expect(isColumnGroup(group)).toBe(true);
    expect(isColumnGroup(leaf("a"))).toBe(false);
  });
});

describe("flattenColumnTree", () => {
  it("leaves a flat list unchanged", () => {
    const { leaves, groups } = flattenColumnTree([leaf("a"), leaf("b")]);
    expect(leaves.map((column) => column.key)).toEqual(["a", "b"]);
    expect(groups.size).toBe(0);
  });

  it("stamps the parent path onto nested leaves", () => {
    const tree: ColumnInput<Row>[] = [
      leaf("person"),
      {
        header: "Delivery",
        children: [leaf("timeline"), leaf("budget")],
      },
    ];
    const { leaves, groups } = flattenColumnTree(tree);
    expect(leaves.map((column) => column.key)).toEqual([
      "person",
      "timeline",
      "budget",
    ]);
    expect(leaves[1]?.group).toBe("Delivery");
    expect(groups.get(columnGroupId(["Delivery"]))?.childKeys).toEqual([
      "timeline",
      "budget",
    ]);
    expect(groups.get(columnGroupId(["Delivery"]))?.marryChildren).toBe(true);
  });

  it("records collapse options on the group", () => {
    const { groups } = flattenColumnTree([
      {
        header: "Contact",
        collapsedKey: "email",
        collapsedRender: (row) => row.email,
        children: [leaf("email"), leaf("city")],
      },
    ]);
    const record = groups.get(columnGroupId(["Contact"]));
    expect(record?.collapsedKey).toBe("email");
    expect(record?.collapsedRender).toBeTypeOf("function");
  });

  it("records header align on the group", () => {
    const { groups } = flattenColumnTree([
      {
        header: "Delivery",
        align: "start",
        children: [leaf("a"), leaf("b")],
      },
    ]);
    expect(groups.get(columnGroupId(["Delivery"]))?.align).toBe("start");
  });
});

describe("applyCollapsedColumnGroups", () => {
  it("inserts an arrow stub when the group has no collapse options", () => {
    const { leaves, groups } = flattenColumnTree([
      {
        header: "People",
        children: [leaf("a"), leaf("b")],
      },
      leaf("c"),
    ]);
    const next = applyCollapsedColumnGroups(
      leaves,
      [columnGroupId(["People"])],
      groups
    );
    expect(next.map((column) => column.key)).toEqual([
      `${COLUMN_GROUP_STUB_PREFIX}${columnGroupId(["People"])}:0`,
      "c",
    ]);
    expect(next[0]).toMatchObject({
      header: "",
      width: COLUMN_GROUP_STUB_WIDTH,
      minWidth: COLUMN_GROUP_STUB_WIDTH,
      maxWidth: COLUMN_GROUP_STUB_WIDTH,
    });
    expect(next[0]?.headerTooltip).toBeUndefined();
  });

  it("keeps collapsedKey and hides the other leaves", () => {
    const { leaves, groups } = flattenColumnTree([
      {
        header: "Assignment",
        collapsedKey: "team",
        children: [leaf("team"), leaf("status")],
      },
    ]);
    const next = applyCollapsedColumnGroups(
      leaves,
      [columnGroupId(["Assignment"])],
      groups
    );
    expect(next.map((column) => column.key)).toEqual(["team"]);
  });

  it("prefers collapsedRender over collapsedKey", () => {
    const { leaves, groups } = flattenColumnTree([
      {
        header: "Contact",
        collapsedKey: "city",
        collapsedRender: (row) => row.email,
        children: [leaf("email"), leaf("city")],
      },
    ]);
    const next = applyCollapsedColumnGroups(
      leaves,
      [columnGroupId(["Contact"])],
      groups
    );
    expect(next).toHaveLength(1);
    expect(next[0]!.key.startsWith(COLUMN_GROUP_RENDER_PREFIX)).toBe(true);
    expect(next[0]!.formatValue?.({ id: "1", email: "a@b.c" })).toBe("a@b.c");
  });

  it("honours groupShow always and closed", () => {
    const { leaves, groups } = flattenColumnTree([
      {
        header: "G",
        children: [
          { ...leaf("keep"), groupShow: "always" },
          { ...leaf("closed"), groupShow: "closed" },
          leaf("open"),
        ],
      },
    ]);
    const next = applyCollapsedColumnGroups(
      leaves,
      [columnGroupId(["G"])],
      groups
    );
    expect(next.map((column) => column.key)).toEqual(["keep", "closed"]);
  });

  it("draws an empty cell where a collapsed group had columns", () => {
    const columns = [leaf("a", "G"), leaf("b", "G")];
    const next = applyCollapsedColumnGroups(columns, [columnGroupId(["G"])]);

    expect(next).toHaveLength(1);
    // The stub holds the group's place in the row so the header above it has
    // something to sit on; it has no value of its own to show.
    expect(next[0]!.formatValue?.({ id: "1", email: "a@b.c" })).toBe("");
  });

  it("puts a stub on each split run of a flat group", () => {
    const columns = [leaf("a", "G"), leaf("x"), leaf("b", "G")];
    const next = applyCollapsedColumnGroups(columns, [columnGroupId(["G"])]);
    expect(next.map((column) => column.key)).toEqual([
      `${COLUMN_GROUP_STUB_PREFIX}${columnGroupId(["G"])}:0`,
      "x",
      `${COLUMN_GROUP_STUB_PREFIX}${columnGroupId(["G"])}:2`,
    ]);
  });
});

describe("marriedOrderHolds", () => {
  it("rejects a reorder that splits a married group", () => {
    const { groups } = flattenColumnTree([
      {
        header: "Delivery",
        children: [leaf("timeline"), leaf("budget")],
      },
      leaf("load"),
    ]);
    expect(marriedOrderHolds(["timeline", "budget", "load"], groups)).toBe(
      true
    );
    expect(marriedOrderHolds(["timeline", "load", "budget"], groups)).toBe(
      false
    );
  });
});
