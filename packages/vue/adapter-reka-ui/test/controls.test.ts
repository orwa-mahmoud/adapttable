import { renderToString } from "vue/server-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";

import { rekaButton, rekaInput } from "../src/controls/basic";
import { rekaCheckbox, rekaSelectionCheckbox } from "../src/controls/checkbox";
import { rekaFilterControls } from "../src/controls/filterControls";
import { rekaSelect } from "../src/controls/select";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  document.body.replaceChildren();
});

function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(host);
  cleanups.push(() => app.unmount());
  return host;
}

describe("Reka interactive targets", () => {
  it("forwards button parts, classes, events and native refs to Primitive", async () => {
    const ref = vi.fn();
    const click = vi.fn();
    const host = mount(() =>
      rekaButton(
        {
          "data-adapttable-part": "sort-button",
          class: "consumer-sort",
          ref,
          "aria-label": "Sort name",
          onClick: click,
        },
        "Name"
      )
    );
    const button = host.querySelector("button");
    expect(button?.getAttribute("data-adapttable-part")).toBe("sort-button");
    expect(button?.classList.contains("consumer-sort")).toBe(true);
    expect(button?.getAttribute("aria-label")).toBe("Sort name");
    expect(ref).toHaveBeenCalledWith(button);
    button?.click();
    await nextTick();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("keeps rejected selections controlled and requests every repeated toggle once", async () => {
    const toggle = vi.fn();
    const ref = vi.fn();
    const checked = shallowRef(false);
    const mixed = shallowRef(true);
    const disabled = shallowRef(false);
    const legacy = vi.fn();
    const host = mount(() =>
      rekaSelectionCheckbox({
        attrs: {
          ref,
          type: "checkbox",
          checked: checked.value,
          indeterminate: mixed.value,
          disabled: disabled.value,
          onChange: legacy,
          class: "consumer-selection",
          "aria-label": "Select row",
          "data-adapttable-part": "row-select",
        },
        checked: checked.value,
        indeterminate: mixed.value,
        onToggle: toggle,
      })
    );
    const checkbox = host.querySelector<HTMLButtonElement>('[role="checkbox"]');
    expect(checkbox?.getAttribute("aria-checked")).toBe("mixed");
    expect(checkbox?.type).toBe("button");
    expect(checkbox?.classList.contains("consumer-selection")).toBe(true);
    expect(ref).toHaveBeenCalledWith(checkbox);
    checkbox?.click();
    await nextTick();
    checkbox?.click();
    await nextTick();
    expect(toggle).toHaveBeenCalledTimes(2);
    expect(legacy).not.toHaveBeenCalled();
    expect(checkbox?.getAttribute("aria-checked")).toBe("mixed");
    checked.value = true;
    mixed.value = false;
    await nextTick();
    expect(checkbox?.getAttribute("aria-checked")).toBe("true");
    disabled.value = true;
    await nextTick();
    checkbox?.click();
    expect(toggle).toHaveBeenCalledTimes(2);
  });

  it("keeps the filter-checkbox marker on Label and state on CheckboxRoot", () => {
    const controls = rekaFilterControls(() => ({
      filterCheckbox: "consumer-label",
    }));
    const host = mount(() =>
      controls.Checkbox({
        label: "Active",
        checked: true,
        onChange: vi.fn(),
        attrs: {
          "data-adapttable-part": "filter-checkbox",
          "aria-label": "Active",
        },
      })
    );
    const label = host.querySelector(
      '[data-adapttable-part="filter-checkbox"]'
    );
    expect(label?.tagName).toBe("LABEL");
    expect(label?.classList.contains("consumer-label")).toBe(true);
    expect(
      label?.querySelector('[role="checkbox"]')?.getAttribute("aria-checked")
    ).toBe("true");
  });

  it("uses a native text field and restores a rejected controlled edit", () => {
    const change = vi.fn();
    const host = mount(() =>
      rekaInput({
        attrs: { "aria-label": "Search" },
        value: "old",
        onChange: change,
      })
    );
    const input = host.querySelector("input");
    if (!input) throw new Error("Missing input");
    input.value = "new";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(change).toHaveBeenCalledWith("new");
    expect(input.value).toBe("old");
  });

  it("places select semantics and ref on the trigger, including an empty option", () => {
    const ref = vi.fn();
    const host = mount(() =>
      rekaSelect({
        attrs: {
          "aria-label": "Operator",
          "data-adapttable-part": "filter-operator",
          class: "consumer-select",
          ref,
        },
        value: "",
        options: [
          { value: "", label: "Any" },
          { value: "active", label: "Active" },
        ],
        onChange: vi.fn(),
      })
    );
    const trigger = host.querySelector('[role="combobox"]');
    expect(trigger?.textContent).toContain("Any");
    expect(trigger?.getAttribute("data-adapttable-part")).toBe(
      "filter-operator"
    );
    expect(trigger?.classList.contains("consumer-select")).toBe(true);
    expect(ref).toHaveBeenCalledWith(trigger);
  });

  it("hydrates controlled checkbox and select without mismatches", async () => {
    const component = defineComponent({
      setup: () => () =>
        h("div", [
          rekaCheckbox({
            attrs: { "aria-label": "Select" },
            checked: false,
            indeterminate: true,
            onChange: vi.fn(),
          }),
          rekaSelect({
            attrs: { "aria-label": "Status" },
            value: "active",
            options: [{ value: "active", label: "Active" }],
            onChange: vi.fn(),
          }),
        ]),
    });
    const html = await renderToString(createSSRApp(component));
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.append(host);
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    const app = createSSRApp(component);
    app.mount(host);
    cleanups.push(() => app.unmount());
    await nextTick();
    expect(
      warn.mock.calls.filter((args) =>
        args.some((arg) => String(arg).includes("Hydration"))
      )
    ).toEqual([]);
    expect(
      error.mock.calls.filter((args) =>
        args.some((arg) => String(arg).includes("Hydration"))
      )
    ).toEqual([]);
    expect(
      host.querySelector('[role="checkbox"]')?.getAttribute("aria-checked")
    ).toBe("mixed");
  });
});
