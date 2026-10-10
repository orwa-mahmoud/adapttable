import { describe, expect, it, vi } from "vitest";
import { h, shallowRef } from "vue";

import { NativeFilterSurface } from "../src/filters/NativeFilterSurface";
import { find, mountNative, part, tick } from "./filter-editing-helpers";

function fixture() {
  const open = shallowRef(true);
  const modal = shallowRef(true);
  let accepted = true;
  const close = vi.fn(() => {
    if (accepted) open.value = false;
  });
  const view = mountNative(
    () =>
      h(NativeFilterSurface, {
        open: open.value,
        modal: modal.value,
        dir: "rtl",
        label: "Filters",
        backdropLabel: "Cancel filters",
        anchor: null,
        children: h("input", { "aria-label": "Search" }),
        onClose: close,
      }),
    {
      filtersBackdrop: "backdrop-only",
      filtersPanel: "pane-only",
      filtersDrawer: "drawer-alias",
    }
  );
  return {
    ...view,
    open,
    modal,
    close,
    reject: () => {
      accepted = false;
    },
  };
}
describe("addressable native modal backdrop", () => {
  it("places the real backdrop and foreground panel inside the native host", async () => {
    const view = fixture();
    await tick();
    const dialog = find<HTMLDialogElement>(document.body, "dialog");
    const panel = find(dialog, part("filters-panel"));
    const backdrop = find<HTMLButtonElement>(dialog, part("filters-backdrop"));
    expect(dialog.hasAttribute("tabindex")).toBe(false);
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.dir).toBe("rtl");
    expect(panel.className).toBe("drawer-alias pane-only");
    expect(backdrop.tagName).toBe("BUTTON");
    expect(backdrop.type).toBe("button");
    expect(backdrop.getAttribute("aria-label")).toBe("Cancel filters");
    expect(backdrop.className).toBe("backdrop-only");
    expect(backdrop.contains(document.activeElement)).toBe(false);
    backdrop.click();
    await tick();
    expect(view.close).toHaveBeenCalledExactlyOnceWith("outside");
    expect(document.body.querySelector("dialog")).toBeNull();
  });

  it("keeps the host open on rejected backdrop dismissal without a duplicate request", async () => {
    const view = fixture();
    view.reject();
    await tick();
    const backdrop = find<HTMLButtonElement>(
      document.body,
      part("filters-backdrop")
    );
    backdrop.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    backdrop.dispatchEvent(
      new MouseEvent("click", { bubbles: true, detail: 1 })
    );
    await tick();
    expect(view.close).toHaveBeenCalledExactlyOnceWith("outside");
    expect(find<HTMLDialogElement>(document.body, "dialog").open).toBe(true);
  });

  it("does not treat a drag from the panel or a cancelled pointer as a backdrop click", async () => {
    const view = fixture();
    await tick();
    const panel = find(document.body, part("filters-panel"));
    const backdrop = find(document.body, part("filters-backdrop"));
    panel.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    backdrop.dispatchEvent(
      new MouseEvent("click", { bubbles: true, detail: 1 })
    );
    expect(view.close).not.toHaveBeenCalled();
    backdrop.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    backdrop.dispatchEvent(new Event("pointercancel", { bubbles: true }));
    backdrop.dispatchEvent(
      new MouseEvent("click", { bubbles: true, detail: 1 })
    );
    expect(view.close).not.toHaveBeenCalled();
  });

  it("retires a retained backdrop after close/reopen and never adds one to the popover", async () => {
    const view = fixture();
    await tick();
    const old = find<HTMLButtonElement>(
      document.body,
      part("filters-backdrop")
    );
    const oldDialog = find<HTMLDialogElement>(document.body, "dialog");
    view.open.value = false;
    await tick();
    view.open.value = true;
    await tick();
    old.click();
    oldDialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(view.close).not.toHaveBeenCalled();
    view.modal.value = false;
    await tick();
    expect(document.body.querySelector(part("filters-backdrop"))).toBeNull();
    expect(document.body.querySelector(part("filters-popover"))).not.toBeNull();
    view.stop();
    old.click();
    expect(view.close).not.toHaveBeenCalled();
  });
});
