import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";

import { naiveButton } from "../src/controls/button";
import { naiveCheckbox } from "../src/controls/checkbox";
import { naiveInput } from "../src/controls/input";

const cleanups: (() => void)[] = [];
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.restoreAllMocks();
});

describe("Naive UI semantic control bridges", () => {
  it("keeps button type, classes, ARIA, listener and ref on the actual button", async () => {
    const press = vi.fn();
    const ref = vi.fn();
    const host = mount(() =>
      naiveButton(
        {
          type: "submit",
          ref,
          class: "custom-button",
          "aria-label": "Sort name",
          "data-adapttable-part": "sort-button",
          onClick: press,
        },
        "Name"
      )
    );
    const button = host.querySelector("button")!;
    expect(button.classList.contains("n-button")).toBe(true);
    expect(button.classList.contains("custom-button")).toBe(true);
    expect(button.type).toBe("submit");
    expect(button.getAttribute("aria-label")).toBe("Sort name");
    expect(button.dataset.adapttablePart).toBe("sort-button");
    expect(ref).toHaveBeenLastCalledWith(button);
    button.click();
    expect(press).toHaveBeenCalledTimes(1);
    button.focus();
    expect(document.activeElement).toBe(button);
    cleanups.pop()!();
    await nextTick();
    expect(ref).toHaveBeenLastCalledWith(null);
  });

  it("uses one checkbox update per click and keeps rejected state controlled", async () => {
    const toggle = vi.fn();
    const legacy = vi.fn();
    const ref = vi.fn();
    const state = shallowRef({ checked: false, indeterminate: true });
    const host = mount(() =>
      naiveCheckbox({
        attrs: {
          type: "checkbox",
          class: "pick-row",
          "aria-label": "Select Ada",
          "data-adapttable-part": "selection-checkbox",
          checked: true,
          onChange: legacy,
          ref,
        },
        ...state.value,
        onToggle: toggle,
      })
    );
    const checkbox = host.querySelector<HTMLElement>('[role="checkbox"]')!;
    expect(checkbox.classList.contains("n-checkbox")).toBe(true);
    expect(checkbox.classList.contains("pick-row")).toBe(true);
    expect(checkbox.dataset.adapttablePart).toBe("selection-checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
    expect(checkbox.getAttribute("aria-label")).toBe("Select Ada");
    expect(checkbox.hasAttribute("aria-labelledby")).toBe(false);
    expect(ref).toHaveBeenLastCalledWith(checkbox);
    checkbox.click();
    await nextTick();
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(legacy).not.toHaveBeenCalled();
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
    checkbox.click();
    await nextTick();
    expect(toggle).toHaveBeenCalledTimes(2);
    state.value = { checked: true, indeterminate: false };
    await nextTick();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    checkbox.focus();
    expect(document.activeElement).toBe(checkbox);
  });

  it("keeps disabled checkboxes inert", async () => {
    const toggle = vi.fn();
    const host = mount(() =>
      naiveCheckbox({
        attrs: { disabled: true, "aria-label": "Select disabled row" },
        checked: false,
        indeterminate: false,
        onToggle: toggle,
      })
    );
    const checkbox = host.querySelector<HTMLElement>('[role="checkbox"]')!;
    checkbox.click();
    await nextTick();
    expect(toggle).not.toHaveBeenCalled();
    expect(checkbox.hasAttribute("tabindex")).toBe(false);
    expect(checkbox.getAttribute("aria-disabled")).toBe("true");
  });

  it("puts text markers, labels, classes and refs on the native input", async () => {
    const update = vi.fn();
    const ref = vi.fn();
    const keydown = vi.fn();
    const host = mount(() =>
      naiveInput({
        attrs: {
          ref,
          id: "search-name",
          class: "search-control",
          "aria-label": "Search records",
          "data-adapttable-part": "search",
          onKeydown: keydown,
        },
        value: "Ada",
        onChange: update,
      })
    );
    const input = host.querySelector("input")!;
    expect(input.closest(".n-input")).not.toBeNull();
    expect(input.classList.contains("search-control")).toBe(true);
    expect(input.id).toBe("search-name");
    expect(input.dataset.adapttablePart).toBe("search");
    expect(input.getAttribute("aria-label")).toBe("Search records");
    expect(ref).toHaveBeenLastCalledWith(input);
    input.value = "Bea";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await nextTick();
    expect(update).toHaveBeenCalledExactlyOnceWith("Bea");
    expect(input.value).toBe("Ada");
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(keydown).toHaveBeenCalledTimes(1);
  });

  it("preserves date input semantics through documented native input props", () => {
    const host = mount(() =>
      naiveInput({
        attrs: { "aria-label": "Created after" },
        type: "date",
        value: "2026-10-01",
        onChange: vi.fn(),
      })
    );
    expect(host.querySelector("input")!.type).toBe("date");
    expect(host.querySelector("input")!.value).toBe("2026-10-01");
  });
  it("preserves disabled, readonly, length and blur semantics on text inputs", () => {
    const blur = vi.fn();
    const host = mount(() =>
      naiveInput({
        attrs: {
          "aria-label": "Name",
          readonly: true,
          maxlength: 20,
          minlength: 2,
          onBlur: blur,
        },
        value: "Ada",
        onChange: vi.fn(),
      })
    );
    const input = host.querySelector("input")!;
    expect(input.readOnly).toBe(true);
    expect(input.maxLength).toBe(20);
    expect(input.minLength).toBe(2);
    input.focus();
    input.blur();
    expect(blur).toHaveBeenCalledTimes(1);
  });
});
