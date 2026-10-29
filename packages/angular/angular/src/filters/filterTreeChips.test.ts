import { defaultLabels, type FilterDef } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import { filterTreeChips } from "./filterTreeChips";

interface Row {
  name: string;
}

const DEFS: FilterDef<Row>[] = [{ key: "name", type: "text", label: "Person" }];

describe("filterTreeChips", () => {
  it("chips every finished condition and none still waiting for a value", () => {
    const setTree = vi.fn();
    const chips = filterTreeChips(
      {
        combinator: "or",
        conditions: [
          { key: "name", op: "eq", value: "Ada" },
          { key: "name", op: "contains" },
          { key: "name", op: "empty" },
        ],
      },
      setTree,
      DEFS,
      defaultLabels,
      undefined
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      "Person Equal Ada",
      expect.stringContaining("Person"),
    ]);
    chips[0]?.onRemove();
    expect(setTree).toHaveBeenCalledWith({
      combinator: "or",
      conditions: [
        { key: "name", op: "contains" },
        { key: "name", op: "empty" },
      ],
    });
  });

  it("has no chips without a tree or a way to change it", () => {
    expect(
      filterTreeChips(undefined, vi.fn(), DEFS, defaultLabels, undefined)
    ).toEqual([]);
    expect(
      filterTreeChips(
        {
          combinator: "and",
          conditions: [{ key: "name", op: "eq", value: "Ada" }],
        },
        undefined,
        DEFS,
        defaultLabels,
        undefined
      )
    ).toEqual([]);
  });
});
