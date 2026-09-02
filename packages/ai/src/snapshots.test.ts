import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildManifest } from "./manifest";
import type { AgentObservation } from "./types";

const here = dirname(fileURLToPath(import.meta.url));

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function read(name: string): unknown {
  return JSON.parse(readFileSync(join(here, "__snapshots__", name), "utf8"));
}

function observation(patch: Partial<AgentObservation>): AgentObservation {
  return {
    tableId: "demo",
    viewRevision: 1,
    featureIds: [],
    columns: [],
    source: PAGE_ONLY,
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
    pageMax: 100,
    rowAddressScope: "visible",
    ...patch,
  };
}

describe("manifest snapshots", () => {
  it("locks the minimal, standard and custom catalogs", () => {
    const minimal = buildManifest(observation({ tableId: "minimal" }));
    const standard = buildManifest(
      observation({
        tableId: "standard",
        featureIds: ["filters", "grouping", "export-csv"],
        hasFilters: true,
        hasExport: true,
        source: { ...PAGE_ONLY, grouping: "client", fullDataset: true },
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
      })
    );
    const custom = buildManifest(
      observation({
        tableId: "custom",
        featureIds: ["filters", "editing"],
        hasFilters: true,
        hasEdit: true,
        writePolicy: "deny",
        columns: [
          {
            id: "secret",
            label: "Secret",
            type: "string",
            readable: false,
            writable: false,
            sortable: false,
          },
        ],
      })
    );
    expect(minimal).toEqual(read("minimal.json"));
    expect(standard).toEqual(read("standard.json"));
    expect(custom).toEqual(read("custom.json"));
  });
});
