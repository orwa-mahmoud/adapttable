/**
 * `findInTable()` is the option a table reads to build the live find state.
 */
import { describe, expect, it } from "vitest";

import { featureOptionsOf } from "../featureHost";
import { findInTable } from "./findInTable";

describe("findInTable()", () => {
  it("turns the find bar on", () => {
    expect(featureOptionsOf([findInTable()])).toMatchObject({
      findInTable: true,
    });
  });
});
