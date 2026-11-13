/**
 * Every built-in command is one definition, and that definition agrees with
 * itself: the input schema accepts what the command handles, the preview
 * proposes what the apply step writes, and the result is what the output
 * schema publishes.
 */
import { describe, expect, it } from "vitest";

import { guideOf, summaryOf } from "../guides";
import {
  CAPABILITY_KEYS,
  type CapabilityKey,
  DESTRUCTIVE_KEYS,
  WRITE_KEYS,
} from "../keys";
import { createAgentSession } from "../session";
import type {
  AgentApply,
  AgentObservation,
  RowWindow,
  WriteExecuteResult,
} from "../types";
import { validateSchema } from "../validate";
import { TABLE_COMMANDS, tableCommand } from ".";
import { isGovernedKind } from "./command";

const COLUMNS = [
  {
    id: "name",
    label: "Name",
    type: "string",
    readable: true,
    writable: true,
    sortable: true,
  },
  {
    id: "salary",
    label: "Salary",
    type: "number",
    readable: true,
    writable: true,
    sortable: true,
  },
] as const;

function observation(): AgentObservation {
  return {
    tableId: "people",
    viewRevision: 3,
    featureIds: [
      "filters",
      "grouping-panel",
      "export-csv",
      "row-reorder",
      "saved-views",
    ],
    columns: [...COLUMNS],
    source: {
      fullDataset: true,
      grouping: "client",
      selectAcrossPages: false,
      exportScope: "page",
      totalCount: "loaded",
    },
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: true,
    hasExport: true,
    hasEdit: true,
    hasReorder: true,
    hasSelection: true,
    hasSavedViews: true,
    hasAdd: true,
    hasDelete: true,
    hasColumnPinning: true,
    hasRowPinning: true,
    hasColumnHide: true,
    hasColumnOrder: true,
    aggregations: {
      columns: [{ id: "salary", operations: [{ id: "sum", label: "Sum" }] }],
      active: [],
    },
    availableFilters: [],
    page: 1,
    limit: 10,
    search: "",
    pageMax: 5,
    rowAddressScope: "visible",
  };
}

const WINDOW: RowWindow = {
  rows: [
    { rowKey: "r1", cells: { name: "Ada", salary: 10 } },
    { rowKey: "r2", cells: { name: "Lin", salary: 20 } },
  ],
  offset: 0,
  limit: 2,
  redacted: [],
};

/** Every dispatch member, each recording the call that reached it. */
function recordingApply(calls: string[]): AgentApply {
  const record =
    (name: string) =>
    (...args: readonly unknown[]): undefined => {
      calls.push(`${name}:${JSON.stringify(args)}`);
      return undefined;
    };
  return {
    setPage: record("setPage"),
    setLimit: record("setLimit"),
    setSearch: record("setSearch"),
    setSort: record("setSort"),
    setFilters: record("setFilters"),
    setGroupBy: record("setGroupBy"),
    setAggregations: record("setAggregations"),
    pinColumn: record("pinColumn"),
    hideColumn: record("hideColumn"),
    setColumnOrder: record("setColumnOrder"),
    pinRow: record("pinRow"),
    setSelection: record("setSelection"),
    applyView: record("applyView"),
    runExport: (format) => {
      calls.push(`runExport:${format}`);
      return { ok: true, revision: 3 };
    },
    readRows: () => WINDOW,
    resolveRow: (ref) => ({
      rowKey: "rowKey" in ref ? ref.rowKey : "r1",
      scope: "visible",
      position: 1,
    }),
    editCells: record("editCells"),
    addRows: record("addRows"),
    deleteRows: record("deleteRows"),
    reorderRows: record("reorderRows"),
  };
}

/** One argument bag per command, exactly as a caller following the guide sends it. */
const SAMPLES: Readonly<Record<CapabilityKey, Record<string, unknown>>> = {
  "columns.describe": {},
  "view.describe": {},
  "view.setPage": { page: 2 },
  "view.setSort": { key: "salary", dir: "desc" },
  "view.setSearch": { query: "ada" },
  "view.setFilters": { filters: {} },
  "view.setGroupBy": { key: "name" },
  "view.setAggregations": { set: { salary: "sum" } },
  "view.pinColumn": { key: "name", side: "start" },
  "view.hideColumn": { key: "salary", hidden: true },
  "view.setColumnOrder": { order: ["salary", "name"] },
  "view.pinRow": { rowKey: "r1", side: "top" },
  "view.setSelection": { ids: ["r1"] },
  "views.apply": { viewId: "mine" },
  "rows.read": { offset: 0, limit: 2 },
  "rows.resolve": { position: 1, scope: "visible" },
  "export.run": { format: "csv" },
  "edit.cells": {
    edits: [
      { rowKey: "r1", column: "salary", value: 11 },
      { rowKey: "r2", column: "name", value: "Lee" },
    ],
  },
  "rows.add": { rows: [{ name: "Kai" }] },
  "rows.delete": { rows: [{ rowKey: "r1" }, { rowKey: "r2" }] },
  "rows.reorder": { fromKey: "r1", toKey: "r2" },
};

async function run(key: CapabilityKey) {
  const calls: string[] = [];
  const session = createAgentSession({
    observe: observation,
    apply: recordingApply(calls),
  });
  const result = await session.execute(key, SAMPLES[key], 3, `id-${key}`);
  return { result, calls, guide: session.describe(key) };
}

describe("the command registry", () => {
  it("holds exactly one definition per capability key, in catalog order", () => {
    expect(TABLE_COMMANDS.map((command) => command.key)).toEqual([
      ...CAPABILITY_KEYS,
    ]);
    expect(new Set(TABLE_COMMANDS).size).toBe(CAPABILITY_KEYS.length);
    for (const key of CAPABILITY_KEYS) {
      expect(tableCommand(key)?.key).toBe(key);
    }
    expect(tableCommand("orders.archive")).toBeUndefined();
    expect(tableCommand("toString")).toBeUndefined();
  });

  it("refuses a guide or summary for a key it does not define, by name", () => {
    const unknown = "orders.archive" as CapabilityKey;
    expect(() => guideOf(unknown)).toThrow(
      'unknown capability "orders.archive"'
    );
    expect(() => summaryOf(unknown)).toThrow(
      'unknown capability "orders.archive"'
    );
  });

  it("classes exactly the published write and destructive keys as governed", () => {
    for (const command of TABLE_COMMANDS) {
      const write = (WRITE_KEYS as readonly string[]).includes(command.key);
      const destructive = (DESTRUCTIVE_KEYS as readonly string[]).includes(
        command.key
      );
      expect(isGovernedKind(command.kind), command.key).toBe(write);
      expect(command.kind === "destructive", command.key).toBe(destructive);
      // A governed write is approved from its preview; nothing else has one.
      expect(command.preview !== undefined, command.key).toBe(write);
      if (command.partial === "supported") expect(write).toBe(true);
    }
  });

  it.each(CAPABILITY_KEYS)(
    "%s: its schema accepts the sample, and the result matches its output",
    async (key) => {
      const sample = SAMPLES[key];
      expect(validateSchema(guideOf(key).input, sample)).toBeUndefined();
      const { result, guide } = await run(key);
      // The live guide narrows the authored one; the sample stays valid.
      expect(validateSchema(guide.input, sample)).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.ok).toBe(true);
      // What crosses the wire: a property left `undefined` is not sent.
      const sent: unknown = JSON.parse(JSON.stringify(result.result));
      expect(validateSchema(guideOf(key).output, sent)).toBeUndefined();
    }
  );

  it.each(WRITE_KEYS)(
    "%s: the apply step writes what the preview proposed",
    async (key) => {
      const command = tableCommand(key);
      const calls: string[] = [];
      const apply = recordingApply(calls);
      const entry = observation();
      const plan = await command?.preview?.({
        context: {
          observation: entry,
          apply,
          observe: observation,
          throwIfCancelled: () => undefined,
        },
        body: SAMPLES[key],
        guard: { observe: observation, isEnabled: () => true },
      });
      expect(plan?.proposals.length).toBeGreaterThan(0);
      if (command?.partial === "supported") {
        // Row-by-row approval narrows `payload` with `proposals`.
        expect(plan?.perItem).toBe(true);
        expect(plan?.payload).toHaveLength(plan?.proposals.length ?? -1);
      }
      expect(calls).toEqual([]);
      const { result } = await run(key);
      const written = result.result as WriteExecuteResult;
      expect(written.applied).toBe(true);
      expect(written.proposals).toEqual(plan?.proposals);
      if (written.results) {
        expect(written.results.map((row) => row.rowKey)).toEqual(
          plan?.proposals.map((proposal) => proposal.rowKey)
        );
      }
    }
  );
});
