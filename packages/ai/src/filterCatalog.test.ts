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
    expect(
      extrasFromAgentFilters([{ column: "team", value: ["Core"] }], catalog)
    ).toEqual({ team: ["Core"] });
    expect(
      extrasFromAgentFilters({ column: "team", value: "Core" }, catalog)
    ).toEqual({ team: ["Core"] });
    expect(
      extrasFromAgentFilters(
        [{ key: "team", op: "=", value: ["Core"] }],
        catalog
      )
    ).toEqual({ team: ["Core"] });
  });

  it("refuses what it cannot resolve, and names what it would take", () => {
    // A refusal that withholds the set leaves a caller guessing at something
    // the table could simply have shown it, which is how a turn ends up
    // asking the reader a question the table already knows the answer to.
    expect(() => extrasFromAgentFilters({ ghost: 1 }, catalog)).toThrow(
      /"ghost" is not a filter key on this table — it has: team, salary/
    );
    expect(() =>
      extrasFromAgentFilters({ salary: { gt: 10000 } }, catalog)
    ).toThrow(/not an object/);
    expect(() =>
      extrasFromAgentFilters({ salaryOp: "contains" }, catalog)
    ).toThrow(/"salary" takes one of: .*— not "contains"/);
    expect(() => extrasFromAgentFilters({ team: ["Ghost"] }, catalog)).toThrow(
      /"team" takes one of: Core, Platform, Data — not "Ghost"/
    );
    expect(() =>
      extrasFromAgentFilters([{ key: "ghost", op: "eq", value: "x" }], catalog)
    ).toThrow(/"ghost" is not a filter on this table — it has: team, salary/);
    expect(() =>
      extrasFromAgentFilters(
        [{ key: "salary", op: "contains", value: 1 }],
        catalog
      )
    ).toThrow(/"salary" takes one of: .*— not "contains"/);
    expect(() => extrasFromAgentFilters(["team"], catalog)).toThrow(
      /needs key and op/
    );
    expect(() => extrasFromAgentFilters("Core", catalog)).toThrow(
      /filter object/
    );
    expect(() => extrasFromAgentFilters({ team: true }, catalog)).not.toThrow();
  });

  it("resolves a published choice to the spelling the table uses", () => {
    // The value the rows hold is "Platform". Accepting "platform" and then
    // filtering on it would match nothing, so what lands is the catalog's own
    // spelling — resolution, not a relaxed comparison.
    expect(extrasFromAgentFilters({ team: "platform" }, catalog)).toEqual({
      team: "Platform",
    });
    expect(extrasFromAgentFilters({ team: ["  DATA "] }, catalog)).toEqual({
      team: ["Data"],
    });
    expect(
      extrasFromAgentFilters(
        [{ key: "Team", op: "in", value: "core" }],
        catalog
      )
    ).toEqual({ team: ["Core"] });
    expect(extrasFromAgentFilters({ TEAM: "Core" }, catalog)).toEqual({
      team: "Core",
    });
  });

  it("refuses a value two options could equally be", () => {
    // Two choices differing only in case is a real ambiguity: the table knows
    // they are distinct, so picking one for the caller would be a guess.
    const ambiguous = agentFiltersFromDefs(
      [
        {
          key: "state",
          type: "multiSelect" as const,
          label: "State",
          options: [
            { value: "Active", label: "Active" },
            { value: "active", label: "Lowercase active" },
          ],
        },
      ],
      undefined
    )!;
    expect(() =>
      extrasFromAgentFilters({ state: "ACTIVE" }, ambiguous)
    ).toThrow(/"state" takes one of: Active, active — not "ACTIVE"/);
    // Either one named exactly still lands, untouched.
    expect(extrasFromAgentFilters({ state: "active" }, ambiguous)).toEqual({
      state: "active",
    });
  });

  it("leaves a filter that published no options alone", () => {
    // A text filter offers no list, so there is nothing to resolve against
    // and whatever the caller wrote is what the host asked to receive.
    const open = agentFiltersFromDefs(
      [{ key: "note", type: "text", label: "Note" }],
      undefined
    )!;
    expect(extrasFromAgentFilters({ note: "  Mixed Case  " }, open)).toEqual({
      note: "  Mixed Case  ",
    });
  });

  it("resolves an operator written in another case", () => {
    expect(
      extrasFromAgentFilters({ salaryMin: 1, salaryOp: "GT" }, catalog)
    ).toEqual({ salaryMin: 1, salaryOp: "gt" });
  });

  it("takes the label a caller was shown as well as the value", () => {
    const labelled = agentFiltersFromDefs(
      [
        {
          key: "tier",
          type: "multiSelect" as const,
          label: "Tier",
          options: [{ value: "t1", label: "Gold" }],
        },
      ],
      undefined
    )!;
    expect(extrasFromAgentFilters({ tier: "gold" }, labelled)).toEqual({
      tier: "t1",
    });
  });

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

const TEAM_DEFAULT_OP =
  (agentFiltersFromDefs([TEAM, SALARY], undefined) ?? []).find(
    (entry) => entry.key === "team"
  )?.defaultOperator ?? "in";

describe("a condition list written the other ways a model writes one", () => {
  const catalog = agentFiltersFromDefs([TEAM, SALARY], undefined) ?? [];

  it("takes `column` where it takes `key`", () => {
    // Models reach for both words; the catalog decides which filter it is
    // either way rather than dropping the condition on a spelling.
    expect(
      extrasFromAgentFilters([{ column: "team", value: ["Core"] }], catalog)
    ).toEqual(
      extrasFromAgentFilters([{ key: "team", value: ["Core"] }], catalog)
    );
  });

  it("takes `values` where it takes `value`", () => {
    expect(
      extrasFromAgentFilters([{ key: "team", values: ["Core"] }], catalog)
    ).toEqual(
      extrasFromAgentFilters([{ key: "team", value: ["Core"] }], catalog)
    );
  });

  it("refuses a condition naming no filter at all", () => {
    // Said plainly: a condition the table cannot place is not a filter it can
    // quietly leave off.
    expect(() =>
      extrasFromAgentFilters([{ op: "in", value: ["Core"] }], catalog)
    ).toThrow(/needs key and op/);
  });

  it("refuses a condition naming a filter this table does not publish", () => {
    expect(() =>
      extrasFromAgentFilters([{ key: "nonesuch", value: 1 }], catalog)
    ).toThrow(/needs key and op/);
  });

  it("falls back to the filter's own default operator", () => {
    expect(
      extrasFromAgentFilters([{ key: "team", value: ["Core"] }], catalog)
    ).toEqual(
      extrasFromAgentFilters(
        [{ key: "team", op: TEAM_DEFAULT_OP, value: ["Core"] }],
        catalog
      )
    );
  });
});
