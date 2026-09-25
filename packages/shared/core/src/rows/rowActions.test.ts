import { describe, expect, it, vi } from "vitest";

import type { RowAction } from "../types";
import { visibleRowActions } from "./rowActions";

interface Row {
  id: string;
}

const ROW: Row = { id: "a" };

describe("visibleRowActions", () => {
  it("keeps actions that have no isHidden probe", () => {
    const actions: RowAction<Row>[] = [
      { key: "edit", label: "Edit", onClick: vi.fn() },
    ];
    expect(visibleRowActions(actions, ROW)).toEqual(actions);
  });

  it("drops an action whose isHidden returns true", () => {
    const actions: RowAction<Row>[] = [
      { key: "edit", label: "Edit", onClick: vi.fn() },
      {
        key: "secret",
        label: "Secret",
        onClick: vi.fn(),
        isHidden: () => true,
      },
    ];
    expect(visibleRowActions(actions, ROW).map((action) => action.key)).toEqual(
      ["edit"]
    );
  });

  it("keeps a disabled action — disabled is not hidden", () => {
    const actions: RowAction<Row>[] = [
      {
        key: "del",
        label: "Delete",
        onClick: vi.fn(),
        isDisabled: () => true,
      },
    ];
    expect(visibleRowActions(actions, ROW)).toHaveLength(1);
  });
});
