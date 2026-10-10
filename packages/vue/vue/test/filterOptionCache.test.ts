import { expect, it, vi } from "vitest";

import { createFilterOptionCache } from "../src/layout/filterOptionCache";
it("keeps unchanged loaders, honors explicit defs and evicts removed column shorthands", () => {
  const cache = createFilterOptionCache<unknown>();
  const column = vi.fn(() => Promise.resolve([]));
  const override = vi.fn(() => Promise.resolve([]));
  const cached = vi.fn(() => Promise.resolve([]));
  const first = cache.reconcile(
    [
      { key: "x", filter: { type: "select", options: column } },
      { key: "text", filter: "text" },
      { key: "null", filter: null },
      { key: "plain", filter: {} },
      { key: "static", filter: { options: [] } },
    ],
    []
  );
  first.set("x", cached);
  expect(
    cache.reconcile([{ key: "x", filter: { options: column } }], []).get("x")
  ).toBe(cached);
  expect(
    cache
      .reconcile(
        [{ key: "x", filter: { options: column } }],
        [{ key: "x", type: "select", options: override }]
      )
      .has("x")
  ).toBe(false);
  first.set("x", cached);
  expect(
    cache
      .reconcile([], [{ key: "x", type: "select", options: override }])
      .get("x")
  ).toBe(cached);
  expect(
    cache.reconcile([], [{ key: "x", type: "select", options: [] }]).size
  ).toBe(0);
  first.set("x", cached);
  cache.clear();
  expect(first.size).toBe(0);
});
