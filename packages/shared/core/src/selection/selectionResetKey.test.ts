import { describe, expect, it } from "vitest";

import { selectionResetKey } from "./selectionBindingState";

const QUERY = {
  search: "ada",
  extra: { team: ["core"] },
  filterTree: undefined,
  groupBy: undefined,
};

describe("selectionResetKey", () => {
  it("changes when the advanced filter tree changes", () => {
    const tree = {
      combinator: "and" as const,
      conditions: [{ key: "team", op: "eq", value: "core" }],
    };
    expect(selectionResetKey({ ...QUERY, filterTree: tree })).not.toBe(
      selectionResetKey(QUERY)
    );
  });

  it("changes with the search, a filter value or the grouping", () => {
    const base = selectionResetKey(QUERY);
    expect(selectionResetKey({ ...QUERY, search: "grace" })).not.toBe(base);
    expect(selectionResetKey({ ...QUERY, extra: { team: ["web"] } })).not.toBe(
      base
    );
    expect(selectionResetKey({ ...QUERY, groupBy: "team" })).not.toBe(base);
  });

  it("is the same for an equal query rebuilt", () => {
    expect(selectionResetKey({ ...QUERY, extra: { team: ["core"] } })).toBe(
      selectionResetKey(QUERY)
    );
  });
});

describe("selectionResetKey with operands that are not plain values", () => {
  const withValue = (value: unknown) =>
    selectionResetKey({
      ...QUERY,
      filterTree: {
        combinator: "and",
        conditions: [{ key: "n", op: "eq", value }],
      },
    });

  it("keys a bigint without serializing it, apart from its number twin", () => {
    expect(withValue(1n)).toBe(withValue(1n));
    expect(withValue(1n)).not.toBe(withValue(1));
    expect(withValue(Number.NaN)).not.toBe(withValue(null));
    expect(withValue(-0)).not.toBe(withValue(0));
  });

  it("counts an object operand by identity and never reads it", () => {
    const operand = new Proxy(
      {},
      {
        get() {
          throw new Error("must not be read");
        },
        ownKeys() {
          throw new Error("must not be listed");
        },
      }
    );
    expect(withValue(operand)).toBe(withValue(operand));
    expect(withValue(operand)).not.toBe(withValue({}));
  });
});
