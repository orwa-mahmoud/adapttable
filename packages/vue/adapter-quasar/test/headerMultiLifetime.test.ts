import type { FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QMenu, Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import {
  computed,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { FilterHeaderControl } from "../src/header-filters";

interface Row {
  name: string;
}
const labels = resolveLabels(undefined);
const settle = async () => {
  await nextTick();
  // Exercise the SDK's default transition, including delayed focus work.
  await new Promise((resolve) => setTimeout(resolve, 400));
  await nextTick();
};
const menuSelector = '[data-adapttable-part="filter-header-menu"]';
function checkbox(menu: Element): HTMLElement {
  const control = menu.querySelector<HTMLElement>('[role="checkbox"]');
  if (!control) throw new Error("Missing genuine QCheckbox role host");
  return control;
}

it.each([true, false])(
  "retires a cached compact menu without resetting accepted=%s filters or restoring hidden focus",
  async (accept) => {
    const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
    const shown = shallowRef(true);
    const setExtra = vi.fn(
      (
        key: string,
        value: Parameters<FilterFormSource<Row>["setExtra"]>[1]
      ) => {
        if (accept) extra.value = { ...extra.value, [key]: value };
      }
    );
    const source = computed<FilterFormSource<Row>>(() => ({
      extra: extra.value,
      setExtra,
      setExtras: vi.fn(),
      allFilteredRows: [{ name: "Ada" }],
    }));
    const Cached = defineComponent(
      () => () =>
        h(FilterHeaderControl<Row>, {
          def: {
            key: "name",
            type: "multiSelect",
            options: [{ value: "Ada", label: "Ada" }],
          },
          source: source.value,
          labels,
        })
    );
    const Placeholder = defineComponent(() => () => h("p", "Another view"));
    const outside = document.createElement("button");
    outside.textContent = "Outside the cached view";
    document.body.append(outside);
    const warnings = vi.spyOn(console, "warn");
    const errors = vi.spyOn(console, "error");
    const wrapper = mount(
      defineComponent(
        () => () =>
          h(KeepAlive, null, {
            default: () => (shown.value ? h(Cached) : h(Placeholder)),
          })
      ),
      {
        attachTo: document.body,
        global: { plugins: [Quasar] },
      }
    );
    let disposed = false;
    try {
      await settle();
      const trigger = wrapper.get(
        '[data-adapttable-part="filter-header-input"]'
      );
      const originalTrigger = trigger.element as HTMLButtonElement;
      originalTrigger.focus();
      await trigger.trigger("click");
      await settle();
      const originalMenu = document.querySelector(menuSelector);
      if (!originalMenu) throw new Error("Missing genuine QMenu portal");
      const originalCheckbox = checkbox(originalMenu);
      originalCheckbox.focus();
      originalCheckbox.click();
      await nextTick();
      expect(setExtra).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
      expect(originalCheckbox.getAttribute("aria-checked")).toBe(
        String(accept)
      );
      const staleMenu = wrapper.getComponent(QMenu).vm;

      shown.value = false;
      await nextTick();
      outside.focus();
      await settle();
      expect(wrapper.text()).toContain("Another view");
      expect(originalMenu.isConnected).toBe(false);
      expect(staleMenu.contentEl).toBeNull();
      expect(document.querySelector(menuSelector)).toBeNull();
      expect(originalTrigger.isConnected).toBe(false);
      expect(document.activeElement).toBe(outside);
      originalCheckbox.click();
      staleMenu.show();
      await settle();
      expect(setExtra).toHaveBeenCalledTimes(1);
      expect(document.querySelector(menuSelector)).toBeNull();

      shown.value = true;
      await settle();
      expect(
        wrapper.get('[data-adapttable-part="filter-header-input"]').element
      ).toBe(originalTrigger);
      expect(originalTrigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.querySelector(menuSelector)).toBeNull();
      expect(document.activeElement).toBe(outside);
      expect(extra.value.name).toEqual(accept ? ["Ada"] : undefined);
      originalCheckbox.click();
      staleMenu.show();
      await settle();
      expect(setExtra).toHaveBeenCalledTimes(1);
      expect(document.querySelector(menuSelector)).toBeNull();

      originalTrigger.click();
      await settle();
      const reopened = document.querySelector(menuSelector);
      if (!reopened) throw new Error("The current menu did not reopen");
      expect(reopened).not.toBe(originalMenu);
      const currentCheckbox = checkbox(reopened);
      const currentMenu = wrapper.getComponent(QMenu).vm;
      expect(currentCheckbox.getAttribute("aria-checked")).toBe(String(accept));
      currentCheckbox.focus();
      wrapper.unmount();
      disposed = true;
      outside.focus();
      await settle();
      expect(reopened.isConnected).toBe(false);
      expect(currentMenu.contentEl).toBeNull();
      expect(document.querySelector(menuSelector)).toBeNull();
      expect(document.activeElement).toBe(outside);
      currentCheckbox.click();
      await nextTick();
      expect(setExtra).toHaveBeenCalledTimes(1);
      expect(warnings).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      if (!disposed) wrapper.unmount();
      outside.remove();
      warnings.mockRestore();
      errors.mockRestore();
      await settle();
    }
  }
);
