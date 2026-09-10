import { FILTER_AI_OPTIONS_LIMIT } from "@adapttable/core";
import { describe, expect, it } from "vitest";

import {
  agentFiltersFromDefs,
  extrasFromAgentFilters,
  formatFilterCatalog,
} from "./filterCatalog";

const TEAM = {
  key: "team",
  type: "multiSelect" as const,
  label: "Team",
  options: ["Core", "Platform", "Data"].map((team) => ({
    value: team,
    label: team,
  })),
};

const SALARY = {
  key: "salary",
  type: "numberRange" as const,
  label: "Salary",
};

describe("agentFiltersFromDefs", () => {
  it("returns undefined when the table has no declarative defs", () => {
    expect(agentFiltersFromDefs(undefined, undefined)).toBeUndefined();
    expect(agentFiltersFromDefs([], undefined)).toBeUndefined();
  });

  it("publishes type, operators and a small static list", () => {
    const catalog = agentFiltersFromDefs([TEAM, SALARY], undefined);
    expect(catalog).toEqual([
      {
        key: "team",
        label: "Team",
        type: "multiSelect",
        operators: ["in"],
        defaultOperator: "in",
        valueKeys: ["team"],
        options: TEAM.options,
      },
      {
        key: "salary",
        label: "Salary",
        type: "numberRange",
        operators: expect.arrayContaining(["gt", "between"]),
        defaultOperator: "gte",
        valueKeys: expect.arrayContaining([
          "salary",
          "salaryMin",
          "salaryMax",
          "salaryOp",
        ]),
      },
    ]);
  });

  it("hides a filter, omits a large list, and respects a custom cap", () => {
    const many = Array.from(
      { length: FILTER_AI_OPTIONS_LIMIT + 1 },
      (_, i) => ({
        value: `c${String(i)}`,
        label: `C${String(i)}`,
      })
    );
    const catalog = agentFiltersFromDefs(
      [
        { key: "secret", type: "text", ai: false },
        { key: "customer", type: "select", options: many },
        {
          key: "status",
          type: "select",
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
          ai: { options: 1 },
        },
        {
          key: "region",
          type: "select",
          options: [{ value: "eu", label: "EU" }],
          ai: { options: false },
        },
      ],
      undefined
    );
    expect(catalog?.map((filter) => filter.key)).toEqual([
      "customer",
      "status",
      "region",
    ]);
    expect(catalog?.[0]?.options).toBeUndefined();
    expect(catalog?.[0]?.optionsOmitted).toBe(true);
    expect(catalog?.[1]?.optionsOmitted).toBe(true);
    expect(catalog?.[2]?.options).toBeUndefined();
    expect(catalog?.[2]?.optionsOmitted).toBe(true);
  });

  it("uses the column id for policy and omits nothing on a valueless hide", () => {
    const catalog = agentFiltersFromDefs(
      [
        { key: "name", column: "person", type: "text", ai: { options: false } },
        { key: "empty", type: "select", options: [] },
        { key: "badCap", type: "text", ai: { options: Number.NaN } },
      ],
      undefined,
      { person: { readable: false } }
    );
    expect(catalog?.map((filter) => filter.key)).toEqual(["empty", "badCap"]);
    expect(catalog?.[0]).not.toHaveProperty("optionsOmitted");
    expect(catalog?.[1]?.optionsOmitted).toBeUndefined();
  });

  it("returns an empty catalog when every def is hidden", () => {
    expect(
      agentFiltersFromDefs(
        [{ key: "secret", type: "text", ai: false }],
        undefined
      )
    ).toEqual([]);
  });

  it("omits auto and async choices and unreadable columns", () => {
    const catalog = agentFiltersFromDefs(
      [
        { key: "city", type: "select", options: "auto" },
        {
          key: "tag",
          type: "select",
          options: () => Promise.resolve([{ value: "x", label: "X" }]),
        },
        { key: "salary", type: "numberRange" },
      ],
      undefined,
      { salary: { readable: false } }
    );
    expect(catalog?.map((filter) => filter.key)).toEqual(["city", "tag"]);
    expect(catalog?.every((filter) => filter.optionsOmitted)).toBe(true);
  });
});

describe("extrasFromAgentFilters", () => {
  const catalog = agentFiltersFromDefs([TEAM, SALARY], undefined);

  it("passes a host object through when there is no catalog", () => {
    expect(extrasFromAgentFilters({ team: ["Core"] }, undefined)).toEqual({
      team: ["Core"],
    });
    expect(() => extrasFromAgentFilters(["team"], undefined)).toThrow(
      /filter object/
    );
  });

  it("accepts extras and condition arrays against the catalog", () => {
    expect(
      extrasFromAgentFilters(
        { team: ["Core"], salaryMin: 10000, salaryOp: "gt" },
        catalog
      )
    ).toEqual({ team: ["Core"], salaryMin: 10000, salaryOp: "gt" });
    expect(
      extrasFromAgentFilters(
        [{ key: "salary", op: "gt", value: 10000 }],
        catalog
      )
    ).toEqual({ salaryMin: "10000", salaryOp: "gt" });
    expect(extrasFromAgentFilters({}, catalog)).toEqual({});
    expect(extrasFromAgentFilters(null, catalog)).toEqual({});
  });

  it("rejects unknown keys, operators and options", () => {
    expect(() => extrasFromAgentFilters({ ghost: 1 }, catalog)).toThrow(
      /not a visible filter/
    );
    expect(() =>
      extrasFromAgentFilters({ salary: { gt: 10000 } }, catalog)
    ).toThrow(/not an object/);
    expect(() =>
      extrasFromAgentFilters({ salaryOp: "contains" }, catalog)
    ).toThrow(/cannot use operator/);
    expect(() => extrasFromAgentFilters({ team: ["Ghost"] }, catalog)).toThrow(
      /does not accept option/
    );
    expect(() =>
      extrasFromAgentFilters([{ key: "ghost", op: "eq", value: "x" }], catalog)
    ).toThrow(/not a visible filter/);
    expect(() =>
      extrasFromAgentFilters(
        [{ key: "salary", op: "contains", value: 1 }],
        catalog
      )
    ).toThrow(/cannot use operator/);
    expect(() => extrasFromAgentFilters(["team"], catalog)).toThrow(
      /needs key and op/
    );
    expect(() => extrasFromAgentFilters("Core", catalog)).toThrow(
      /filter object/
    );
    expect(() => extrasFromAgentFilters({ team: true }, catalog)).not.toThrow();
    expect(() =>
      extrasFromAgentFilters({ salaryMin: () => 1 }, catalog)
    ).toThrow(/not function/);
    expect(() =>
      extrasFromAgentFilters(
        [{ key: "team", op: "in", value: "Ghost" }],
        catalog
      )
    ).toThrow(/does not accept option/);
  });
});

describe("formatFilterCatalog", () => {
  it("names the untyped, empty and listed cases", () => {
    expect(formatFilterCatalog(undefined)).toContain("has not published");
    expect(formatFilterCatalog([])).toContain("No filters are visible");
    const catalog = agentFiltersFromDefs([TEAM], undefined);
    expect(formatFilterCatalog(catalog)).toContain("team [");
    expect(formatFilterCatalog(catalog)).toContain(
      "options: Core, Platform, Data"
    );
    const omitted = agentFiltersFromDefs(
      [
        {
          key: "region",
          type: "select",
          options: [{ value: "eu", label: "EU" }],
          ai: { options: false },
        },
      ],
      undefined
    );
    expect(formatFilterCatalog(omitted)).toContain("options omitted");
  });
});
