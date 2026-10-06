import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick, ref } from "vue";

import ElementInput from "../src/controls/ElementInput.vue";
import ElementSelect from "../src/controls/ElementSelect.vue";
import { ElementFilterSurface } from "../src/filters/ElementFilterSurface";
import { mount, node } from "./mount";

const anchors: HTMLElement[] = [];
afterEach(() => anchors.splice(0).forEach((anchor) => anchor.remove()));
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
function fixture(modal: boolean, accept = true, select = false) {
  const anchor = document.createElement("button");
  anchor.textContent = "Open filters";
  document.body.append(anchor);
  anchors.push(anchor);
  anchor.focus();
  const open = ref(true);
  const selectChange = vi.fn();
  const close = vi.fn((reason?: "escape" | "outside" | "done") => {
    if (accept) open.value = false;
    return reason;
  });
  const view = mount(() =>
    h(ElementFilterSurface, {
      open: open.value,
      modal,
      anchor,
      label: "Filter records",
      dir: "rtl",
      className: "host-panel",
      onClose: close,
      children: select
        ? h(ElementSelect, {
            value: "a",
            options: [
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ],
            "aria-label": "Filter choice",
            onChange: selectChange,
          })
        : h(ElementInput, { value: "", "aria-label": "Filter name" }),
    })
  );
  return { ...view, anchor, open, close, selectChange };
}
function escape(element: HTMLElement) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
}

describe("Element Plus filter overlays", () => {
  for (const modal of [false, true]) {
    const mode = modal ? "drawer" : "popover";
    it(`${mode}: first Escape closes an open select and the next closes only the outer layer`, async () => {
      const state = fixture(modal, true, true);
      await tick();
      const input = node<HTMLInputElement>(
        document,
        'input[aria-label="Filter choice"]'
      );
      input.focus();
      input.click();
      await tick();
      expect(input.getAttribute("aria-expanded")).toBe("true");
      escape(input);
      await tick();
      expect(input.getAttribute("aria-expanded")).toBe("false");
      expect(state.close).not.toHaveBeenCalled();
      expect(state.open.value).toBe(true);
      escape(input);
      await tick();
      expect(state.close).toHaveBeenCalledExactlyOnceWith("escape");
      expect(state.open.value).toBe(false);
      expect(state.selectChange).not.toHaveBeenCalled();
      await vi.waitFor(() => expect(document.activeElement).toBe(state.anchor));
    });

    it(`${mode}: a closed select requests outer Escape once and preserves rejected state and focus`, async () => {
      const state = fixture(modal, false, true);
      await tick();
      const input = node<HTMLInputElement>(
        document,
        'input[aria-label="Filter choice"]'
      );
      input.focus();
      expect(input.getAttribute("aria-expanded")).toBe("false");
      escape(input);
      await tick();
      expect(state.close).toHaveBeenCalledExactlyOnceWith("escape");
      expect(state.open.value).toBe(true);
      expect(document.activeElement).toBe(input);
      escape(input);
      await tick();
      expect(state.close).toHaveBeenCalledTimes(2);
      expect(state.open.value).toBe(true);
      expect(document.activeElement).toBe(input);
      expect(state.selectChange).not.toHaveBeenCalled();
    });
  }

  it("renders a named real nonmodal kit dialog with no backdrop", async () => {
    fixture(false);
    await tick();
    const surface = node(document, '[data-adapttable-part="filters-popover"]');
    const dialog = node(document, '[role="dialog"]');
    expect(surface.classList.contains("el-card")).toBe(true);
    expect(surface.classList.contains("host-panel")).toBe(true);
    expect(dialog.classList.contains("el-popper")).toBe(true);
    expect(dialog.contains(surface)).toBe(true);
    expect(dialog.getAttribute("aria-label")).toBe("Filter records");
    expect(dialog.getAttribute("aria-modal")).not.toBe("true");
    expect(surface.getAttribute("dir")).toBe("rtl");
    expect(document.querySelector(".el-overlay")).toBeNull();
  });

  it("requests accepted Escape once and restores the connected trigger", async () => {
    const state = fixture(false);
    await tick();
    const input = node<HTMLInputElement>(
      document,
      'input[aria-label="Filter name"]'
    );
    input.focus();
    escape(input);
    await tick();
    expect(state.close).toHaveBeenCalledExactlyOnceWith("escape");
    expect(state.open.value).toBe(false);
    await vi.waitFor(() => expect(document.activeElement).toBe(state.anchor));
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-adapttable-part="filters-popover"]')
      ).toBeNull()
    );
  });

  it("retains a rejected outside close without taking host state", async () => {
    const state = fixture(false, false);
    await tick();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await tick();
    expect(state.close).toHaveBeenCalledExactlyOnceWith("outside");
    expect(state.open.value).toBe(true);
    expect(
      node(document, '[data-adapttable-part="filters-popover"]')
    ).not.toBeNull();
  });

  it("puts drawer semantics, marker and class on the actual kit dialog", async () => {
    fixture(true);
    await tick();
    const dialog = node<HTMLElement>(
      document,
      '[data-adapttable-part="filters-panel"]'
    );
    expect(dialog.classList.contains("el-drawer")).toBe(true);
    expect(dialog.classList.contains("host-panel")).toBe(true);
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Filter records");
    expect(dialog.getAttribute("dir")).toBe("rtl");
    expect(dialog.closest(".el-overlay")).not.toBeNull();
    await vi.waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
  });

  it("keeps a rejected drawer Escape open and emits one close request", async () => {
    const state = fixture(true, false);
    await tick();
    const input = node<HTMLInputElement>(
      document,
      'input[aria-label="Filter name"]'
    );
    input.focus();
    escape(input);
    await tick();
    expect(state.close).toHaveBeenCalledExactlyOnceWith("escape");
    expect(state.open.value).toBe(true);
    expect(
      document.querySelector(
        '.el-drawer.open[data-adapttable-part="filters-panel"]'
      )
    ).not.toBeNull();
    expect(document.activeElement).toBe(input);
  });
});
