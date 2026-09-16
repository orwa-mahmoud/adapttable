/**
 * What a failed bulk action says.
 *
 * A rejection can be anything at all — a library throws an `Error`, an API
 * rejects with a JSON body, a stray `throw "nope"` reaches here — and the bulk
 * bar has one line to show. Whatever arrives, the reader gets a sentence rather
 * than `[object Object]` or a blank bar.
 */
import { describe, expect, it } from "vitest";

import { bulkActionErrorMessage } from "./useBulkActionRunner";

describe("bulkActionErrorMessage", () => {
  it("says nothing when nothing failed", () => {
    expect(bulkActionErrorMessage(null)).toBeNull();
    expect(bulkActionErrorMessage(undefined)).toBeNull();
  });

  it("takes an Error's own message", () => {
    expect(bulkActionErrorMessage(new Error("Server said no"))).toBe(
      "Server said no"
    );
  });

  it("passes a thrown string through", () => {
    expect(bulkActionErrorMessage("Offline")).toBe("Offline");
  });

  it("renders the primitives someone might throw", () => {
    expect(bulkActionErrorMessage(503)).toBe("503");
    expect(bulkActionErrorMessage(false)).toBe("false");
    expect(bulkActionErrorMessage(9007199254740993n)).toBe("9007199254740993");
  });

  it("serializes a rejected response body", () => {
    expect(bulkActionErrorMessage({ code: 409, detail: "conflict" })).toBe(
      '{"code":409,"detail":"conflict"}'
    );
  });

  it("survives a value that cannot be serialized", () => {
    // A circular object, or one whose `toJSON` throws: the bar still gets a
    // line rather than the error handler itself throwing.
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(bulkActionErrorMessage(circular)).toBe("Unknown error");
  });

  it("survives a value that serializes to nothing", () => {
    expect(bulkActionErrorMessage(() => undefined)).toBe("Unknown error");
  });
});
