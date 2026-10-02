/** Column resize gestures reach the host through Angular's attribute binding. */
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptAttrs } from "../attrs";
import { injectColumnResize } from "./columnResize";

@Component({
  imports: [AdaptAttrs],
  template: `
    <table [attr.dir]="dir()">
      <thead>
        <tr>
          <th data-column-key="name" [style.width.px]="width()">
            <button [adaptAttrs]="handle"></button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-column-key="name">Dubai</td>
        </tr>
      </tbody>
    </table>
  `,
})
class Host {
  readonly dir = signal<"ltr" | "rtl">("ltr");
  readonly width = signal(150);
  readonly setWidth = vi.fn((_key: string, width: number) => {
    this.width.set(width);
  });
  readonly handle = {
    ...injectColumnResize("name", this.setWidth, "Resize column: Name"),
  };
}

async function mount(dir: "ltr" | "rtl" = "ltr") {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.dir.set(dir);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const header = root.querySelector("th")!;
  // jsdom has no layout. The browser would measure the host's rendered width.
  vi.spyOn(header, "getBoundingClientRect").mockImplementation(
    () => new DOMRect(0, 0, Number.parseFloat(header.style.width), 32)
  );
  return {
    fixture,
    header,
    handle: root.querySelector("button")!,
    setWidth: fixture.componentInstance.setWidth,
  };
}

afterEach(() => {
  document.dispatchEvent(new MouseEvent("pointercancel"));
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("injectColumnResize", () => {
  it("exposes named button metadata and resize callbacks", () => {
    const setWidth = vi.fn();
    const props = injectColumnResize("name", setWidth, "Resize column: Name");
    expect(props.role).toBe("button");
    expect(props.tabIndex).toBe(0);
    expect(props["aria-label"]).toBe("Resize column: Name");
    expect(typeof props.onPointerDown).toBe("function");
    expect(typeof props.onKeyDown).toBe("function");
    expect(typeof props.onDoubleClick).toBe("function");
  });

  it.each([
    { dir: "ltr" as const, widen: "ArrowRight", narrow: "ArrowLeft" },
    { dir: "rtl" as const, widen: "ArrowLeft", narrow: "ArrowRight" },
  ])(
    "resizes the host's current width with $dir arrow keys",
    async ({ dir, widen, narrow }) => {
      const { fixture, handle, header, setWidth } = await mount(dir);
      const key = new KeyboardEvent("keydown", {
        key: widen,
        bubbles: true,
        cancelable: true,
      });
      handle.dispatchEvent(key);
      await fixture.whenStable();
      expect(key.defaultPrevented).toBe(true);
      expect(setWidth).toHaveBeenCalledExactlyOnceWith("name", 166);
      expect(header.style.width).toBe("166px");

      handle.dispatchEvent(
        new KeyboardEvent("keydown", { key: narrow, bubbles: true })
      );
      await fixture.whenStable();
      expect(setWidth).toHaveBeenNthCalledWith(2, "name", 150);
      expect(header.style.width).toBe("150px");

      const ignored = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      handle.dispatchEvent(ignored);
      expect(ignored.defaultPrevented).toBe(false);
      expect(setWidth).toHaveBeenCalledTimes(2);
    }
  );

  it("keeps a keyboard resize above the minimum width", async () => {
    const { fixture, handle, header, setWidth } = await mount();
    fixture.componentInstance.width.set(64);
    await fixture.whenStable();
    handle.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    await fixture.whenStable();
    expect(setWidth).toHaveBeenCalledExactlyOnceWith("name", 60);
    expect(header.style.width).toBe("60px");
  });

  it.each([
    { dir: "ltr" as const, delta: 1, end: "pointerup" },
    { dir: "rtl" as const, delta: -1, end: "pointercancel" },
  ])(
    "commits $dir pointer frames and stops after $end",
    async ({ dir, delta, end }) => {
      const { fixture, handle, header, setWidth } = await mount(dir);
      const frames: FrameRequestCallback[] = [];
      vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
        (callback) => frames.push(callback)
      );
      const cancel = vi
        .spyOn(globalThis, "cancelAnimationFrame")
        .mockImplementation(() => undefined);
      const down = new MouseEvent("pointerdown", {
        clientX: 100,
        bubbles: true,
        cancelable: true,
      });
      handle.dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      document.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 100 + 20 * delta })
      );
      document.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 100 + 40 * delta })
      );
      expect(setWidth).not.toHaveBeenCalled();
      expect(frames).toHaveLength(1);
      frames[0]!(0);
      await fixture.whenStable();
      expect(setWidth).toHaveBeenCalledExactlyOnceWith("name", 190);
      expect(header.style.width).toBe("190px");

      document.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 100 + 55 * delta })
      );
      document.dispatchEvent(new MouseEvent(end));
      await fixture.whenStable();
      expect(cancel).toHaveBeenCalledWith(2);
      expect(setWidth).toHaveBeenNthCalledWith(2, "name", 205);
      expect(header.style.width).toBe("205px");
      const scheduled = frames.length;
      document.dispatchEvent(new MouseEvent("pointermove", { clientX: 500 }));
      expect(frames).toHaveLength(scheduled);
      expect(setWidth).toHaveBeenCalledTimes(2);
    }
  );

  it("sizes the host column to the widest cell on double-click", async () => {
    const { fixture, handle, header, setWidth } = await mount();
    const cell = (fixture.nativeElement as HTMLElement).querySelector("td")!;
    Object.defineProperty(header, "scrollWidth", { value: 100 });
    Object.defineProperty(cell, "scrollWidth", { value: 300 });
    handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await fixture.whenStable();
    expect(setWidth).toHaveBeenCalledExactlyOnceWith("name", 324);
    expect(header.style.width).toBe("324px");
  });
});
