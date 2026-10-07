import { describe, expect, it } from "vitest";

import { createMenuNavigation } from "./menuNavigation";

const items = [
  { label: "Alpha" },
  { label: "Blocked", disabled: true },
  { label: "Bravo" },
  { label: "Briar" },
];

describe("flat native menu navigation", () => {
  it("reuses wrapped arrows and boundaries while skipping disabled items", () => {
    const menu = createMenuNavigation();
    for (const [key, from, to] of [
      ["ArrowDown", -1, 0],
      ["ArrowUp", -1, 3],
      ["ArrowDown", 0, 2],
      ["ArrowDown", 3, 0],
      ["ArrowUp", 0, 3],
      ["Home", 3, 0],
      ["End", 0, 3],
      ["ArrowDown", 99, 0],
      ["ArrowUp", -99, 3],
      ["Home", 1, 0],
    ] as const)
      expect(menu.key({ key }, items, from)).toEqual({
        kind: "focus",
        index: to,
      });
  });

  it("retains Bravo when b then r extends a matching prefix and cycles repeated b", () => {
    const menu = createMenuNavigation();
    expect(menu.key({ key: "b" }, items, 0, 1000)).toEqual({
      kind: "focus",
      index: 2,
    });
    expect(menu.key({ key: "r" }, items, 2, 1100)).toEqual({
      kind: "focus",
      index: 2,
    });
    menu.reset();
    expect(menu.key({ key: "b" }, items, 0, 1200)).toEqual({
      kind: "focus",
      index: 2,
    });
    expect(menu.key({ key: "b" }, items, 2, 1300)).toEqual({
      kind: "focus",
      index: 3,
    });
    expect(menu.key({ key: "b" }, items, 3, 1400)).toEqual({
      kind: "focus",
      index: 2,
    });
  });

  it("starts a fresh prefix after timeout or reset and leaves unmatched prefixes inert", () => {
    const menu = createMenuNavigation();
    expect(menu.key({ key: "b" }, items, 0, 1000)).toEqual({
      kind: "focus",
      index: 2,
    });
    expect(menu.key({ key: "a" }, items, 2, 1801)).toEqual({
      kind: "focus",
      index: 0,
    });
    menu.reset();
    expect(menu.key({ key: "B" }, items, 0, 1900)).toEqual({
      kind: "focus",
      index: 2,
    });
    expect(menu.key({ key: "z" }, items, 2, 2000)).toBeUndefined();
    menu.reset();
    expect(menu.key({ key: "x" }, items, -1, 2100)).toBeUndefined();
  });

  it.each([
    { candidates: [] },
    { candidates: [{ label: "Disabled", disabled: true }] },
  ])(
    "handles empty or all-disabled menus without focus or activation",
    ({ candidates }) => {
      const menu = createMenuNavigation();
      for (const key of [
        "ArrowDown",
        "ArrowUp",
        "Home",
        "End",
        "b",
        "Enter",
        " ",
      ])
        expect(menu.key({ key }, candidates, -1)).toBeUndefined();
      expect(menu.key({ key: "Escape" }, candidates, -1)).toEqual({
        kind: "close",
        key: "Escape",
      });
    }
  );

  it("closes on Tab/Shift+Tab without owning activation or default traversal", () => {
    const menu = createMenuNavigation();
    for (const shiftKey of [false, true])
      expect(menu.key({ key: "Tab", shiftKey }, items, 2)).toEqual({
        kind: "close",
        key: "Tab",
      });
    for (const key of ["Enter", " ", "F2"])
      expect(menu.key({ key }, items, 2)).toBeUndefined();
  });

  it("ignores composition, already handled keys, and control/meta/alt modifiers", () => {
    const menu = createMenuNavigation();
    for (const event of [
      { key: "Escape", defaultPrevented: true },
      { key: "Tab", isComposing: true },
      { key: "ArrowDown", isComposing: true },
      { key: "a", ctrlKey: true },
      { key: "ArrowDown", metaKey: true },
      { key: "a", altKey: true },
    ])
      expect(menu.key(event, items, 0)).toBeUndefined();
  });
});
