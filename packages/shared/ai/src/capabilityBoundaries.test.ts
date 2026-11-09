/**
 * What an agent is allowed to see and do after the focused core doors.
 *
 * A feature name on the host is not an invitation. The advertised keys are
 * the operations that host has actually wired, and a full-table read is
 * refused before the host reader runs when the source only has one page.
 */
import { describe, expect, it, vi } from "vitest";

import { buildManifest, enabledKeys } from "./manifest";
import { createAgentSession } from "./session";
import type { AgentObservation } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

const NAME = {
  id: "name",
  label: "Name",
  type: "string",
  readable: true,
  writable: true,
  sortable: true,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 4,
    featureIds: [],
    columns: [NAME],
    source: PAGE_ONLY,
    writePolicy: "allow",
    hasPagination: false,
    hasSearch: false,
    hasSort: false,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 1,
    rowAddressScope: "visible",
    ...patch,
  };
}

describe("enabled operations", () => {
  it("describes only the operations a bare table has wired", () => {
    expect(enabledKeys(observation())).toEqual([
      "columns.describe",
      "view.describe",
      "rows.read",
      "rows.resolve",
    ]);
  });

  it("keeps grouping, export, and editing off until each one is wired", () => {
    const named = observation({
      featureIds: ["grouping", "editing", "export"],
    });
    expect(enabledKeys(named)).not.toContain("view.setGroupBy");
    expect(enabledKeys(named)).not.toContain("view.setAggregations");
    expect(enabledKeys(named)).not.toContain("export.run");
    expect(enabledKeys(named)).not.toContain("edit.cells");
  });

  it("advertises edit and grouping only with their own switches", () => {
    const wired = observation({
      featureIds: ["grouping-panel", "editing"],
      hasEdit: true,
      source: { ...PAGE_ONLY, grouping: "client" },
      aggregations: {
        columns: [
          { id: "name", operations: [{ id: "count", label: "Count" }] },
        ],
        active: [],
      },
    });
    const keys = enabledKeys(wired);
    expect(keys).toContain("view.setGroupBy");
    expect(keys).toContain("view.setAggregations");
    expect(keys).toContain("edit.cells");
    expect(keys).not.toContain("export.run");
    expect(keys).not.toContain("rows.add");
  });

  it("drops a wired edit channel when the write policy is not allow", () => {
    const denied = observation({
      featureIds: ["editing"],
      hasEdit: true,
      writePolicy: "deny",
    });
    expect(enabledKeys(denied)).not.toContain("edit.cells");
  });

  it("publishes the scope the host named, not a wider one", () => {
    const page = observation({ rowAddressScope: "page" });
    expect(buildManifest(page).rowAddressing).toEqual({
      scope: "page",
      key: "rowKey",
    });
    const visible = observation({ rowAddressScope: "visible" });
    expect(buildManifest(visible).rowAddressing.scope).toBe("visible");
  });
});

describe("full scope without a full dataset", () => {
  it("refuses the read before the host reader runs", async () => {
    const readRows = vi.fn();
    const session = createAgentSession({
      observe: () => observation(),
      apply: { readRows },
    });
    const result = await session.execute(
      "rows.read",
      { offset: 0, limit: 10, scope: "full" },
      4,
      "full-page-only"
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("scope-denied");
    expect(readRows).not.toHaveBeenCalled();
  });
});
