import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../types";
import { resetDevWarnings } from "../utils/devWarn";
import {
  buildFilterRuntime,
  clearedFilterExtras,
  type FilterDef,
  filterLabel,
  filterPredicate,
  filterStateKeys,
  resolveFilterDefs,
} from "./filterDefs";

interface Row {
  name: string;
  status: string;
  budget: number;
  hiredAt: string;
  department: { name: string };
}

const ROW: Row = {
  name: "Alice",
  status: "active",
  budget: 1200,
  hiredAt: "2026-03-10",
  department: { name: "Core" },
};

describe("filterStateKeys", () => {
  it("single key for scalar types, suffixed pairs for ranges", () => {
    expect(filterStateKeys({ key: "status", type: "select" })).toEqual([
      "status",
    ]);
    expect(filterStateKeys({ key: "hiredAt", type: "dateRange" })).toEqual([
      "hiredAtFrom",
      "hiredAtTo",
    ]);
    expect(filterStateKeys({ key: "budget", type: "numberRange" })).toEqual([
      "budgetMin",
      "budgetMax",
    ]);
  });
});

describe("resolveFilterDefs", () => {
  beforeEach(() => resetDevWarnings());

  const columns: ColumnDef<Row>[] = [
    { key: "name", header: "Name" },
    { key: "status", header: "Status", filter: "select" },
    {
      key: "budget",
      header: "Budget",
      filter: { type: "numberRange" },
    },
  ];

  it("merges column shorthands (inheriting the header as label) with standalone defs", () => {
    const defs = resolveFilterDefs(columns, [
      { key: "companyId", type: "select", label: "Company" },
    ]);
    expect(defs.map((d) => d.key)).toEqual(["status", "budget", "companyId"]);
    expect(defs[0]).toMatchObject({ type: "select", label: "Status" });
    expect(defs[1]).toMatchObject({ type: "numberRange", label: "Budget" });
  });

  it("standalone defs win on key collision, with a dev warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const defs = resolveFilterDefs(columns, [
      { key: "status", type: "multiSelect", label: "State" },
    ]);
    expect(defs.filter((d) => d.key === "status")).toHaveLength(1);
    expect(defs.find((d) => d.key === "status")).toMatchObject({
      type: "multiSelect",
      label: "State",
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('column "status" declares a filter')
    );
    warn.mockRestore();
  });

  it("filters-only usage (no column declares a filter) is first-class", () => {
    const bare: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];
    const defs = resolveFilterDefs(bare, [{ key: "status", type: "select" }]);
    expect(defs).toHaveLength(1);
  });

  it("a non-string column header falls back to the humanized key as label", () => {
    const defs = resolveFilterDefs(
      [{ key: "hiredAt", header: undefined, filter: "dateRange" }],
      undefined
    );
    expect(filterLabel(defs[0]!)).toBe("Hired At");
  });
});

describe("filterPredicate", () => {
  it("text: a null row value never matches an active term", () => {
    const p = filterPredicate<Row>({
      key: "nick",
      type: "text",
      getValue: () => null,
    });
    expect(p(ROW, { nick: "x" })).toBe(false);
    expect(p(ROW, {})).toBe(true);
  });

  it("text: case-insensitive contains; inactive filter matches all", () => {
    const p = filterPredicate<Row>({ key: "name", type: "text" });
    expect(p(ROW, {})).toBe(true);
    expect(p(ROW, { name: "ali" })).toBe(true);
    expect(p(ROW, { name: "zzz" })).toBe(false);
  });

  it("select: strict value match", () => {
    const p = filterPredicate<Row>({ key: "status", type: "select" });
    expect(p(ROW, { status: "active" })).toBe(true);
    expect(p(ROW, { status: "blocked" })).toBe(false);
  });

  it("multiSelect: membership, tolerating a scalar value from the URL", () => {
    const p = filterPredicate<Row>({ key: "status", type: "multiSelect" });
    expect(p(ROW, { status: ["active", "planned"] })).toBe(true);
    expect(p(ROW, { status: ["blocked"] })).toBe(false);
    expect(p(ROW, { status: "active" })).toBe(true);
    expect(p(ROW, { status: [] })).toBe(true);
  });

  it("dateRange: inclusive bounds with end-of-day on the upper edge", () => {
    const p = filterPredicate<Row>({ key: "hiredAt", type: "dateRange" });
    expect(p(ROW, {})).toBe(true);
    expect(p(ROW, { hiredAtFrom: "2026-03-01" })).toBe(true);
    expect(p(ROW, { hiredAtFrom: "2026-04-01" })).toBe(false);
    // Same-day upper bound keeps that day's rows.
    expect(p(ROW, { hiredAtTo: "2026-03-10" })).toBe(true);
    expect(p(ROW, { hiredAtTo: "2026-03-09" })).toBe(false);
    expect(p(ROW, { hiredAtFrom: "2026-03-01", hiredAtTo: "2026-03-31" })).toBe(
      true
    );
  });

  it("dateRange: an unparsable row date never matches an active range", () => {
    const p = filterPredicate<Row>({ key: "hiredAt", type: "dateRange" });
    const bad = { ...ROW, hiredAt: "not-a-date" };
    expect(p(bad, { hiredAtFrom: "2026-01-01" })).toBe(false);
  });

  it("dateRange: matches Date objects, epoch numbers and datetime strings", () => {
    interface Stamped {
      hiredAt: Date | number | string;
    }
    const p = filterPredicate<Stamped>({ key: "hiredAt", type: "dateRange" });
    const range = { hiredAtFrom: "2026-03-01", hiredAtTo: "2026-03-31" };
    // The same instant in three shapes — all must land inside the range.
    const instant = new Date(2026, 2, 10, 14, 30);
    expect(p({ hiredAt: instant }, range)).toBe(true);
    expect(p({ hiredAt: instant.getTime() }, range)).toBe(true);
    expect(p({ hiredAt: "2026-03-10T14:30:00" }, range)).toBe(true);
    // And the same three shapes outside it are all excluded.
    const outside = new Date(2026, 3, 2);
    expect(p({ hiredAt: outside }, range)).toBe(false);
    expect(p({ hiredAt: outside.getTime() }, range)).toBe(false);
    expect(p({ hiredAt: "2026-04-02T00:00:00" }, range)).toBe(false);
  });

  it("dateRange: boundary-day rows survive in UTC+4 and UTC-8 alike", () => {
    const originalTZ = process.env.TZ;
    const inTZ = (tz: string, run: () => void) => {
      process.env.TZ = tz;
      try {
        run();
      } finally {
        process.env.TZ = originalTZ;
      }
    };
    const p = filterPredicate<{ hiredAt: Date | string }>({
      key: "hiredAt",
      type: "dateRange",
    });
    for (const tz of ["Asia/Dubai", "America/Los_Angeles"]) {
      inTZ(tz, () => {
        // Early morning and late night of the boundary days, as a local
        // Date and as a local-naive datetime string.
        const early = new Date(2026, 0, 1, 2, 0);
        const late = new Date(2026, 0, 31, 23, 30);
        const range = { hiredAtFrom: "2026-01-01", hiredAtTo: "2026-01-31" };
        expect(p({ hiredAt: early }, range)).toBe(true);
        expect(p({ hiredAt: late }, range)).toBe(true);
        expect(p({ hiredAt: "2026-01-01T02:00:00" }, range)).toBe(true);
        expect(p({ hiredAt: "2026-01-31T23:30:00" }, range)).toBe(true);
        // Just past either edge stays out.
        expect(p({ hiredAt: new Date(2025, 11, 31, 23, 59) }, range)).toBe(
          false
        );
        expect(p({ hiredAt: new Date(2026, 1, 1, 0, 0) }, range)).toBe(false);
      });
    }
  });

  it("dateRange: inclusivity at both ends — exact datetime bounds included", () => {
    const p = filterPredicate<{ hiredAt: Date }>({
      key: "hiredAt",
      type: "dateRange",
    });
    const at = (h: number, m: number) => new Date(2026, 2, 10, h, m);
    // A datetime "to" bound is inclusive exactly, without end-of-day padding.
    const exact = {
      hiredAtFrom: "2026-03-10T09:00:00",
      hiredAtTo: "2026-03-10T17:00:00",
    };
    expect(p({ hiredAt: at(9, 0) }, exact)).toBe(true);
    expect(p({ hiredAt: at(17, 0) }, exact)).toBe(true);
    expect(p({ hiredAt: at(8, 59) }, exact)).toBe(false);
    expect(p({ hiredAt: at(17, 1) }, exact)).toBe(false);
  });

  it("numberRange: min/max bounds; NaN row values never match", () => {
    const p = filterPredicate<Row>({ key: "budget", type: "numberRange" });
    expect(p(ROW, {})).toBe(true);
    expect(p(ROW, { budgetMin: 1000 })).toBe(true);
    expect(p(ROW, { budgetMin: 1500 })).toBe(false);
    expect(p(ROW, { budgetMax: 1200 })).toBe(true);
    expect(p(ROW, { budgetMax: 1000 })).toBe(false);
    const bad = { ...ROW, budget: Number.NaN };
    expect(p(bad, { budgetMin: 1 })).toBe(false);
  });

  it("compares primitive row values of every type as text", () => {
    const of = (v: unknown) =>
      filterPredicate<Row>({ key: "k", type: "text", getValue: () => v });
    expect(of(42)(ROW, { k: "4" })).toBe(true);
    expect(of(true)(ROW, { k: "tru" })).toBe(true);
    expect(of(10n)(ROW, { k: "10" })).toBe(true);
    // Non-primitives never match an active filter.
    expect(of({ nested: 1 })(ROW, { k: "nested" })).toBe(false);
    const selectOn = filterPredicate<Row>({
      key: "k",
      type: "select",
      getValue: () => 7,
    });
    expect(selectOn(ROW, { k: 7 })).toBe(true);
  });

  it("reads nested values via dot paths and honors getValue overrides", () => {
    const byPath = filterPredicate<Row>({
      key: "department.name",
      type: "select",
    });
    expect(byPath(ROW, { "department.name": "Core" })).toBe(true);
    const byGetter = filterPredicate<Row>({
      key: "dept",
      type: "select",
      getValue: (r) => r.department.name,
    });
    expect(byGetter(ROW, { dept: "Core" })).toBe(true);
    expect(byGetter(ROW, { dept: "Web" })).toBe(false);
  });
});

describe("buildFilterRuntime", () => {
  const defs: FilterDef<Row>[] = [
    { key: "name", type: "text", label: "Name" },
    {
      key: "status",
      type: "multiSelect",
      label: "Status",
      options: [{ value: "active", label: "Active" }],
    },
    { key: "team", type: "select", options: [{ value: "c", label: "Core" }] },
    { key: "hiredAt", type: "dateRange", label: "Hired" },
    { key: "budget", type: "numberRange", label: "Budget" },
  ];
  const runtime = buildFilterRuntime(defs);

  it("registers array and number keys for URL parsing", () => {
    expect(runtime.arrayExtraKeys).toEqual(["status"]);
    expect(runtime.numberExtraKeys).toEqual(["budgetMin", "budgetMax"]);
  });

  it("labels chips per state key, mapping option values to labels", () => {
    expect(runtime.filterLabels.name!("ali")).toBe("Name: ali");
    expect(runtime.filterLabels.status!("active")).toBe("Status: Active");
    expect(runtime.filterLabels.team!("c")).toBe("Team: Core");
    expect(runtime.filterLabels.team!("unknown")).toBe("Team: unknown");
    expect(runtime.filterLabels.hiredAtFrom!("2026-01-01")).toBe(
      "Hired ≥ 2026-01-01"
    );
    expect(runtime.filterLabels.hiredAtTo!("2026-12-31")).toBe(
      "Hired ≤ 2026-12-31"
    );
    expect(runtime.filterLabels.budgetMin!("5")).toBe("Budget ≥ 5");
    expect(runtime.filterLabels.budgetMax!("9")).toBe("Budget ≤ 9");
  });

  it("AND-composes every predicate", () => {
    expect(runtime.filterFn(ROW, {})).toBe(true);
    expect(runtime.filterFn(ROW, { name: "ali", budgetMin: 1000 })).toBe(true);
    expect(runtime.filterFn(ROW, { name: "ali", budgetMin: 9999 })).toBe(false);
  });

  it("clearedFilterExtras blanks every owned state key", () => {
    expect(clearedFilterExtras(defs)).toEqual({
      name: undefined,
      status: undefined,
      team: undefined,
      hiredAtFrom: undefined,
      hiredAtTo: undefined,
      budgetMin: undefined,
      budgetMax: undefined,
    });
  });
});

describe("i18n-aware column filters", () => {
  interface LRow {
    statusEn: string;
    statusAr: string;
  }
  const ROW_L: LRow = { statusEn: "active", statusAr: "نشط" };

  it("a localized column's filter matches the locale-resolved value", () => {
    const defs = resolveFilterDefs<LRow>(
      [
        {
          key: "statusEn",
          i18n: { ar: "statusAr" },
          filter: "select",
        },
      ],
      undefined,
      "ar"
    );
    const p = filterPredicate(defs[0]!);
    expect(p(ROW_L, { statusEn: "نشط" })).toBe(true);
    expect(p(ROW_L, { statusEn: "active" })).toBe(false);
  });

  it("a shorthand with its own getValue keeps it", () => {
    const defs = resolveFilterDefs<LRow>(
      [
        {
          key: "statusEn",
          i18n: { ar: "statusAr" },
          filter: { type: "select", getValue: () => "custom" },
        },
      ],
      undefined,
      "ar"
    );
    const p = filterPredicate(defs[0]!);
    expect(p(ROW_L, { statusEn: "custom" })).toBe(true);
  });
});
