/**
 * A table's URL is hand-editable and shareable, which means every reader here
 * is parsing text a person may have typed, truncated or half-encoded. None of
 * it may throw, and none of it may accept a value the table cannot honour — a
 * malformed sort direction has to read as "no sort", not as a direction the
 * comparator has never heard of.
 */
import { describe, expect, it } from "vitest";

import {
  isEmptyFilterValue,
  readExtra,
  readRowPins,
  readSortDir,
  writeExtra,
} from "./serialize";

const params = (query: string) => new URLSearchParams(query);

describe("readSortDir", () => {
  it("reads the two directions a table can honour", () => {
    expect(readSortDir(params("sortDir=asc"))).toBe("asc");
    expect(readSortDir(params("sortDir=desc"))).toBe("desc");
  });

  it("reads anything else as no direction at all", () => {
    expect(readSortDir(params(""))).toBeUndefined();
    expect(readSortDir(params("sortDir=sideways"))).toBeUndefined();
    expect(readSortDir(params("sortDir="))).toBeUndefined();
  });

  it("reads a namespaced table's own parameter", () => {
    expect(readSortDir(params("a.sortDir=desc&sortDir=asc"), "a.")).toBe(
      "desc"
    );
  });
});

describe("readExtra", () => {
  it("reads a single value and an array, decoding each entry", () => {
    // The stored value is percent-encoded per entry, so a value may hold the
    // comma the list is delimited by.
    const search = params("f_team=core");
    search.set("f_city", "Paris%2C%20FR,Lyon");
    const extra = readExtra(search, [], ["city"]);
    expect(extra.team).toBe("core");
    expect(extra.city).toEqual(["Paris, FR", "Lyon"]);
  });

  it("ignores an empty parameter and anything outside the prefix", () => {
    const extra = readExtra(params("f_team=&other=x"), [], []);
    expect(extra).toEqual({});
  });

  it("survives a percent sequence a person truncated by hand", () => {
    const extra = readExtra(params("f_city=Paris%2"), [], ["city"]);
    expect(extra.city).toEqual(["Paris%2"]);
  });
});

describe("isEmptyFilterValue", () => {
  it("treats nothing, blank text and an empty list as cleared", () => {
    expect(isEmptyFilterValue(undefined)).toBe(true);
    expect(isEmptyFilterValue(null as never)).toBe(true);
    expect(isEmptyFilterValue("")).toBe(true);
    expect(isEmptyFilterValue([])).toBe(true);
  });

  it("treats a real value as a filter", () => {
    expect(isEmptyFilterValue("core")).toBe(false);
    expect(isEmptyFilterValue(["core"])).toBe(false);
    expect(isEmptyFilterValue(0)).toBe(false);
    expect(isEmptyFilterValue(["false"])).toBe(false);
  });
});

describe("writeExtra", () => {
  it("replaces the filters already in the URL rather than adding to them", () => {
    const search = params("f_team=old&f_city=Paris&page=2");
    writeExtra(search, { team: "core" });
    expect(search.get("f_team")).toBe("core");
    expect(search.has("f_city")).toBe(false);
    expect(search.get("page")).toBe("2");
  });

  it("drops a cleared filter instead of writing an empty parameter", () => {
    const search = params("f_team=core");
    writeExtra(search, { team: "", city: [], seats: undefined });
    expect([...search.keys()]).toEqual([]);
  });

  it("encodes each list entry so a value may contain the delimiter", () => {
    const search = params("");
    writeExtra(search, { city: ["Paris, FR", " Lyon ", ""] });
    expect(search.get("f_city")).toBe("Paris%2C%20FR,Lyon");
    expect(readExtra(search, [], ["city"]).city).toEqual(["Paris, FR", "Lyon"]);
  });

  it("round-trips a namespaced table without touching its neighbour", () => {
    const search = params("b.f_team=web");
    writeExtra(search, { team: "core" }, "a.");
    expect(search.get("a.f_team")).toBe("core");
    expect(search.get("b.f_team")).toBe("web");
  });
});

describe("readRowPins", () => {
  it("reads nothing when the parameter is absent", () => {
    expect(readRowPins(params(""))).toBeUndefined();
  });

  it("reads each pinned row onto the edge it names", () => {
    expect(readRowPins(params("rowPin=r1%3Atop,r2%3Abottom"))).toEqual({
      top: ["r1"],
      bottom: ["r2"],
    });
  });

  it("skips an entry with no id, no side, or an edge that does not exist", () => {
    expect(
      readRowPins(
        params(
          "rowPin=" + encodeURIComponent(":top,r1:sideways,r2:top,justtext")
        )
      )
    ).toEqual({
      top: ["r2"],
      bottom: [],
    });
  });

  it("decodes an id that carried its own colon", () => {
    expect(
      readRowPins(params("rowPin=" + encodeURIComponent("order%3A9:top")))
    ).toEqual({
      top: ["order:9"],
      bottom: [],
    });
  });
});
