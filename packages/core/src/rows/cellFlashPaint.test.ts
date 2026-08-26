import { describe, expect, it } from "vitest";

import { cellFlashAttr, rowFlashSignature } from "./cellFlashPaint";

const flashing = (rowId: string, columnKey: string) =>
  rowId === "a" && columnKey === "budget";

describe("cellFlashAttr", () => {
  it("is empty when the cell is marked", () => {
    expect(cellFlashAttr(flashing, "a", "budget")).toBe("");
  });

  it("is omitted when the cell is not marked, or when nothing is wired", () => {
    expect(cellFlashAttr(flashing, "a", "name")).toBeUndefined();
    expect(cellFlashAttr(undefined, "a", "budget")).toBeUndefined();
  });
});

describe("rowFlashSignature", () => {
  const columns = [{ key: "name" }, { key: "budget" }, { key: "team" }];

  it("joins the flashing keys so a later mark invalidates the memo", () => {
    expect(rowFlashSignature(flashing, "a", columns)).toBe("budget");
    expect(rowFlashSignature(flashing, "b", columns)).toBe("");
  });

  it("is empty when the host never passed a reader", () => {
    expect(rowFlashSignature(undefined, "a", columns)).toBe("");
  });
});
