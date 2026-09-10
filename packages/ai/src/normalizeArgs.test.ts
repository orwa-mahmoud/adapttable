import { describe, expect, it } from "vitest";

import { normalizeCapabilityArgs } from "./normalizeArgs";

describe("normalizeCapabilityArgs", () => {
  it("rewrites column to key for sort, group and pin", () => {
    expect(
      normalizeCapabilityArgs("view.setSort", {
        column: "salary",
        dir: "desc",
      })
    ).toEqual({ key: "salary", dir: "desc" });
    expect(
      normalizeCapabilityArgs("view.setGroupBy", { column: "team" })
    ).toEqual({ key: "team" });
    expect(
      normalizeCapabilityArgs("view.pinColumn", { column: "person" })
    ).toEqual({ key: "person" });
  });

  it("rewrites sort / sortBy bags into key and dir", () => {
    expect(normalizeCapabilityArgs("view.setSort", { sort: "salary" })).toEqual(
      { key: "salary" }
    );
    expect(
      normalizeCapabilityArgs("view.setSort", {
        sort: { column: "salary", direction: "descending" },
      })
    ).toEqual({ key: "salary", dir: "desc" });
    expect(
      normalizeCapabilityArgs("view.setSort", {
        sortBy: "salary",
        sortDir: "desc",
      })
    ).toEqual({ key: "salary", dir: "desc" });
  });

  it("keeps a null key so clear-sort still validates", () => {
    expect(normalizeCapabilityArgs("view.setSort", { key: null })).toEqual({
      key: null,
    });
  });

  it("leaves a truly unknown property for the schema to reject", () => {
    expect(normalizeCapabilityArgs("view.setSort", { foo: "salary" })).toEqual({
      foo: "salary",
    });
  });
});
