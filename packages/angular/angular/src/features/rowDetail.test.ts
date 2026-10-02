/**
 * The row-detail features: what each writes, and the live expansion a table
 * reads while either is composed.
 */
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { featureOptionsOf } from "../featureHost";
import { injectRowDetail, nestedTable, rowDetail } from "./rowDetail";

/** A stand-in renderer; the features only carry it. */
class Panel {}

describe("rowDetail() and nestedTable()", () => {
  it("write the renderer or the declaration, and the rows open at first", () => {
    expect(featureOptionsOf([rowDetail(Panel, ["a"])])).toEqual({
      renderRowDetail: Panel,
      defaultExpandedRowIds: ["a"],
    });
    const nested = vi.fn();
    expect(featureOptionsOf([nestedTable(nested)])).toEqual({
      nestedTable: nested,
      defaultExpandedRowIds: undefined,
    });
  });
});

describe("injectRowDetail", () => {
  it("is absent while neither feature is composed", () => {
    expect(
      TestBed.runInInjectionContext(() => injectRowDetail({ features: [] }))
    ).toBeUndefined();
  });

  it("carries the renderer and the nested declaration, with the rows open at first", () => {
    const nested = vi.fn();
    const detail = TestBed.runInInjectionContext(() =>
      injectRowDetail<{ id: string }>({
        features: [rowDetail(Panel, ["a"]), nestedTable(nested)],
      })
    )!;
    expect(detail().render).toBe(Panel);
    expect(detail().nested).toBe(nested);
    expect(detail().expansion.isExpanded("a")).toBe(true);
    detail().expansion.toggle("b");
    expect(detail().expansion.isExpanded("b")).toBe(true);
  });

  it("arms on a nested table alone", () => {
    const detail = TestBed.runInInjectionContext(() =>
      injectRowDetail({ features: [nestedTable(vi.fn())] })
    );
    expect(detail).toBeDefined();
    expect(detail?.().render).toBeUndefined();
  });
});
