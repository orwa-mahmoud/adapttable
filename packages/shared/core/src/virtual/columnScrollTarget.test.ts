import { describe, expect, it } from "vitest";

import { columnScrollTarget } from "./bodyWindow";
describe("logical virtual column reveal", () => {
  const columns = [{ key: "pin" }, { key: "a" }, { key: "b" }, { key: "c" }];
  it("reveals only offscreen unpinned columns, using neutral default widths", () => {
    const input = {
      columns,
      viewport: { start: 0, width: 320 },
      pinnedKeys: new Set(["pin"]),
    };
    expect(columnScrollTarget({ ...input, columnKey: "a" })).toBeUndefined();
    expect(columnScrollTarget({ ...input, columnKey: "b" })).toBe(160);
    expect(columnScrollTarget({ ...input, columnKey: "pin" })).toBeUndefined();
    expect(
      columnScrollTarget({ ...input, columnKey: "missing" })
    ).toBeUndefined();
  });
  it("reveals the leading edge and wide trailing cells with declared widths", () => {
    expect(
      columnScrollTarget({
        columns,
        columnKey: "a",
        widths: { pin: 50 },
        viewport: { start: 300, width: 100 },
      })
    ).toBe(50);
    expect(
      columnScrollTarget({
        columns: [{ key: "a" }],
        columnKey: "a",
        widths: { a: 50 },
        viewport: { start: 0, width: 0 },
      })
    ).toBeUndefined();
  });
});

it("reserves start/end pins and injected controls in the usable viewport", () => {
  const columns = [
    { key: "start" },
    { key: "a" },
    { key: "b" },
    { key: "end" },
  ];
  const widths = { start: 100, a: 100, b: 100, end: 100 };
  const pinnedKeys = new Set(["start", "end"]);
  expect(
    columnScrollTarget({
      columns,
      widths,
      pinnedKeys,
      columnKey: "b",
      viewport: { start: 0, width: 300 },
    })
  ).toBe(100);
  expect(
    columnScrollTarget({
      columns,
      widths,
      pinnedKeys,
      columnKey: "b",
      viewport: { start: 0, width: 300 },
      leadingWidth: 40,
      trailingWidth: 20,
    })
  ).toBe(140);
  expect(
    columnScrollTarget({
      columns,
      widths,
      pinnedKeys,
      columnKey: "a",
      viewport: { start: 160, width: 300 },
      leadingWidth: 40,
      trailingWidth: 20,
    })
  ).toBe(40);
  expect(
    columnScrollTarget({
      columns,
      widths,
      pinnedKeys,
      columnKey: "b",
      viewport: { start: 160, width: 300 },
      leadingWidth: 40,
      trailingWidth: 20,
    })
  ).toBe(140);
});

it("keeps an oversized revealed column on its leading edge without oscillation", () => {
  const input = {
    columns: [{ key: "a" }, { key: "b" }],
    columnKey: "b",
    widths: { a: 100, b: 200 },
    viewport: { start: 0, width: 80 },
  };
  expect(columnScrollTarget(input)).toBe(100);
  expect(
    columnScrollTarget({ ...input, viewport: { start: 100, width: 80 } })
  ).toBeUndefined();
});
