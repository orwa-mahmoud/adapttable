import { describe, expect, it } from "vitest";

import { readExtra } from "../url/serialize";
import { defaultFilterRegistry } from "./filterBuiltins";
import { serverFilterKeys } from "./serverFilterKeys";

interface Deal {
  id: string;
  stage: string;
  owner: string;
  budget: number;
}

describe("serverFilterKeys", () => {
  it("derives list, number and counted keys from column shorthands", () => {
    const keys = serverFilterKeys<Deal>({
      columns: [
        { key: "stage", filter: "checklist" },
        { key: "owner", filter: "multiSelect" },
        { key: "budget", filter: "numberRange" },
        { key: "id" },
      ],
    });
    expect(keys.arrayExtraKeys).toEqual(["stage", "owner", "budget"]);
    expect(keys.numberExtraKeys).toEqual(["budgetMin", "budgetMax"]);
    expect(keys.facetKeys).toEqual(["stage"]);
  });

  it("lets a declared filter replace the column's shorthand", () => {
    const keys = serverFilterKeys<Deal>({
      columns: [{ key: "stage", filter: "checklist" }],
      filters: [{ key: "stage", type: "select" }],
    });
    expect(keys).toEqual({
      arrayExtraKeys: [],
      numberExtraKeys: [],
      facetKeys: [],
    });
  });

  it("reads a host filter type the table is given", () => {
    const keys = serverFilterKeys<Deal>({
      columns: [{ key: "owner", filter: "people" }],
      filterTypes: [
        { ...defaultFilterRegistry.get("checklist")!, type: "people" },
      ],
    });
    expect(keys.arrayExtraKeys).toEqual(["owner"]);
    expect(keys.facetKeys).toEqual(["owner"]);
  });

  it("types a range and a list restored from the URL", () => {
    const keys = serverFilterKeys<Deal>({
      columns: [
        { key: "stage", filter: "checklist" },
        { key: "budget", filter: "numberRange" },
      ],
    });
    const extra = readExtra(
      new URLSearchParams("f_stage=won,lost&f_budgetMin=500"),
      keys.numberExtraKeys,
      keys.arrayExtraKeys
    );
    expect(extra).toEqual({
      stage: ["won", "lost"],
      budgetMin: 500,
    });
  });
});
