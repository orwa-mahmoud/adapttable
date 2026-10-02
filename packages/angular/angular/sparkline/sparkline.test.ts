/**
 * Sparklines: the chart a host draws, and the column whose cell is that chart.
 */
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { AdaptCell } from "../src/cell";
import {
  AdaptSparkline,
  finiteSparklineValues,
  sparklineColumn,
  sparklineExportValue,
  type SparklineKind,
  sparklineSummary,
} from "./sparkline";

describe("finiteSparklineValues", () => {
  it("drops non-finite points", () => {
    expect(finiteSparklineValues([1, Number.NaN, 2, Infinity, 3])).toEqual([
      1, 2, 3,
    ]);
  });
});

describe("sparklineSummary", () => {
  it("describes empty, single and multi series", () => {
    expect(sparklineSummary([])).toBe("no values");
    expect(sparklineSummary([42])).toBe("1 value, 42");
    expect(sparklineSummary([2, 8, 5])).toBe("3 values, min 2, max 8, last 5");
  });
});

describe("sparklineExportValue", () => {
  it("joins the finite numbers", () => {
    expect(sparklineExportValue([1, Number.NaN, 2])).toBe("1, 2");
  });
});

@Component({
  imports: [AdaptSparkline],
  template: `
    <adapt-sparkline
      [values]="values()"
      [kind]="kind()"
      [label]="label()"
      [width]="width()"
      [height]="height()"
      [color]="color()"
    />
  `,
})
class Host {
  readonly values = signal<readonly number[]>([1, 3, 2]);
  readonly kind = signal<SparklineKind>("line");
  readonly label = signal<string | undefined>(undefined);
  readonly width = signal(80);
  readonly height = signal(28);
  readonly color = signal("currentColor");
}

const chart = () => document.querySelector("svg");

describe("AdaptSparkline", () => {
  it("renders an accessible line chart", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const drawn = chart();
    expect(drawn?.getAttribute("aria-label")).toBe(
      "3 values, min 1, max 3, last 2"
    );
    expect(drawn?.getAttribute("data-kind")).toBe("line");
    expect(drawn?.getAttribute("data-adapttable-part")).toBe("sparkline");
    expect(drawn?.querySelector("path")).not.toBeNull();
  });

  it("draws bars and an area", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.kind.set("bar");
    fixture.componentInstance.values.set([1, 2, 3]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(chart()?.querySelectorAll("rect")).toHaveLength(3);
    fixture.componentInstance.kind.set("area");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(chart()?.getAttribute("data-kind")).toBe("area");
    expect(chart()?.querySelectorAll("path")).toHaveLength(2);
  });

  it("draws a one-point line", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.values.set([7]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(chart()?.querySelector("path")?.getAttribute("d")).toContain("M");
  });

  it("accepts a host label and stays empty-safe", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.values.set([]);
    fixture.componentInstance.label.set("quiet");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(chart()?.getAttribute("aria-label")).toBe("quiet");
  });

  it("keeps a flat series on the midline", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.values.set([5, 5, 5]);
    fixture.componentInstance.width.set(40);
    fixture.componentInstance.height.set(20);
    fixture.componentInstance.color.set("red");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(chart()?.getAttribute("width")).toBe("40");
    expect(chart()?.querySelector("path")?.getAttribute("stroke")).toBe("red");
  });
});

interface Row {
  id: string;
  history: number[];
}

@Component({
  imports: [AdaptCell],
  template: `<td [adaptCell]="column" [adaptCellRow]="row"></td>`,
})
class CellHost {
  column = sparklineColumn<Row>({
    key: "trend",
    header: "Trend",
    values: (row) => row.history,
    kind: "bar",
    width: 48,
    height: 16,
    color: "red",
  });
  row: Row = { id: "a", history: [1, 4, 2] };
}

describe("sparklineColumn", () => {
  const column = sparklineColumn<Row>({
    key: "trend",
    header: "Trend",
    values: (row) => row.history,
    kind: "bar",
  });

  it("sorts and exports the numbers, not the SVG", () => {
    const row = { id: "a", history: [4, 9, 6] };
    expect(column.sortValue?.(row)).toBe(6);
    expect(column.exportValue?.(row)).toBe("4, 9, 6");
    expect(column.sortValue?.({ id: "b", history: [] })).toBeUndefined();
  });

  it("renders the chart from the row", async () => {
    const fixture = TestBed.createComponent(CellHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const drawn = chart();
    expect(drawn?.getAttribute("aria-label")).toBe(
      "3 values, min 1, max 4, last 2"
    );
    expect(drawn?.getAttribute("data-kind")).toBe("bar");
    expect(drawn?.getAttribute("width")).toBe("48");
    expect(drawn?.querySelector("g")?.getAttribute("fill")).toBe("red");
    expect(drawn?.querySelectorAll("rect").length).toBeGreaterThan(0);
  });

  it("forwards a host label", async () => {
    const fixture = TestBed.createComponent(CellHost);
    fixture.componentInstance.column = sparklineColumn<Row>({
      key: "trend",
      values: (row) => row.history,
      label: (values, row) => `${row.id}:${values.length}`,
    });
    fixture.componentInstance.row = { id: "z", history: [1, 2] };
    fixture.detectChanges();
    await fixture.whenStable();
    expect(chart()?.getAttribute("aria-label")).toBe("z:2");
  });
});
