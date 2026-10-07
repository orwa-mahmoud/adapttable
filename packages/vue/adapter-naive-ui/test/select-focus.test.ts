import { describe, expect, it, vi } from "vitest";
import { h } from "vue";

import { naiveSelect } from "../src/controls/select";
import { escape, find, mount, tick } from "./filter-helpers";

function press(target: Element, key: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}

function fixture() {
  const update = vi.fn();
  const outerKeydown = vi.fn();
  const callback = vi.fn();
  const view = mount(() =>
    h("div", { onKeydown: outerKeydown }, [
      naiveSelect({
        attrs: { "aria-label": "Density", ref: callback },
        value: "comfortable",
        options: [
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" },
        ],
        onChange: update,
      }),
      h("button", { type: "button" }, "Next control"),
    ])
  );
  return {
    ...view,
    update,
    outerKeydown,
    callback,
    input: find<HTMLInputElement>(view.host, 'input[role="combobox"]'),
    outside: find<HTMLButtonElement>(view.host, "button"),
  };
}

describe("Naive select keyboard focus", () => {
  it("restores the canonical combobox after repeated Escape dismissals", async () => {
    const view = fixture();
    await tick();
    view.input.focus();
    for (let repeat = 0; repeat < 2; repeat++) {
      expect(document.activeElement).toBe(view.input);
      press(document.activeElement!, "Enter");
      await tick();
      expect(view.input.getAttribute("aria-expanded")).toBe("true");
      view.outerKeydown.mockClear();
      await escape(document.activeElement!);
      expect(view.input.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(view.input);
      expect(view.outerKeydown).not.toHaveBeenCalled();
    }
    expect(view.update).not.toHaveBeenCalled();
    expect(view.callback).toHaveBeenCalledExactlyOnceWith(view.input);
  });

  it("lets a subsequent Escape reach the surrounding surface", async () => {
    const view = fixture();
    await tick();
    view.input.focus();
    press(view.input, "Enter");
    await tick();
    await escape(document.activeElement!);
    view.outerKeydown.mockClear();
    await escape(document.activeElement!);
    expect(view.input.getAttribute("aria-expanded")).toBe("false");
    expect(view.outerKeydown).toHaveBeenCalledOnce();
  });

  it("does not steal focus when a user leaves an open select", async () => {
    const view = fixture();
    await tick();
    view.input.focus();
    press(view.input, "Enter");
    await tick();
    view.outside.focus();
    await tick();
    expect(document.activeElement).toBe(view.outside);
    expect(view.input.getAttribute("aria-expanded")).toBe("false");
  });
});
