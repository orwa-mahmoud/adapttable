import { describe, expect, it, vi } from "vitest";

import { type AgentEnvelope, executeEnvelope, parseEnvelope } from "./envelope";
import { AGENT_SCHEMA_VERSION } from "./keys";
import { createAgentSession } from "./session";
import type { AgentObservation, AgentSession } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "employees",
    viewRevision: 1,
    featureIds: [],
    columns: [
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
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

const VALID = {
  schemaVersion: AGENT_SCHEMA_VERSION,
  tableId: "employees",
  key: "view.setPage",
  args: { page: 2 },
  expectedRevision: 1,
  idempotencyKey: "page-2",
};

describe("parseEnvelope", () => {
  it("accepts a complete envelope and defaults missing args to {}", () => {
    const parsed = parseEnvelope(VALID);
    expect(parsed.schemaVersion).toBe(AGENT_SCHEMA_VERSION);
    expect(parsed.tableId).toBe("employees");
    expect(parsed.key).toBe("view.setPage");
    expect(parsed.args).toEqual({ page: 2 });
    expect(parsed.expectedRevision).toBe(1);
    expect(parsed.idempotencyKey).toBe("page-2");
    expect(
      parseEnvelope({
        schemaVersion: VALID.schemaVersion,
        tableId: VALID.tableId,
        key: VALID.key,
        expectedRevision: VALID.expectedRevision,
        idempotencyKey: VALID.idempotencyKey,
      }).args
    ).toEqual({});
  });

  it("rejects a non-object and every missing required field", () => {
    expect(() => parseEnvelope(null)).toThrow(/object/);
    expect(() => parseEnvelope([])).toThrow(/object/);
    expect(() => parseEnvelope("x")).toThrow(/object/);
    expect(() => parseEnvelope({ ...VALID, schemaVersion: "nope" })).toThrow(
      /schemaVersion/
    );
    expect(() => parseEnvelope({ ...VALID, tableId: "" })).toThrow(/tableId/);
    expect(() => parseEnvelope({ ...VALID, tableId: 1 })).toThrow(/tableId/);
    expect(() => parseEnvelope({ ...VALID, key: "" })).toThrow(/key/);
    expect(() => parseEnvelope({ ...VALID, key: 1 })).toThrow(/key/);
    expect(() => parseEnvelope({ ...VALID, expectedRevision: "1" })).toThrow(
      /expectedRevision/
    );
    expect(() =>
      parseEnvelope({ ...VALID, expectedRevision: Infinity })
    ).toThrow(/expectedRevision/);
    expect(() => parseEnvelope({ ...VALID, idempotencyKey: "" })).toThrow(
      /idempotencyKey/
    );
    expect(() => parseEnvelope({ ...VALID, idempotencyKey: 1 })).toThrow(
      /idempotencyKey/
    );
  });
});

describe("executeEnvelope", () => {
  it("calls session.execute after matching schema and tableId", async () => {
    const apply = { setPage: vi.fn() };
    const session = createAgentSession({
      observe: () => observation(),
      apply,
    });
    const result = await executeEnvelope(session, parseEnvelope(VALID));
    expect(result.ok).toBe(true);
    expect(apply.setPage).toHaveBeenCalledWith(2);
  });

  it("refuses a tableId that is not this session", async () => {
    const session = createAgentSession({
      observe: () => observation(),
      apply: {},
    });
    const result = await executeEnvelope(
      session,
      parseEnvelope({ ...VALID, tableId: "other" })
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("table-mismatch");
  });

  it("refuses a forged schemaVersion without calling execute", async () => {
    const execute = vi.fn();
    const session: AgentSession = {
      catalog: () => [],
      describe: () => {
        throw new Error("unused");
      },
      execute,
      manifest: () => ({
        schemaVersion: AGENT_SCHEMA_VERSION,
        tableId: "employees",
        viewRevision: 4,
        capabilities: [],
        columns: [],
        rowAddressing: { scope: "visible", key: "rowKey" },
        limits: { pageMax: 10, readMax: 50 },
        policy: { write: "allow", approval: "writes", commit: "stage" },
        source: PAGE_ONLY,
      }),
    };
    const forged = {
      ...parseEnvelope(VALID),
      schemaVersion: "other.v0",
    } as unknown as AgentEnvelope;
    const result = await executeEnvelope(session, forged);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("schema-mismatch");
    expect(result.revision).toBe(4);
    expect(execute).not.toHaveBeenCalled();
  });
});
