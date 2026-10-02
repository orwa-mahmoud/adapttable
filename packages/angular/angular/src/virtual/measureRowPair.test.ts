/**
 * A row and its open detail panel, measured as one virtual item.
 */
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { injectRowPairMeasurer } from "./measureRowPair";

function element(height: number): Element {
  const node = document.createElement("tr");
  node.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      width: 0,
      height,
      bottom: height,
      right: 0,
    }) as DOMRect;
  return node;
}

describe("injectRowPairMeasurer", () => {
  it("reports the row and its detail together while on, and nothing while off", () => {
    const resizeItem = vi.fn();
    const enabled = signal(false);
    const measurer = TestBed.runInInjectionContext(() =>
      injectRowPairMeasurer({ virtualizer: () => ({ resizeItem }), enabled })
    );
    measurer.row(3)(element(40));
    expect(resizeItem).not.toHaveBeenCalled();

    enabled.set(true);
    TestBed.tick();
    measurer.row(3)(element(40));
    expect(resizeItem).toHaveBeenLastCalledWith(3, 40);
    measurer.detail(3)(element(260));
    expect(resizeItem).toHaveBeenLastCalledWith(3, 300);
  });
});
