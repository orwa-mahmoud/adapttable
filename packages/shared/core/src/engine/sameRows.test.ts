import { describe, expect, it } from "vitest";

import { sameRows } from "./sameRows";

describe("sameRows", () => {
  const a = { id: 1 };
  const b = { id: 2 };

  it("compares rows by identity", () => {
    expect(sameRows([a, b], [a, b])).toBe(true);
    expect(sameRows([a, b], [a, { id: 2 }])).toBe(false);
  });
});
