// @vitest-environment jsdom
/**
 * A responsive layout change keeps a cell editor's focus once the table edits
 * at all — and only then, so a table without editing never loads the keeper.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  // Each test starts before any editing store has installed the keeper.
  vi.resetModules();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

/** A table whose second editor holds focus, and the frames it waits on. */
function fixture() {
  document.body.innerHTML =
    '<div data-adapttable-part="root"><input data-adapttable-part="edit-cell-editor" value="first"><input data-adapttable-part="edit-cell-editor" value="draft text"></div>';
  const root = document.querySelector<HTMLElement>(
    '[data-adapttable-part="root"]'
  )!;
  root.querySelectorAll("input")[1]!.focus();
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => {
    frames.push(fn);
    return frames.length;
  });
  return {
    /** Lay the table out again: every control is a new element. */
    relayout: () => {
      root.replaceChildren(
        ...[...root.children].map((child) => child.cloneNode(true))
      );
      while (frames.length) frames.shift()!(0);
    },
    second: () => root.querySelectorAll("input")[1],
  };
}

describe("notifyLayoutChange", () => {
  it("does nothing before a table edits", async () => {
    const { notifyLayoutChange } = await import("./layoutChange");
    const table = fixture();
    notifyLayoutChange();
    table.relayout();
    expect(document.activeElement).toBe(document.body);
  });

  it("keeps the editor focused once a cell edit session exists", async () => {
    const { notifyLayoutChange } = await import("./layoutChange");
    const { createCellEditSession } = await import("../editing/editSession");
    createCellEditSession();
    const table = fixture();
    notifyLayoutChange();
    table.relayout();
    expect(document.activeElement).toBe(table.second());
  });

  it("keeps the editor focused once a row edit store exists", async () => {
    const { notifyLayoutChange } = await import("./layoutChange");
    const { createRowEditStore } = await import("../editing/rowEditing");
    createRowEditStore({ columns: [] });
    const table = fixture();
    notifyLayoutChange();
    table.relayout();
    expect(document.activeElement).toBe(table.second());
  });
});
