/**
 * `filterTypes()` registers the specs and turns the option on.
 */
import type { FilterTypeSpec } from "@adapttable/core";
import { describe, expect, it } from "vitest";

import { featureOptionsOf } from "../featureHost";
import { filterTypes } from "./filters";

const SPEC = {
  type: "rating",
  label: "Rating",
} as unknown as FilterTypeSpec;

describe("filterTypes()", () => {
  it("carries the specs", () => {
    expect(featureOptionsOf([filterTypes([SPEC])])).toMatchObject({
      filterTypes: [SPEC],
    });
  });
});
