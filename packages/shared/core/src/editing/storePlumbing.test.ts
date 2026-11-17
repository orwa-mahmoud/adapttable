import { describe, expect, it, vi } from "vitest";

import { createTableStore } from "../state/tableStore";
import { stateCell } from "./storePlumbing";

describe("stateCell", () => {
  it("holds a value and tells its readers when it changes", () => {
    const cell = stateCell("drafts", 0, undefined);
    const heard = vi.fn();
    cell.subscribe(heard);
    cell.set(1);
    expect(cell.get()).toBe(1);
    expect(heard).toHaveBeenCalledTimes(1);
    cell.set(1);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("lives in the table's store: its writer sees a write at once, its readers when the change ends", () => {
    const store = createTableStore();
    const drafts = stateCell("drafts", 0, store);
    const focus = stateCell("focus", "a", store);
    const heard: string[] = [];
    drafts.subscribe(() => heard.push("drafts"));
    focus.subscribe(() => heard.push("focus"));
    store.batch(() => {
      drafts.set(2);
      focus.set("b");
      expect(drafts.get()).toBe(2);
      expect(heard).toEqual([]);
    });
    expect(heard).toEqual(["drafts", "focus"]);
  });

  it("keeps two cells of the same name apart", () => {
    const store = createTableStore();
    const one = stateCell("drafts", 0, store);
    const two = stateCell("drafts", 0, store);
    one.set(5);
    expect(two.get()).toBe(0);
  });
});
