import {
  DENSITY_CONTROL,
  featureSlotFillsOf,
  FULLSCREEN_CONTROL,
  renderFeatureSlot,
  resolveLabels,
} from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QSelect, Quasar } from "quasar";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";
import { quasarFilterSlots } from "../src/filters/quasarFilterSlots";
import { fullscreen } from "../src/fullscreen";
import { requiredControl } from "../src/table/content";

const wrappers: ReturnType<typeof mount>[] = [];
const host: typeof mount = (component, options) => {
  const wrapper = mount(component, {
    ...options,
    attachTo: document.body,
    global: { plugins: [Quasar] },
  });
  wrappers.push(wrapper);
  return wrapper;
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
});
const settle = async () => {
  await nextTick();
  await nextTick();
};

describe("Quasar binding feature fills", () => {
  it("paints density and fullscreen from the binding's controlled feature slots", async () => {
    const fills = featureSlotFillsOf([densityChooser(), fullscreen()]);
    const labels = resolveLabels(undefined);
    const changed = vi.fn();
    const toggle = vi.fn();
    const wrapper = host(
      defineComponent(
        () => () =>
          h("div", [
            ...renderFeatureSlot(DENSITY_CONTROL, fills, {
              labels,
              dir: "rtl",
              density: "compact",
              onDensityChange: changed,
              classNames: { densityToggle: "density-paint" },
            }),
            ...renderFeatureSlot(FULLSCREEN_CONTROL, fills, {
              labels,
              dir: "rtl",
              fullscreen: {
                active: false,
                supported: true,
                toggle,
                exit: vi.fn(),
                container: undefined,
              },
              classNames: { fullscreenToggle: "fullscreen-paint" },
            }),
          ])
      )
    );
    await settle();
    expect(
      wrapper.get('[data-adapttable-part="density-toggle"]').element.tagName
    ).toBe("INPUT");
    expect(wrapper.get("label").classes()).toContain("density-paint");
    wrapper.getComponent(QSelect).vm.toggleOption({
      value: "comfortable",
      label: labels.densityComfortable,
    });
    await settle();
    expect(changed).toHaveBeenCalledExactlyOnceWith("comfortable");
    expect(
      (
        wrapper.get('[data-adapttable-part="density-toggle"]')
          .element as HTMLInputElement
      ).value
    ).toBe(labels.densityCompact);
    await wrapper
      .get('[data-adapttable-part="fullscreen-toggle"]')
      .trigger("click");
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(
      wrapper.get('[data-adapttable-part="fullscreen-toggle"]').classes()
    ).toContain("fullscreen-paint");
  });

  it("forwards controlled density requests through the assembled table's callback and Vue event", async () => {
    const callback = vi.fn();
    const wrapper = host(DataTable<{ id: string; name: string }>, {
      props: {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name", header: "Name" }],
        rowKey: (row) => row.id,
        features: [densityChooser()],
        density: "compact",
        onDensityChange: callback,
        forceMobile: false,
        urlSync: false,
        searchable: false,
      },
    });
    await settle();
    wrapper
      .getComponent(QSelect)
      .vm.toggleOption({ value: "comfortable", label: "Comfortable" });
    await settle();
    expect(callback).toHaveBeenCalledExactlyOnceWith("comfortable");
    expect(wrapper.emitted("update:density")).toEqual([["comfortable"]]);
    expect(
      wrapper.get('[data-adapttable-part="root"]').attributes("data-density")
    ).toBe("compact");
    await wrapper.setProps({ onDensityChange: undefined });
    wrapper
      .getComponent(QSelect)
      .vm.toggleOption({ value: "comfortable", label: "Comfortable" });
    await settle();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("update:density")).toEqual([
      ["comfortable"],
      ["comfortable"],
    ]);
  });

  it("fills the filter field's input, select and checkbox channels with real kit controls", async () => {
    const input = vi.fn();
    const select = vi.fn();
    const checkbox = vi.fn();
    const wrapper = host(
      defineComponent(
        () => () =>
          h("div", [
            quasarFilterSlots.Input({
              label: "Name",
              type: "text",
              value: "Ada",
              attrs: { id: "name-filter" },
              onChange: input,
            }),
            quasarFilterSlots.Select({
              label: "Choice",
              value: "one",
              attrs: { id: "choice-filter" },
              options: [
                { value: "one", label: "One" },
                { value: "two", label: "Two" },
              ],
              onChange: select,
            }),
            quasarFilterSlots.Checkbox({
              label: "Active",
              checked: false,
              attrs: { id: "active-filter" },
              onChange: checkbox,
            }),
          ])
      )
    );
    await wrapper.get("#name-filter").setValue("Bea");
    await settle();
    expect(input).toHaveBeenCalledExactlyOnceWith("Bea");
    wrapper
      .getComponent(QSelect)
      .vm.toggleOption({ value: "two", label: "Two" });
    await settle();
    expect(select).toHaveBeenCalledExactlyOnceWith("two");
    await wrapper.get("#active-filter").trigger("click");
    expect(checkbox).toHaveBeenCalledExactlyOnceWith(true);
    expect(wrapper.get("#active-filter").attributes("aria-checked")).toBe(
      "false"
    );
  });

  it("fails explicitly when required kit controls are absent", () => {
    expect(() => requiredControl(undefined, {}, "TreeToggle")).toThrow(
      "Quasar requires the TreeToggle control"
    );
  });
});
