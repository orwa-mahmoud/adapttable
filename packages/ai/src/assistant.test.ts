/**
 * The assistant contracts, and the rules that make them safe to build on.
 */
import { describe, expect, it, vi } from "vitest";

import {
  assertUniqueSuggestions,
  type AssistantAction,
  type AssistantPlanner,
  type AssistantSuggestion,
  eligibleSuggestions,
} from "./assistant";
import { createAgentSession } from "./session";
import type { AgentObservation } from "./types";

const SUGGESTIONS: AssistantSuggestion[] = [
  {
    id: "group-by-city",
    title: "Group by city",
    prompt: "group by city",
    requires: ["view.setGroupBy"],
  },
  {
    id: "pin-first",
    title: "Pin the first column",
    prompt: "pin the name column",
    requires: ["view.pinColumn"],
  },
  {
    id: "what-can-you-do",
    title: "What can you do?",
    prompt: "what can you do?",
  },
];

describe("eligibleSuggestions", () => {
  it("keeps only what the table can actually run", () => {
    const eligible = eligibleSuggestions(SUGGESTIONS, [
      "view.setGroupBy",
      "view.describe",
    ]);

    expect(eligible.map((s) => s.id)).toEqual([
      "group-by-city",
      "what-can-you-do",
    ]);
  });

  it("needs every required key, not just one", () => {
    const both: AssistantSuggestion[] = [
      {
        id: "pin-and-group",
        title: "Pin and group",
        prompt: "group by city and pin it",
        requires: ["view.setGroupBy", "view.pinColumn"],
      },
    ];

    expect(eligibleSuggestions(both, ["view.setGroupBy"])).toEqual([]);
    expect(
      eligibleSuggestions(both, ["view.setGroupBy", "view.pinColumn"])
    ).toHaveLength(1);
  });

  it("keeps the authored order", () => {
    const eligible = eligibleSuggestions(SUGGESTIONS, [
      "view.pinColumn",
      "view.setGroupBy",
    ]);

    expect(eligible.map((s) => s.id)).toEqual([
      "group-by-city",
      "pin-first",
      "what-can-you-do",
    ]);
  });

  it("offers nothing on a table that advertises nothing", () => {
    expect(eligibleSuggestions(SUGGESTIONS, [])).toEqual([SUGGESTIONS[2]]);
  });
});

describe("assertUniqueSuggestions", () => {
  it("passes distinct ids through unchanged", () => {
    expect(assertUniqueSuggestions(SUGGESTIONS)).toBe(SUGGESTIONS);
  });

  it("names the id that repeats", () => {
    expect(() =>
      assertUniqueSuggestions([
        SUGGESTIONS[0]!,
        { ...SUGGESTIONS[1]!, id: "group-by-city" },
      ])
    ).toThrow(/duplicate suggestion "group-by-city"/);
  });
});

/**
 * A suggestion's prompt is authored text. The temptation this guards against
 * is manufacturing one from the key — "view.setGroupBy" becoming "view set
 * group by" — which produces a request the reader never wrote and the model
 * never chose.
 */
describe("suggestions are authored, never derived from keys", () => {
  it("carries a prompt that is nothing like its required key", () => {
    for (const suggestion of SUGGESTIONS) {
      for (const key of suggestion.requires ?? []) {
        expect(suggestion.prompt).not.toContain(key);
        expect(suggestion.prompt).not.toBe(key.replaceAll(".", " "));
      }
    }
  });
});

const observation = (): AgentObservation => ({
  tableId: "orders",
  viewRevision: 3,
  featureIds: [],
  columns: [
    {
      id: "name",
      label: "Name",
      type: "string",
      readable: true,
      writable: false,
      sortable: true,
    },
  ],
  source: {
    fullDataset: false,
    grouping: false,
    selectAcrossPages: false,
    exportScope: "page",
    totalCount: "loaded",
  },
  writePolicy: "allow",
  hasPagination: true,
  hasSearch: true,
  hasSort: true,
  hasFilters: false,
  hasExport: false,
  hasEdit: false,
  hasReorder: false,
  page: 1,
  limit: 10,
  search: "",
  pageMax: 50,
  rowAddressScope: "visible",
});

/**
 * The whole point of the action shape: it is the executor's own argument
 * list, so a planned turn runs through the same governance as a scripted
 * call, with no chat-specific path around it.
 */
describe("an action is exactly what the session executes", () => {
  it("runs through the ordinary executor", async () => {
    const setSearch = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { setSearch },
    });
    const planner: AssistantPlanner = ({ request, available, revision }) => {
      expect(available).toContain("view.setSearch");
      return {
        id: "p1",
        requestId: request.id,
        actions: [
          {
            capabilityKey: "view.setSearch",
            args: { query: "ada" },
            expectedRevision: revision,
            idempotencyKey: "turn-1-0",
          },
        ],
      };
    };

    const proposal = await planner({
      request: { id: "t1", text: "search for ada" },
      available: session.catalog().map((entry) => entry.key),
      revision: session.manifest().viewRevision,
    });
    const action: AssistantAction = proposal.actions[0]!;
    const result = await session.execute(
      action.capabilityKey,
      action.args,
      action.expectedRevision,
      action.idempotencyKey
    );

    expect(result.ok).toBe(true);
    expect(setSearch).toHaveBeenCalledExactlyOnceWith("ada");
  });

  it("fails an action planned against a view the table has left", async () => {
    const setSearch = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { setSearch },
    });

    // Planned at revision 2; the table is at 3. Carrying the revision on the
    // action is what makes this a refusal rather than a silent apply to a
    // different view.
    const result = await session.execute(
      "view.setSearch",
      { query: "ada" },
      2,
      "stale"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("revision-mismatch");
    expect(setSearch).not.toHaveBeenCalled();
  });
});
