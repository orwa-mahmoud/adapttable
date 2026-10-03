import { featureOptionsOf } from "@adapttable/angular";
import { AdaptEditableCell } from "@adapttable/taiga-ui";
import { batchEditing } from "@adapttable/taiga-ui/batch-editing";
import { cellNavigation } from "@adapttable/taiga-ui/cell-navigation";
import { editing, rowEditing } from "@adapttable/taiga-ui/editing";
import { rowReorder } from "@adapttable/taiga-ui/row-reorder";
import { virtualize } from "@adapttable/taiga-ui/virtualize";
import { describe, expect, it, vi } from "vitest";

describe("Taiga UI Angular feature wrappers", () => {
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
