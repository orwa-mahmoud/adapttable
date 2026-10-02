import { featureOptionsOf } from "@adapttable/angular";
import { AdaptEditableCell } from "@adapttable/ng-zorro";
import { batchEditing } from "@adapttable/ng-zorro/batch-editing";
import { cellNavigation } from "@adapttable/ng-zorro/cell-navigation";
import { editing, rowEditing } from "@adapttable/ng-zorro/editing";
import { rowReorder } from "@adapttable/ng-zorro/row-reorder";
import { virtualize } from "@adapttable/ng-zorro/virtualize";
import { describe, expect, it, vi } from "vitest";

describe("NG-ZORRO Angular feature wrappers", () => {
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
    expect(cell.renders?.some((fill) => fill.slot.id === "editable-cell")).toBe(
      true
    );
    expect(featureOptionsOf([row])).toMatchObject({
      rowEditing: true,
      onRowEdit,
    });
    expect(row.renders?.[0]?.render({} as never)).toBe(AdaptEditableCell);
    expect(row.renders?.some((fill) => fill.slot.id === "editable-cell")).toBe(
      true
    );
    expect(featureOptionsOf([batchEditing(onBatchEdit)])).toMatchObject({
      batchEditing: true,
      onBatchEdit,
    });
  });
});
