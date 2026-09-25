import { describe, expect, it } from "vitest";

import { errorMessage } from "./errorMessage";

describe("errorMessage", () => {
  it("reads Error.message and stringifies any other value", () => {
    expect(errorMessage(new Error("nope"))).toBe("nope");
    expect(errorMessage("nope")).toBe("nope");
    expect(errorMessage(4)).toBe("4");
  });
});
