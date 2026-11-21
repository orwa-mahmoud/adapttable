import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cellNavigation } from "./cell-navigation";
import { batchEditing, dirtyIndicators, editing, rowEditing } from "./editing";
import { commandPalette, savedViews, sidePanel } from "./factories";
import { findInTable } from "./find-in-table";
import { groupingPanel } from "./grouping-panel";
import { FeatureProviders } from "./providers";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

const SHEET_ID = "adapttable-forced-colors";

function sheetText(): string {
  return document.getElementById(SHEET_ID)?.textContent ?? "";
}

function mount(features: readonly TableFeature<never>[]) {
  return render(
    <FeatureProviders props={applyTableFeatures({ features })}>
      <span />
    </FeatureProviders>
  );
}

afterEach(() => {
  document.getElementById(SHEET_ID)?.remove();
});

const save = () => undefined;

/** Each feature, and a selector only its rules hold. */
const OWNED: readonly [string, () => TableFeature<never>, string][] = [
  ["cellNavigation", () => cellNavigation(), "[data-cell-selected]"],
  ["findInTable", () => findInTable(), "[data-cell-match-current] {"],
  ["editing", () => editing(save), "[data-dirty]"],
  ["rowEditing", () => rowEditing(save), "[data-changed]"],
  ["batchEditing", () => batchEditing(save), "batch-edit-cell"],
  ["dirtyIndicators", () => dirtyIndicators(), "[data-dirty]"],
  ["commandPalette", () => commandPalette(), "command-list"],
  [
    "sidePanel",
    () => sidePanel({ panels: [], open: null, onOpenChange: save }),
    "side-panel-body",
  ],
  [
    "savedViews",
    () => savedViews({ storageKey: "contrast" }),
    "saved-views-panel",
  ],
  ["groupingPanel", () => groupingPanel(), '"grouping-panel"'],
];

describe("high-contrast rules", () => {
  it("gives a plain table the base rules and no feature's", () => {
    mount([]);
    const css = sheetText();
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("@media (prefers-contrast: more)");
    expect(css).toContain("outline: 2px solid Highlight !important");
    expect(css).toContain('[aria-invalid="true"]');
    expect(css).toContain('[data-pinned="start"]');
    for (const [, , selector] of OWNED) expect(css).not.toContain(selector);
  });

  it.each(OWNED)("adds %s's rules when it is composed", (_, make, selector) => {
    mount([make()]);
    expect(sheetText()).toContain(selector);
  });

  it("keeps one sheet for every table and grows it in cascade order", () => {
    mount([editing(save)]);
    mount([cellNavigation(), findInTable()]);
    mount([editing(save)]);
    expect(document.querySelectorAll(`style#${SHEET_ID}`)).toHaveLength(1);
    const css = sheetText();
    // A later rule wins at equal specificity: selection, then find hits, then
    // edit marks, then validation, whatever order the tables mounted in.
    const order = [
      "[data-cell-selected] {",
      "[data-cell-match] {",
      "[data-dirty],\n  [data-changed] {",
      '  [aria-invalid="true"] {',
    ].map((rule) => css.indexOf(rule));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(css.split("[data-cell-match-current] {")).toHaveLength(2);
  });

  it("leaves the sheet in place when a table unmounts", () => {
    const { unmount } = mount([findInTable()]);
    unmount();
    expect(sheetText()).toContain("[data-cell-match]");
  });
});
