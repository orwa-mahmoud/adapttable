/**
 * Parsing the table's query on the server.
 *
 * Nearly every test here is about a request that should NOT be trusted,
 * because that is what the package is for. A URL is user input the moment it
 * leaves the browser, and the failure this prevents — a column name chosen by
 * the caller reaching a database — does not look like a bug until it does.
 */
import {
  type QueryFilterGroup,
  serializeFilterTree,
} from "@adapttable/core/query";
import { describe, expect, it } from "vitest";

import { parseTableQuery } from "./index";

/**
 * A tree encoded the way the table encodes it — through core's own codec, so
 * this cannot drift from the format the browser actually writes. Imported from
 * the same React-free entry the source uses, so a test can never be the reason
 * this package looks like it can reach a hook.
 */
const treeParam = (tree: QueryFilterGroup) =>
  `?ft=${encodeURIComponent(serializeFilterTree(tree) ?? "")}`;

const schema = { columns: ["name", "team", "budget"] };

describe("parseTableQuery", () => {
  it("reads a plain query", () => {
    const query = parseTableQuery("?page=2&limit=10&q=ali", schema);

    expect(query.page).toBe(2);
    expect(query.limit).toBe(10);
    expect(query.search).toBe("ali");
    expect(query.rejected).toEqual([]);
  });

  it("computes the offset, so every caller does not", () => {
    expect(parseTableQuery("?page=3&limit=20", schema).offset).toBe(40);
    expect(parseTableQuery("", schema).offset).toBe(0);
  });

  it("takes a Request, a URL, a query string or params", () => {
    const expected = "ali";
    const url = "https://example.com/api/people?q=ali";

    expect(parseTableQuery(url, schema).search).toBe(expected);
    expect(parseTableQuery(new URL(url), schema).search).toBe(expected);
    expect(parseTableQuery({ url }, schema).search).toBe(expected);
    expect(parseTableQuery(new URLSearchParams("q=ali"), schema).search).toBe(
      expected
    );
    expect(parseTableQuery("q=ali", schema).search).toBe(expected);
  });

  describe("what it refuses", () => {
    it("drops a sort on a column that is not in the schema", () => {
      // The failure this exists to prevent: a column name chosen by the
      // caller reaching the database.
      const query = parseTableQuery("?sortBy=password", schema);

      expect(query.sort).toEqual([]);
      expect(query.rejected).toEqual([
        { param: "sortBy", value: "password", reason: "not a sortable column" },
      ]);
    });

    it("keeps the valid levels of a sort chain and drops the rest", () => {
      const query = parseTableQuery("?sort=name:asc,secret:desc,team:desc", {
        columns: ["name", "team"],
      });

      expect(query.sort).toEqual([
        { key: "name", dir: "asc" },
        { key: "team", dir: "desc" },
      ]);
      expect(query.rejected).toHaveLength(1);
    });

    it("drops a filter on a column that is not in the schema", () => {
      const query = parseTableQuery("?f_team=core&f_password=x", schema);

      expect(query.filters).toEqual({ team: "core" });
      expect(query.rejected[0]?.param).toBe("f_password");
    });

    it("drops a groupBy the schema does not allow", () => {
      const query = parseTableQuery("?groupBy=salary", schema);

      expect(query.groupBy).toBeUndefined();
      expect(query.rejected).toHaveLength(1);
    });

    it("clamps a limit above the ceiling and says so", () => {
      const query = parseTableQuery("?limit=999999", {
        ...schema,
        maxLimit: 100,
      });

      expect(query.limit).toBe(100);
      expect(query.rejected[0]?.reason).toContain("100");
    });

    it("never lets a schema raise the limit past the table's own ceiling", () => {
      const query = parseTableQuery("?limit=100000", {
        ...schema,
        maxLimit: 10_000,
      });

      expect(query.limit).toBe(500);
    });

    it("drops the WHOLE filter tree when one field is unknown", () => {
      // Dropping a single condition out of an AND quietly WIDENS the result
      // set — the one failure mode a filter must not have.
      const query = parseTableQuery(
        treeParam({
          combinator: "and",
          conditions: [
            { key: "team", op: "eq", value: "core" },
            { key: "password", op: "contains", value: "x" },
          ],
        }),
        schema
      );

      expect(query.filterTree).toBeUndefined();
      expect(query.rejected[0]?.reason).toContain("unknown columns");
    });

    it("checks a nested group too", () => {
      const query = parseTableQuery(
        treeParam({
          combinator: "and",
          conditions: [
            {
              combinator: "or",
              conditions: [{ key: "password", op: "eq", value: "x" }],
            },
          ],
        }),
        schema
      );

      expect(query.filterTree).toBeUndefined();
    });

    it("keeps a filter tree whose fields all check out", () => {
      const query = parseTableQuery(
        treeParam({
          combinator: "and",
          conditions: [{ key: "team", op: "eq", value: "core" }],
        }),
        schema
      );

      expect(query.filterTree?.combinator).toBe("and");
      expect(query.rejected).toEqual([]);
    });

    it("reports a filter tree it cannot read at all", () => {
      const query = parseTableQuery("?ft=not-json", schema);

      expect(query.filterTree).toBeUndefined();
      expect(query.rejected[0]?.reason).toContain("readable");
    });

    it("drops unknown pivot fields and keeps the rest", () => {
      const query = parseTableQuery(
        "?pivot=rows:team,secret;sum:budget",
        schema
      );

      expect(query.pivot?.rows).toEqual(["team"]);
      expect(query.pivot?.measures).toEqual([{ key: "budget", agg: "sum" }]);
      expect(query.rejected).toHaveLength(1);
    });

    it("reports nothing at all for a pivot with no valid field left", () => {
      const query = parseTableQuery("?pivot=rows:secret", schema);

      expect(query.pivot).toBeUndefined();
      expect(query.pivotCollapsed).toBeUndefined();
    });

    it("keeps the switches and the folded groups a link carried", () => {
      // A schema vouches for column names. The rest is the client's view of its
      // own table, and answering with subtotals it asked to hide would answer a
      // different question.
      const query = parseTableQuery(
        "?pivot=rows:team;sum:budget;sub:0;grand:0;hide:EU/Alpha",
        schema
      );

      expect(query.pivot?.subtotals).toBe(false);
      expect(query.pivot?.grandTotals).toBe(false);
      expect(query.pivotCollapsed).toHaveLength(1);
      // The key names the path it folds. Its separator is a control
      // character, written here as a code point so this file stays text.
      expect(query.pivotCollapsed?.[0]?.split(String.fromCodePoint(0))).toEqual(
        ["EU", "Alpha"]
      );
      expect(query.rejected).toEqual([]);
    });

    it("reads a pivot parameter from before those fields existed", () => {
      const query = parseTableQuery("?pivot=rows:team;sum:budget", schema);

      expect(query.pivot).toEqual({
        rows: ["team"],
        columns: [],
        measures: [{ key: "budget", agg: "sum" }],
      });
      expect(query.pivotCollapsed).toBeUndefined();
    });
  });

  describe("what it tolerates", () => {
    it("treats a nonsense page or limit as the default", () => {
      // A stale bookmark should give a table, not an error page.
      const query = parseTableQuery("?page=-4&limit=abc", schema);

      expect(query.page).toBe(1);
      expect(query.limit).toBe(25);
    });

    it("honours the schema's default page size", () => {
      expect(parseTableQuery("", { ...schema, defaultLimit: 50 }).limit).toBe(
        50
      );
    });

    it("reads a repeated filter as the multi-value it is", () => {
      const query = parseTableQuery("?f_team=core&f_team=platform", schema);

      expect(query.filters.team).toEqual(["core", "platform"]);
    });

    it("skips a malformed level rather than losing the whole ordering", () => {
      const query = parseTableQuery("?sort=name:asc,,team", schema);

      expect(query.sort).toEqual([
        { key: "name", dir: "asc" },
        { key: "team", dir: "asc" },
      ]);
    });

    it("leaves an empty search out rather than filtering on nothing", () => {
      expect(parseTableQuery("?q=", schema).search).toBeUndefined();
    });
  });

  describe("the shapes a hand-edited link still takes", () => {
    it("still reads the single-column sort form an older link carries", () => {
      expect(parseTableQuery("?sortBy=team&sortDir=desc", schema).sort).toEqual(
        [{ key: "team", dir: "desc" }]
      );
      // Anything that is not `desc` is ascending: a link is user input, and a
      // typo in the direction should not lose the ordering.
      expect(parseTableQuery("?sortBy=team&sortDir=up", schema).sort).toEqual([
        { key: "team", dir: "asc" },
      ]);
      expect(parseTableQuery("?sortBy=team", schema).sort).toEqual([
        { key: "team", dir: "asc" },
      ]);
    });

    it("drops the single-column sort form when it names a forbidden column", () => {
      const query = parseTableQuery("?sortBy=password&sortDir=desc", schema);

      expect(query.sort).toEqual([]);
      expect(query.rejected).toEqual([
        { param: "sortBy", value: "password", reason: "not a sortable column" },
      ]);
    });

    it("passes a groupBy the schema allows straight through", () => {
      const query = parseTableQuery("?groupBy=team", schema);

      expect(query.groupBy).toBe("team");
      expect(query.rejected).toEqual([]);
    });

    it("treats an empty q and an empty groupBy as absent, not as values", () => {
      const query = parseTableQuery("?q=&groupBy=", schema);

      expect(query.search).toBeUndefined();
      expect(query.groupBy).toBeUndefined();
      expect(query.rejected).toEqual([]);
    });

    it("drops a forbidden column from the pivot's column axis", () => {
      const query = parseTableQuery(
        "?pivot=rows:team;cols:secret,name;sum:budget",
        schema
      );

      expect(query.pivot?.columns).toEqual(["name"]);
      expect(query.rejected).toEqual([
        { param: "pivot", value: "secret", reason: "not a pivotable column" },
      ]);
    });
  });

  describe("a schema that asks for more than it allows", () => {
    it("caps its own default and says the limit was refused", () => {
      const query = parseTableQuery("", {
        columns: ["name"],
        defaultLimit: 500,
        maxLimit: 50,
      });

      expect(query.limit).toBe(50);
      expect(query.rejected).toEqual([
        { param: "limit", value: "", reason: "above the maximum of 50" },
      ]);
    });
  });

  describe("two tables sharing one URL", () => {
    it("reads only its own namespace", () => {
      const query = parseTableQuery("?left.q=ali&right.q=bob&left.page=3", {
        ...schema,
        urlKey: "left",
      });

      expect(query.search).toBe("ali");
      expect(query.page).toBe(3);
    });

    it("reports a rejection without its namespace", () => {
      const query = parseTableQuery("?left.f_password=x", {
        ...schema,
        urlKey: "left",
      });

      expect(query.rejected[0]?.param).toBe("f_password");
    });
  });

  it("passes a cursor through untouched", () => {
    // Opaque by contract: the table never reads one, and neither does this.
    const query = parseTableQuery("?cursor=abc123", schema);

    expect(query.cursor).toBe("abc123");
  });

  it("gives a route enough to be strict when it wants to be", () => {
    const query = parseTableQuery("?sortBy=password&f_secret=1", schema);

    expect(query.rejected).toHaveLength(2);
    expect(
      query.rejected.map((r) => r.param).sort((a, b) => a.localeCompare(b))
    ).toEqual(["f_secret", "sortBy"]);
  });
});
