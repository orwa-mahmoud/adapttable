import { describe, expect, it, vi } from "vitest";

import { defaultLabels } from "../labels";
import type { FilterDef } from "./filterDefs";
import { filterTreeConditionChips } from "./filterTreeChips";

interface Row {
  name: string;
}

const DEFS: FilterDef<Row>[] = [{ key: "name", type: "text", label: "Person" }];

describe("filterTreeConditionChips", () => {
  it("chips every condition that filters, keyed by its path, and removes by path", () => {
    const onRemove = vi.fn();
    const chips = filterTreeConditionChips({
      tree: {
        combinator: "or",
        conditions: [
          { key: "name", op: "eq", value: "Ada" },
          { key: "name", op: "contains" },
          {
            combinator: "and",
            conditions: [{ key: "name", op: "empty" }],
          },
        ],
      },
      defs: DEFS,
      labels: defaultLabels,
      onRemove,
    });

    expect(chips.map((chip) => chip.key)).toEqual([
      "ft:0:name:eq",
      "ft:2.0:name:empty",
    ]);
    expect(chips[0]?.label).toBe("Person Equal Ada");
    chips[1]?.onRemove();
    expect(onRemove).toHaveBeenCalledWith([2, 0]);
  });

  it("has no chips without a tree or a way to remove from it", () => {
    const tree = {
      combinator: "and" as const,
      conditions: [{ key: "name", op: "eq", value: "Ada" }],
    };
    expect(
      filterTreeConditionChips({
        tree: undefined,
        defs: DEFS,
        labels: defaultLabels,
        onRemove: vi.fn(),
      })
    ).toEqual([]);
    expect(
      filterTreeConditionChips({
        tree,
        defs: DEFS,
        labels: defaultLabels,
        onRemove: undefined,
      })
    ).toEqual([]);
  });
});
