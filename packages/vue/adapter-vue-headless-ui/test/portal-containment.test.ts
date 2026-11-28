import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { DataTable } from "../src";
import { fullscreen } from "../src/fullscreen";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop();
  }
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function openSelect() {
  const trigger = element<HTMLButtonElement>(part("rows-per-page"));
  trigger.focus();
  trigger.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
  return trigger;
}
const props = {
  data: [{ id: "a", name: "Ada" }],
  columns: [{ key: "name" }],
  rowKey: (row: { id: string; name: string }) => row.id,
  urlSync: false,
  forceMobile: false,
};
it("places a genuine Select portal inside the actual fullscreen root", async () => {
  const current = shallowRef<HTMLElement | null>(null);
  const patches: [object, string, PropertyDescriptor | undefined][] = [];
  const property = (
    target: object,
    name: string,
    descriptor: PropertyDescriptor
  ) => {
    patches.push([target, name, Object.getOwnPropertyDescriptor(target, name)]);
    Object.defineProperty(target, name, { configurable: true, ...descriptor });
  };
  property(document, "fullscreenEnabled", { value: true });
  property(document, "fullscreenElement", { get: () => current.value });
  property(HTMLElement.prototype, "requestFullscreen", {
    value: vi.fn(function (this: HTMLElement) {
      current.value = this;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    }),
  });
  property(document, "exitFullscreen", {
    value: vi.fn(() => {
      current.value = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    }),
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<{ id: string; name: string }>, {
        ...props,
        features: [fullscreen()],
      }),
  });
  app.mount(host);
  stops.push(() => {
    app.unmount();
    patches.reverse();
    for (const [target, name, descriptor] of patches) {
      if (descriptor) Object.defineProperty(target, name, descriptor);
      else Reflect.deleteProperty(target, name);
    }
  });
  await flush();
  element<HTMLButtonElement>(part("fullscreen-toggle")).click();
  await flush();
  expect(current.value).not.toBeNull();
  await openSelect();
  const list = element('[role="listbox"]');
  expect(current.value?.contains(list)).toBe(true);
  const fullscreenRoot = current.value;
  await document.exitFullscreen();
  await flush();
  const resumedList = element('[role="listbox"]');
  expect(current.value).toBeNull();
  expect(fullscreenRoot?.contains(resumedList)).toBe(false);
  expect(document.body.contains(resumedList)).toBe(true);
});
it("retires an uncontrolled footer Select through KeepAlive and resumes it closed", async () => {
  const visible = shallowRef(true);
  const Table = defineComponent({
    render: () => h(DataTable<{ id: string; name: string }>, props),
  });
  const Other = defineComponent({ render: () => h("p", "Paused") });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h("div", [
        h("input", { id: "portal-focus-owner" }),
        h(KeepAlive, null, {
          default: () => (visible.value ? h(Table) : h(Other)),
        }),
      ]),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  await flush();
  await openSelect();
  expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  visible.value = false;
  await nextTick();
  const outside = element<HTMLInputElement>("#portal-focus-owner");
  outside.focus();
  await flush();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.activeElement).toBe(outside);
  visible.value = true;
  await flush();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.activeElement).toBe(outside);
});

it("keeps repeated footer selections usable and restores focus on Escape", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () => h(DataTable<{ id: string; name: string }>, props),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  await flush();
  const trigger = await openSelect();
  const list = element('[role="listbox"]');
  list.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  for (const pageSize of ["50", "10"]) {
    await openSelect();
    const option = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((node) => node.textContent?.trim() === pageSize);
    if (!option) throw new Error(`Missing ${pageSize} page size`);
    option.focus();
    option.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
    await flush();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(trigger.textContent).toContain(pageSize);
    expect(document.activeElement).toBe(trigger);
  }
});

it("does not reclaim outside focus when the table with an open Select is removed", async () => {
  const visible = shallowRef(true);
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h("div", [
        h("input", { id: "disposal-focus-owner" }),
        visible.value
          ? h(DataTable<{ id: string; name: string }>, props)
          : null,
      ]),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  await flush();
  await openSelect();
  expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  visible.value = false;
  await nextTick();
  const outside = element<HTMLInputElement>("#disposal-focus-owner");
  outside.focus();
  await flush();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.activeElement).toBe(outside);
  expect(document.body.style.pointerEvents).not.toBe("none");
});
