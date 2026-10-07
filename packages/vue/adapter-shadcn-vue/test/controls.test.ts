import { renderToString } from "@vue/server-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type VNode,
} from "vue";

import { Input } from "../src/components/input";
import { Textarea } from "../src/components/textarea";
import {
  shadcnButton,
  shadcnDensityControl,
  shadcnInput,
  shadcnMultiSelect,
  shadcnSelect,
  shadcnSelectionCheckbox,
} from "../src/controls";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function mount(render: () => VNode): HTMLElement {
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
function query<T extends Element>(host: ParentNode, selector: string): T {
  const target = host.querySelector<T>(selector);
  if (!target) throw new Error(`Missing ${selector}`);
  return target;
}

describe("copied shadcn controls", () => {
  it("forwards button semantics, keyboard events and public target refs", async () => {
    const focus = vi.fn();
    const keydown = vi.fn();
    const click = vi.fn();
    const host = mount(() =>
      shadcnButton({
        attrs: {
          ref: focus,
          class: "custom-button",
          "data-adapttable-part": "sort-button",
          "aria-label": "Sort revenue",
          onKeydown: keydown,
          onClick: click,
        },
        label: "Revenue",
      })
    );
    const button = query<HTMLButtonElement>(host, "button");
    expect(button.dataset.slot).toBe("button");
    expect(button.dataset.adapttablePart).toBe("sort-button");
    expect(button.classList.contains("custom-button")).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Sort revenue");
    expect(focus).toHaveBeenLastCalledWith(button);
    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    button.click();
    await nextTick();
    expect(keydown).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    cleanups.splice(0).forEach((cleanup) => cleanup());
    expect(focus).toHaveBeenLastCalledWith(null);
  });

  it("keeps disabled buttons inactive", () => {
    const click = vi.fn();
    const host = mount(() =>
      shadcnButton({
        attrs: { disabled: true, onClick: click },
        label: "Save",
      })
    );
    query<HTMLButtonElement>(host, "button").click();
    expect(click).not.toHaveBeenCalled();
  });

  it("puts compound select classes and refs on the interactive target", () => {
    const focus = vi.fn();
    const host = mount(() =>
      shadcnSelect({
        attrs: {
          ref: focus,
          class: "custom-select",
          dir: "rtl",
          "aria-label": "Density",
          "data-adapttable-part": "density-toggle",
        },
        value: "compact",
        onChange: vi.fn(),
        options: [{ value: "compact", label: "Compact" }],
      })
    );
    const select = query<HTMLSelectElement>(host, "select");
    const wrapper = query<HTMLElement>(
      host,
      "[data-slot=native-select-wrapper]"
    );
    expect(select.dataset.slot).toBe("native-select");
    expect(select.dataset.adapttablePart).toBe("density-toggle");
    expect(select.classList.contains("custom-select")).toBe(true);
    expect(wrapper.classList.contains("custom-select")).toBe(false);
    expect(wrapper.dir).toBe("rtl");
    expect(select.dir).toBe("rtl");
    expect(focus).toHaveBeenLastCalledWith(select);
    expect(select.options[0]?.dataset.slot).toBe("native-select-option");
  });

  it("supports empty options and restores a declined select request", async () => {
    const changed = vi.fn();
    const host = mount(() =>
      shadcnSelect({
        attrs: {},
        value: "",
        onChange: changed,
        options: [
          { value: "", label: "Any" },
          { value: "active", label: "Active" },
        ],
      })
    );
    const select = query<HTMLSelectElement>(host, "select");
    select.value = "active";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(changed).toHaveBeenCalledExactlyOnceWith("active");
    expect(select.value).toBe("");
  });

  it("accepts a host select update", async () => {
    const value = ref("comfortable");
    const host = mount(() =>
      shadcnSelect({
        attrs: {},
        value: value.value,
        onChange: (next) => {
          value.value = next;
        },
        options: [
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" },
        ],
      })
    );
    const select = query<HTMLSelectElement>(host, "select");
    select.value = "compact";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(select.value).toBe("compact");
  });

  it("uses one event for mixed selection without the native change callback", async () => {
    const toggle = vi.fn();
    const legacy = vi.fn();
    const focus = vi.fn();
    const host = mount(() =>
      shadcnSelectionCheckbox({
        attrs: {
          type: "checkbox",
          checked: false,
          indeterminate: true,
          onChange: legacy,
          ref: focus,
          class: "selection-hook",
          "data-adapttable-part": "selection-checkbox",
          "aria-label": "Select all",
        },
        checked: false,
        indeterminate: true,
        onToggle: toggle,
      })
    );
    const checkbox = query<HTMLButtonElement>(host, "[role=checkbox]");
    expect(checkbox.dataset.slot).toBe("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
    expect(checkbox.dataset.adapttablePart).toBe("selection-checkbox");
    expect(checkbox.classList.contains("selection-hook")).toBe(true);
    expect(focus).toHaveBeenLastCalledWith(checkbox);
    checkbox.click();
    await nextTick();
    checkbox.click();
    await nextTick();
    expect(toggle).toHaveBeenCalledTimes(2);
    expect(legacy).not.toHaveBeenCalled();
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
  });

  it("forwards input semantics and reconciles rejected input", async () => {
    const changed = vi.fn();
    const focus = vi.fn();
    const host = mount(() =>
      shadcnInput({
        attrs: {
          ref: focus,
          type: "search",
          class: "search-hook",
          "data-adapttable-part": "search-input",
          "aria-label": "Search",
        },
        value: "saved",
        onChange: changed,
      })
    );
    const input = query<HTMLInputElement>(host, "input");
    expect(focus).toHaveBeenLastCalledWith(input);
    expect(input.type).toBe("search");
    expect(input.dataset.slot).toBe("input");
    input.value = "draft";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(changed).toHaveBeenCalledExactlyOnceWith("draft");
    expect(input.value).toBe("saved");
  });

  it("preserves accepted input and textarea values", async () => {
    const value = ref("before");
    const host = mount(() =>
      h("div", [
        h(Input, {
          modelValue: value.value,
          "onUpdate:modelValue": (next: string | number) => {
            value.value = String(next);
          },
        }),
        h(Textarea, {
          modelValue: value.value,
          "onUpdate:modelValue": (next: string | number) => {
            value.value = String(next);
          },
        }),
      ])
    );
    const input = query<HTMLInputElement>(host, "input");
    const textarea = query<HTMLTextAreaElement>(host, "textarea");
    input.value = "after";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(input.value).toBe("after");
    expect(textarea.value).toBe("after");
    textarea.value = "notes";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(input.value).toBe("notes");
    expect(textarea.value).toBe("notes");
  });

  it("restores a rejected multi-select request and retires detached controls", async () => {
    const changed = vi.fn();
    const host = mount(() =>
      shadcnMultiSelect({
        attrs: { "aria-label": "Tags" },
        value: ["a"],
        onChange: changed,
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
      })
    );
    const select = query<HTMLSelectElement>(host, "select");
    expect(
      Array.from(select.selectedOptions, (option) => option.value)
    ).toEqual(["a"]);
    for (const option of select.options) option.selected = true;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(changed).toHaveBeenCalledExactlyOnceWith(["a", "b"]);
    expect(
      Array.from(select.selectedOptions, (option) => option.value)
    ).toEqual(["a"]);
    cleanups.splice(0).forEach((cleanup) => cleanup());
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(changed).toHaveBeenCalledOnce();
  });

  it("renders controls through the server renderer", async () => {
    const app = createSSRApp({
      render: () =>
        h("div", [
          shadcnButton({ attrs: { "aria-label": "Sort" }, label: "Sort" }),
          shadcnInput({ attrs: {}, value: "hello", onChange: vi.fn() }),
          shadcnSelectionCheckbox({
            attrs: { "aria-label": "Select" },
            checked: true,
            indeterminate: false,
            onToggle: vi.fn(),
          }),
          shadcnDensityControl({
            attrs: {},
            value: "compact",
            options: [{ value: "compact", label: "Compact" }],
            onChange: vi.fn(),
          }),
          shadcnSelect({
            attrs: {},
            value: "5",
            options: [{ value: "5", label: "5 rows" }],
            onChange: vi.fn(),
          }),
        ]),
    });
    const html = await renderToString(app);
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('data-slot="native-select"');
    expect(html).toContain('aria-checked="true"');
  });
});
