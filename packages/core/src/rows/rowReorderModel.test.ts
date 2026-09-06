/**
 * The digest a virtualized row is memoized against while a drag is in
 * progress. Every part of it is a paint the reader can see — the lift, the
 * drop edge under the pointer, the pause while the host confirms — so a digest
 * that does not change leaves the previous frame's chrome on screen.
 */
import { describe, expect, it } from "vitest";

import { type RowReorderDigest, rowReorderSignature } from "./rowReorderModel";

function digest(patch: Partial<RowReorderDigest> = {}): RowReorderDigest {
  return {
    lifted: null,
    pendingMove: null,
    isLifted: () => false,
    overIndex: null,
    ...patch,
  };
}

describe("rowReorderSignature", () => {
  it("has no digest at all when reordering is not composed", () => {
    expect(rowReorderSignature(undefined, "r1", 0)).toBeNull();
  });

  it("is empty while nothing is being dragged", () => {
    expect(rowReorderSignature(digest(), "r1", 0)).toBe("");
  });

  it("marks the drag, the lifted row and the row under the pointer", () => {
    const during = digest({
      lifted: { id: "r1" },
      isLifted: (id) => id === "r1",
      overIndex: 2,
      overPosition: "after",
    });
    expect(rowReorderSignature(during, "r1", 0)).toBe("Ld");
    expect(rowReorderSignature(during, "r2", 2)).toBe("Ltafter");
  });

  it("marks a move waiting on the host's answer", () => {
    expect(
      rowReorderSignature(
        digest({ pendingMove: { from: 0 }, hostConfirmPending: true }),
        "r1",
        0
      )
    ).toBe("PH");
  });

  it("ignores a stale target index once the drag has ended", () => {
    expect(
      rowReorderSignature(
        digest({ overIndex: 0, overPosition: "before" }),
        "r1",
        0
      )
    ).toBe("");
  });
});
