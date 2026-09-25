import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { columnResizeHandleProps } from "./columnResize";

/**
 * A fake resize-handle event whose owning cell reports a fixed width and whose
 * nearest `[dir]` ancestor reports `dir` (so the RTL drag/key flip is testable
 * without a real layout).
 */
function handleEvent(
  width: number,
  extra: Record<string, unknown>,
  dir: "ltr" | "rtl" = "ltr"
) {
  const cell = { getBoundingClientRect: () => ({ width }) };
  const dirEl = { getAttribute: () => dir };
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: {
      closest: (selector: string) => (selector === "[dir]" ? dirEl : cell),
    } as unknown as HTMLElement,
    ...extra,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("columnResizeHandleProps", () => {
  beforeEach(() => {
    // Synchronous rAF: each pointer move commits immediately, and pointerup
    // finds no pending frame (matching the async contract's end state).
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback): number => {
        cb(0);
        return 1;
      }
    );
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("exposes accessible button semantics", () => {
    const props = columnResizeHandleProps("a", vi.fn(), "Resize A");
    expect(props.role).toBe("button");
    expect(props.tabIndex).toBe(0);
    expect(props["aria-label"]).toBe("Resize A");
  });

  it("resizes on pointer drag from the live cell width", () => {
    const setWidth = vi.fn();
    const props = columnResizeHandleProps("a", setWidth, "Resize A");
    // start at clientX 100, cell width 150
    props.onPointerDown(handleEvent(150, { clientX: 100 }) as never);
    // drag right by 40px
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 140 }));
    expect(setWidth).toHaveBeenLastCalledWith("a", 190);
    document.dispatchEvent(new MouseEvent("pointerup"));
    // pointerup flushes the release position; the listener is then detached
    // so further moves do nothing.
    expect(setWidth).toHaveBeenLastCalledWith("a", 190);
    const committed = setWidth.mock.calls.length;
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 300 }));
    expect(setWidth).toHaveBeenCalledTimes(committed);
  });

  it("inverts the pointer drag in RTL (handle is on the visual left)", () => {
    const setWidth = vi.fn();
    const props = columnResizeHandleProps("a", setWidth, "Resize A");
    props.onPointerDown(handleEvent(150, { clientX: 100 }, "rtl") as never);
    // In RTL the inline-end handle is on the left; dragging left (clientX 100→60)
    // must WIDEN: 150 + (100 - 60) = 190.
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 60 }));
    expect(setWidth).toHaveBeenLastCalledWith("a", 190);
    document.dispatchEvent(new MouseEvent("pointerup"));
  });

  it("clamps the drag to the minimum width", () => {
    const setWidth = vi.fn();
    const props = columnResizeHandleProps("a", setWidth, "Resize A");
    props.onPointerDown(handleEvent(150, { clientX: 100 }) as never);
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: -500 }));
    expect(setWidth).toHaveBeenLastCalledWith("a", 60);
    document.dispatchEvent(new MouseEvent("pointerup"));
  });

  it("nudges width with arrow keys", () => {
    const setWidth = vi.fn();
    const props = columnResizeHandleProps("a", setWidth, "Resize A");
    props.onKeyDown(handleEvent(150, { key: "ArrowRight" }) as never);
    expect(setWidth).toHaveBeenLastCalledWith("a", 166);
    props.onKeyDown(handleEvent(150, { key: "ArrowLeft" }) as never);
    expect(setWidth).toHaveBeenLastCalledWith("a", 134);
    props.onKeyDown(handleEvent(150, { key: "Enter" }) as never);
    expect(setWidth).toHaveBeenCalledTimes(2); // ignored key
  });

  it("swaps the arrow keys in RTL (ArrowLeft widens)", () => {
    const setWidth = vi.fn();
    const props = columnResizeHandleProps("a", setWidth, "Resize A");
    props.onKeyDown(handleEvent(150, { key: "ArrowLeft" }, "rtl") as never);
    expect(setWidth).toHaveBeenLastCalledWith("a", 166);
    props.onKeyDown(handleEvent(150, { key: "ArrowRight" }, "rtl") as never);
    expect(setWidth).toHaveBeenLastCalledWith("a", 134);
  });

  it("falls back to the resolved CSS direction when no [dir] ancestor exists", () => {
    vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({
      direction: "rtl",
    } as CSSStyleDeclaration);
    const setWidth = vi.fn();
    const props = columnResizeHandleProps("a", setWidth, "Resize A");
    const event = {
      preventDefault: vi.fn(),
      currentTarget: {
        closest: (selector: string) =>
          selector === "[dir]"
            ? null
            : { getBoundingClientRect: () => ({ width: 150 }) },
      } as unknown as HTMLElement,
      key: "ArrowLeft",
    };
    // computed direction rtl → ArrowLeft widens: 150 + 16 = 166.
    props.onKeyDown(event as never);
    expect(setWidth).toHaveBeenLastCalledWith("a", 166);
  });

  it("falls back to the minimum width when no owning cell is found", () => {
    const setWidth = vi.fn();
    const props = columnResizeHandleProps("a", setWidth, "Resize A");
    // A handle not nested in a th/td: closest("th,td") returns null, so the
    // live width measurement falls back to MIN_COLUMN_WIDTH (60). An ArrowRight
    // step then yields 60 + 16 = 76.
    const event = {
      preventDefault: vi.fn(),
      currentTarget: {
        closest: (selector: string) =>
          selector === "[dir]" ? { getAttribute: () => "ltr" } : null,
      } as unknown as HTMLElement,
      key: "ArrowRight",
    };
    props.onKeyDown(event as never);
    expect(setWidth).toHaveBeenLastCalledWith("a", 76);
  });
});

describe("drag-less click", () => {
  it("commits nothing when the pointer never moves", () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback): number => {
        cb(0);
        return 1;
      }
    );
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    const setWidth = vi.fn();
    const props = columnResizeHandleProps("a", setWidth, "Resize A");
    props.onPointerDown(handleEvent(150, { clientX: 100 }) as never);
    document.dispatchEvent(new MouseEvent("pointerup"));
    expect(setWidth).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("columnResizeHandleProps — double-click sizes to content", () => {
  /** A header cell with a body cell under it, both measurable. */
  function tableWithHandle(contentWidth: number) {
    document.body.innerHTML = `
      <table>
        <thead><tr><th data-column-key="name"><span id="handle"></span></th></tr></thead>
        <tbody><tr><td data-column-key="name"></td></tr></tbody>
      </table>`;
    for (const cell of document.querySelectorAll<HTMLElement>(
      '[data-column-key="name"]'
    )) {
      Object.defineProperty(cell, "scrollWidth", { value: contentWidth });
    }
    return document.querySelector<HTMLElement>("#handle")!;
  }

  it("sizes the column to its widest cell", () => {
    const setWidth = vi.fn();
    const handle = tableWithHandle(300);
    const props = columnResizeHandleProps("name", setWidth, "Resize column");
    props.onDoubleClick({
      currentTarget: handle,
    } as unknown as Parameters<typeof props.onDoubleClick>[0]);
    expect(setWidth).toHaveBeenCalledExactlyOnceWith("name", 324);
  });

  it("does nothing when there is nothing to measure", () => {
    // An empty or unrendered column keeps the width it has rather than
    // collapsing to the minimum.
    const setWidth = vi.fn();
    const handle = tableWithHandle(0);
    const props = columnResizeHandleProps("name", setWidth, "Resize column");
    props.onDoubleClick({
      currentTarget: handle,
    } as unknown as Parameters<typeof props.onDoubleClick>[0]);
    expect(setWidth).not.toHaveBeenCalled();
  });
});
