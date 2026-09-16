import { describe, expect, it } from "vitest";

import {
  applyTableUrlState,
  captureTableUrlState,
  MAX_TABLE_URL_STATE_LENGTH,
  parseTableUrlState,
  updateTableUrlState,
} from "./urlStateCodec";

function params(search: string): URLSearchParams {
  return new URLSearchParams(search);
}

function fuzzCorpus(): string[] {
  const alphabet = [
    "a",
    "Z",
    "0",
    " ",
    "&",
    "=",
    "%",
    ",",
    ":",
    ".",
    "/",
    "\n",
    "\0",
    "é",
    "بحث",
    "中",
    "😀",
  ];
  let seed = 0x5eed1234;
  const generated: string[] = [];
  for (let sample = 0; sample < 160; sample += 1) {
    let value = "";
    const length = sample % 31;
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      value += alphabet[seed % alphabet.length];
    }
    generated.push(value);
  }
  return generated;
}

describe("versioned table URL state codec", () => {
  it("decodes what it encodes across a deterministic Unicode corpus", () => {
    for (const value of fuzzCorpus()) {
      const encoded = updateTableUrlState("", "", (table) => {
        table.set("q", value);
        table.set("f_label", value);
      });
      const decoded = parseTableUrlState(encoded, "");
      expect(decoded.get("atv")).toBe("1");
      expect(decoded.get("q")).toBe(value);
      expect(decoded.get("f_label")).toBe(value);
    }
  });

  it("reads an unmarked link as version 1 and stamps its next write", () => {
    expect(parseTableUrlState("q=existing", "").get("q")).toBe("existing");

    const written = params(
      updateTableUrlState("q=existing", "", (table) => {
        table.set("page", "2");
      })
    );
    expect(written.get("q")).toBe("existing");
    expect(written.get("page")).toBe("2");
    expect(written.get("atv")).toBe("1");
  });

  it("keeps the find query beside q through capture and apply", () => {
    const encoded = updateTableUrlState("q=roster&atv=1", "", (table) => {
      table.set("find", "Ada");
    });
    expect(params(encoded).get("find")).toBe("Ada");
    expect(params(encoded).get("q")).toBe("roster");
    const captured = captureTableUrlState(encoded, "");
    expect(params(captured).get("find")).toBe("Ada");
    const restored = applyTableUrlState("app=keep&find=stale", captured, "");
    expect(params(restored).get("find")).toBe("Ada");
    expect(params(restored).get("app")).toBe("keep");
  });

  it("drops live keys the saved view does not mention", () => {
    const captured = captureTableUrlState("q=ali&sortBy=name&atv=1", "");
    const restored = applyTableUrlState(
      "q=changed&sortBy=keep&page=3&formula=total:=1&atv=1",
      captured,
      ""
    );
    const next = params(restored);
    expect(next.get("q")).toBe("ali");
    expect(next.get("sortBy")).toBe("name");
    expect(next.get("page")).toBeNull();
    expect(next.get("formula")).toBeNull();
  });

  it("uses the first duplicate and canonicalizes duplicates on write", () => {
    const initial = "q=first&q=second&page=2&page=9";
    const decoded = parseTableUrlState(initial, "");
    expect(decoded.get("q")).toBe("first");
    expect(decoded.get("page")).toBe("2");

    const written = params(updateTableUrlState(initial, "", () => undefined));
    expect(written.getAll("q")).toEqual(["first"]);
    expect(written.getAll("page")).toEqual(["2"]);
  });

  it("recovers only the unsupported namespace and preserves unknown params", () => {
    const initial =
      "left.atv=2&left.q=bad&left.future=x&right.atv=1&right.q=good&app=keep";
    expect(parseTableUrlState(initial, "left.").toString()).toBe("");
    expect(parseTableUrlState(initial, "right.").get("right.q")).toBe("good");

    const written = params(
      updateTableUrlState(initial, "left.", (table) => {
        table.set("left.q", "fixed");
      })
    );
    expect(written.get("left.atv")).toBe("1");
    expect(written.get("left.q")).toBe("fixed");
    expect(written.get("left.future")).toBe("x");
    expect(written.get("right.q")).toBe("good");
    expect(written.get("app")).toBe("keep");
  });

  it("treats malformed and truncated markers as unsupported", () => {
    expect(parseTableUrlState("atv=banana&q=bad", "").toString()).toBe("");
    expect(() => parseTableUrlState("atv=%E0%A4%A&q=bad", "")).not.toThrow();
    expect(parseTableUrlState("atv=%E0%A4%A&q=bad", "").toString()).toBe("");
  });

  it("ignores oversized input and accepts a bounded recovery write", () => {
    const oversized = `q=${"x".repeat(MAX_TABLE_URL_STATE_LENGTH)}&app=keep`;
    expect(parseTableUrlState(oversized, "").toString()).toBe("");

    const recovered = params(
      updateTableUrlState(oversized, "", (table) => {
        table.set("q", "safe");
      })
    );
    expect(recovered.get("q")).toBe("safe");
    expect(recovered.get("atv")).toBe("1");
    expect(recovered.get("app")).toBe("keep");
  });

  it("keeps the previous valid state when a write would exceed the cap", () => {
    const initial = "q=safe&atv=1&app=keep";
    const written = params(
      updateTableUrlState(initial, "", (table) => {
        table.set("q", "x".repeat(MAX_TABLE_URL_STATE_LENGTH));
      })
    );
    expect(written.get("q")).toBe("safe");
    expect(written.get("atv")).toBe("1");
    expect(written.get("app")).toBe("keep");
  });

  it("preserves a maximum-length unmarked v1 slice when no marker fits", () => {
    const value = "x".repeat(MAX_TABLE_URL_STATE_LENGTH - "q=".length);
    const initial = `q=${value}`;
    expect(initial).toHaveLength(MAX_TABLE_URL_STATE_LENGTH);

    const written = params(
      updateTableUrlState(initial, "", (table) => {
        table.set("q", `${value}x`);
      })
    );
    expect(written.get("q")).toBe(value);
    expect(written.get("atv")).toBeNull();

    const captured = params(captureTableUrlState(initial, ""));
    expect(captured.get("q")).toBe(value);
    expect(captured.get("atv")).toBeNull();
  });

  it("captures and applies only canonical state for one table", () => {
    const captured = captureTableUrlState(
      "left.q=first&left.q=second&left.future=x&right.q=keep",
      "left."
    );
    expect(params(captured).getAll("left.q")).toEqual(["first"]);
    expect(params(captured).get("left.atv")).toBe("1");
    expect(params(captured).has("left.future")).toBe(false);

    const applied = params(
      applyTableUrlState("left.q=old&right.q=keep&app=yes", captured, "left.")
    );
    expect(applied.get("left.q")).toBe("first");
    expect(applied.get("right.q")).toBe("keep");
    expect(applied.get("app")).toBe("yes");
  });

  it("refuses an oversized or unsupported saved slice", () => {
    const current = "left.q=current&left.atv=1&right.q=keep";
    const unsupported = applyTableUrlState(
      current,
      "left.atv=99&left.q=bad",
      "left."
    );
    expect(params(unsupported).get("left.q")).toBeNull();
    expect(params(unsupported).get("right.q")).toBe("keep");

    const oversized = applyTableUrlState(
      current,
      `left.q=${"x".repeat(MAX_TABLE_URL_STATE_LENGTH)}`,
      "left."
    );
    expect(params(oversized).get("left.q")).toBe("current");
    expect(params(oversized).get("right.q")).toBe("keep");
  });
});
