import { describe, expect, it, vi } from "vitest";

import { cellNavigation } from "./cell-navigation";
import { editHistory } from "./editing";

/** The kit's factories hand the host callbacks to the shared features. */
describe("host callbacks through the mantine factories", () => {
  it("passes onRangeChange through cellNavigation", () => {
    const onRangeChange = vi.fn();
    expect(cellNavigation({ onRangeChange }).apply?.({})).toEqual({
      cellNavigation: true,
      onCellRangeChange: onRangeChange,
    });
    expect(cellNavigation().apply?.({})).toEqual({ cellNavigation: true });
  });

  it("passes onChange through editHistory", () => {
    const onChange = vi.fn();
    expect(editHistory({ onChange }).apply?.({})).toEqual({
      editHistory: { onChange },
    });
  });
});
