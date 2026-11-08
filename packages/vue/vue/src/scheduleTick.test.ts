import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import { scheduleTick, tickFailure } from "./scheduleTick";

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

describe("tickFailure", () => {
  it("rethrows an error as itself", () => {
    const error = new Error("focus target gone");
    expect(tickFailure(error)).toBe(error);
  });

  it("wraps a thrown non-error value", () => {
    const failure = tickFailure("detached");
    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toBe("detached");
  });
});
