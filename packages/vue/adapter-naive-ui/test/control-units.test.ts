import type { ColumnDef } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";

import { DataTable } from "../src";
import { eventHandler, withoutAttributes } from "../src/controls/attributes";
import { naiveTableControls } from "../src/controls/table";
import { fullscreen } from "../src/fullscreen";
import { requireControl } from "../src/renderers/content";
import { find, mount, part, tick } from "./filter-helpers";

describe("Naive control attributes", () => {
  it("removes only the named attributes", () => {
    expect(
      withoutAttributes({ value: "a", type: "text", id: "x" }, ["value"])
    ).toEqual({ type: "text", id: "x" });
  });

  it("runs Vue's merged listener arrays in order with the same event", () => {
    const calls: string[] = [];
    const event = new KeyboardEvent("keydown", { key: "Enter" });
    const first = vi.fn(() => calls.push("first"));
    const second = vi.fn(() => calls.push("second"));
    const handler = eventHandler<KeyboardEvent>([first, [second], "ignored"]);
    handler?.(event);
    expect(calls).toEqual(["first", "second"]);
    expect(first).toHaveBeenCalledWith(event);
    expect(second).toHaveBeenCalledWith(event);
    expect(eventHandler(first)).toBe(first);
    expect(eventHandler(undefined)).toBeUndefined();
  });
});

describe("Naive table controls", () => {
  const controls = naiveTableControls();

  it("shows busy, expanded and collapsed toggle glyphs on Naive buttons", async () => {
    const { host } = mount(() => [
      controls.TreeToggle?.({
        attrs: { "data-adapttable-part": "tree-busy" },
        expanded: false,
        loading: true,
      }),
      controls.TreeToggle?.({
        attrs: { "data-adapttable-part": "tree-open" },
        expanded: true,
        loading: false,
      }),
      controls.RowDetailToggle?.({
        attrs: { "data-adapttable-part": "detail-closed" },
        expanded: false,
      }),
    ]);
    await tick();
    expect(find(host, part("tree-busy")).textContent).toBe("…");
    expect(find(host, part("tree-open")).textContent).toBe("−");
    expect(find(host, part("detail-closed")).textContent).toBe("+");
    expect(find(host, part("detail-closed")).classList).toContain("n-button");
  });

  it("names the missing kit feature when a required control is absent", () => {
    expect(() => requireControl(undefined, "GroupRow")).toThrow(
      "AdaptTable Naive UI: GroupRow requires its matching kit feature."
    );
    const control = () => null;
    expect(requireControl(control, "GroupRow")).toBe(control);
  });
});

describe("Naive fullscreen", () => {
  const restores: (() => void)[] = [];
  afterEach(() => {
    for (const restore of restores.splice(0).reverse()) restore();
  });
  function platform(
    target: object,
    key: string,
    descriptor: PropertyDescriptor
  ) {
    const original = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, { ...descriptor, configurable: true });
    restores.push(() => {
      if (original) Object.defineProperty(target, key, original);
      else Reflect.deleteProperty(target, key);
    });
  }

  it("toggles the table root through a Naive button", async () => {
    const state: { current: Element | null } = { current: null };
    const request = vi.fn(function (this: Element) {
      state.current = this;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    const exit = vi.fn(() => {
      state.current = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    platform(document, "fullscreenEnabled", { value: true });
    platform(document, "fullscreenElement", { get: () => state.current });
    platform(document, "exitFullscreen", { value: exit });
    platform(HTMLElement.prototype, "requestFullscreen", { value: request });
    const columns: ColumnDef<{ id: string }>[] = [{ key: "id" }];
    const { host } = mount(() =>
      h(DataTable<{ id: string }>, {
        data: [{ id: "a" }],
        columns,
        rowKey: (row: { id: string }) => row.id,
        urlSync: false,
        forceMobile: false,
        features: [fullscreen()],
      })
    );
    await tick();
    const button = find<HTMLButtonElement>(host, part("fullscreen-toggle"));
    expect(button.classList).toContain("n-button");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    button.click();
    await tick();
    expect(request).toHaveBeenCalledTimes(1);
    expect(state.current).toBe(find(host, part("root")));
    expect(button.getAttribute("aria-pressed")).toBe("true");
    button.click();
    await tick();
    expect(exit).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });
});
