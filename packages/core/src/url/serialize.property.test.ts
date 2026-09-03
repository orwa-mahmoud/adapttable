import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  MAX_LIMIT,
  readCollapsedGroups,
  readColumnLayout,
  readExtra,
  readFilterTreeParam,
  readLimit,
  readPage,
  readRowPins,
  readSortLevels,
  writeCollapsedGroups,
  writeColumnLayout,
  writeExtra,
  writeFilterTreeParam,
  writeRowPins,
  writeSortLevels,
} from "./serialize";

const reservedKeys = new Set(["__proto__", "constructor", "prototype"]);
const tokenArb = fc
  .string({ minLength: 1, maxLength: 24 })
  .filter((value) => value.trim() !== "" && !reservedKeys.has(value));

function cycle(write: (params: URLSearchParams) => void): URLSearchParams {
  const params = new URLSearchParams();
  write(params);
  return new URLSearchParams(params.toString());
}

describe("URL field codecs — properties", () => {
  it("readPage accepts only finite page numbers above zero", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 200 }),
        fc.integer({ min: 1, max: 20 }),
        (page, fallback) => {
          const got = readPage(new URLSearchParams(`page=${page}`), fallback);
          if (page > 0) expect(got).toBe(page);
          else expect(got).toBe(fallback);
        }
      )
    );
  });

  it("readLimit accepts only the shared (0, MAX_LIMIT] range", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 800 }),
        fc.integer({ min: 1, max: 50 }),
        (limit, fallback) => {
          const got = readLimit(
            new URLSearchParams(`limit=${limit}`),
            fallback
          );
          if (limit > 0 && limit <= MAX_LIMIT) expect(got).toBe(limit);
          else expect(got).toBe(fallback);
        }
      )
    );
  });

  it("extra-filter bags survive a real URLSearchParams hop", () => {
    fc.assert(
      fc.property(
        fc.record({
          status: tokenArb,
          count: fc.integer({ min: -20, max: 20 }),
          tags: fc.uniqueArray(tokenArb, {
            minLength: 1,
            maxLength: 4,
            selector: (tag) => tag.trim(),
          }),
        }),
        (extra) => {
          const cycled = cycle((params) => {
            writeExtra(params, extra);
          });
          expect(readExtra(cycled, ["count"], ["tags"])).toEqual({
            status: extra.status,
            count: extra.count,
            tags: extra.tags.map((tag) => tag.trim()).filter(Boolean),
          });
        }
      )
    );
  });

  it("sort levels round-trip keys that carry delimiter characters", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            key: tokenArb,
            dir: fc.constantFrom("asc", "desc"),
          }),
          { minLength: 0, maxLength: 5, selector: (level) => level.key }
        ),
        (levels) => {
          const cycled = cycle((params) => {
            writeSortLevels(params, levels);
          });
          expect(readSortLevels(cycled)).toEqual(levels);
        }
      )
    );
  });

  it("column layout round-trips after width clamp and name trim", () => {
    fc.assert(
      fc.property(
        fc.record({
          hidden: fc.uniqueArray(tokenArb, { maxLength: 4 }),
          order: fc.uniqueArray(tokenArb, { maxLength: 4 }),
          pinKey: tokenArb,
          side: fc.constantFrom("start", "end"),
          widthKey: tokenArb,
          width: fc.double({ min: 1, max: 8000, noNaN: true }),
          nameKey: tokenArb,
          name: tokenArb,
          collapsed: fc.uniqueArray(tokenArb, { maxLength: 3 }),
        }),
        (input) => {
          const cycled = cycle((params) => {
            writeColumnLayout(params, {
              hidden: input.hidden,
              order: input.order,
              pinned: { [input.pinKey]: input.side },
              widths: { [input.widthKey]: input.width },
              names: { [input.nameKey]: input.name },
              collapsedGroups: input.collapsed,
            });
          });
          const layout = readColumnLayout(cycled);
          expect(layout?.hidden).toEqual(input.hidden);
          expect(layout?.order).toEqual(input.order);
          expect(layout?.pinned).toEqual({ [input.pinKey]: input.side });
          expect(layout?.widths[input.widthKey]).toBe(
            Math.min(Math.max(Math.round(input.width), 60), 4000)
          );
          expect(layout?.names?.[input.nameKey]).toBe(input.name.trim());
          expect(layout?.collapsedGroups).toEqual(
            input.collapsed.length > 0 ? input.collapsed : undefined
          );
        }
      )
    );
  });

  it("row pins and collapsed groups survive encode/decode", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(tokenArb, { maxLength: 4 }),
        fc.uniqueArray(tokenArb, { maxLength: 4 }),
        fc.uniqueArray(tokenArb, { maxLength: 4 }),
        (top, bottom, closed) => {
          const pins = cycle((params) => {
            writeRowPins(params, { top, bottom });
          });
          expect(readRowPins(pins)).toEqual(
            top.length === 0 && bottom.length === 0
              ? undefined
              : { top, bottom }
          );
          const groups = cycle((params) => {
            writeCollapsedGroups(params, closed);
          });
          expect(readCollapsedGroups(groups)).toEqual(
            closed.length === 0 ? undefined : closed
          );
        }
      )
    );
  });

  it("filter trees round-trip the v1 encoding", () => {
    fc.assert(
      fc.property(
        fc.record({
          combinator: fc.constantFrom("and", "or"),
          key: tokenArb,
          op: fc.constantFrom("eq", "contains", "gt"),
          value: tokenArb,
        }),
        (input) => {
          const tree = {
            combinator: input.combinator,
            conditions: [{ key: input.key, op: input.op, value: input.value }],
          };
          const cycled = cycle((params) => {
            writeFilterTreeParam(params, tree);
          });
          expect(readFilterTreeParam(cycled)).toEqual(tree);
        }
      )
    );
  });
});
