/**
 * `@adapttable/react/stream` — hooks plus the shared wire parser.
 */
import { describe, expect, it } from "vitest";

import {
  parseRowPatchFrame,
  useChangedCellFlash,
  useRowPatchStream,
} from "./stream";

describe("@adapttable/react/stream", () => {
  it("exports the hook and the wire parser from the same entry", () => {
    expect(typeof useRowPatchStream).toBe("function");
    expect(typeof useChangedCellFlash).toBe("function");
    expect(parseRowPatchFrame('{"type":"remove","id":"a"}')).toEqual([
      { type: "remove", id: "a" },
    ]);
  });
});
