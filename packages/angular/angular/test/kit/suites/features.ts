import { featureOptionsOf } from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { expect, vi } from "vitest";

import { type AngularKitUnderTest, kitComponent } from "../kit";

/**
 * The shared `features.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function featuresTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const {
    batchEditing,
    cellNavigation,
    editing,
    rowEditing,
    rowReorder,
    virtualize,
  } = kit.features;
  const AdaptEditableCell = kitComponent(kit, "AdaptEditableCell");
  return collectConformanceTests(({ describe, it }) => {
    describe(`${kit.name} Angular feature wrappers`, () => {
      it("arms virtualize with the windowing knobs", () => {
        expect(featureOptionsOf([virtualize()])).toMatchObject({
          virtualize: true,
        });
        expect(
          featureOptionsOf([
            virtualize({ estimateRowSize: 72, virtualOverscan: 4 }),
          ])
        ).toMatchObject({
          virtualize: true,
          estimateRowSize: 72,
          virtualOverscan: 4,
        });
        expect(featureOptionsOf([virtualize(false)])).toMatchObject({
          virtualize: false,
        });
      });

      it("arms cell navigation", () => {
        expect(featureOptionsOf([cellNavigation()])).toMatchObject({
          cellNavigation: true,
        });
      });

      it("arms row reorder under the row-reorder id", () => {
        const onRowReorder = vi.fn();
        const feature = rowReorder(onRowReorder);
        expect(feature.id).toBe("row-reorder");
        expect(featureOptionsOf([feature])).toEqual({});
      });

      it("arms cell, row and batch editing", () => {
        const onCellEdit = vi.fn();
        const onRowEdit = vi.fn();
        const onBatchEdit = vi.fn();
        const cell = editing(onCellEdit);
        const row = rowEditing(onRowEdit);
        expect(featureOptionsOf([cell])).toMatchObject({
          onCellEdit,
        });
        expect(cell.renders?.[0]?.render({} as never)).toBe(AdaptEditableCell);
        expect(
          cell.renders?.some((fill) => fill.slot.id === "editable-cell")
        ).toBe(true);
        expect(featureOptionsOf([row])).toMatchObject({
          rowEditing: true,
          onRowEdit,
        });
        expect(row.renders?.[0]?.render({} as never)).toBe(AdaptEditableCell);
        expect(
          row.renders?.some((fill) => fill.slot.id === "editable-cell")
        ).toBe(true);
        expect(featureOptionsOf([batchEditing(onBatchEdit)])).toMatchObject({
          batchEditing: true,
          onBatchEdit,
        });
      });
    });
  });
}
