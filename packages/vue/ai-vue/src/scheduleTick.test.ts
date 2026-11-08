import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import { scheduleTick } from "./scheduleTick";

describe("scheduleTick", () => {
  it("runs the work after Vue flushes", async () => {
    let ran = false;
    scheduleTick(() => {
      ran = true;
    });
    expect(ran).toBe(false);
    await nextTick();
    expect(ran).toBe(true);
  });
});
