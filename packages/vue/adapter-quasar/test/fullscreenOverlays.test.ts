import { mount } from "@vue/test-utils";
import { AppFullscreen, QMenu, QSelect, Quasar } from "quasar";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import { DataTable } from "../src";
import { filters } from "../src/filters";
import { fullscreen } from "../src/fullscreen";

// Install only the browser API that jsdom lacks, before the real vendor plugin
// is evaluated. Quasar owns its own fullscreen listener and portal handling.
const api = vi.hoisted(() => {
  const descriptors = [
    [Element.prototype, "requestFullscreen"],
    [document, "exitFullscreen"],
    [document, "fullscreenElement"],
    [document, "fullscreenEnabled"],
  ] as const;
  const originals = descriptors.map(([target, key]) =>
    Object.getOwnPropertyDescriptor(target, key)
  );
  const state: { current: Element | null } = { current: null };
  let rejected = false;
  const request = vi.fn(function (this: Element) {
    if (rejected) return Promise.reject(new Error("Permission denied"));
    state.current = this;
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  const exit = vi.fn(() => {
    state.current = null;
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  Object.defineProperty(Element.prototype, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: exit,
  });
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => state.current,
  });
  Object.defineProperty(document, "fullscreenEnabled", {
    configurable: true,
    value: true,
  });
  return {
    request,
    exit,
    reject: (value: boolean) => {
      rejected = value;
    },
    restore: () => {
      descriptors.forEach(([target, key], index) => {
        const original = originals[index];
        if (original) Object.defineProperty(target, key, original);
        else Reflect.deleteProperty(target, key);
      });
    },
  };
});
const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
  if (document.fullscreenElement) await document.exitFullscreen();
  api.reject(false);
});
afterAll(() => api.restore());
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function table(mode: "popover" | "drawer" = "popover") {
  const wrapper = mount(DataTable<{ id: string; name: string }>, {
    attachTo: document.body,
    global: { plugins: [[Quasar, { plugins: { AppFullscreen } }]] },
    props: {
      data: [{ id: "a", name: "Ada" }],
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: false,
      features: [
        fullscreen(),
        filters<{ id: string; name: string }>(
          [
            {
              key: "name",
              type: "select",
              options: [{ value: "Ada", label: "Ada" }],
            },
          ],
          { mode }
        ),
      ],
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
it("observes the binding's native table fullscreen request and contains QMenu and QSelect portals", async () => {
  const wrapper = table();
  await settle();
  const root = wrapper.get(part("root")).element;
  await wrapper.get(part("fullscreen-toggle")).trigger("click");
  await settle();
  expect(document.fullscreenElement).toBe(root);
  expect(AppFullscreen.activeEl).toBe(root);
  expect(api.request.mock.instances.at(-1)).toBe(root);
  await wrapper.get(part("filters-button")).trigger("click");
  await settle();
  const menu = document.body.querySelector(part("filters-popover"));
  expect(menu).not.toBeNull();
  expect(root.contains(menu)).toBe(true);
  wrapper.getComponent(QSelect).vm.showPopup();
  await settle();
  expect(wrapper.findAllComponents(QMenu).length).toBeGreaterThanOrEqual(2);
  expect(root.contains(document.body.querySelector('[role="listbox"]'))).toBe(
    true
  );
  await wrapper.get(part("fullscreen-toggle")).trigger("click");
  await settle();
  expect(document.fullscreenElement).toBeNull();
  expect(AppFullscreen.activeEl).toBeNull();
  expect(root.contains(menu)).toBe(false);
});
it("keeps a rejected fullscreen request inactive and retains normal popup ownership", async () => {
  api.reject(true);
  const wrapper = table();
  await settle();
  await wrapper.get(part("fullscreen-toggle")).trigger("click");
  await settle();
  expect(document.fullscreenElement).toBeNull();
  expect(AppFullscreen.isActive).toBe(false);
  await wrapper.get(part("filters-button")).trigger("click");
  await settle();
  expect(document.body.querySelector(part("filters-popover"))).not.toBeNull();
  expect(
    wrapper
      .get(part("root"))
      .element.contains(document.body.querySelector(part("filters-popover")))
  ).toBe(false);
});
it("keeps nested QSelect choices in the modal accessibility tree during table fullscreen", async () => {
  const wrapper = table("drawer");
  await settle();
  await wrapper.get(part("fullscreen-toggle")).trigger("click");
  await settle();
  await wrapper.get(part("filters-button")).trigger("click");
  await settle();
  const dialog = document.body.querySelector(
    '[role="dialog"][aria-modal="true"]'
  );
  expect(dialog).not.toBeNull();
  expect(document.fullscreenElement?.contains(dialog)).toBe(true);
  wrapper.getComponent(QSelect).vm.showPopup();
  await settle();
  expect(
    dialog?.contains(document.body.querySelector('[role="listbox"]'))
  ).toBe(true);
  wrapper.unmount();
  wrappers.splice(wrappers.indexOf(wrapper), 1);
  await settle();
  expect(document.fullscreenElement).toBeNull();
  expect(document.body.querySelector(part("filters-panel"))).toBeNull();
});
