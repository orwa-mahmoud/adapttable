import { describe, expect, it } from "vitest";

import { parseRowPatchFrame } from "./parse";

interface Row {
  id: string;
  name: string;
}

/**
 * The wire format is the table's own patch shape as JSON. What matters here
 * is what happens to a frame that is NOT that: a malformed frame must be
 * dropped, never applied, because applying half of one can empty a table.
 */
describe("parseRowPatchFrame", () => {
  it("reads a single patch and an array of them alike", () => {
    expect(parseRowPatchFrame<Row>('{"type":"remove","id":"a"}')).toEqual([
      { type: "remove", id: "a" },
    ]);
    expect(
      parseRowPatchFrame<Row>(
        '[{"type":"remove","id":"a"},{"type":"remove","id":"b"}]'
      )
    ).toHaveLength(2);
  });

  it("carries each patch kind through with its fields", () => {
    const frame = JSON.stringify([
      { type: "insert", row: { id: "a", name: "Ada" }, at: 2 },
      { type: "update", id: "b", changes: { name: "Bo" } },
      { type: "upsert", row: { id: "c", name: "Cara" } },
      { type: "remove", id: "d" },
    ]);
    expect(parseRowPatchFrame<Row>(frame)).toEqual([
      { type: "insert", row: { id: "a", name: "Ada" }, at: 2 },
      { type: "update", id: "b", changes: { name: "Bo" } },
      { type: "upsert", row: { id: "c", name: "Cara" } },
      { type: "remove", id: "d" },
    ]);
  });

  it("takes a numeric id as a string, the way rowKey would", () => {
    expect(parseRowPatchFrame<Row>('{"type":"remove","id":7}')).toEqual([
      { type: "remove", id: "7" },
    ]);
  });

  it("drops a frame that is not JSON rather than throwing", () => {
    // Throwing here would take the connection down over one bad frame.
    expect(parseRowPatchFrame<Row>("not json at all")).toEqual([]);
    expect(parseRowPatchFrame<Row>("")).toEqual([]);
  });

  it("drops entries that could not be applied safely", () => {
    const frame = JSON.stringify([
      { type: "remove" }, // no id — would mean "remove what?"
      { type: "update", id: "a" }, // no changes
      { type: "insert", row: "Ada" }, // a row is an object
      { type: "explode", id: "a" }, // not a patch kind
      "just a string",
      null,
      { type: "remove", id: "" }, // an empty id is not an id
      { type: "remove", id: "keep" },
    ]);
    expect(parseRowPatchFrame<Row>(frame)).toEqual([
      { type: "remove", id: "keep" },
    ]);
  });

  it("leaves `at` off an insert that did not name a position", () => {
    expect(
      parseRowPatchFrame<Row>(
        '{"type":"insert","row":{"id":"a","name":"Ada"},"at":"end"}'
      )
    ).toEqual([
      { type: "insert", row: { id: "a", name: "Ada" }, at: undefined },
    ]);
  });
});
