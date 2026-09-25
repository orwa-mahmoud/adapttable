import { describe, expect, it, vi } from "vitest";

import { PIN_Z } from "../columns/columnLayoutModel";
import {
  chromeColumnPlan,
  columnAriaSort,
  columnTextAlign,
  DESKTOP_ACTIONS_WIDTH,
  DESKTOP_EXPANSION_WIDTH,
  DESKTOP_SELECTION_WIDTH,
  desktopBodyPinStyle,
  desktopChromeMetrics,
  desktopDetailMeasureRef,
  desktopEdgeHeadPin,
  desktopHasPinned,
  desktopHeadCellGeometry,
  desktopPinSignature,
  desktopRowMeasureRef,
  desktopScrollBoxStyle,
  documentOffsetTop,
  entryKeys,
  extraRowCoveredSlots,
  measureRowDetailAsPair,
  measureWindowScrollMargin,
  pinnedRowIds,
  sortIndexOf,
  sortLevelOf,
  sourceWindowStart,
  virtualListElement,
} from "./chromeModel";
import { REORDER_COLUMN_WIDTH } from "./leanAssembly";

const leads = { start: 0, end: 0 };
const pinOffset = (key: string) =>
  key === "name" ? { side: "start" as const, inset: 0 } : undefined;

describe("desktop layout", () => {
  it("sums the injected columns into pin leads", () => {
    expect(
      desktopChromeMetrics({
        expandable: true,
        showReorder: true,
        hasSelection: true,
        showActions: true,
      })
    ).toEqual({
      leads: {
        start:
          DESKTOP_EXPANSION_WIDTH +
          REORDER_COLUMN_WIDTH +
          DESKTOP_SELECTION_WIDTH,
        end: DESKTOP_ACTIONS_WIDTH,
      },
      extraMinWidth:
        DESKTOP_EXPANSION_WIDTH +
        REORDER_COLUMN_WIDTH +
        DESKTOP_SELECTION_WIDTH +
        DESKTOP_ACTIONS_WIDTH,
      expansionLead: DESKTOP_EXPANSION_WIDTH,
      reorderLead: REORDER_COLUMN_WIDTH,
      selectionLead: DESKTOP_EXPANSION_WIDTH + REORDER_COLUMN_WIDTH,
      expansion: DESKTOP_EXPANSION_WIDTH,
      selection: DESKTOP_SELECTION_WIDTH,
      actions: DESKTOP_ACTIONS_WIDTH,
      includeExpansionInLeads: true,
    });
    const kit = desktopChromeMetrics({
      expandable: true,
      showReorder: false,
      hasSelection: false,
      showActions: false,
      widths: { expansion: 40, includeExpansionInLeads: false },
    });
    expect(kit.leads).toEqual({ start: 0, end: 0 });
    expect(kit.expansion).toBe(40);
  });

  it("says whether anything is pinned", () => {
    const columns = [{ key: "name" }, { key: "age" }];
    expect(desktopHasPinned(columns, pinOffset, false, false)).toBe(true);
    expect(desktopHasPinned(columns, undefined, false, false)).toBe(false);
    expect(desktopHasPinned(columns, undefined, true, false)).toBe(true);
    expect(desktopHasPinned(columns, undefined, false, true)).toBe(true);
  });

  it("scrolls a bounded box on both axes and a page sideways only when needed", () => {
    expect(desktopScrollBoxStyle(300, false)).toEqual({
      maxHeight: 300,
      overflowX: "auto",
      overflowY: "auto",
    });
    expect(desktopScrollBoxStyle(undefined, true)).toEqual({
      overflowX: "auto",
    });
    expect(desktopScrollBoxStyle(undefined, false)).toBeUndefined();
  });

  it("digests every pin side and inset", () => {
    expect(
      desktopPinSignature([{ key: "name" }, { key: "age" }], pinOffset)
    ).toBe("name:start:0|");
    expect(desktopPinSignature([{ key: "age" }], undefined)).toBe("");
  });

  it("measures a scroll row or its pair, never a pinned row", () => {
    const measureElement = vi.fn();
    const pair = {
      row: vi.fn(() => measureElement),
      detail: vi.fn(() => measureElement),
    };
    expect(
      desktopRowMeasureRef("top", pair, 0, measureElement)
    ).toBeUndefined();
    expect(desktopRowMeasureRef(undefined, pair, 3, undefined)).toBe(
      measureElement
    );
    expect(pair.row).toHaveBeenCalledWith(3);
    expect(desktopRowMeasureRef(undefined, undefined, 0, measureElement)).toBe(
      measureElement
    );
    expect(desktopDetailMeasureRef(undefined, pair, 2)).toBe(measureElement);
    expect(pair.detail).toHaveBeenCalledWith(2);
    expect(desktopDetailMeasureRef("bottom", pair, 2)).toBeUndefined();
    expect(desktopDetailMeasureRef(undefined, undefined, 2)).toBeUndefined();
  });

  it("combines column and row pins on a body cell", () => {
    expect(
      desktopBodyPinStyle("age", pinOffset, leads, undefined, 0)
    ).toBeUndefined();
    expect(
      desktopBodyPinStyle("name", pinOffset, leads, undefined, 0)
    ).toMatchObject({
      position: "sticky",
      insetInlineStart: 0,
      zIndex: PIN_Z.body,
    });
    expect(
      desktopBodyPinStyle("age", pinOffset, leads, "top", 40)
    ).toMatchObject({
      position: "sticky",
      top: 40,
    });
  });

  it("gives a header cell its pin, width and resize anchoring", () => {
    expect(
      desktopHeadCellGeometry({ key: "name", width: 150 }, { pinOffset, leads })
    ).toEqual({
      pin: expect.objectContaining({
        position: "sticky",
        zIndex: PIN_Z.headerPinned,
      }),
      width: 150,
      anchorsResize: false,
    });
    expect(
      desktopHeadCellGeometry(
        { key: "age" },
        { leads, columnWidths: { age: 90 }, setWidth: () => undefined }
      )
    ).toEqual({ pin: undefined, width: 90, anchorsResize: true });
  });

  it("pins an injected header cell to its edge only when a column there is pinned", () => {
    expect(desktopEdgeHeadPin("end", false)).toBeUndefined();
    expect(desktopEdgeHeadPin("end", true)).toMatchObject({
      position: "sticky",
      insetInlineEnd: 0,
      zIndex: PIN_Z.headerPinned,
    });
  });
});

describe("header attributes", () => {
  const levels = [
    { key: "name", dir: "asc" as const },
    { key: "age", dir: "desc" as const },
  ];

  it("aligns logically", () => {
    expect(columnTextAlign("center")).toBe("center");
    expect(columnTextAlign("end")).toBe("end");
    expect(columnTextAlign(undefined)).toBe("start");
  });

  it("finds a column's sort level and its badge position", () => {
    expect(sortLevelOf(levels, "age")).toEqual({ key: "age", dir: "desc" });
    expect(sortLevelOf(levels, "id")).toBeUndefined();
    expect(sortIndexOf(levels, "age")).toBe(2);
    expect(sortIndexOf(levels, "id")).toBeUndefined();
  });

  it("announces aria-sort only on sortable headers", () => {
    expect(columnAriaSort({ key: "a" }, "a", "asc")).toBeUndefined();
    expect(columnAriaSort({ key: "a", sortable: true }, "b", "asc")).toBe(
      "none"
    );
    expect(columnAriaSort({ key: "a", sortable: true }, "a", "asc")).toBe(
      "ascending"
    );
    expect(columnAriaSort({ key: "a", sortable: true }, "a", "desc")).toBe(
      "descending"
    );
  });
});

describe("body plan", () => {
  it("plans the injected columns", () => {
    expect(
      chromeColumnPlan({
        rowActionCount: 0,
        rowEditing: true,
        rowReorder: true,
        rowDetail: false,
        selection: true,
      })
    ).toEqual({
      showActions: true,
      showReorder: true,
      expandable: false,
      hasSelection: true,
      leadingCells: 2,
    });
    expect(
      chromeColumnPlan({
        rowActionCount: 2,
        rowEditing: false,
        rowReorder: false,
        rowDetail: true,
        selection: false,
      })
    ).toMatchObject({ showActions: true, leadingCells: 1 });
  });

  it("collects pinned row ids from both edges", () => {
    const ids = pinnedRowIds(
      (row: { id: string }) => row.id,
      [{ id: "1" }],
      [{ id: "9" }]
    );
    expect([...ids]).toEqual(["1", "9"]);
    expect(
      pinnedRowIds((row: { id: string }) => row.id, undefined, undefined).size
    ).toBe(0);
  });

  it("computes covered slots once per anchor row", () => {
    const covered = vi.fn(() => new Set([1]));
    const map = extraRowCoveredSlots(
      [
        { id: "a", kind: "separator", beforeRowId: "r1" },
        { id: "b", kind: "separator", beforeRowId: "r1" },
        { id: "c", kind: "separator" },
      ] as never[],
      covered
    );
    expect([...map.keys()]).toEqual(["r1"]);
    expect(covered).toHaveBeenCalledTimes(1);
    expect(extraRowCoveredSlots(undefined, covered).size).toBe(0);
  });
});

describe("windowing", () => {
  it("keys entries, pairs desktop details and finds the window start", () => {
    expect(entryKeys([{ key: "a" }, { key: "b" }])).toEqual(["a", "b"]);
    expect(entryKeys()).toEqual([]);
    expect(measureRowDetailAsPair(false, () => null)).toBe(true);
    expect(measureRowDetailAsPair(true, () => null)).toBe(false);
    expect(measureRowDetailAsPair(false, undefined)).toBe(false);
    expect(
      sourceWindowStart({ paginationMode: "paged", page: 3, limit: 10 })
    ).toBe(20);
    expect(
      sourceWindowStart({ paginationMode: "paged", page: 0, limit: 10 })
    ).toBe(0);
    expect(
      sourceWindowStart({ paginationMode: "infinite", page: 3, limit: 10 })
    ).toBe(0);
  });

  it("measures the list's document offset", () => {
    const root = document.createElement("div");
    const tbody = document.createElement("div");
    tbody.dataset.adapttablePart = "tbody";
    root.append(tbody);
    vi.spyOn(tbody, "getBoundingClientRect").mockReturnValue({
      top: 120,
    } as DOMRect);
    expect(virtualListElement(null)).toBeNull();
    expect(virtualListElement(root)).toBe(tbody);
    const bare = document.createElement("div");
    expect(virtualListElement(bare)).toBe(bare);
    expect(measureWindowScrollMargin(root)).toBe(120);
    expect(measureWindowScrollMargin(null)).toBe(0);
    vi.spyOn(bare, "getBoundingClientRect").mockReturnValue({
      top: -50,
    } as DOMRect);
    expect(documentOffsetTop(bare)).toBe(0);
  });
});
