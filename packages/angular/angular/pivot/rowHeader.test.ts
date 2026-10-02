/**
 * The row header's own fallbacks, when a column carries no caption or indent.
 */
import type { PivotRow } from "@adapttable/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { AdaptPivotRowHeader } from "./rowHeader";

const line = (depth: number): PivotRow =>
  ({
    key: "k",
    kind: "leaf",
    label: "Alpha",
    depth,
    path: [],
    cells: [],
    count: 1,
  }) as unknown as PivotRow;

function cell(row: PivotRow, meta?: Record<string, unknown>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [AdaptPivotRowHeader] });
  const fixture = TestBed.createComponent(AdaptPivotRowHeader);
  fixture.componentRef.setInput("row", row);
  fixture.componentRef.setInput("column", { key: "pivot-row", meta });
  fixture.detectChanges();
  return fixture.nativeElement.querySelector("span") as HTMLElement;
}

describe("AdaptPivotRowHeader", () => {
  it("uses the line's label when the column carries no caption", () => {
    const span = cell(line(0));

    expect(span.textContent).toBe("Alpha");
    expect(span.style.paddingInlineStart).toBe("");
  });

  it("ignores an indent that is not a number", () => {
    const span = cell(line(1), { pivotIndent: "wide" });

    expect(span.style.paddingInlineStart).toBe("");
  });
});
