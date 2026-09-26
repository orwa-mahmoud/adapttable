/**
 * The command palette's list model: query and highlight state, the filtered
 * view, key actions, running a command and the Tab trap.
 */
import { describe, expect, it, vi } from "vitest";

import {
  commandListKeyAction,
  commandListView,
  createCommandList,
  nextCommandIndex,
  runCommand,
  tabTrapTarget,
} from "./commandListModel";
import type { Command } from "./commandRegistry";

const command = (key: string, label: string, disabled?: boolean): Command => ({
  key,
  label,
  disabled,
  onSelect: vi.fn(),
});

const COMMANDS = [
  command("copy", "Copy"),
  command("export", "Export CSV"),
  command("print", "Print", true),
];

describe("createCommandList", () => {
  it("resets the highlight on a new query and clears on reset", () => {
    const list = createCommandList();
    const listener = vi.fn();
    const stop = list.subscribe(listener);
    list.setActive(2);
    list.setQuery("ex");
    expect(list.getSnapshot()).toEqual({ query: "ex", active: 0 });
    list.setQuery("ex");
    expect(listener).toHaveBeenCalledTimes(2);
    list.reset();
    expect(list.getSnapshot()).toEqual({ query: "", active: 0 });
    stop();
    list.setActive(1);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

describe("commandListView", () => {
  it("filters by the query and clamps the highlight", () => {
    const view = commandListView(COMMANDS, { query: "export", active: 5 });
    expect(view.matches.map((match) => match.key)).toEqual(["export"]);
    expect(view.active).toBe(0);
    expect(commandListView(COMMANDS, { query: "zzz", active: 3 })).toEqual({
      matches: [],
      active: 0,
    });
  });
});

describe("nextCommandIndex", () => {
  it("wraps the arrows and jumps with Home and End", () => {
    expect(nextCommandIndex("ArrowDown", 2, 3)).toBe(0);
    expect(nextCommandIndex("ArrowUp", 0, 3)).toBe(2);
    expect(nextCommandIndex("Home", 2, 3)).toBe(0);
    expect(nextCommandIndex("End", 0, 3)).toBe(2);
    expect(nextCommandIndex("a", 0, 3)).toBeUndefined();
    expect(nextCommandIndex("ArrowDown", 0, 0)).toBeUndefined();
  });
});

describe("commandListKeyAction", () => {
  const view = commandListView(COMMANDS, { query: "", active: 1 });

  it("closes, runs, moves, or leaves the key alone", () => {
    expect(commandListKeyAction("Escape", view)).toEqual({ kind: "close" });
    expect(commandListKeyAction("Enter", view)).toEqual({
      kind: "run",
      command: COMMANDS[1],
    });
    expect(commandListKeyAction("ArrowDown", view)).toEqual({
      kind: "move",
      to: 2,
    });
    expect(commandListKeyAction("Tab", view)).toBeNull();
  });
});

describe("runCommand", () => {
  it("closes before selecting, and skips a disabled or missing command", () => {
    const order: string[] = [];
    const close = vi.fn(() => order.push("close"));
    const run = command("copy", "Copy");
    vi.mocked(run.onSelect).mockImplementation(() => {
      order.push("select");
    });
    runCommand(run, close);
    expect(order).toEqual(["close", "select"]);
    runCommand(COMMANDS[2], close);
    runCommand(undefined, close);
    expect(close).toHaveBeenCalledTimes(1);
    expect(COMMANDS[2]?.onSelect).not.toHaveBeenCalled();
  });
});

describe("tabTrapTarget", () => {
  const items = ["input", "first", "last"];

  it("wraps at either edge only", () => {
    expect(tabTrapTarget(items, "last", false)).toBe("input");
    expect(tabTrapTarget(items, "input", true)).toBe("last");
    expect(tabTrapTarget(items, "first", false)).toBeUndefined();
    expect(tabTrapTarget(items, "first", true)).toBeUndefined();
    expect(tabTrapTarget(items, "elsewhere", false)).toBeUndefined();
    expect(tabTrapTarget(items, null, false)).toBeUndefined();
    expect(tabTrapTarget([], "input", false)).toBeUndefined();
  });
});
