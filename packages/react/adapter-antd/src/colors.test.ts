import { describe, expect, it } from "vitest";

import { isDangerColor } from "./colors";

describe("isDangerColor", () => {
  it("treats the common destructive color names as danger", () => {
    expect(isDangerColor("danger")).toBe(true);
    expect(isDangerColor("red")).toBe(true);
    expect(isDangerColor("error")).toBe(true);
  });

  it("leaves other tokens (and undefined) as not-danger", () => {
    expect(isDangerColor("primary")).toBe(false);
    expect(isDangerColor("blue")).toBe(false);
    expect(isDangerColor(undefined)).toBe(false);
  });
});
