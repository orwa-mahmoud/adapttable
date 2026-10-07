import type { UseSavedViewsResult } from "@adapttable/vue";
import { resolveLabels, SavedViewsMenuChrome } from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QCard, QDialog, Quasar } from "quasar";
import { afterEach, expect, it } from "vitest";
import { computed, defineComponent, h, nextTick, shallowRef } from "vue";

import { quasarSavedViewsMenuSlots } from "../src/views/controls";

const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 45));
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
});
function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const target = document.querySelector<T>(selector);
  if (!target) throw new Error(`Missing ${selector}`);
  return target;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function fixture(mode: "outside" | "replace" | "reopen" | "dialog" | "hidden") {
  const modal = shallowRef(false);
  const model = shallowRef<UseSavedViewsResult>();
  const menu = () =>
    h(SavedViewsMenuChrome, {
      savedViews: model.value!,
      labels: resolveLabels(undefined),
      dir: "ltr",
      slots: quasarSavedViewsMenuSlots,
    });
  const wrapper = mount(
    defineComponent({
      setup() {
        const value: UseSavedViewsResult = {
          views: computed(() => [{ name: "One", search: "" }]),
          defaultView: computed(() => undefined),
          save: () => undefined,
          apply: () => {
            if (mode === "replace") model.value = { ...value };
            if (mode === "dialog") modal.value = true;
            if (mode === "hidden") element(part("views-button")).hidden = true;
            // Chrome closes after calling apply. Acquire its resulting flush in
            // the next microtask so these are post-dismissal host actions.
            if (mode === "outside")
              void nextTick(() =>
                nextTick(() => element("#new-outside").focus())
              );
            if (mode === "reopen")
              void nextTick(() =>
                nextTick(() => element(part("views-button")).click())
              );
          },
          remove: () => undefined,
          rename: () => undefined,
          move: () => undefined,
          setDefault: () => undefined,
          reload: () => undefined,
        };
        model.value = value;
        const dialogContent = () =>
          h(
            "button",
            { id: "new-dialog-focus", autofocus: true },
            "New dialog"
          );
        const dialogCard = () => h(QCard, {}, dialogContent);
        return () =>
          h("div", [
            menu(),
            h("button", { id: "new-outside" }, "New outside focus"),
            h(
              QDialog,
              {
                modelValue: modal.value,
                transitionDuration: 0,
                "onUpdate:modelValue": (open: boolean) => {
                  modal.value = open;
                },
              },
              dialogCard
            ),
          ]);
      },
    }),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  return { wrapper, model };
}
async function apply() {
  const trigger = element<HTMLButtonElement>(part("views-button"));
  trigger.focus();
  trigger.click();
  await settle();
  const panel = element(part("views-panel"));
  const action = element<HTMLButtonElement>(part("views-item"));
  action.focus();
  action.click();
  await settle();
  return { trigger, panel, action };
}
it("preserves outside focus claimed after an accepted native action", async () => {
  fixture("outside");
  const { trigger, panel, action } = await apply();
  expect(trigger.isConnected).toBe(true);
  expect(panel.isConnected).toBe(false);
  expect(action.isConnected).toBe(false);
  expect(document.activeElement).toBe(element("#new-outside"));
});
it("rejects focus from a retired saved-view model after replacement", async () => {
  const f = fixture("replace");
  const original = f.model.value;
  const { trigger, panel } = await apply();
  expect(f.model.value).not.toBe(original);
  expect(panel.isConnected).toBe(false);
  expect(document.activeElement).not.toBe(trigger);
});
it("does not steal focus from a reopened native menu session", async () => {
  fixture("reopen");
  const { trigger, panel } = await apply();
  expect(panel.isConnected).toBe(false);
  expect(element(part("views-panel"))).not.toBe(panel);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(document.activeElement).toBe(element(part("views-item")));
});
it("lets a newer native QDialog own focus after applying a view", async () => {
  const f = fixture("dialog");
  const { trigger, panel } = await apply();
  expect(panel.isConnected).toBe(false);
  expect(
    f.wrapper
      .getComponent(QDialog)
      .vm.contentEl.contains(element("#new-dialog-focus"))
  ).toBe(true);
  expect(document.activeElement).toBe(element("#new-dialog-focus"));
  expect(document.activeElement).not.toBe(trigger);
});
it("does not restore the trigger after the accepted action hides it", async () => {
  fixture("hidden");
  const { trigger, panel } = await apply();
  expect(panel.isConnected).toBe(false);
  expect(trigger.hidden).toBe(true);
  expect(document.activeElement).not.toBe(trigger);
});
