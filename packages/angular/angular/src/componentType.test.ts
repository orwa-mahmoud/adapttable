import { Component } from "@angular/core";
import { describe, expect, it } from "vitest";

import { isComponentType } from "./componentType";

@Component({ template: "" })
class Panel {}

describe("isComponentType", () => {
  it("takes a compiled component", () => {
    expect(isComponentType(Panel)).toBe(true);
  });

  it("refuses a plain function, text and nothing", () => {
    expect(isComponentType(() => "text")).toBe(false);
    expect(isComponentType("Panel")).toBe(false);
    expect(isComponentType(undefined)).toBe(false);
  });
});
