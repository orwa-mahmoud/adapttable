import { describe, expect, it } from "vitest";

import {
  isStreamLive,
  isStreamSettled,
  type RowPatchStreamStatus,
} from "./status";

const EVERY: readonly RowPatchStreamStatus[] = [
  "idle",
  "connecting",
  "open",
  "reconnecting",
  "error",
  "closed",
];

/**
 * The two questions a host actually asks a status: is data arriving, and is
 * there any point waiting. Answered here over every status so a new one
 * cannot be added without deciding what it means.
 */
describe("stream status", () => {
  it("only `open` is carrying patches", () => {
    expect(EVERY.filter(isStreamLive)).toEqual(["open"]);
  });

  it("`error` and `closed` are the ones nothing recovers from", () => {
    // `reconnecting` is deliberately NOT settled: a retry is already
    // scheduled, so a host showing "give up" there would be lying.
    expect(EVERY.filter(isStreamSettled)).toEqual(["error", "closed"]);
  });
});
