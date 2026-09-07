/**
 * The one account of a pending write that every surface reads.
 */
import { describe, expect, it } from "vitest";

import type { AgentApprovalPending } from "./AgentApprovalChrome";
import { approvalReview } from "./approvalReview";

function pending(
  patch: Partial<AgentApprovalPending> = {}
): AgentApprovalPending {
  return {
    proposals: [
      { rowKey: "r1", column: "salary", before: 100, after: 200 },
      { rowKey: "r1", column: "name", before: "Ada", after: "Ada L." },
      { rowKey: "r2", column: "salary", before: 110, after: 210 },
      { rowKey: "r3", column: "salary", before: 120, after: 220 },
    ],
    decisions: ["pending", "pending", "pending", "pending"],
    presentation: "widget",
    approve: () => undefined,
    reject: () => undefined,
    decideAt: () => undefined,
    ...patch,
  };
}

describe("counting a write", () => {
  it("is nothing when nothing is pending", () => {
    expect(approvalReview(null, undefined)).toBeNull();
    expect(approvalReview(undefined, undefined)).toBeNull();
  });

  it("counts changes and rows separately", () => {
    const review = approvalReview(pending(), undefined)!;
    // Two of the four changes are edits to r1.
    expect(review.changes).toBe(4);
    expect(review.rows).toBe(3);
    expect(review.summary).toBe("4 proposed changes across 3 rows");
  });

  it("does not say 'across 1 rows'", () => {
    const one = approvalReview(
      pending({
        proposals: [{ rowKey: "r1", column: "salary", after: 200 }],
        decisions: ["pending"],
      }),
      undefined
    )!;
    expect(one.summary).toBe("1 proposed change");
  });

  it("gives two edits to one row distinct identities", () => {
    const review = approvalReview(pending(), undefined)!;
    const ids = review.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("what the summary controls promise", () => {
  it("offers all of it while nothing has been decided", () => {
    const review = approvalReview(pending(), undefined)!;
    expect(review.started).toBe(false);
    expect(review.approveLabel).toBe("Approve all");
    expect(review.rejectLabel).toBe("Reject all");
    expect(review.tally).toBeUndefined();
  });

  it("offers only the rest once a row has been decided", () => {
    // "Approve all" would be a lie: the refused row stays refused.
    const review = approvalReview(
      pending({ decisions: ["rejected", "pending", "pending", "pending"] }),
      undefined
    )!;
    expect(review.started).toBe(true);
    expect(review.approveLabel).toBe("Approve remaining");
    expect(review.rejectLabel).toBe("Reject remaining");
    expect(review.tally).toBe("0 approved · 1 rejected · 3 left");
  });

  it("keeps a live tally as decisions accumulate", () => {
    const review = approvalReview(
      pending({ decisions: ["approved", "approved", "rejected", "pending"] }),
      undefined
    )!;
    expect(review.approved).toBe(2);
    expect(review.rejected).toBe(1);
    expect(review.pending).toBe(1);
  });
});

describe("showing the first few", () => {
  it("previews three and says how many more there are", () => {
    const review = approvalReview(pending(), undefined)!;
    expect(review.preview).toHaveLength(3);
    expect(review.truncated).toBe(true);
    expect(review.reviewAllLabel).toBe("Review all 4 changes");
  });

  it("offers no expansion when the preview is the whole list", () => {
    const review = approvalReview(
      pending({
        proposals: [
          { rowKey: "r1", after: 1 },
          { rowKey: "r2", after: 2 },
        ],
        decisions: ["pending", "pending"],
      }),
      undefined
    )!;
    expect(review.truncated).toBe(false);
    expect(review.reviewAllLabel).toBeUndefined();
  });
});

describe("a write that named no rows", () => {
  const operation = pending({
    proposals: [],
    decisions: [],
    operation: {
      capability: "staff.activateAll",
      title: "Activate everyone",
      arguments: { status: "Active" },
    },
    // No rows means no per-row controls to offer.
    decideAt: undefined,
  });

  it("carries the operation and offers no per-item decisions", () => {
    const review = approvalReview(operation, undefined)!;
    expect(review.operation?.title).toBe("Activate everyone");
    expect(review.perItem).toBe(false);
    expect(review.changes).toBe(0);
    // No invented row count.
    expect(review.rows).toBe(0);
  });

  it("still offers a whole answer", () => {
    const review = approvalReview(operation, undefined)!;
    expect(review.approveLabel).toBe("Approve all");
    expect(review.truncated).toBe(false);
  });
});

describe("localization", () => {
  it("uses the table's own wording throughout", () => {
    const review = approvalReview(
      pending({ decisions: ["approved", "pending", "pending", "pending"] }),
      {
        proposalSummary: ({ changes, rows }) =>
          `LOC ${String(changes)}/${String(rows)}`,
        proposalTally: ({ approved }) => `LOC tally ${String(approved)}`,
        approveRemainingProposals: "LOC approve rest",
        rejectRemainingProposals: "LOC reject rest",
        reviewAllProposals: (count) => `LOC all ${String(count)}`,
      }
    )!;
    expect(review.summary).toBe("LOC 4/3");
    expect(review.tally).toBe("LOC tally 1");
    expect(review.approveLabel).toBe("LOC approve rest");
    expect(review.rejectLabel).toBe("LOC reject rest");
    expect(review.reviewAllLabel).toBe("LOC all 4");
  });
});
