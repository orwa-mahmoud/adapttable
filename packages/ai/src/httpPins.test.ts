import { describe, expect, it, vi } from "vitest";

import {
  contractFingerprint,
  createPinStore,
  DEFAULT_PIN_TTL_MS,
  pinExpiry,
} from "./httpPins";
import { createAgentSession } from "./session";
import type {
  AgentManifest,
  AgentObservation,
  AgentSession,
  CatalogEntry,
} from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: ["filters"],
    columns: [
      {
        id: "name",
        label: "Name",
        type: "string",
        readable: true,
        writable: true,
        sortable: true,
      },
    ],
    source: PAGE_ONLY,
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
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

function tableSession(patch: Partial<AgentObservation> = {}): AgentSession {
  return createAgentSession({
    observe: () => observation(patch),
    apply: { setPage: vi.fn() },
  });
}

function record(
  connectionId: string,
  contractVersion: string,
  seq: number,
  expiresAt = Number.MAX_SAFE_INTEGER
) {
  return {
    connectionId,
    tableId: "orders",
    contractVersion,
    seq,
    expiresAt,
  };
}

describe("naming a contract", () => {
  it("changes when a label, a type or a limit changes under stable keys", () => {
    const base = tableSession();
    const relabelled = tableSession({
      columns: [
        {
          id: "name",
          label: "Full name",
          type: "string",
          readable: true,
          writable: true,
          sortable: true,
        },
      ],
    });

    const before = contractFingerprint(base.manifest(), base.catalog());
    const after = contractFingerprint(
      relabelled.manifest(),
      relabelled.catalog()
    );
    // Every key is still the same; the backend would still write the wrong
    // prompt from the old label.
    expect(after).not.toBe(before);
  });

  it("ignores a view revision, which is not the contract moving", () => {
    const first = tableSession();
    const second = tableSession({ viewRevision: 99 });

    expect(contractFingerprint(second.manifest(), second.catalog())).toBe(
      contractFingerprint(first.manifest(), first.catalog())
    );
  });

  it("cannot be spelled by a column id that contains a separator", () => {
    const manifest = (columns: readonly string[]): AgentManifest =>
      ({
        schemaVersion: "adapttable.agent.v1",
        tableId: "orders",
        viewRevision: 1,
        capabilities: [],
        columns: columns.map((id) => ({
          id,
          label: id,
          type: "string" as const,
          readable: true,
          writable: false,
          sortable: false,
        })),
        rowAddressing: { scope: "visible" as const, key: "rowKey" as const },
        limits: { pageMax: 10, readMax: 50 },
        policy: {
          write: "allow" as const,
          approval: "never" as const,
          commit: "immediate" as const,
        },
        source: PAGE_ONLY,
      }) as unknown as AgentManifest;
    const catalog: readonly CatalogEntry[] = [];

    expect(contractFingerprint(manifest(["a,b"]), catalog)).not.toBe(
      contractFingerprint(manifest(["a", "b"]), catalog)
    );
  });
});

describe("the client's pin memory", () => {
  it("keeps two connections to one table apart", () => {
    const store = createPinStore();
    const table = tableSession();
    store.remember(table, record("conn-a", "v1", 1));

    expect(store.read(table, "conn-a")?.contractVersion).toBe("v1");
    // The other endpoint never negotiated anything.
    expect(store.read(table, "conn-b")).toBeUndefined();
  });

  it("ignores an acknowledgement that left before the one it holds", () => {
    const store = createPinStore();
    const table = tableSession();
    store.remember(table, record("conn", "v2", 2));
    // The slower of two in-flight refreshes, landing last.
    store.remember(table, record("conn", "v1", 1));

    expect(store.read(table, "conn")?.contractVersion).toBe("v2");
  });

  it("stops answering once a record has idled out", () => {
    const clock = { now: 0 };
    const store = createPinStore({ now: () => clock.now });
    const table = tableSession();
    store.remember(table, record("conn", "v1", 1, 1_000));

    expect(store.read(table, "conn")?.contractVersion).toBe("v1");
    clock.now = 1_000;
    expect(store.read(table, "conn")).toBeUndefined();
  });

  it("forgets one connection, or every one", () => {
    const store = createPinStore();
    const table = tableSession();
    store.remember(table, record("conn-a", "v1", 1));
    store.remember(table, record("conn-b", "v1", 1));

    store.forget(table, "conn-a");
    expect(store.read(table, "conn-a")).toBeUndefined();
    expect(store.read(table, "conn-b")).toBeDefined();

    store.forget(table);
    expect(store.read(table, "conn-b")).toBeUndefined();
  });

  it("drops the least recently used connection past its ceiling", () => {
    const clock = { now: 0 };
    const store = createPinStore({
      now: () => clock.now,
      maxConnections: 2,
    });
    const table = tableSession();
    store.remember(table, record("conn-a", "v1", 1));
    clock.now = 1;
    store.remember(table, record("conn-b", "v1", 1));
    clock.now = 2;
    // Touching a makes b the oldest.
    store.read(table, "conn-a");
    clock.now = 3;
    store.remember(table, record("conn-c", "v1", 1));

    expect(store.read(table, "conn-a")).toBeDefined();
    expect(store.read(table, "conn-c")).toBeDefined();
    expect(store.read(table, "conn-b")).toBeUndefined();
  });

  it("runs one refresh for callers that ask for the same version", async () => {
    const store = createPinStore();
    const table = tableSession();
    const run = vi.fn(() => Promise.resolve());

    await Promise.all([
      store.join(table, "conn", "v1", run),
      store.join(table, "conn", "v1", run),
    ]);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("leaves nobody acknowledged when the shared refresh fails", async () => {
    const store = createPinStore();
    const table = tableSession();
    const run = () =>
      Promise.reject(new Error("cancelled by the first caller"));

    const first = store.join(table, "conn", "v1", run);
    const second = store.join(table, "conn", "v1", run);

    await expect(first).rejects.toThrow(/cancelled/);
    await expect(second).rejects.toThrow(/cancelled/);
    expect(store.read(table, "conn")).toBeUndefined();
  });

  it("lets the next caller try again after a failure", async () => {
    const store = createPinStore();
    const table = tableSession();
    const failing = () => Promise.reject(new Error("nope"));

    await expect(store.join(table, "conn", "v1", failing)).rejects.toThrow();
    const run = vi.fn(() => Promise.resolve());
    await store.join(table, "conn", "v1", run);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("counts sends so two refreshes cannot claim one order", () => {
    const store = createPinStore();
    const table = tableSession();

    expect(store.claim(table, "conn")).toBe(1);
    expect(store.claim(table, "conn")).toBe(2);
    expect(store.claim(table, "other")).toBe(1);
  });
});

describe("how long a pin is held", () => {
  it("takes the backend's own lifetime when it names one", () => {
    expect(pinExpiry(1_000, 5_000, DEFAULT_PIN_TTL_MS)).toBe(6_000);
  });

  it("falls back when the backend names none or an impossible one", () => {
    expect(pinExpiry(0, undefined, 100)).toBe(100);
    expect(pinExpiry(0, 0, 100)).toBe(100);
    expect(pinExpiry(0, -5, 100)).toBe(100);
  });
});
