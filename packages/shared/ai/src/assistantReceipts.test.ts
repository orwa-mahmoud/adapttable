/**
 * Receipts are read off the payload, never off the outer flag.
 */
import { describe, expect, it } from "vitest";

import {
  receiptFromResult,
  receiptsFromResults,
  turnStatus,
} from "./assistantReceipts";
import type { ExecuteResult } from "./types";

const result = (patch: Partial<ExecuteResult> = {}): ExecuteResult => ({
  ok: true,
  revision: 2,
  idempotencyKey: "k",
  ...patch,
});

describe("receiptFromResult", () => {
  it("reads a plain view operation as executed", () => {
    expect(receiptFromResult(result({ result: { ok: true } })).status).toBe(
      "executed"
    );
  });

  it("reads an applied write as executed", () => {
    const receipt = receiptFromResult(
      result({
        result: { proposals: [], applied: true, approval: "not-required" },
      }),
      "edit.cells"
    );

    expect(receipt).toMatchObject({
      status: "executed",
      capabilityKey: "edit.cells",
      idempotencyKey: "k",
    });
  });

  it("does not call an approved-but-unapplied write executed", () => {
    // ok: true, and nothing has reached the host. Reporting this as done is
    // exactly the lie the outer flag invites.
    expect(
      receiptFromResult(
        result({
          result: { proposals: [], applied: false, approval: "approved" },
        })
      ).status
    ).toBe("staged");
  });

  it("calls a staged write staged, even though the session applied it", () => {
    // The staging callback IS a host callback, so the session reports
    // `applied: true` for it. Reading that as done tells the reader a number
    // changed while the table is still showing "1 unsaved row" — the commit
    // policy is the only thing that separates the two.
    const staged = receiptFromResult(
      result({
        result: { proposals: [], applied: true, approval: "not-required" },
      }),
      "edit.cells",
      "stage"
    );
    expect(staged.status).toBe("staged");

    const saved = receiptFromResult(
      result({
        result: { proposals: [], applied: true, approval: "not-required" },
      }),
      "edit.cells",
      "immediate"
    );
    expect(saved.status).toBe("executed");
  });

  it("leaves a view operation alone under a staging policy", () => {
    // Only writes stage. A filter is not waiting for anyone to press Save.
    expect(
      receiptFromResult(
        result({ result: { ok: true } }),
        "view.setFilters",
        "stage"
      ).status
    ).toBe("executed");
  });

  it("distinguishes a human's refusal from a failure", () => {
    expect(
      receiptFromResult(
        result({
          result: { proposals: [], applied: false, approval: "rejected" },
        })
      ).status
    ).toBe("rejected");
  });

  it("reports a write still waiting on a human", () => {
    expect(
      receiptFromResult(
        result({
          result: { proposals: [], applied: false, approval: "pending" },
        })
      ).status
    ).toBe("awaiting-approval");
  });

  it("reports a cancelled approval as cancelled", () => {
    expect(
      receiptFromResult(
        result({
          result: { proposals: [], applied: false, approval: "cancelled" },
        })
      ).status
    ).toBe("cancelled");
  });

  it("separates a stale view from an ordinary failure", () => {
    expect(
      receiptFromResult(
        result({
          ok: false,
          error: { code: "revision-mismatch", message: "moved on" },
        })
      )
    ).toMatchObject({ status: "stale", message: "moved on" });
    expect(
      receiptFromResult(
        result({ ok: false, error: { code: "cancelled", message: "stopped" } })
      ).status
    ).toBe("cancelled");
    expect(
      receiptFromResult(
        result({ ok: false, error: { code: "apply-failed", message: "no" } })
      ).status
    ).toBe("failed");
  });
});

describe("turnStatus", () => {
  it("calls a turn where everything landed applied", () => {
    expect(
      turnStatus(
        receiptsFromResults([
          result({ idempotencyKey: "a" }),
          result({ idempotencyKey: "b" }),
        ])
      )
    ).toBe("applied");
  });

  it("calls a mixed turn partial, not done and not failed", () => {
    const receipts = receiptsFromResults([
      result({ idempotencyKey: "a" }),
      result({
        idempotencyKey: "b",
        ok: false,
        error: { code: "revision-mismatch", message: "moved on" },
      }),
    ]);

    expect(turnStatus(receipts)).toBe("partial");
  });

  it("calls an all-cancelled turn cancelled", () => {
    expect(
      turnStatus(
        receiptsFromResults([
          result({
            idempotencyKey: "a",
            ok: false,
            error: { code: "cancelled", message: "stopped" },
          }),
        ])
      )
    ).toBe("cancelled");
  });

  it("says none when a turn ran no actions", () => {
    expect(turnStatus([])).toBe("none");
  });

  it("carries the commit policy to every receipt in the turn", () => {
    const receipts = receiptsFromResults(
      [
        result({
          idempotencyKey: "a",
          result: { proposals: [], applied: true, approval: "not-required" },
        }),
      ],
      ["edit.cells"],
      "stage"
    );

    expect(receipts[0]?.status).toBe("staged");
  });

  it("pairs each receipt with the key that ran", () => {
    const receipts = receiptsFromResults(
      [result({ idempotencyKey: "a" }), result({ idempotencyKey: "b" })],
      ["view.setPage", "view.pinColumn"]
    );

    expect(receipts.map((receipt) => receipt.capabilityKey)).toEqual([
      "view.setPage",
      "view.pinColumn",
    ]);
  });
});

describe("a write a reader approved only part of", () => {
  it("is not reported as saved", () => {
    // Two of three raises ran. `applied` is true for that and for a whole
    // write alike, so reading it alone tells the reader everything landed.
    const receipt = receiptFromResult(
      result({
        result: {
          proposals: [],
          applied: true,
          approval: "partial",
          results: [
            { rowKey: "r1", column: "salary", ok: true },
            { rowKey: "r3", column: "salary", ok: true },
          ],
        },
      }),
      "edit.cells"
    );

    expect(receipt.status).toBe("partial");
  });

  it("carries the reason the reader gave", () => {
    const receipt = receiptFromResult(
      result({
        result: {
          proposals: [],
          applied: true,
          approval: "partial",
          approvalReason: "not while she is on leave",
        },
      })
    );

    expect(receipt).toMatchObject({
      status: "partial",
      approvalReason: "not while she is on leave",
    });
  });

  it("stays partial on a staging table", () => {
    // Staged or saved, the fact worth the reader's attention is the same:
    // something they saw proposed was refused and never ran.
    const receipt = receiptFromResult(
      result({
        result: { proposals: [], applied: true, approval: "partial" },
      }),
      "edit.cells",
      "stage"
    );

    expect(receipt.status).toBe("partial");
  });

  it("makes the whole turn partial, whatever else ran", () => {
    expect(
      turnStatus([
        { status: "executed", idempotencyKey: "a" },
        { status: "partial", idempotencyKey: "b" },
      ])
    ).toBe("partial");
    expect(turnStatus([{ status: "partial", idempotencyKey: "b" }])).toBe(
      "partial"
    );
  });
});
