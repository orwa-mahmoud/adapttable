import type { Options } from "@popperjs/core";
import { describe, expect, it } from "vitest";

import { bootstrapPopperOptions } from "./bootstrapPositioning";

describe("native dropdown viewport positioning", () => {
  it("keeps native modifiers and placements while using fixed, nonadaptive coordinates", () => {
    const offset = { name: "offset", options: { offset: [0, 2] } };
    const options: Partial<Options> = {
      placement: "bottom-end",
      modifiers: [offset],
    };
    const positioned = bootstrapPopperOptions(options);
    expect(positioned.strategy).toBe("fixed");
    expect(positioned.placement).toBe("bottom-end");
    expect(positioned.modifiers).toEqual([
      offset,
      { name: "computeStyles", options: { adaptive: false } },
    ]);
    expect(options.modifiers).toEqual([offset]);
    expect(bootstrapPopperOptions({}).modifiers).toEqual([
      { name: "computeStyles", options: { adaptive: false } },
    ]);
  });
});
