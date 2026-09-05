import type { ColumnModel } from "../columnModel";
import { describe, expect, it } from "vitest";

import {
  COLUMN_GROUP_RENDER_PREFIX,
  COLUMN_GROUP_STUB_PREFIX,
  columnGroupHeaderCaption,
  columnGroupId,
  columnGroupPath,
  columnGroupStubStyle,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  groupedHeaderChildRule,
  groupedHeaderLabelStyle,
  headerGroupRow,
  headerGroupRows,
  htmlGroupedHeaderPlan,
  toggleCollapsedColumnGroup,
} from "./headerGroups";

interface Row {
  id: string;
}
const col = (
  key: string,
  group?: string | readonly string[]
): ColumnModel<Row> => ({
  key,
  header: key,
  group,
});

describe("columnGroupPath", () => {
  it("is empty until a group is declared", () => {
    expect(columnGroupPath(col("a"))).toEqual([]);
  });

  it("wraps a string as one level", () => {
    expect(columnGroupPath(col("a", "People"))).toEqual(["People"]);
  });

  it("keeps a path as-is", () => {
    expect(columnGroupPath(col("a", ["Finance", "Q1"]))).toEqual([
      "Finance",
      "Q1",
    ]);
  });
});

describe("groupedHeaderChildRule", () => {
  it("draws an inset hairline instead of a full-width border", () => {
    const rule = groupedHeaderChildRule("red");
    expect(rule.borderBottom).toBe("none");
    expect(rule.backgroundImage).toContain("red");
  });
});

describe("headerGroupRow", () => {
  it("returns null when no column declares a group", () => {
    expect(headerGroupRow([col("a"), col("b")])).toBeNull();
  });

  it("merges contiguous same-group columns and gaps", () => {
    const cells = headerGroupRow([
      col("a", "People"),
      col("b", "People"),
      col("c"),
      col("d"),
      col("e", "Money"),
    ])!;
    expect(cells.map((c) => [c.label, c.span])).toEqual([
      ["People", 2],
      [null, 2],
      ["Money", 1],
    ]);
  });

  it("splits a group whose columns were reordered apart", () => {
    const cells = headerGroupRow([col("a", "G"), col("x"), col("b", "G")])!;
    expect(cells.map((c) => c.label)).toEqual(["G", null, "G"]);
  });
});

describe("groupedHeaderAlign", () => {
  it("keeps the previous hardcoded center when omit", () => {
    expect(groupedHeaderAlign()).toBe("center");
    expect(groupedHeaderAlign("center")).toBe("center");
    expect(groupedHeaderAlign("start")).toBe("start");
    expect(groupedHeaderAlign("end")).toBe("end");
  });
});

describe("headerGroupRows", () => {
  it("stacks a path into one row per depth", () => {
    const rows = headerGroupRows([
      col("a", ["Finance", "Q1"]),
      col("b", ["Finance", "Q1"]),
      col("c", ["Finance", "Q2"]),
    ])!;
    expect(rows).toHaveLength(2);
    expect(rows[0]!.map((c) => [c.label, c.span])).toEqual([["Finance", 3]]);
    expect(rows[1]!.map((c) => [c.label, c.span])).toEqual([
      ["Q1", 2],
      ["Q2", 1],
    ]);
  });

  it("marks a collapsed group when asked", () => {
    const id = columnGroupId(["People"]);
    const rows = headerGroupRows(
      [col("a", "People"), col("b", "People")],
      [id],
      true
    )!;
    expect(rows[0]![0]).toMatchObject({
      id,
      collapsed: true,
      collapsible: true,
    });
  });

  it("reads align from the group record", () => {
    const id = columnGroupId(["Delivery"]);
    const rows = headerGroupRows(
      [col("a", "Delivery"), col("b", "Delivery")],
      [],
      false,
      new Map([[id, { align: "start" }]])
    )!;
    expect(rows[0]![0]!.align).toBe("start");
  });
});

describe("headerGroupRows hideLabel", () => {
  it("hides the caption on a collapsed stub and keeps the name on the cell", () => {
    const id = columnGroupId(["People"]);
    const stub: ColumnModel<Row> = {
      key: `${COLUMN_GROUP_STUB_PREFIX}${id}:0`,
      header: "",
      group: "People",
    };
    const rows = headerGroupRows([stub], [id], true)!;
    expect(rows[0]![0]).toMatchObject({
      label: "People",
      hideLabel: true,
      collapsed: true,
    });
    expect(columnGroupHeaderCaption(rows[0]![0]!)).toBeNull();
  });

  it("shows the group's name while it is open", () => {
    // The caption is what a kit draws in the band; only the collapsed stub
    // hides it, because there is no width left to read a name in.
    const rows = headerGroupRows([col("name", "People")], [], true)!;
    expect(rows[0]![0]).toMatchObject({ label: "People", hideLabel: false });
    expect(columnGroupHeaderCaption(rows[0]![0]!)).toBe("People");
  });
});

describe("htmlGroupedHeaderPlan", () => {
  it("rowspans ungrouped leaves through the group band", () => {
    const plan = htmlGroupedHeaderPlan([
      col("person"),
      col("team", "Assignment"),
      col("status", "Assignment"),
      col("timeline", "Delivery"),
      col("budget", "Delivery"),
      col("load"),
    ])!;
    expect(plan).toHaveLength(2);
    expect(
      plan[0]!.map((cell) =>
        cell.kind === "group"
          ? ["group", cell.cell.label, cell.colSpan]
          : ["leaf", cell.key, cell.rowSpan]
      )
    ).toEqual([
      ["leaf", "person", 2],
      ["group", "Assignment", 2],
      ["group", "Delivery", 2],
      ["leaf", "load", 2],
    ]);
    expect(plan[1]!.map((cell) => cell.key)).toEqual([
      "team",
      "status",
      "timeline",
      "budget",
    ]);
  });

  it("lifts a middle ungrouped leaf the way Ant does", () => {
    const plan = htmlGroupedHeaderPlan([
      col("a", "Person"),
      col("city"),
      col("b", "Person"),
    ])!;
    expect(
      plan[0]!.map((cell) =>
        cell.kind === "group"
          ? ["group", cell.cell.label, cell.colSpan]
          : ["leaf", cell.key, cell.rowSpan]
      )
    ).toEqual([
      ["group", "Person", 1],
      ["leaf", "city", 2],
      ["group", "Person", 1],
    ]);
    expect(plan[1]!.map((cell) => cell.key)).toEqual(["a", "b"]);
  });

  it("rowspans a shorter branch under a deeper neighbor", () => {
    const plan = htmlGroupedHeaderPlan([
      col("q1", ["Finance", "Q1"]),
      col("q2", ["Finance", "Q2"]),
      col("geo", "Geo"),
    ])!;
    expect(plan).toHaveLength(3);
    expect(plan[0]!.map((cell) => cell.kind)).toEqual(["group", "group"]);
    expect(
      plan[1]!.map((cell) =>
        cell.kind === "group" ? ["group", cell.cell.label] : ["leaf", cell.key]
      )
    ).toEqual([
      ["group", "Q1"],
      ["group", "Q2"],
      ["leaf", "geo"],
    ]);
    expect(plan[1]!.at(-1)).toMatchObject({ kind: "leaf", rowSpan: 2 });
    expect(plan[2]!.map((cell) => cell.key)).toEqual(["q1", "q2"]);
  });

  it("rowspans a collapsedRender group like an ungrouped leaf", () => {
    const id = columnGroupId(["Delivery"]);
    const plan = htmlGroupedHeaderPlan(
      [
        col("person"),
        {
          key: `${COLUMN_GROUP_RENDER_PREFIX}${id}:0`,
          header: "",
          group: "Delivery",
        },
        col("load"),
      ],
      [id],
      true
    )!;
    expect(plan).toHaveLength(1);
    expect(
      plan[0]!.map((cell) =>
        cell.kind === "group"
          ? ["group", cell.cell.label, cell.colSpan, cell.rowSpan]
          : ["leaf", cell.key, cell.rowSpan]
      )
    ).toEqual([
      ["leaf", "person", 1],
      ["group", "Delivery", 1, 1],
      ["leaf", "load", 1],
    ]);
  });

  it("keeps two header rows when collapsedKey leaves a real child", () => {
    const id = columnGroupId(["Assignment"]);
    const plan = htmlGroupedHeaderPlan(
      [col("person"), col("team", "Assignment"), col("load")],
      [id],
      true
    )!;
    expect(plan).toHaveLength(2);
    expect(
      plan[0]!.map((cell) =>
        cell.kind === "group"
          ? ["group", cell.cell.label, cell.colSpan, cell.rowSpan]
          : ["leaf", cell.key, cell.rowSpan]
      )
    ).toEqual([
      ["leaf", "person", 2],
      ["group", "Assignment", 1, 1],
      ["leaf", "load", 2],
    ]);
    expect(plan[1]!.map((cell) => cell.key)).toEqual(["team"]);
  });

  it("rowspans a collapsed brief beside an open group's children", () => {
    const delivery = columnGroupId(["Delivery"]);
    const plan = htmlGroupedHeaderPlan(
      [
        col("person"),
        col("team", "Assignment"),
        col("status", "Assignment"),
        {
          key: `${COLUMN_GROUP_RENDER_PREFIX}${delivery}:0`,
          header: "",
          group: "Delivery",
        },
        col("load"),
      ],
      [delivery],
      true
    )!;
    expect(plan).toHaveLength(2);
    expect(
      plan[0]!.map((cell) =>
        cell.kind === "group"
          ? ["group", cell.cell.label, cell.colSpan, cell.rowSpan]
          : ["leaf", cell.key, cell.rowSpan]
      )
    ).toEqual([
      ["leaf", "person", 2],
      ["group", "Assignment", 2, 1],
      ["group", "Delivery", 1, 2],
      ["leaf", "load", 2],
    ]);
    expect(plan[1]!.map((cell) => cell.key)).toEqual(["team", "status"]);
  });

  it("rowspans a collapsed stub beside an open group's children", () => {
    const delivery = columnGroupId(["Delivery"]);
    const plan = htmlGroupedHeaderPlan(
      [
        col("person"),
        col("team", "Assignment"),
        col("status", "Assignment"),
        {
          key: `${COLUMN_GROUP_STUB_PREFIX}${delivery}:0`,
          header: "",
          group: "Delivery",
        },
        col("load"),
      ],
      [delivery],
      true
    )!;
    expect(plan).toHaveLength(2);
    const stub = plan[0]!.find(
      (cell) => cell.kind === "group" && cell.cell.label === "Delivery"
    );
    expect(stub).toMatchObject({
      kind: "group",
      rowSpan: 2,
      cell: { hideLabel: true, label: "Delivery" },
    });
    expect(plan[1]!.map((cell) => cell.key)).toEqual(["team", "status"]);
  });

  it("returns null when nothing is grouped", () => {
    expect(htmlGroupedHeaderPlan([col("a"), col("b")])).toBeNull();
  });
});

describe("toggleCollapsedColumnGroup", () => {
  it("adds then removes the id", () => {
    const id = columnGroupId(["People"]);
    expect(toggleCollapsedColumnGroup([], id)).toEqual([id]);
    expect(toggleCollapsedColumnGroup([id], id)).toEqual([]);
  });
});

describe("groupedHeaderCellStyle", () => {
  it("locks a hidden-label stub so the table cannot stretch it", () => {
    expect(
      groupedHeaderCellStyle(
        {
          rowSpan: 2,
          cell: {
            key: "g",
            label: "Delivery",
            span: 1,
            id: "Delivery",
            collapsed: true,
            collapsible: true,
            hideLabel: true,
          },
        },
        "red"
      )
    ).toEqual({
      ...columnGroupStubStyle(),
      textAlign: "center",
      whiteSpace: "nowrap",
    });
  });

  it("keeps a labelled group from wrapping the chevron above the title", () => {
    const style = groupedHeaderCellStyle(
      {
        rowSpan: 1,
        cell: {
          key: "g",
          label: "Assignment",
          span: 1,
          id: "Assignment",
          collapsed: true,
          collapsible: true,
          hideLabel: false,
        },
      },
      "red"
    );
    expect(style.whiteSpace).toBe("nowrap");
    expect(style.minWidth).toBe("max-content");
    expect(groupedHeaderLabelStyle()).toMatchObject({
      display: "inline-flex",
      whiteSpace: "nowrap",
    });
  });

  it("honours an explicit group header align", () => {
    expect(
      groupedHeaderCellStyle(
        {
          rowSpan: 2,
          cell: {
            key: "g",
            label: "Delivery",
            span: 1,
            id: "Delivery",
            collapsed: true,
            collapsible: true,
            hideLabel: false,
            align: "start",
          },
        },
        "red"
      ).textAlign
    ).toBe("start");
  });
});
