import {
  AdaptPivotRowHeader,
  pivot,
  type PivotField,
} from "@adapttable/angular/pivot";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { TestBed } from "@angular/core/testing";
import { expect } from "vitest";

import { type AngularKitUnderTest, kitComponent } from "../kit";

/**
 * The shared `pivot.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function pivotTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { kitSelector } = kit;
  const pivotTableModel = kitComponent(kit, "pivotTableModel");
  return collectConformanceTests(({ describe, it }) => {
    /**
     * The native pivot panel, and the row header it draws for a pivot table.
     */

    const FIELDS: PivotField[] = [
      { key: "region", label: "Region" },
      { key: "team", label: "Team" },
      { key: "amount", label: "Amount" },
    ];

    const part = (name: string) =>
      document.querySelector<HTMLElement>(kitSelector(name));

    describe("pivot row header", () => {
      it("names the part and indents a nested line", () => {
        const result = pivot(
          [
            { team: "Alpha", region: "EU", amount: 10 },
            { team: "Beta", region: "US", amount: 30 },
          ],
          {
            rows: ["region", "team"],
            columns: [],
            measures: [{ key: "amount", agg: "sum" }],
          }
        );
        const model = pivotTableModel(result, { fields: FIELDS });
        const leaf = model.rows.find((row) => row.depth === 1)!;

        expect(model.columns[0]?.cell).toBe(AdaptPivotRowHeader);
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ imports: [AdaptPivotRowHeader] });
        const fixture = TestBed.createComponent(AdaptPivotRowHeader);
        fixture.componentRef.setInput("row", leaf);
        fixture.componentRef.setInput("column", model.columns[0]);
        fixture.detectChanges();
        const cell = part("pivot-row-header");

        expect(cell?.getAttribute("data-pivot-kind")).toBe("leaf");
        expect(cell?.style.paddingInlineStart).toBe("16px");
      });

      it("uses the label when there is no caption, and skips a bad indent", () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ imports: [AdaptPivotRowHeader] });
        const fixture = TestBed.createComponent(AdaptPivotRowHeader);
        fixture.componentRef.setInput("row", {
          kind: "subtotal",
          label: "EU",
          depth: 0,
        });
        fixture.componentRef.setInput("column", {
          meta: { pivotIndent: "wide" },
        });
        fixture.detectChanges();

        expect(part("pivot-row-header")?.textContent).toBe("EU");
        expect(part("pivot-row-header")?.style.paddingInlineStart).toBe("");
      });
    });
  });
}
