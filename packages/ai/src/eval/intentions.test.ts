import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { toJsonTools } from "../json";
import { CAPABILITY_KEYS } from "../keys";
import { createAgentSession } from "../session";
import type { AgentObservation } from "../types";

const PAGE_ONLY = {
  fullDataset: true,
  grouping: "client" as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function fullObservation(): AgentObservation {
  return {
    tableId: "employees",
    viewRevision: 1,
    featureIds: ["filters", "grouping", "export-csv", "editing", "row-reorder"],
    columns: [
      {
        id: "name",
        label: "Name",
        type: "string",
        readable: true,
        writable: false,
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
    ],
    source: PAGE_ONLY,
    writePolicy: "allow",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: true,
    hasExport: true,
    hasEdit: true,
    hasReorder: true,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
  };
}

interface IntentionRow {
  readonly text: string;
  readonly expected: { readonly key: string; readonly args: unknown };
}

interface IntentionFile {
  readonly schemaVersion: string;
  readonly intentions: readonly IntentionRow[];
}

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../__fixtures__/intentions.json"
);

describe("provider-free intention fixtures", () => {
  const file = JSON.parse(readFileSync(fixturePath, "utf8")) as IntentionFile;

  it("is valid JSON with one row per frozen capability key", () => {
    expect(file.schemaVersion).toBe("adapttable.agent.v1");
    expect(Array.isArray(file.intentions)).toBe(true);
    const keys = file.intentions.map((row) => row.expected.key);
    for (const key of CAPABILITY_KEYS) {
      expect(keys, `missing key ${key}`).toContain(key);
    }
    expect(file.intentions.find((row) => row.text === "go to page 2")).toEqual({
      text: "go to page 2",
      expected: { key: "view.setPage", args: { page: 2 } },
    });
    expect(
      file.intentions.find((row) =>
        row.text.includes("fifth visible row's salary")
      )?.expected
    ).toEqual({
      key: "edit.cells",
      args: {
        position: 5,
        scope: "visible",
        column: "salary",
        value: 20000,
      },
    });
  });

  it("matches toJsonTools / describe for keys today's session advertises", () => {
    const session = createAgentSession({
      observe: fullObservation,
      apply: {},
    });
    const toolNames = new Set(toJsonTools(session).map((tool) => tool.name));
    for (const entry of session.catalog()) {
      expect(toolNames.has(entry.key)).toBe(true);
      const guide = session.describe(entry.key);
      expect(guide.key).toBe(entry.key);
      expect(guide.input).toBeDefined();
    }
  });
});
