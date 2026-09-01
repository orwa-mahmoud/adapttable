/**
 * What a source can do, and what the table does with the answer.
 *
 * Two halves: the declared contract always wins, and the inference reproduces
 * exactly the shape-sniffing the table did before the contract existed — that
 * is what keeps every source written against v2 behaving as it did.
 */
import { describe, expect, it } from "vitest";

import { exportAllFallsBackToPage } from "../export/tableCsv";
import { groupingComputationKind } from "../grouping/groupingStrategy";
import {
  capabilityReason,
  sourceCapabilities,
  type TableSourceCapabilities,
} from "./capabilities";

const ROWS = [{ id: "1", team: "eng" }];

/** A source that answers for one page and nothing else. */
const paged = { total: 0 };
/** A source that handed over the whole filtered set. */
const full = { allFilteredRows: ROWS, total: ROWS.length };
/** A server-paginated source that counted the matches. */
const counted = { total: 250 };
/** A source whose server does the grouping. */
const grouped = { total: 250, groups: [{ value: "eng", count: 250 }] };

describe("sourceCapabilities — inference", () => {
  it("gives a one-page source nothing beyond the page", () => {
    expect(sourceCapabilities(paged)).toEqual({
      fullDataset: false,
      grouping: false,
      selectAcrossPages: false,
      exportScope: "page",
      totalCount: "loaded",
    });
  });

  it("gives a full filtered set every client-side capability", () => {
    expect(sourceCapabilities(full)).toEqual({
      fullDataset: true,
      grouping: "client",
      selectAcrossPages: true,
      exportScope: "all",
      totalCount: "exact",
    });
  });

  it("reads a counted server page as exact, selectable, still page-scoped", () => {
    expect(sourceCapabilities(counted)).toMatchObject({
      fullDataset: false,
      grouping: false,
      selectAcrossPages: true,
      exportScope: "page",
      totalCount: "exact",
    });
  });

  it("reads server group rows as server grouping", () => {
    expect(sourceCapabilities(grouped).grouping).toBe("server");
  });

  it("takes the query contract's word for server grouping", () => {
    expect(sourceCapabilities(counted, { grouping: true }).grouping).toBe(
      "server"
    );
  });
});

describe("sourceCapabilities — the declaration wins", () => {
  const declared: TableSourceCapabilities = {
    fullDataset: false,
    grouping: false,
    selectAcrossPages: false,
    exportScope: "page",
    totalCount: "loaded",
  };

  it("keeps a denial the shape would have overruled", () => {
    // Every field below says "yes" by inference. The source says no, and a
    // source that knows it cannot page past what it holds is right.
    expect(sourceCapabilities({ ...full, capabilities: declared })).toEqual(
      declared
    );
  });

  it("keeps a claim the shape cannot see", () => {
    const server: TableSourceCapabilities = {
      fullDataset: false,
      grouping: "server",
      selectAcrossPages: true,
      exportScope: "all",
      totalCount: "exact",
    };
    // No `groups` yet and no `allFilteredRows` ever: the query has not run,
    // and only the source can say what will come back.
    expect(sourceCapabilities({ ...paged, capabilities: server })).toEqual(
      server
    );
  });

  it("ignores the query contract once the source has spoken", () => {
    expect(
      sourceCapabilities(
        { ...paged, capabilities: declared },
        { grouping: true }
      ).grouping
    ).toBe(false);
  });
});

describe("capabilityReason", () => {
  it("has a sentence for every capability", () => {
    const keys: (keyof TableSourceCapabilities)[] = [
      "fullDataset",
      "grouping",
      "selectAcrossPages",
      "exportScope",
      "totalCount",
    ];
    for (const key of keys)
      expect(capabilityReason(key).endsWith(".")).toBe(true);
  });
});

describe("the features that used to guess", () => {
  it("groups on the client for a full set, and not at all for a page", () => {
    expect(groupingComputationKind({ groupByKeys: ["team"], ...full })).toBe(
      "client"
    );
    expect(groupingComputationKind({ groupByKeys: ["team"], ...paged })).toBe(
      "none"
    );
  });

  it("never pretends a source can group when it says it cannot", () => {
    expect(
      groupingComputationKind({
        groupByKeys: ["team"],
        allFilteredRows: ROWS,
        capabilities: {
          fullDataset: true,
          grouping: false,
          selectAcrossPages: true,
          exportScope: "all",
          totalCount: "exact",
        },
      })
    ).toBe("none");
  });

  it("waits for the rows a declared server grouping will return", () => {
    const capabilities: TableSourceCapabilities = {
      fullDataset: false,
      grouping: "server",
      selectAcrossPages: true,
      exportScope: "page",
      totalCount: "exact",
    };
    // Declared but not yet delivered: grouping the page slice in the meantime
    // would answer a different question from the one the server will answer.
    expect(
      groupingComputationKind({ groupByKeys: ["team"], capabilities })
    ).toBe("none");
    expect(
      groupingComputationKind({
        groupByKeys: ["team"],
        sourceGroups: [{ value: "eng", count: 250 }],
        capabilities,
      })
    ).toBe("source");
  });

  it("falls export back to the page only when nothing can reach further", () => {
    expect(exportAllFallsBackToPage({ scope: "all" }, paged)).toBe(true);
    expect(exportAllFallsBackToPage({ scope: "all" }, full)).toBe(false);
    // The host fetches the rest itself, so the source's limit is not the end
    // of the story.
    expect(
      exportAllFallsBackToPage(
        { scope: "all", fetchAll: { fetchPage: () => Promise.resolve(ROWS) } },
        paged
      )
    ).toBe(false);
    // A declaration is enough: a source that will serve everything on request
    // is not falling back, whatever its current shape looks like.
    expect(
      exportAllFallsBackToPage(
        { scope: "all" },
        {
          ...paged,
          capabilities: {
            fullDataset: false,
            grouping: false,
            selectAcrossPages: true,
            exportScope: "all",
            totalCount: "exact",
          },
        }
      )
    ).toBe(false);
  });

  it("leaves a page-scoped export alone", () => {
    expect(exportAllFallsBackToPage({ scope: "page" }, paged)).toBe(false);
  });
});
