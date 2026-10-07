import { describe, expect, it, vi } from "vitest";

import type { AggregationItem } from "../aggregate/aggregationModel";
import { defaultLabels } from "../labels";
import {
  aggregationRemovalFocusSelectors,
  deferGroupingDropToInner,
  focusAfterAggregationRemoval,
  groupingAggregationOptions,
  groupingAvailableColumns,
  groupingColumnName,
  groupingDropPlan,
  groupingOperationLabel,
  INERT_GROUPING_DROP_HANDLERS,
} from "./groupingPanelChromeModel";

const labels = defaultLabels;

describe("groupingDropPlan", () => {
  it("offers every target when no chip is lifted", () => {
    const plan = groupingDropPlan(["a", "b"], undefined);
    expect([0, 1, 2].map(plan.inert)).toEqual([false, false, false]);
    expect([0, 1].map(plan.chipTarget)).toEqual([0, 1]);
    expect(plan.panelTarget).toBe(2);

    const header = groupingDropPlan(["a", "b"], { key: "c", source: "header" });
    expect(header.inert(0)).toBe(false);
    expect(header.chipTarget(1)).toBe(1);
  });

  it("makes the boundaries either side of a lifted chip inert", () => {
    const plan = groupingDropPlan(["a", "b", "c"], {
      key: "b",
      source: "chip",
    });
    expect([0, 1, 2, 3].map(plan.inert)).toEqual([false, true, true, false]);
    // Onto the chip before it takes its place; onto itself refuses; onto a
    // chip after it lands after that chip.
    expect(plan.chipTarget(0)).toBe(0);
    expect(plan.chipTarget(1)).toBeUndefined();
    expect(plan.chipTarget(2)).toBe(3);
    expect(plan.panelTarget).toBe(3);
  });

  it("has no strip target when the last chip is lifted", () => {
    const plan = groupingDropPlan(["a", "b"], { key: "b", source: "chip" });
    expect(plan.panelTarget).toBeUndefined();
  });
});

describe("drop handler policies", () => {
  it("refuses without letting the event bubble", () => {
    const event = { stopPropagation: vi.fn() };
    INERT_GROUPING_DROP_HANDLERS.onDragEnter?.(event);
    INERT_GROUPING_DROP_HANDLERS.onDragOver?.(event);
    INERT_GROUPING_DROP_HANDLERS.onDragLeave?.(event);
    INERT_GROUPING_DROP_HANDLERS.onDrop?.(event);
    expect(event.stopPropagation).toHaveBeenCalledTimes(4);
  });

  it("stands down once an inner target accepted, but always leaves", () => {
    const handlers = {
      onDragEnter: vi.fn(),
      onDragOver: vi.fn(),
      onDragLeave: vi.fn(),
      onDrop: vi.fn(),
    };
    const deferred = deferGroupingDropToInner(handlers);
    const accepted = { defaultPrevented: true };
    deferred.onDragEnter?.(accepted);
    deferred.onDragOver?.(accepted);
    deferred.onDrop?.(accepted);
    deferred.onDragLeave?.(accepted);
    expect(handlers.onDragEnter).not.toHaveBeenCalled();
    expect(handlers.onDragOver).not.toHaveBeenCalled();
    expect(handlers.onDrop).not.toHaveBeenCalled();
    expect(handlers.onDragLeave).toHaveBeenCalledWith(accepted);

    const open = { defaultPrevented: false };
    deferred.onDragEnter?.(open);
    deferred.onDragOver?.(open);
    deferred.onDrop?.(open);
    expect(handlers.onDragEnter).toHaveBeenCalledWith(open);
    expect(handlers.onDragOver).toHaveBeenCalledWith(open);
    expect(handlers.onDrop).toHaveBeenCalledWith(open);

    const empty = deferGroupingDropToInner({});
    expect(() => empty.onDrop?.(open)).not.toThrow();
    expect(empty.onDragLeave).toBeUndefined();
  });
});

describe("column names and the add picker", () => {
  it("names a column by its text header, mobile label, then key", () => {
    expect(groupingColumnName({ key: "a", header: "Alpha" })).toBe("Alpha");
    expect(
      groupingColumnName({ key: "a", header: { node: true }, mobileLabel: "A" })
    ).toBe("A");
    expect(groupingColumnName({ key: "a" })).toBe("a");
  });

  it("offers groupable columns not already grouped", () => {
    expect(
      groupingAvailableColumns(
        [
          { key: "a", header: "Alpha" },
          { key: "b", header: "Beta", groupable: false },
          { key: "c", header: "Gamma", groupable: true },
        ],
        ["c"]
      )
    ).toEqual([{ value: "a", label: "Alpha" }]);
  });
});

describe("aggregation choices", () => {
  it("localizes built-in operations and keeps a host's own label", () => {
    expect(groupingOperationLabel({ id: "avg", builtIn: true }, labels)).toBe(
      labels.groupingAverage
    );
    expect(groupingOperationLabel({ id: "odd", builtIn: true }, labels)).toBe(
      "odd"
    );
    expect(
      groupingOperationLabel(
        { id: "p90", builtIn: false, label: "P90" },
        labels
      )
    ).toBe("P90");
    expect(groupingOperationLabel({ id: "p90", builtIn: false }, labels)).toBe(
      "p90"
    );
  });

  function item(overrides: Partial<AggregationItem>): AggregationItem {
    return {
      columnKey: "budget",
      editable: true,
      origin: "reader",
      operations: [
        { id: "sum", builtIn: true },
        { id: "max", builtIn: true },
      ],
      ...overrides,
    };
  }

  it("lists the operations, with an honest current value", () => {
    expect(
      groupingAggregationOptions(item({ operationId: "sum" }), labels)
    ).toEqual([
      { value: "sum", label: labels.selectionSum },
      { value: "max", label: labels.selectionMax },
    ]);
    expect(groupingAggregationOptions(item({}), labels)[0]).toEqual({
      value: "",
      label: labels.groupingAggregationCustom,
    });
    expect(
      groupingAggregationOptions(item({ operationId: "count" }), labels)[0]
    ).toEqual({ value: "count", label: labels.selectionCount });
  });
});

describe("focus after removing an aggregation", () => {
  it("prefers the next remove, then the previous, then the picker", () => {
    expect(aggregationRemovalFocusSelectors(["a", "b"], 1)[0]).toContain(
      '[data-adapttable-aggregation="b"]'
    );
    expect(aggregationRemovalFocusSelectors(["a"], 1)[0]).toContain(
      '[data-adapttable-aggregation="a"]'
    );
    expect(aggregationRemovalFocusSelectors([], 0)).toEqual([
      '[data-adapttable-part="grouping-aggregation-option"]',
      '[data-adapttable-part="grouping-aggregation-add"], [data-adapttable-part="grouping-aggregations-restore"]',
    ]);
  });

  function group(markup: string): HTMLElement {
    const root = document.createElement("fieldset");
    root.innerHTML = markup;
    document.body.append(root);
    return root;
  }

  it("moves focus to the first target that is mounted", () => {
    const root = group(`
      <span data-adapttable-aggregation="b">
        <button data-adapttable-part="grouping-aggregation-remove">x</button>
      </span>
      <button data-adapttable-part="grouping-aggregation-add">add</button>`);
    focusAfterAggregationRemoval(root, ["b"], 0);
    expect(document.activeElement?.textContent).toBe("x");

    focusAfterAggregationRemoval(root, ["gone"], 0);
    expect(document.activeElement?.textContent).toBe("add");

    const options = group(
      `<input data-adapttable-part="grouping-aggregation-option" value="o" />`
    );
    focusAfterAggregationRemoval(options, [], 0);
    expect((document.activeElement as HTMLInputElement).value).toBe("o");

    const before = document.activeElement;
    focusAfterAggregationRemoval(group(""), [], 0);
    focusAfterAggregationRemoval(null, ["b"], 0);
    expect(document.activeElement).toBe(before);
  });
});

describe("compound aggregation focus targets", () => {
  it("resolves a native field inside its owned choice part and skips disabled choices", () => {
    const root = document.createElement("fieldset");
    root.innerHTML =
      '<label data-adapttable-part="grouping-aggregation-option"><input disabled type="checkbox"></label><label data-adapttable-part="grouping-aggregation-option"><input type="checkbox"></label><button data-adapttable-part="grouping-aggregations-restore">Restore</button>';
    document.body.append(root);
    try {
      const input = root.querySelector<HTMLInputElement>(
        "input:not(:disabled)"
      )!;
      focusAfterAggregationRemoval(root, [], 0);
      expect(document.activeElement).toBe(input);
      input.disabled = true;
      focusAfterAggregationRemoval(root, [], 0);
      expect(document.activeElement?.textContent).toBe("Restore");
    } finally {
      root.remove();
    }
  });
  it("preserves remove-before-picker ordering and never chooses an unrelated field", () => {
    const root = document.createElement("fieldset");
    root.innerHTML =
      '<span data-adapttable-aggregation="next"><button data-adapttable-part="grouping-aggregation-remove">Remove next</button></span><label data-adapttable-part="grouping-aggregation-option"><input disabled type="checkbox"></label><input id="unrelated"><button data-adapttable-part="grouping-aggregations-restore">Restore</button>';
    document.body.append(root);
    try {
      const remove = root.querySelector<HTMLButtonElement>("button")!;
      focusAfterAggregationRemoval(root, ["next"], 0);
      expect(document.activeElement).toBe(remove);
      remove.remove();
      focusAfterAggregationRemoval(root, ["next"], 0);
      expect(document.activeElement?.textContent).toBe("Restore");
    } finally {
      root.remove();
    }
  });
});
describe("hidden aggregation choice descendants", () => {
  it("skips aria-disabled, hidden, inert, CSS-hidden and nonfocusable owned candidates", () => {
    const root = document.createElement("fieldset");
    root.innerHTML =
      '<label data-adapttable-part="grouping-aggregation-option"><input aria-disabled="true" type="checkbox"><input hidden type="checkbox"><span inert><input type="checkbox"></span><span style="display:none"><input type="checkbox"></span><input style="visibility:hidden" type="checkbox"><input type="hidden"><span>Unfocusable</span><input id="enabled-choice" type="checkbox"></label>';
    document.body.append(root);
    try {
      focusAfterAggregationRemoval(root, [], 0);
      expect(document.activeElement?.id).toBe("enabled-choice");
    } finally {
      root.remove();
    }
  });
  it("falls through hidden parts to the restore control without changing remove-before-picker order", () => {
    const root = document.createElement("fieldset");
    root.innerHTML =
      '<span data-adapttable-aggregation="next"><button data-adapttable-part="grouping-aggregation-remove" hidden>Hidden remove</button></span><label data-adapttable-part="grouping-aggregation-option" aria-hidden="true"><input type="checkbox"></label><span data-adapttable-part="grouping-aggregation-option">Unfocusable</span><button data-adapttable-part="grouping-aggregations-restore">Restore</button>';
    document.body.append(root);
    try {
      focusAfterAggregationRemoval(root, ["next"], 0);
      expect(document.activeElement?.textContent).toBe("Restore");
    } finally {
      root.remove();
    }
  });
});
