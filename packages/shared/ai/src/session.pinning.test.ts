/**
 * Governed pinning: what the agent may pin, and what it may not.
 *
 * Pinning is a view operation, not a data write, so it must never fall into
 * the approval path that guards edits. What it does need is the addressing
 * discipline every other row operation has — a stable key or a
 * revision-bound position, resolved against the view the request was
 * authorized in.
 */
import { pinnedSummaryRowId } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "./session";
import type { AgentObservation, ResolvedRow, RowRef } from "./types";

/** A real summary-row id, built the way the table builds one. */
const SUMMARY_ROW_ID = pinnedSummaryRowId("top", 0);

const SOURCE = {
  fullDataset: true,
  grouping: "client" as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: ["column-menu", "row-pinning"],
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
        id: "notes",
        label: "Notes",
        type: "string",
        readable: true,
        writable: false,
        sortable: false,
        pinnable: false,
      },
    ],
    source: SOURCE,
    writePolicy: "allow",
    approval: "writes",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    hasColumnPinning: true,
    hasRowPinning: true,
    pinnedColumns: { name: "start" },
    pinnedRows: { top: ["r1"], bottom: [] },
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

/** Resolve any key or position to a row, so addressing is what is tested. */
const resolveRow = (ref: RowRef): ResolvedRow =>
  "rowKey" in ref
    ? { rowKey: ref.rowKey, scope: "visible" }
    : { rowKey: `r${ref.position}`, scope: ref.scope, position: ref.position };

describe("pinning capabilities follow the wired operation", () => {
  it("advertises neither when the table pins nothing", () => {
    const session = createAgentSession({
      observe: () =>
        observation({ hasColumnPinning: false, hasRowPinning: false }),
      apply: {},
    });
    const keys = session.catalog().map((entry) => entry.key);

    expect(keys).not.toContain("view.pinColumn");
    expect(keys).not.toContain("view.pinRow");
  });

  it("drops column pinning when no column is pinnable", () => {
    const session = createAgentSession({
      observe: () =>
        observation({
          columns: [
            {
              id: "notes",
              label: "Notes",
              type: "string",
              readable: true,
              writable: false,
              sortable: false,
              pinnable: false,
            },
          ],
        }),
      apply: {},
    });

    expect(session.catalog().map((entry) => entry.key)).not.toContain(
      "view.pinColumn"
    );
  });

  it("advertises both when both are wired", () => {
    const session = createAgentSession({ observe: observation, apply: {} });
    const keys = session.catalog().map((entry) => entry.key);

    expect(keys).toContain("view.pinColumn");
    expect(keys).toContain("view.pinRow");
  });

  it("reports the live pin state through view.describe", async () => {
    const session = createAgentSession({ observe: observation, apply: {} });
    const result = await session.execute("view.describe", {}, 1, "d1");

    expect(result.result).toMatchObject({
      pinnedColumns: { name: "start" },
      pinnedRows: { top: ["r1"], bottom: [] },
    });
  });
});

describe("view.pinColumn", () => {
  it("pins a pinnable column to the logical start edge", async () => {
    const pinColumn = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { pinColumn },
    });
    const result = await session.execute(
      "view.pinColumn",
      { key: "name", side: "start" },
      1,
      "p1"
    );

    expect(result.ok).toBe(true);
    // Logical, not physical: the same call is correct under dir="rtl", where
    // start is the right edge. Nothing here converts a side to a direction.
    expect(pinColumn).toHaveBeenCalledExactlyOnceWith("name", "start");
  });

  it("unpins with null rather than resetting the layout", async () => {
    const pinColumn = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { pinColumn },
    });
    const result = await session.execute(
      "view.pinColumn",
      { key: "name", side: null },
      1,
      "p2"
    );

    expect(result.ok).toBe(true);
    expect(pinColumn).toHaveBeenCalledExactlyOnceWith("name", undefined);
  });

  it("refuses a column the agent was never told about", async () => {
    const pinColumn = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { pinColumn },
    });
    const result = await session.execute(
      "view.pinColumn",
      { key: "secret", side: "start" },
      1,
      "p3"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/unknown column "secret"/);
    expect(pinColumn).not.toHaveBeenCalled();
  });

  it("refuses a column the host marked unpinnable", async () => {
    const pinColumn = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { pinColumn },
    });
    const result = await session.execute(
      "view.pinColumn",
      { key: "notes", side: "start" },
      1,
      "p4"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/not pinnable/);
    expect(pinColumn).not.toHaveBeenCalled();
  });

  it("still unpins a column that may not be pinned", async () => {
    const pinColumn = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { pinColumn },
    });
    // Unpinning is the inverse of a pin that already exists — refusing it
    // would strand a column the host pinned itself.
    const result = await session.execute(
      "view.pinColumn",
      { key: "notes", side: null },
      1,
      "p5"
    );

    expect(result.ok).toBe(true);
    expect(pinColumn).toHaveBeenCalledExactlyOnceWith("notes", undefined);
  });

  it("says why the end edge is unavailable to a data column", async () => {
    const session = createAgentSession({
      observe: observation,
      apply: { pinColumn: vi.fn() },
    });
    const result = await session.execute(
      "view.pinColumn",
      { key: "name", side: "end" },
      1,
      "p6"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/start edge only/);
  });

  it("rejects a side that is not a side at all", async () => {
    const session = createAgentSession({
      observe: observation,
      apply: { pinColumn: vi.fn() },
    });
    const result = await session.execute(
      "view.pinColumn",
      { key: "name", side: "middle" },
      1,
      "p7"
    );

    expect(result.error?.code).toBe("invalid-arguments");
  });
});

describe("view.pinRow", () => {
  it("pins a row addressed by stable key", async () => {
    const pinRow = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { pinRow, resolveRow },
    });
    const result = await session.execute(
      "view.pinRow",
      { rowKey: "r7", side: "bottom" },
      1,
      "r1"
    );

    expect(result.ok).toBe(true);
    expect(pinRow).toHaveBeenCalledExactlyOnceWith("r7", "bottom");
  });

  it("resolves a position against the revision it was read at", async () => {
    const pinRow = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { pinRow, resolveRow },
    });
    const result = await session.execute(
      "view.pinRow",
      { position: 3, scope: "visible", expectedRevision: 1, side: "top" },
      1,
      "r2"
    );

    expect(result.ok).toBe(true);
    expect(pinRow).toHaveBeenCalledExactlyOnceWith("r3", "top");
  });

  it("refuses a position read against a view that has moved on", async () => {
    const pinRow = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ viewRevision: 4 }),
      apply: { pinRow, resolveRow },
    });
    // The ordinal was true of revision 1; row 3 of revision 4 is a different
    // row, so pinning it would pin whatever happens to sit there now.
    const result = await session.execute(
      "view.pinRow",
      { position: 3, scope: "visible", expectedRevision: 1, side: "top" },
      4,
      "r3"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("revision-mismatch");
    expect(pinRow).not.toHaveBeenCalled();
  });

  it("unpins with null", async () => {
    const pinRow = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { pinRow, resolveRow },
    });
    const result = await session.execute(
      "view.pinRow",
      { rowKey: "r1", side: null },
      1,
      "r4"
    );

    expect(result.ok).toBe(true);
    expect(pinRow).toHaveBeenCalledExactlyOnceWith("r1", undefined);
  });

  it("refuses a summary row, which is chrome rather than data", async () => {
    const pinRow = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: {
        pinRow,
        resolveRow: () => ({
          rowKey: SUMMARY_ROW_ID,
          scope: "visible" as const,
        }),
      },
    });
    const result = await session.execute(
      "view.pinRow",
      { rowKey: SUMMARY_ROW_ID, side: "top" },
      1,
      "r5"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/summary row, not a data row/);
    expect(pinRow).not.toHaveBeenCalled();
  });

  it("refuses when the table stops pinning while the row resolves", async () => {
    const pinRow = vi.fn();
    let pinning = true;
    const session = createAgentSession({
      observe: () => observation({ hasRowPinning: pinning }),
      apply: {
        pinRow,
        resolveRow: (ref: RowRef) => {
          // The host un-composed row pinning while its own lookup was in
          // flight; the request was authorized against a table that no
          // longer exists.
          pinning = false;
          return resolveRow(ref);
        },
      },
    });
    const result = await session.execute(
      "view.pinRow",
      { rowKey: "r7", side: "top" },
      1,
      "r6"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("not-wired");
    expect(pinRow).not.toHaveBeenCalled();
  });

  it("requires a side", async () => {
    const session = createAgentSession({
      observe: observation,
      apply: { pinRow: vi.fn(), resolveRow },
    });
    const result = await session.execute(
      "view.pinRow",
      { rowKey: "r7" },
      1,
      "r7"
    );

    expect(result.error?.code).toBe("invalid-arguments");
  });
});

describe("pinning is a view operation, not a data write", () => {
  it("never asks for approval, even under the strictest write policy", async () => {
    const onApprove = vi.fn(() => Promise.resolve(true));
    const pinColumn = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes", writePolicy: "deny" }),
      apply: { pinColumn },
      onApprove,
    });
    const result = await session.execute(
      "view.pinColumn",
      { key: "name", side: "start" },
      1,
      "a1"
    );

    expect(result.ok).toBe(true);
    expect(onApprove).not.toHaveBeenCalled();
    expect(pinColumn).toHaveBeenCalledExactlyOnceWith("name", "start");
  });

  it("reports the callback missing rather than pretending it pinned", async () => {
    const session = createAgentSession({ observe: observation, apply: {} });
    const result = await session.execute(
      "view.pinColumn",
      { key: "name", side: "start" },
      1,
      "a2"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/pinColumn/);
  });

  it("keeps two tables' pinning apart", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const sessionA = createAgentSession({
      observe: () => observation({ tableId: "a" }),
      apply: { pinColumn: first },
    });
    const sessionB = createAgentSession({
      observe: () => observation({ tableId: "b" }),
      apply: { pinColumn: second },
    });

    await sessionA.execute("view.pinColumn", { key: "name" }, 1, "same-key");
    await sessionB.execute("view.pinColumn", { key: "name" }, 1, "same-key");

    // The same idempotency key in two sessions is two requests, not a replay.
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
