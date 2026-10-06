import {
  DENSITY_CONTROL,
  featureSlotFillsOf,
  FULLSCREEN_CONTROL,
  renderFeatureSlot,
  resolveLabels,
} from "@adapttable/vue/adapter";
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref, type VNode } from "vue";

import { nuxtButton } from "../src/controls/button";
import NuxtInput from "../src/controls/NuxtInput.vue";
import NuxtSelect from "../src/controls/NuxtSelect.vue";
import { densityChooser } from "../src/density";
import { nuxtFilterSlots } from "../src/filters/nuxtFilterSlots";
import { fullscreen } from "../src/fullscreen";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
async function mount(
  render: () => VNode,
  dir: "ltr" | "rtl" = "ltr"
): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(
    defineComponent(
      () => () => h(UApp, { toaster: null, dir }, { default: render })
    )
  );
  app.use(ui);
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  await nextTick();
  return host;
}
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
  await nextTick();
}

describe("Nuxt UI controls with the official Vue plugin", () => {
  it("fills density and fullscreen through the binding's feature slots", async () => {
    const toggle = vi.fn();
    const fills = featureSlotFillsOf([densityChooser(), fullscreen()]);
    const labels = resolveLabels(undefined);
    const host = await mount(
      () =>
        h("div", [
          ...renderFeatureSlot(DENSITY_CONTROL, fills, {
            labels,
            dir: "rtl",
            density: "compact",
            onDensityChange: vi.fn(),
            classNames: {
              densitySelect: "density-select-paint",
              densityToggle: "density-toggle-paint",
            },
          }),
          ...renderFeatureSlot(FULLSCREEN_CONTROL, fills, {
            labels,
            dir: "rtl",
            fullscreen: {
              supported: true,
              active: false,
              toggle,
              exit: vi.fn(),
              container: undefined,
            },
            classNames: { fullscreenButton: "fullscreen-paint" },
          }),
        ]),
      "rtl"
    );
    const density = host.querySelector(
      '[data-adapttable-part="density-toggle"]'
    );
    expect(density?.getAttribute("role")).toBe("combobox");
    expect(density?.classList.contains("density-select-paint")).toBe(true);
    expect(density?.classList.contains("density-toggle-paint")).toBe(true);
    expect(density?.getAttribute("dir")).toBe("rtl");
    expect(density?.textContent).toContain(labels.densityCompact);
    const button = host.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="fullscreen-toggle"]'
    );
    expect(button?.classList.contains("fullscreen-paint")).toBe(true);
    button?.click();
    expect(toggle).toHaveBeenCalledTimes(1);
  });
  it("uses the real button target for semantics and a single action", async () => {
    const action = vi.fn();
    const host = await mount(() =>
      nuxtButton({
        label: "Export rows",
        attrs: {
          onClick: action,
          "data-adapttable-part": "export-button",
          "aria-label": "Export rows",
          class: "export-paint",
        },
      })
    );
    const button = host.querySelector("button");
    expect(button?.getAttribute("data-slot")).toBe("base");
    expect(button?.getAttribute("data-adapttable-part")).toBe("export-button");
    expect(button?.classList.contains("export-paint")).toBe(true);
    button?.click();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("preserves the input target, focus, names and controlled rejection", async () => {
    const change = vi.fn();
    const focusRef = vi.fn();
    const host = await mount(() =>
      h(NuxtInput, {
        control: {
          value: "kept",
          label: "Find rows",
          type: "search",
          focusRef,
          attrs: {
            id: "query",
            name: "query",
            "data-adapttable-part": "find-input",
            "aria-describedby": "query-help",
          },
          onChange: change,
        },
        className: "find-paint",
      })
    );
    const input = host.querySelector("input");
    expect(input).not.toBeNull();
    if (!input) throw new Error("Missing Nuxt input");
    expect(input.id).toBe("query");
    expect(input.name).toBe("query");
    expect(input.getAttribute("aria-label")).toBe("Find rows");
    expect(input.getAttribute("aria-describedby")).toBe("query-help");
    expect(input.getAttribute("data-adapttable-part")).toBe("find-input");
    expect(input.classList.contains("find-paint")).toBe(true);
    expect(focusRef).toHaveBeenCalledWith(input);
    input.focus();
    input.value = "rejected";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(change).toHaveBeenCalledExactlyOnceWith("rejected");
    expect(input.value).toBe("kept");
    expect(document.activeElement).toBe(input);
    expect(host.querySelector("input")).toBe(input);
  });

  it("accepts host updates and releases the documented input ref", async () => {
    const value = ref("before");
    const focusRef = vi.fn();
    const host = await mount(() =>
      h(NuxtInput, {
        control: {
          value: value.value,
          label: "Query",
          attrs: {},
          focusRef,
          onChange: (next) => {
            value.value = next;
          },
        },
      })
    );
    const input = host.querySelector("input");
    if (!input) throw new Error("Missing Nuxt input");
    input.value = "accepted";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(value.value).toBe("accepted");
    expect(input.value).toBe("accepted");
    cleanups.pop()?.();
    expect(focusRef).toHaveBeenLastCalledWith(null);
  });

  it("uses the public select trigger ref and supports an empty model option", async () => {
    const focusRef = vi.fn();
    const host = await mount(() =>
      h(NuxtSelect, {
        control: {
          value: "",
          label: "Operator",
          attrs: { "data-adapttable-part": "filter-operator", id: "operator" },
          focusRef,
          options: [
            { value: "", label: "Any operator" },
            { value: "equals", label: "Equals" },
          ],
          onChange: vi.fn(),
        },
        className: "operator-paint",
      })
    );
    const trigger = host.querySelector<HTMLButtonElement>(
      'button[role="combobox"]'
    );
    expect(trigger?.textContent).toContain("Any operator");
    expect(trigger?.id).toBe("operator");
    expect(trigger?.classList.contains("operator-paint")).toBe(true);
    expect(trigger?.getAttribute("aria-label")).toBe("Operator");
    expect(trigger?.getAttribute("data-adapttable-part")).toBe(
      "filter-operator"
    );
    expect(focusRef).toHaveBeenCalledWith(trigger);
  });

  it("keeps the vendor checkbox controlled when a request is rejected", async () => {
    const change = vi.fn();
    const host = await mount(() =>
      h("div", [
        nuxtFilterSlots(() => ({ filterCheckbox: "checkbox-paint" })).Checkbox({
          checked: false,
          label: "Only active",
          attrs: { "data-adapttable-part": "filter-checkbox", id: "active" },
          onChange: change,
        }),
      ])
    );
    const checkbox = host.querySelector<HTMLButtonElement>(
      'button[role="checkbox"]'
    );
    expect(checkbox?.id).toBe("active");
    expect(checkbox?.getAttribute("aria-checked")).toBe("false");
    expect(checkbox?.classList.contains("checkbox-paint")).toBe(true);
    expect(host.querySelector('label[for="active"]')?.textContent).toBe(
      "Only active"
    );
    checkbox?.click();
    await settle();
    expect(change).toHaveBeenCalledExactlyOnceWith(true);
    expect(checkbox?.getAttribute("aria-checked")).toBe("false");
    checkbox?.click();
    await settle();
    expect(change).toHaveBeenCalledTimes(2);
  });
});
