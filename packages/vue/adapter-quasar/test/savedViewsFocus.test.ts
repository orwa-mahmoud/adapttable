import { useSavedViews } from "@adapttable/vue";
import {
  resolveLabels,
  SavedViewsMenuChrome,
  type SavedViewsMenuSlots,
} from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { Quasar } from "quasar";
import { expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import { quasarSavedViewsMenuSlots } from "../src/views/controls";

const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await nextTick();
};
it.each([false, true])(
  "finishes the same accepted saved-view apply with native QMenu=%s",
  async (managed) => {
    const trace: string[] = [];
    const focus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement)
        trace.push(event.target.dataset.adapttablePart ?? event.target.tagName);
    };
    document.addEventListener("focusin", focus);
    const wrapper = mount(
      defineComponent({
        setup() {
          const model = useSavedViews({
            storageKey: "focus-comparison",
            storage: null,
            store: {
              list: () => Promise.resolve([{ name: "One", search: "" }]),
              save: () => Promise.resolve(),
              remove: () => Promise.resolve(),
            },
          });
          const slots: SavedViewsMenuSlots = {
            ...quasarSavedViewsMenuSlots,
            ...(managed
              ? {}
              : { Panel: ({ attrs, content }) => h("div", attrs, [content]) }),
          };
          return () =>
            h(SavedViewsMenuChrome, {
              savedViews: model,
              labels: resolveLabels(undefined),
              dir: "ltr",
              slots,
            });
        },
      }),
      { attachTo: document.body, global: { plugins: [Quasar] } }
    );
    try {
      await settle();
      const trigger = wrapper.get<HTMLButtonElement>(
        '[data-adapttable-part="views-button"]'
      ).element;
      trigger.focus();
      trigger.click();
      await settle();
      const panel = document.getElementById(
        trigger.getAttribute("aria-controls") ?? ""
      );
      const item = panel?.querySelector<HTMLButtonElement>(
        '[data-adapttable-part="views-item"]'
      );
      if (!panel || !item)
        throw new Error("Missing acquired native menu controls");
      item.focus();
      item.click();
      await settle();
      expect(panel.isConnected).toBe(false);
      expect(trigger.isConnected).toBe(true);
      expect(
        document.activeElement,
        JSON.stringify({
          managed,
          trace,
          focused: document.activeElement?.tagName,
          triggerPart: trigger.dataset.adapttablePart,
          itemPart: item.dataset.adapttablePart,
        })
      ).toBe(trigger);
    } finally {
      wrapper.unmount();
      document.removeEventListener("focusin", focus);
      await settle();
    }
  }
);
