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
