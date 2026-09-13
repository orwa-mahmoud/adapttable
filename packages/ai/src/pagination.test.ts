/**
 * Pages are counted, never guessed.
 */
import { describe, expect, it } from "vitest";

import { agentPagination, pageRefusal, pageSizeRefusal } from "./pagination";

describe("a source that counted its matching rows", () => {
  it("divides the total by the page size", () => {
    const p = agentPagination({
      page: 1,
      pageSize: 25,
      totalRows: 130,
      canJump: true,
    });
    expect(p.totalPages).toBe(6);
    expect(p.hasNext).toBe(true);
    expect(p.hasPrevious).toBe(false);
  });

  it("gives a table that fits on one page exactly one page", () => {
    // Eight rows at ten a page. The defect this replaces read the eight as a
    // page bound and let an agent report a move to a page that is not there.
    const p = agentPagination({
      page: 1,
      pageSize: 10,
      totalRows: 8,
      canJump: true,
    });
    expect(p.totalPages).toBe(1);
    expect(p.hasNext).toBe(false);
    expect(pageRefusal(p, 2)).toMatch(/past the last page/);
  });

  it("keeps one page for an empty result", () => {
    const p = agentPagination({
      page: 1,
      pageSize: 25,
      totalRows: 0,
      canJump: true,
    });
    expect(p.totalPages).toBe(1);
    expect(p.hasNext).toBe(false);
  });

  it("counts the filtered total, and moves when the page size changes", () => {
    const wide = agentPagination({
      page: 1,
      pageSize: 100,
      totalRows: 130,
      canJump: true,
    });
    expect(wide.totalPages).toBe(2);
    const narrow = agentPagination({
      page: 1,
      pageSize: 10,
      totalRows: 130,
      canJump: true,
    });
    expect(narrow.totalPages).toBe(13);
  });

  it("says where the last page is when the ask is past it", () => {
    const p = agentPagination({
      page: 2,
      pageSize: 25,
      totalRows: 130,
      canJump: true,
    });
    expect(pageRefusal(p, 40)).toBe(
      "page 40 is past the last page (6 of 130 matching rows at 25 a page)"
    );
    expect(pageRefusal(p, 6)).toBeUndefined();
  });
});

describe("a source of unknown length", () => {
  it("leaves the total and the last page unknown", () => {
    const p = agentPagination({ page: 3, pageSize: 25, canJump: true });
    expect(p.totalRows).toBeUndefined();
    expect(p.totalPages).toBeUndefined();
    expect(p.hasNext).toBeUndefined();
    expect(p.hasPrevious).toBe(true);
  });

  it("lets a host that supports jumps keep supporting them", () => {
    // No fabricated total is required to name a page: the host said it takes
    // page numbers, so it takes them.
    const p = agentPagination({ page: 3, pageSize: 25, canJump: true });
    expect(pageRefusal(p, 40)).toBeUndefined();
  });

  it("moves one page at a time where that is all the source does", () => {
    const p = agentPagination({ page: 3, pageSize: 25, canJump: false });
    expect(pageRefusal(p, 4)).toBeUndefined();
    expect(pageRefusal(p, 2)).toBeUndefined();
    expect(pageRefusal(p, 9)).toMatch(/one page at a time/);
  });

  it("believes a source that says it is finished", () => {
    const p = agentPagination({
      page: 4,
      pageSize: 25,
      atEnd: true,
      canJump: true,
    });
    expect(p.hasNext).toBe(false);
    expect(pageRefusal(p, 5)).toMatch(/no page after 4/);
  });

  it("reads a short page as the last one", () => {
    const p = agentPagination({
      page: 4,
      pageSize: 25,
      loadedRows: 7,
      canJump: true,
    });
    expect(p.hasNext).toBe(false);
  });

  it("reads a full page as proving nothing either way", () => {
    const p = agentPagination({
      page: 4,
      pageSize: 25,
      loadedRows: 25,
      canJump: true,
    });
    expect(p.hasNext).toBeUndefined();
  });
});

describe("what a page number has to be", () => {
  const p = agentPagination({
    page: 1,
    pageSize: 25,
    totalRows: 130,
    canJump: true,
  });

  it("is a whole number of one or more", () => {
    for (const bad of [0, -1, 1.5, "2", null, undefined]) {
      expect(pageRefusal(p, bad)).toMatch(/whole number of 1 or more/);
    }
  });
});

describe("what a page size has to be", () => {
  it("is one the table offers, when it offers a set", () => {
    const p = agentPagination({
      page: 1,
      pageSize: 25,
      pageSizeOptions: [10, 25, 50],
      totalRows: 130,
      canJump: true,
    });
    expect(pageSizeRefusal(p, 50)).toBeUndefined();
    expect(pageSizeRefusal(p, 37)).toMatch(/offers 10, 25, 50/);
  });

  it("is any whole number where the table offers no set", () => {
    const p = agentPagination({ page: 1, pageSize: 25, canJump: true });
    expect(pageSizeRefusal(p, 37)).toBeUndefined();
    expect(pageSizeRefusal(p, 0)).toMatch(/whole number/);
  });
});
