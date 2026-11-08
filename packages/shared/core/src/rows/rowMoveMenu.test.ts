import { describe, expect, it, vi } from "vitest";

import type { RowGroupRef } from "../grouping/groupRows";
import type { RowMoveRequest } from "./rowMove";
import { rowMoveMenuProps } from "./rowMoveMenu";

const group = (id: string): RowGroupRef => ({ id, label: id, levels: [] });
const row = { id: "r1" };
const target = { id: "t1", label: "Closed" };

function state(pendingMove: RowMoveRequest<typeof row> | null) {
  return {
    moveMenu: () => ({
      kind: "group" as const,
      label: "Move row",
      targets: [target],
    }),
    pendingMove,
    selectMoveTarget: vi.fn(),
    confirmMove: vi.fn(),
    cancelMove: vi.fn(),
  };
}

describe("rowMoveMenuProps", () => {
  it("lists the destinations and selects one", () => {
    const reorder = state(null);
    const props = rowMoveMenuProps(reorder, undefined, row, false);
    expect(props?.label).toBe("Move row");
    expect(props?.items[0]).toMatchObject({ id: "t1", disabled: false });
    props?.items[0]?.onSelect();
    expect(reorder.selectMoveTarget).toHaveBeenCalledWith(target);
    expect(props?.confirmation).toBeUndefined();
  });

  it("locks every destination while moves are locked", () => {
    const props = rowMoveMenuProps(state(null), undefined, row, true);
    expect(props?.items[0]?.disabled).toBe(true);
  });

  it("asks to confirm a pending move on this row", () => {
    const reorder = state({
      kind: "group",
      row,
      rowLabel: "Row 1",
      fromGroup: group("Open"),
      toGroup: group("Closed"),
      position: 0,
    });
    const confirmation = rowMoveMenuProps(
      reorder,
      undefined,
      row,
      false
    )?.confirmation;
    expect(confirmation?.description).toContain("Open");
    expect(confirmation?.description).toContain("Closed");
    expect(confirmation?.onConfirm).toBe(reorder.confirmMove);
  });

  it("is absent when the row has nowhere to move", () => {
    expect(
      rowMoveMenuProps(
        { ...state(null), moveMenu: () => undefined },
        undefined,
        row,
        false
      )
    ).toBeUndefined();
  });
});
