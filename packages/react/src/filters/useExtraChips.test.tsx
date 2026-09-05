import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ExtraFilters } from "@adapttable/core";
import { useExtraChips } from "./useExtraChips";

const labels = {
  status: (v: string) => `Status: ${v}`,
  buId: (v: string) => `BU: ${v}`,
};

function setup(extra: ExtraFilters) {
  const setExtra = vi.fn();
  const { result } = renderHook(() =>
    useExtraChips({ extra, setExtra, labels })
  );
  return { chips: result.current, setExtra };
}

describe("useExtraChips", () => {
  it("returns nothing when no extra matches a label", () => {
    expect(setup({ unrelated: "x" }).chips).toEqual([]);
  });

  it("emits a scalar chip and clears via setExtra('')", () => {
    const { chips, setExtra } = setup({ buId: "bu-1" });
    expect(chips[0]?.label).toBe("BU: bu-1");
    chips[0]?.onRemove();
    expect(setExtra).toHaveBeenCalledWith("buId", "");
  });

  it("emits one chip per array element", () => {
    const { chips, setExtra } = setup({ status: ["Active", "On Notice"] });
    expect(chips.map((c) => c.label)).toEqual([
      "Status: Active",
      "Status: On Notice",
    ]);
    chips[0]?.onRemove();
    expect(setExtra).toHaveBeenCalledWith("status", ["On Notice"]);
  });

  it("clears the key when removing the last array entry", () => {
    const { chips, setExtra } = setup({ status: ["Active"] });
    chips[0]?.onRemove();
    expect(setExtra).toHaveBeenCalledWith("status", "");
  });

  it("ignores empty arrays / strings / undefined", () => {
    expect(setup({ status: [], buId: "", other: undefined }).chips).toEqual([]);
  });

  it("skips keys with no resolver", () => {
    const { chips } = setup({ buId: "bu-1", ghost: "x" });
    expect(chips).toHaveLength(1);
    expect(chips[0]?.key).toBe("buId:bu-1");
  });
});
