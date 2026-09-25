import { describe, expect, it } from "vitest";

import { humanizeKey } from "./humanizeKey";

describe("humanizeKey", () => {
  it("humanizes a camelCase key", () => {
    expect(humanizeKey("hiredAt")).toBe("Hired At");
  });

  it("uses the last dot-path segment", () => {
    expect(humanizeKey("department.name")).toBe("Name");
  });

  it("splits snake_case and kebab-case", () => {
    expect(humanizeKey("first_name")).toBe("First Name");
    expect(humanizeKey("created-at")).toBe("Created At");
  });

  it("returns an empty string for an empty key", () => {
    expect(humanizeKey("")).toBe("");
  });
});
