/**
 * The server package and the query entry load in a process with no browser.
 *
 * A top-level read of `window` or `document` would throw here, before any
 * query is parsed.
 */
import { describe, expect, it } from "vitest";

describe("server and query import", () => {
  it("loads with no browser global", async () => {
    expect(typeof globalThis.window).toBe("undefined");
    expect(typeof globalThis.document).toBe("undefined");
    const server = await import("./index");
    const query = await import("@adapttable/core/query");
    expect(typeof server.parseTableQuery).toBe("function");
    expect(typeof query.parseFilterTree).toBe("function");
  });
});
