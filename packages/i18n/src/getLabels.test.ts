import { localizedColumnPath } from "@adapttable/core";
import { describe, expect, it } from "vitest";

import { getDirection } from "./direction";
import { getLabels, hasLocale, locales } from "./getLabels";
import { ar } from "./locales/ar";
import { de } from "./locales/de";
import { en } from "./locales/en";
import { fa } from "./locales/fa";
import { he } from "./locales/he";
import { ko } from "./locales/ko";
import { ur } from "./locales/ur";
import { zh } from "./locales/zh";
import { zhTW } from "./locales/zh-TW";

describe("getLabels", () => {
  it("returns the English preset for en", () => {
    expect(getLabels("en")).toBe(en);
    expect(getLabels("en-US")).toBe(en);
  });

  it("returns the Arabic preset for ar and its variants", () => {
    expect(getLabels("ar")).toBe(ar);
    expect(getLabels("ar-EG")).toBe(ar);
  });

  it("resolves the other bundled locales by primary subtag", () => {
    expect(getLabels("de-AT")).toBe(de);
    expect(getLabels("zh-CN")).toBe(zh);
    expect(getLabels("he-IL")).toBe(he);
    expect(getLabels("ko-KR")).toBe(ko);
  });

  it("prefers an exact regional tag over the primary subtag", () => {
    expect(getLabels("zh-TW")).toBe(zhTW);
    expect(getLabels("zh-tw")).toBe(zhTW);
    expect(getLabels("zh_TW")).toBe(zhTW);
  });

  it("falls back to English for unbundled locales", () => {
    expect(getLabels("sv")).toBe(en);
    expect(getLabels("zz-ZZ")).toBe(en);
  });
});

describe("hasLocale", () => {
  it("reports bundled locales", () => {
    expect(hasLocale("ar-EG")).toBe(true);
    expect(hasLocale("en")).toBe(true);
    expect(hasLocale("de")).toBe(true);
    expect(hasLocale("ja")).toBe(true);
    expect(hasLocale("ko")).toBe(true);
    expect(hasLocale("zh-TW")).toBe(true);
    expect(hasLocale("fa")).toBe(true);
    expect(hasLocale("ur")).toBe(true);
    expect(hasLocale("sv")).toBe(false);
  });
});

describe("new locales direction", () => {
  it("marks fa and ur as rtl", () => {
    expect(getDirection("fa")).toBe("rtl");
    expect(getDirection("fa-IR")).toBe("rtl");
    expect(getDirection("ur")).toBe("rtl");
    expect(getDirection("ur-PK")).toBe("rtl");
  });

  it("marks the new LTR locales as ltr", () => {
    expect(getDirection("ko")).toBe("ltr");
    expect(getDirection("ru")).toBe("ltr");
    expect(getDirection("tr")).toBe("ltr");
    expect(getDirection("hi")).toBe("ltr");
    expect(getDirection("zh-TW")).toBe("ltr");
  });
});

describe("presets", () => {
  const cmp = (a: string, b: string) => a.localeCompare(b);
  const enKeys = Object.keys(en).sort(cmp);

  it("bundles 17 locales", () => {
    expect(Object.keys(locales)).toHaveLength(17);
  });

  it("exposes the new presets", () => {
    expect(locales.ko).toBe(ko);
    expect(locales.fa).toBe(fa);
    expect(locales.ur).toBe(ur);
    expect(locales["zh-TW"]).toBe(zhTW);
  });

  it("every locale has exactly the English key set", () => {
    for (const [key, preset] of Object.entries(locales)) {
      expect({ key, keys: Object.keys(preset).sort(cmp) }).toEqual({
        key,
        keys: enKeys,
      });
    }
  });

  it("all label builders produce non-empty strings in every locale", () => {
    for (const preset of Object.values(locales)) {
      expect(preset.selectedCount(3).length).toBeGreaterThan(0);
      expect(
        preset.showing({ from: 1, to: 10, total: 50 }).length
      ).toBeGreaterThan(0);
      expect(preset.pageOf({ page: 2, total: 5 }).length).toBeGreaterThan(0);
      expect(preset.goToPage(2).length).toBeGreaterThan(0);
    }
  });
});

/**
 * A label function as this file calls it. The return widens to include
 * `undefined` because a headline label may legitimately have no sentence for
 * a pair it was not given one for, and falls back rather than inventing one.
 */
type AnyLabelFn = (...args: never[]) => string | undefined;

/** How to invoke each function label with distinguishable arguments. */
const INTERPOLATION_CASES: Record<
  string,
  { call: (fn: AnyLabelFn) => string; expects: readonly string[] }
> = {
  /**
   * The badge turns a status token into the reader's language, so the token
   * must NOT survive into the output — the opposite of every other case here.
   * What is asserted instead is that each token maps to something, and that
   * an unknown one still yields a real word rather than leaking itself.
   */
  assistantConnection: {
    call: (fn) => (fn as (status: string) => string)("connecting"),
    expects: [],
  },
  /**
   * A capability key is technical identity and appears as given; the status
   * beside it is translated, so only the key is expected here.
   */
  assistantReceipt: {
    call: (fn) =>
      (fn as (r: { capability?: string; status: string }) => string)({
        capability: "view.pinColumn",
        status: "staged",
      }),
    expects: ["view.pinColumn"],
  },
  /**
   * Like the badge above, a receipt's headline translates its tokens rather
   * than repeating them, so neither `kind` nor `status` survives into the
   * output. It may also decline a pair it has no sentence for, which is why
   * the assertions below cover both the known and the unknown case.
   */
  assistantReceiptStatus: {
    call: (fn) => (fn as (status: string) => string)("staged"),
    expects: [],
  },
  assistantReceiptAction: {
    call: (fn) =>
      (fn as (a: { kind?: string; status: string }) => string | undefined)({
        kind: "filter",
        status: "executed",
      }) ?? "",
    expects: [],
  },
  assistantReceiptTerms: {
    call: (fn) =>
      (
        fn as (subject: {
          kind?: string;
          terms?: readonly { column?: string; value?: string }[];
          direction?: "asc" | "desc";
        }) => string | undefined
      )({
        kind: "filter",
        terms: [{ column: "COLUMN_X", value: "VALUE_X" }],
      }) ?? "",
    expects: ["COLUMN_X", "VALUE_X"],
  },
  // A token these turn into a sentence, not a value they interpolate: a
  // translation that quoted the token back would be showing a reader a code.
  assistantUndoBlocked: {
    call: (fn) =>
      (fn as (code: string) => string | undefined)("table-moved") ?? "",
    expects: [],
  },
  assistantCapabilityName: {
    call: (fn) =>
      (fn as (capability: string) => string | undefined)("edit.cells") ?? "",
    expects: [],
  },
  // This one does interpolate: the capability's own name, in this language.
  assistantAlwaysAllowedRevoke: {
    call: (fn) => (fn as (capability: string) => string)("edit.cells"),
    expects: [],
  },
  assistantReceiptChange: {
    call: (fn) =>
      (fn as (c: { before: string; after: string }) => string)({
        before: "BEFORE_X",
        after: "AFTER_X",
      }),
    expects: ["BEFORE_X", "AFTER_X"],
  },
  assistantReceiptProposed: {
    call: (fn) =>
      (fn as (c: { before: string; after: string }) => string)({
        before: "BEFORE_X",
        after: "AFTER_X",
      }),
    expects: ["BEFORE_X", "AFTER_X"],
  },
  showing: {
    call: (fn) =>
      (fn as (a: { from: number; to: number; total: number }) => string)({
        from: 31,
        to: 47,
        total: 953,
      }),
    expects: ["31", "47", "953"],
  },
  pageOf: {
    call: (fn) =>
      (fn as (a: { page: number; total: number }) => string)({
        page: 31,
        total: 953,
      }),
    expects: ["31", "953"],
  },
  removeFilter: {
    call: (fn) => (fn as (label: string) => string)("STATUS_X"),
    expects: ["STATUS_X"],
  },
  columnRenamed: {
    call: (fn) =>
      (fn as (info: { previous: string; name: string }) => string)({
        previous: "COLUMN_OLD",
        name: "COLUMN_NEW",
      }),
    expects: ["COLUMN_OLD", "COLUMN_NEW"],
  },
  sortedBy: {
    // Only the column can be asserted by substring: the direction word is the
    // part each locale translates, so it differs by design. That it BRANCHES on
    // `ascending` is checked separately below.
    call: (fn) =>
      (fn as (a: { column: string; ascending: boolean }) => string)({
        column: "COLUMN_X",
        ascending: true,
      }),
    expects: ["COLUMN_X"],
  },
  gridRangeSelection: {
    // Distinguishable values per edge: a translation that drops any one of them
    // — easy to do when four numbers read alike — fails here.
    call: (fn) =>
      (
        fn as (a: {
          fromRow: number;
          toRow: number;
          fromColumn: number;
          toColumn: number;
          cells: number;
        }) => string
      )({ fromRow: 31, toRow: 47, fromColumn: 53, toColumn: 59, cells: 953 }),
    expects: ["31", "47", "53", "59", "953"],
  },
  findMatchCount: {
    // Both halves: the count while walking hits, and the empty case every
    // locale words differently ("No matches", "Aucun résultat", …).
    call: (fn) => {
      const count = fn as (current: number, total: number) => string;
      const empty = count(1, 0);
      expect(empty.length).toBeGreaterThan(0);
      return count(31, 47);
    },
    expects: ["31", "47"],
  },
  exportFile: {
    // The file format, so every locale's button names what it downloads. Upper
    // case because that is how a format is written on a button in every one of
    // them — "Export XLSX", never "Export xlsx".
    call: (fn) => (fn as (format: string) => string)("xlsx"),
    expects: ["XLSX"],
  },
  confirmRowMoveDescription: {
    call: (fn) =>
      (fn as (row: string, from: string, to: string) => string)(
        "ROW_X",
        "SOURCE_X",
        "TARGET_X"
      ),
    expects: ["ROW_X", "SOURCE_X", "TARGET_X"],
  },
  rowMovedToGroup: {
    call: (fn) => (fn as (group: string) => string)("GROUP_X"),
    expects: ["GROUP_X"],
  },
  rowMovedUnder: {
    call: (fn) => (fn as (parent: string) => string)("PARENT_X"),
    expects: ["PARENT_X"],
  },
  groupByColumn: {
    call: (fn) => (fn as (label: string) => string)("COLUMN_X"),
    expects: ["COLUMN_X"],
  },
  ungroupColumn: {
    call: (fn) => (fn as (label: string) => string)("COLUMN_X"),
    expects: ["COLUMN_X"],
  },
  removeGroupingColumn: {
    call: (fn) => (fn as (label: string) => string)("COLUMN_X"),
    expects: ["COLUMN_X"],
  },
  moveGroupingColumn: {
    call: (fn) => (fn as (label: string) => string)("COLUMN_X"),
    expects: ["COLUMN_X"],
  },
  groupingAdded: {
    call: (fn) => (fn as (label: string) => string)("COLUMN_X"),
    expects: ["COLUMN_X"],
  },
  groupingRemoved: {
    call: (fn) => (fn as (label: string) => string)("COLUMN_X"),
    expects: ["COLUMN_X"],
  },
  groupingMoved: {
    call: (fn) =>
      (fn as (label: string, position: number) => string)("COLUMN_X", 47),
    expects: ["COLUMN_X", "47"],
  },
  groupingAggregateChanged: {
    call: (fn) =>
      (fn as (label: string, aggregation: string) => string)(
        "COLUMN_X",
        "AGGREGATION_X"
      ),
    expects: ["COLUMN_X", "AGGREGATION_X"],
  },
  groupingRemoveAggregation: {
    call: (fn) => (fn as (column: string) => string)("COLUMN_X"),
    expects: ["COLUMN_X"],
  },
  groupingAggregationFor: {
    call: (fn) => (fn as (column: string) => string)("COLUMN_X"),
    expects: ["COLUMN_X"],
  },
  groupingAggregateRemoved: {
    call: (fn) => (fn as (column: string) => string)("COLUMN_X"),
    expects: ["COLUMN_X"],
  },
  proposalChange: {
    call: (fn) =>
      (
        fn as (change: {
          row: string;
          column?: string;
          before?: string;
          after?: string;
        }) => string
      )({
        row: "ROW_X",
        column: "COLUMN_X",
        before: "BEFORE_X",
        after: "AFTER_X",
      }),
    expects: ["ROW_X", "COLUMN_X", "BEFORE_X", "AFTER_X"],
  },
  proposalSummary: {
    call: (fn) =>
      (fn as (counts: { changes: number; rows: number }) => string)({
        changes: 42,
        rows: 7,
      }),
    // Distinct numbers, so a translation that prints the change count where
    // the row count belongs is caught rather than passing on symmetry.
    expects: ["42", "7"],
  },
  proposalTally: {
    call: (fn) =>
      (
        fn as (counts: {
          pending: number;
          approved: number;
          rejected: number;
        }) => string
      )({ pending: 42, approved: 7, rejected: 13 }),
    expects: ["42", "7", "13"],
  },
};

const NUMERIC_CASE = {
  call: (fn: AnyLabelFn) => (fn as (n: number) => string)(42),
  expects: ["42"] as readonly string[],
};

it("every function label in every locale interpolates ALL its arguments", () => {
  // Distinguishable values per argument: a translation that drops any one
  // of them fails here (the old check only looked for a single number).
  for (const [tag, labels] of Object.entries(locales)) {
    for (const [key, value] of Object.entries(labels)) {
      if (typeof value !== "function") continue;
      const spec = INTERPOLATION_CASES[key] ?? NUMERIC_CASE;
      const out = spec.call(value) ?? "";
      for (const arg of spec.expects) {
        expect(out, `${tag}.${key}`).toContain(arg);
      }
      if (spec === NUMERIC_CASE) {
        // Count-aware singular forms must still be real strings.
        const one = (value as (n: number) => string)(1);
        expect(one.length, `${tag}.${key}(1)`).toBeGreaterThan(0);
      }
    }
  }
});

/**
 * The sort announcement is the one label whose meaning lives in a branch, so a
 * translation that drops the ternary still compiles, still interpolates the
 * column, and quietly tells every user the order is ascending.
 */
it("every locale formats a proposal change without a column or value", () => {
  for (const [tag, labels] of Object.entries(locales)) {
    const rowOnly = labels.proposalChange({ row: "ROW_X" });
    const withColumn = labels.proposalChange({
      row: "ROW_X",
      column: "COLUMN_X",
    });
    const afterOnly = labels.proposalChange({
      row: "ROW_X",
      column: "COLUMN_X",
      after: "AFTER_X",
    });
    const beforeOnly = labels.proposalChange({
      row: "ROW_X",
      column: "COLUMN_X",
      before: "BEFORE_X",
    });

    expect(rowOnly, `${tag} row-only`).toBe("ROW_X");
    expect(withColumn, `${tag} field`).toContain("ROW_X");
    expect(withColumn, `${tag} field`).toContain("COLUMN_X");
    expect(afterOnly, `${tag} after-only`).toContain("AFTER_X");
    expect(beforeOnly, `${tag} before-only`).toContain("BEFORE_X");
    expect(afterOnly, `${tag} must not collapse to the field`).not.toBe(
      withColumn
    );
    expect(beforeOnly, `${tag} must not collapse to the field`).not.toBe(
      withColumn
    );
  }
});

it("every locale distinguishes ascending from descending", () => {
  for (const [tag, labels] of Object.entries(locales)) {
    const up = labels.sortedBy({ column: "C", ascending: true });
    const down = labels.sortedBy({ column: "C", ascending: false });

    expect(up.length, `${tag} ascending`).toBeGreaterThan(0);
    expect(down.length, `${tag} descending`).toBeGreaterThan(0);
    expect(down, `${tag} must not read the same both ways`).not.toBe(up);
  }
});

it("labels AND column i18n paths resolve locale tags identically", () => {
  // "AR-eg" and "ar_EG" are the same locale — both surfaces must agree.
  const arabic = getLabels("ar");
  expect(getLabels("AR-eg")).toBe(arabic);
  expect(getLabels("ar_EG")).toBe(arabic);

  const column = { key: "name", i18n: { ar: "name_ar" } };
  expect(localizedColumnPath(column, "AR-eg")).toBe("name_ar");
  expect(localizedColumnPath(column, "ar_EG")).toBe("name_ar");
  // Exact regional tags still beat the primary subtag on both surfaces.
  const regional = { key: "name", i18n: { ar: "name_ar", "ar-EG": "name_eg" } };
  expect(localizedColumnPath(regional, "ar_eg")).toBe("name_eg");
});

/**
 * The two token-mapping labels are the only ones whose job is to REMOVE their
 * argument from the output. That makes them the only ones a lazy translation
 * can pass by returning the token unchanged, so they get their own check.
 *
 * English is exempt from the "not the token" rule and only from that rule:
 * "rejected", "cancelled" and "failed" are the natural English words as well
 * as the protocol tokens, and inventing a synonym to make them differ would
 * make the English UI worse to satisfy a test.
 */
describe("assistant token labels translate every token", () => {
  const CONNECTION = [
    "idle",
    "connecting",
    "ready",
    "sending",
    "awaiting-approval",
    "error",
    "disconnected",
  ];
  const RECEIPT = [
    "executed",
    "staged",
    "rejected",
    "awaiting-approval",
    "cancelled",
    "stale",
    "failed",
  ];

  it("gives every connection token a word in every locale", () => {
    for (const [tag, labels] of Object.entries(locales)) {
      for (const token of CONNECTION) {
        const out = labels.assistantConnection(token);
        expect(out.length, `${tag}.${token}`).toBeGreaterThan(0);
        if (tag !== "en") expect(out, `${tag}.${token}`).not.toBe(token);
      }
      // An unknown state is still a word, not a blank badge or a raw token.
      const unknown = labels.assistantConnection("nonsense");
      expect(unknown.length, tag).toBeGreaterThan(0);
      expect(unknown, tag).not.toBe("nonsense");
    }
  });

  it("gives every receipt token a word in every locale", () => {
    for (const [tag, labels] of Object.entries(locales)) {
      for (const token of RECEIPT) {
        const out = labels.assistantReceipt({ status: token });
        expect(out.length, `${tag}.${token}`).toBeGreaterThan(0);
        if (tag !== "en") expect(out, `${tag}.${token}`).not.toBe(token);
      }
    }
  });

  it("shows an unknown receipt status rather than nothing", () => {
    for (const [tag, labels] of Object.entries(locales)) {
      // A status this version has no word for still has to say something —
      // a blank receipt is worse than an untranslated one.
      const out = labels.assistantReceipt({ status: "some-new-status" });
      expect(out, tag).toContain("some-new-status");
    }
  });

  it("keeps the capability key beside the translated status", () => {
    for (const [tag, labels] of Object.entries(locales)) {
      const out = labels.assistantReceipt({
        capability: "view.setGroupBy",
        status: "executed",
      });
      expect(out, tag).toContain("view.setGroupBy");
    }
  });
});

/**
 * A receipt headline has two answers, and both have to work in every
 * language: a sentence for a pair this locale knows, and nothing at all for
 * one it does not — which is what lets the panel fall back to the plain
 * status instead of printing a half-translated phrase.
 */
it("every locale writes a receipt headline it knows and declines one it does not", () => {
  for (const [tag, labels] of Object.entries(locales)) {
    const known = labels.assistantReceiptAction({
      kind: "filter",
      status: "executed",
    });
    expect(known, `${tag}.assistantReceiptAction(filter/executed)`).toBeTypeOf(
      "string"
    );
    expect(known?.length ?? 0, `${tag} headline is empty`).toBeGreaterThan(0);

    // An unknown pair, and a receipt with no kind at all.
    expect(
      labels.assistantReceiptAction({ kind: "teleport", status: "executed" }),
      `${tag} invents a headline for an unknown kind`
    ).toBeUndefined();
    expect(
      labels.assistantReceiptAction({ status: "executed" }),
      `${tag} invents a headline without a kind`
    ).toBeUndefined();
  }
});

/**
 * The card's second line, which is where the reader learns WHAT moved.
 *
 * Every locale joins a column to a value in its own way, so the test asserts
 * that both survive and that the two sort directions do not collapse into one
 * word — a card that reads the same whichever way the table sorted is telling
 * the reader nothing.
 */
it("every locale names the column and value, and separates the directions", () => {
  for (const [tag, labels] of Object.entries(locales)) {
    const applied = labels.assistantReceiptTerms({
      kind: "filter",
      terms: [{ column: "Team", value: "Platform" }],
    });
    expect(applied, `${tag} dropped the column`).toContain("Team");
    expect(applied, `${tag} dropped the value`).toContain("Platform");

    const up = labels.assistantReceiptTerms({
      kind: "sort",
      terms: [{ column: "Salary" }],
      direction: "asc",
    });
    const down = labels.assistantReceiptTerms({
      kind: "sort",
      terms: [{ column: "Salary" }],
      direction: "desc",
    });
    expect(up, `${tag} dropped the sorted column`).toContain("Salary");
    expect(up, `${tag} reads the same either way`).not.toBe(down);

    // A search names a value and no column; an edit names what it put where.
    expect(
      labels.assistantReceiptTerms({
        kind: "search",
        terms: [{ value: "nair" }],
      }),
      `${tag} dropped a value that had no column`
    ).toContain("nair");
    const edited = labels.assistantReceiptTerms({
      kind: "edit",
      terms: [{ column: "Salary", value: "185" }],
    });
    expect(edited, `${tag} dropped the edited column`).toContain("Salary");
    expect(edited, `${tag} dropped the value written`).toContain("185");

    // Nothing to name is not a sentence: the headline stands on its own.
    expect(
      labels.assistantReceiptTerms({ kind: "filter", terms: [] }),
      `${tag} invented a detail for a cleared filter`
    ).toBeUndefined();
    expect(
      labels.assistantReceiptTerms({ kind: "filter" }),
      `${tag} invented a detail from no terms at all`
    ).toBeUndefined();
  }
});

/**
 * Taking something off is not putting something on.
 *
 * "Filter applied" over a card where the filter was cleared reads as a
 * failure, so every language gets its own sentence for the other direction.
 */
it("every locale words a cleared filter, sort, search and grouping", () => {
  for (const [tag, labels] of Object.entries(locales)) {
    for (const kind of ["filter", "sort", "search", "group"]) {
      const cleared = labels.assistantReceiptAction({
        kind,
        status: "executed",
        cleared: true,
      });
      const applied = labels.assistantReceiptAction({
        kind,
        status: "executed",
      });
      expect(cleared, `${tag}.${kind} cleared`).toBeTypeOf("string");
      expect(
        (cleared ?? "").length,
        `${tag}.${kind} cleared is empty`
      ).toBeGreaterThan(0);
      expect(cleared, `${tag}.${kind} reads the same either way`).not.toBe(
        applied
      );
    }
    // A kind this language has no cleared sentence for declines, the same way
    // it declines an unknown pair.
    expect(
      labels.assistantReceiptAction({
        kind: "teleport",
        status: "executed",
        cleared: true,
      }),
      `${tag} invented a cleared headline for an unknown kind`
    ).toBeUndefined();
  }
});

it("every locale translates a receipt status on its own", () => {
  for (const [tag, labels] of Object.entries(locales)) {
    for (const token of ["executed", "staged", "failed"]) {
      const out = labels.assistantReceiptStatus(token);
      expect(out, `${tag}.assistantReceiptStatus(${token})`).toBeTypeOf(
        "string"
      );
      // The token itself must not survive into the reader's language.
      if (tag !== "en") expect(out, `${tag} leaked ${token}`).not.toBe(token);
    }
    // An unknown status still yields a string rather than nothing.
    expect(labels.assistantReceiptStatus("brand-new")).toBeTypeOf("string");
  }
});

/**
 * A count-shaped label has more than one shape, and only one of them is
 * exercised by a probe that passes a single number. These walk the others,
 * in every locale, so a translation that handles four changes but not one is
 * caught here rather than on a reader's screen.
 */
it("every locale words a single change, and a single row, on its own", () => {
  for (const [tag, labels] of Object.entries(locales)) {
    const one = labels.proposalSummary({ changes: 1, rows: 1 });
    const many = labels.proposalSummary({ changes: 4, rows: 3 });
    const oneRow = labels.proposalSummary({ changes: 3, rows: 1 });

    expect(one, `${tag}.proposalSummary(1, 1)`).toBeTruthy();
    expect(many, `${tag}.proposalSummary(4, 3)`).toContain("4");
    expect(many, `${tag}.proposalSummary(4, 3)`).toContain("3");
    // One row is not "across 1 rows" in any language: the clause is dropped.
    expect(oneRow, `${tag}.proposalSummary(3, 1)`).not.toBe(many);
    expect(oneRow, `${tag}.proposalSummary(3, 1)`).toContain("3");
  }
});

it("every locale reports a tally with nothing decided yet", () => {
  for (const [tag, labels] of Object.entries(locales)) {
    const fresh = labels.proposalTally({
      pending: 3,
      approved: 0,
      rejected: 0,
    });
    expect(fresh, `${tag}.proposalTally`).toContain("3");
    expect(fresh, `${tag}.proposalTally`).toContain("0");
  }
});

it("every locale words a single-change review link", () => {
  for (const [tag, labels] of Object.entries(locales)) {
    expect(labels.reviewAllProposals(1), `${tag}.reviewAllProposals`).toContain(
      "1"
    );
  }
});

it("every locale names a custom capability by the key the host chose", () => {
  // A custom capability's key is the host's own, so no bundle can translate
  // it. Showing the raw key is the only honest answer; showing `undefined`,
  // or the word for a different capability, would be worse than untranslated.
  for (const [tag, labels] of Object.entries(locales)) {
    const revoke = labels.assistantAlwaysAllowedRevoke("orders.reprice");
    expect(revoke, `${tag}.assistantAlwaysAllowedRevoke`).toContain(
      "orders.reprice"
    );
  }
});
