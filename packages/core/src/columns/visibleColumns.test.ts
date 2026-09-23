import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import { visibleColumns } from "./visibleColumns";

interface Row {
  id: string;
}
const cols: ColumnModel<Row>[] = [
  { key: "a", header: "A" },
  { key: "b", header: "B", hideOnMobile: true },
  { key: "c", header: "C" },
  { key: "d", header: "D", hideOnMobile: true },
  { key: "e", header: "E", hideOnDesktop: true },
];

describe("visibleColumns", () => {
  it("drops hideOnDesktop columns on desktop", () => {
    expect(visibleColumns(cols, "desktop").map((c) => c.key)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("never overrides an explicit hideOnMobile — the author's hide wins", () => {
    // b and d are explicitly hidden on mobile: they NEVER surface, identity
    // default or not; a and c stay; e is mobile-only (hideOnDesktop).
    expect(visibleColumns(cols, "mobile").map((c) => c.key)).toEqual([
      "a",
      "c",
      "e",
    ]);
  });

  it("anchors only columns without an explicit mobile hide", () => {
    // Even with a single identity slot, explicit hides stay hidden and the
    // remaining desktop-visible columns render as normal.
    expect(visibleColumns(cols, "mobile", 1).map((c) => c.key)).toEqual([
      "a",
      "c",
      "e",
    ]);
  });

  it("renders a mobile-only column (hideOnDesktop) on mobile but not desktop", () => {
    const mobileOnly: ColumnModel<Row>[] = [
      { key: "name", header: "Name" },
      { key: "summary", header: "Summary", hideOnDesktop: true },
    ];
    expect(visibleColumns(mobileOnly, "desktop").map((c) => c.key)).toEqual([
      "name",
    ]);
    expect(visibleColumns(mobileOnly, "mobile").map((c) => c.key)).toEqual([
      "name",
      "summary",
    ]);
  });
});

describe("visibleColumns — the deprecated identity argument", () => {
  it("never changes the mobile column set, whatever its count", () => {
    const columns: ColumnModel<Row>[] = [
      { key: "a", header: "A" },
      { key: "b", header: "B", hideOnMobile: true },
      { key: "c", header: "C" },
      { key: "d", header: "D", hideOnDesktop: true },
      { key: "e", header: "E" },
    ];
    const keys = (count: number) =>
      visibleColumns(columns, "mobile", count).map((column) => column.key);

    expect(keys(0)).toEqual(["a", "c", "d", "e"]);
    expect(keys(1)).toEqual(keys(0));
    expect(keys(3)).toEqual(keys(0));
    expect(keys(10)).toEqual(keys(0));
  });
});
