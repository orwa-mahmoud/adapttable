import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { toJsonTools } from "../json";
import { CAPABILITY_KEYS } from "../keys";
import { createAgentSession } from "../session";
import type { AgentObservation } from "../types";

/**
 * Capability keys that item 11-B will advertise. Fixtures name them now so
 * adapters that map `session.catalog()` pick them up when the session does.
 * Today's 11-A session does not list them — that is not a fixture failure.
 */
const PENDING_KEYS = [
  "view.setSelection",
  "views.apply",
  "rows.read",
  "rows.resolve",
  "rows.add",
  "rows.delete",
] as const;

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

  it("is valid JSON with one row per 11-A key plus the frozen 11-B names", () => {
    expect(file.schemaVersion).toBe("adapttable.agent.v1");
    expect(Array.isArray(file.intentions)).toBe(true);
    const keys = file.intentions.map((row) => row.expected.key);
    for (const key of CAPABILITY_KEYS) {
      expect(keys, `missing 11-A key ${key}`).toContain(key);
    }
    for (const key of PENDING_KEYS) {
      expect(keys, `missing pending 11-B key ${key}`).toContain(key);
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
    for (const row of file.intentions) {
      const key = row.expected.key;
      const today = (CAPABILITY_KEYS as readonly string[]).includes(key);
      if (!today) {
        expect(PENDING_KEYS as readonly string[]).toContain(key);
        expect(toolNames.has(key)).toBe(false);
        continue;
      }
      expect(toolNames.has(key)).toBe(true);
      const guide = session.describe(key);
      expect(guide.key).toBe(key);
      expect(guide.input).toBeDefined();
    }
  });
});
