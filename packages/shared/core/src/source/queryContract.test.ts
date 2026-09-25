/**
 * The query contract's promise is compatibility: a source that declares
 * nothing must receive exactly the query it received before these fields
 * existed, and one that declares a capability must receive that field and no
 * others.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import {
  applyQuerySupport,
  isFilterGroup,
  type QueryExtensions,
  type QueryFilterGroup,
} from "./queryContract";

const ALL: QueryExtensions = {
  groupBy: ["team"],
  aggregates: [{ key: "budget", fn: "sum" }],
  filterTree: {
    combinator: "and",
    conditions: [{ key: "status", op: "eq", value: "Active" }],
  },
  facets: ["status"],
  cursor: "opaque-token",
  expandedIds: ["src", "lib"],
};

describe("applyQuerySupport", () => {
  beforeEach(() => {
    resetDevWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("sends nothing extra when the source declares no support", () => {
    expect(applyQuerySupport(ALL, undefined)).toEqual({});
  });

  it("sends nothing extra when support is declared but empty", () => {
    expect(applyQuerySupport(ALL, {})).toEqual({});
  });

  it("sends only the fields whose capability was declared", () => {
    expect(applyQuerySupport(ALL, { grouping: true, facets: true })).toEqual({
      groupBy: ["team"],
      facets: ["status"],
    });
  });

  it("sends every field when every capability is declared", () => {
    const support = {
      grouping: true,
      aggregates: true,
      filterTree: true,
      facets: true,
      cursor: true,
      tree: true,
    };
    expect(applyQuerySupport(ALL, support)).toEqual(ALL);
  });

  it("sends the open tree nodes only to a source that answers trees", () => {
    // A browser holding one page cannot know what is under a branch it has
    // never seen, so a large tree is the server's to walk — but only if it
    // said it could.
    expect(applyQuerySupport(ALL, { tree: true })).toEqual({
      expandedIds: ["src", "lib"],
    });
  });

  it("names the tree remedy when the capability is missing", () => {
    applyQuerySupport({ expandedIds: ["src"] }, {});
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain(
      "supports.tree"
    );
  });

  it("omits fields the caller never set, without warning about them", () => {
    applyQuerySupport({ groupBy: ["team"] }, { grouping: true });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("warns once per capability, naming the field and what to do", () => {
    applyQuerySupport({ groupBy: ["team"] }, undefined);
    applyQuerySupport({ groupBy: ["dept"] }, undefined);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain("groupBy");
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain(
      "supports.grouping"
    );
  });

  it("stays silent when asked to", () => {
    applyQuerySupport(ALL, undefined, { warn: false });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("never mutates the extensions it was handed", () => {
    const input = { ...ALL };
    applyQuerySupport(input, { grouping: true });
    expect(input).toEqual(ALL);
  });
});

describe("isFilterGroup", () => {
  it("tells a nested group from a leaf condition", () => {
    const group: QueryFilterGroup = {
      combinator: "or",
      conditions: [
        { key: "a", op: "eq", value: 1 },
        {
          combinator: "and",
          conditions: [{ key: "b", op: "gt", value: 2 }],
        },
      ],
    };
    expect(isFilterGroup(group.conditions[0]!)).toBe(false);
    expect(isFilterGroup(group.conditions[1]!)).toBe(true);
  });
});
