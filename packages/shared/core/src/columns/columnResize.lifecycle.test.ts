import { afterEach, describe, expect, it, vi } from "vitest";

import { columnResizeHandleProps } from "./columnResize";
function handle(doc: Document) {
  const table = doc.createElement("table");
  table.innerHTML =
    '<thead><tr><th data-column-key="a"><span></span></th></tr></thead>';
  doc.body.append(table);
  table.dir = "ltr";
  const cell = table.querySelector("th")!;
  vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({
    width: 150,
  } as DOMRect);
  Object.defineProperty(cell, "scrollWidth", { value: 150 });
  return table.querySelector("span")!;
}
function down(target: HTMLElement) {
  return {
    currentTarget: target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    clientX: 100,
  } as unknown as PointerEvent & { currentTarget: HTMLElement };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});
describe("column resize ownership", () => {
  it("aborts a drag without committing its pending frame and removes every document listener", () => {
    let pending: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      pending = callback;
      return 7;
    });
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const remove = vi.spyOn(document, "removeEventListener");
    const controller = new AbortController();
    const set = vi.fn();
    const props = columnResizeHandleProps("a", set, "Resize", {
      signal: controller.signal,
    });
    props.onPointerDown(down(handle(document)));
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 150 }));
    controller.abort();
    pending?.(0);
    document.dispatchEvent(new MouseEvent("pointerup"));
    expect(set).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledWith(7);
    for (const name of ["pointermove", "pointerup", "pointercancel"])
      expect(remove.mock.calls.some(([type]) => type === name)).toBe(true);
  });
  it("keeps already-aborted retained handles inert for drag, keyboard and autosize", () => {
    const controller = new AbortController();
    controller.abort();
    const set = vi.fn();
    const props = columnResizeHandleProps("a", set, "Resize", {
      signal: controller.signal,
    });
    const event = down(handle(document));
    props.onPointerDown(event);
    props.onKeyDown({ ...event, key: "ArrowRight" } as unknown as Parameters<
      typeof props.onKeyDown
    >[0]);
    props.onDoubleClick(event);
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 190 }));
    document.dispatchEvent(new MouseEvent("pointerup"));
    expect(set).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
  it("isolates owner-document drags and cleans only the aborted table", () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const other = document.implementation.createHTMLDocument();
    const a = new AbortController();
    const b = new AbortController();
    const writeA = vi.fn();
    const writeB = vi.fn();
    columnResizeHandleProps("a", writeA, "A", {
      signal: a.signal,
    }).onPointerDown(down(handle(document)));
    columnResizeHandleProps("a", writeB, "B", {
      signal: b.signal,
    }).onPointerDown(down(handle(other)));
    other.dispatchEvent(new MouseEvent("pointermove", { clientX: 125 }));
    expect(writeA).not.toHaveBeenCalled();
    expect(writeB).toHaveBeenCalledWith("a", 175);
    a.abort();
    other.dispatchEvent(new MouseEvent("pointerup"));
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 200 }));
    expect(writeA).not.toHaveBeenCalled();
    b.abort();
  });
});
