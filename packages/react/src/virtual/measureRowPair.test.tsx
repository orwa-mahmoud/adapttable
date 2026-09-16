/**
 * Measuring a row together with its detail panel.
 *
 * This is what let row detail and virtualization stop being mutually
 * exclusive: a table cannot nest a panel inside the row it belongs to, so the
 * virtualizer has to be told the pair's height rather than the row's.
 */
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRowPairMeasurer } from "./measureRowPair";

/** jsdom reports zero for everything, so heights are stubbed per element. */
function withHeight(node: HTMLElement, height: number): HTMLElement {
  node.getBoundingClientRect = () =>
    ({
      height,
      width: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: height,
    }) as DOMRect;
  return node;
}

function Pair({
  resizeItem,
  enabled = true,
  detail = true,
}: Readonly<{
  resizeItem: (index: number, size: number) => void;
  enabled?: boolean;
  detail?: boolean;
}>) {
  const measure = useRowPairMeasurer({ resizeItem }, enabled);
  return (
    <div>
      <div
        data-testid="row"
        ref={(node) => {
          if (node) withHeight(node, 40);
          measure.row(3)(node);
        }}
      />
      {detail && (
        <div
          data-testid="detail"
          ref={(node) => {
            if (node) withHeight(node, 160);
            measure.detail(3)(node);
          }}
        />
      )}
    </div>
  );
}

describe("useRowPairMeasurer", () => {
  it("reports the row and its panel as one height", () => {
    const resizeItem = vi.fn();
    render(<Pair resizeItem={resizeItem} />);
    // 40 + 160: the number a virtualizer needs to place everything below it.
    expect(resizeItem).toHaveBeenLastCalledWith(3, 200);
  });

  it("reports the row alone when nothing is expanded", () => {
    const resizeItem = vi.fn();
    render(<Pair resizeItem={resizeItem} detail={false} />);
    expect(resizeItem).toHaveBeenLastCalledWith(3, 40);
  });

  it("corrects the height when a panel opens", () => {
    const resizeItem = vi.fn();
    const { rerender } = render(
      <Pair resizeItem={resizeItem} detail={false} />
    );
    expect(resizeItem).toHaveBeenLastCalledWith(3, 40);
    rerender(<Pair resizeItem={resizeItem} />);
    expect(resizeItem).toHaveBeenLastCalledWith(3, 200);
  });

  it("does nothing at all when it is off", () => {
    // No virtualization, or no expandable rows: no observers, no work.
    const resizeItem = vi.fn();
    render(<Pair resizeItem={resizeItem} enabled={false} />);
    expect(resizeItem).not.toHaveBeenCalled();
  });

  it("says nothing about a row it cannot measure", () => {
    const resizeItem = vi.fn();
    function Empty() {
      const measure = useRowPairMeasurer({ resizeItem }, true);
      return <div ref={measure.detail(1)} />;
    }
    render(<Empty />);
    // A detail with no row is not an item — reporting its height alone would
    // shrink the row above it to nothing.
    expect(resizeItem).not.toHaveBeenCalled();
  });

  it("is inert without a virtualizer", () => {
    function NoVirtualizer() {
      const measure = useRowPairMeasurer(undefined, true);
      return <div ref={measure.row(0)} />;
    }
    expect(() => render(<NoVirtualizer />)).not.toThrow();
  });
});

describe("useRowPairMeasurer — while the page is live", () => {
  /** jsdom ships no ResizeObserver; this one records what it was given. */
  class FakeResizeObserver {
    static readonly instances: FakeResizeObserver[] = [];
    observed = new Set<Element>();
    constructor(readonly callback: ResizeObserverCallback) {
      FakeResizeObserver.instances.push(this);
    }
    observe(target: Element) {
      this.observed.add(target);
    }
    unobserve(target: Element) {
      this.observed.delete(target);
    }
    disconnect() {
      this.observed.clear();
    }
    /** Fire as the browser would when an element's box changes. */
    fire(target: Element) {
      this.callback([{ target } as ResizeObserverEntry], this);
    }
  }

  it("re-reports the pair when a panel changes size", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    FakeResizeObserver.instances.length = 0;
    const resizeItem = vi.fn();
    const { getByTestId } = render(<Pair resizeItem={resizeItem} />);
    const observer = FakeResizeObserver.instances[0]!;
    expect(observer.observed.size).toBe(2);

    // The panel grows — an image loaded, a nested table opened.
    const detail = getByTestId("detail");
    withHeight(detail, 400);
    resizeItem.mockClear();
    act(() => {
      observer.fire(detail);
    });
    expect(resizeItem).toHaveBeenCalledWith(3, 440);
    vi.unstubAllGlobals();
  });

  it("ignores an element it does not own", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    FakeResizeObserver.instances.length = 0;
    const resizeItem = vi.fn();
    render(<Pair resizeItem={resizeItem} />);
    const observer = FakeResizeObserver.instances[0]!;
    resizeItem.mockClear();
    act(() => {
      observer.fire(document.createElement("div"));
    });
    expect(resizeItem).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("stops observing an element it no longer holds", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    FakeResizeObserver.instances.length = 0;
    const resizeItem = vi.fn();
    const { rerender } = render(<Pair resizeItem={resizeItem} />);
    const observer = FakeResizeObserver.instances[0]!;
    expect(observer.observed.size).toBe(2);
    rerender(<Pair resizeItem={resizeItem} detail={false} />);
    expect(observer.observed.size).toBe(1);
    vi.unstubAllGlobals();
  });
});
