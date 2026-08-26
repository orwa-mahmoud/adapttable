/**
 * `@adapttable/core/stream` — the public door, not a second copy of the
 * modules behind it.
 */
import { describe, expect, it } from "vitest";

import {
  parseRowPatchFrame,
  useChangedCellFlash,
  useRowPatchStream,
} from "./stream";

describe("@adapttable/core/stream", () => {
  it("exports the hook and the wire parser from the same entry", () => {
    expect(typeof useRowPatchStream).toBe("function");
    expect(typeof useChangedCellFlash).toBe("function");
    expect(parseRowPatchFrame('{"type":"remove","id":"a"}')).toEqual([
      { type: "remove", id: "a" },
    ]);
  });
});
