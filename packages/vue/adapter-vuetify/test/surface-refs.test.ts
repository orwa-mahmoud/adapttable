import type { ElementRef } from "@adapttable/vue";
import { useDataTableShell } from "@adapttable/vue/adapter";
import { type Component, createApp, h, nextTick, shallowRef } from "vue";
import { createVuetify } from "vuetify";
import { VBtn } from "vuetify/components/VBtn";
import { VCard } from "vuetify/components/VCard";
import { VDivider } from "vuetify/components/VDivider";
import { VListItem } from "vuetify/components/VList";
import { VSheet } from "vuetify/components/VSheet";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import RowActions from "../src/RowActions.vue";
import { VuetifyMobile } from "../src/table/Mobile";
import { VuetifySurface } from "../src/table/VuetifySurface";
import { vuetifyTableControls } from "../src/tableControls";

interface Person {
  id: string;
  name: string;
}

const surfaces: readonly { name: string; component: Component; tag: string }[] =
  [
    { name: "card", component: VCard, tag: "article" },
    { name: "sheet", component: VSheet, tag: "section" },
    { name: "divider", component: VDivider, tag: "hr" },
    { name: "action", component: VBtn, tag: "button" },
    { name: "menu action", component: VListItem, tag: "button" },
  ];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

it("retains native card ownership when the prepared mobile model changes its callback", async () => {
  const first = vi.fn<ElementRef>();
  const second = vi.fn<ElementRef>();
  const owner = shallowRef<ElementRef | undefined>(first);
  const host = document.createElement("div");
  const app = createApp({
    setup() {
      const shell = useDataTableShell<Person>({
        data: [{ id: "ada", name: "Ada" }],
        columns: [{ key: "name", header: "Name" }],
        rowKey: (row) => row.id,
        urlSync: false,
      });
      return () =>
        h(VuetifyMobile<Person>, {
          model: {
            ...shell.mobile.value,
            rows: shell.mobile.value.rows.map((row) => ({
              ...row,
              attrs: { ...row.attrs, ref: owner.value },
            })),
          },
          controls: vuetifyTableControls<Person>(),
          classNames: {},
        });
    },
  }).use(createVuetify({ ssr: true }));
  app.mount(host);
  cleanups.push(() => app.unmount());
  await nextTick();
  const card = host.querySelector("article.v-card");
  expect(card).not.toBeNull();
  expect(first.mock.calls).toEqual([[card]]);
  owner.value = second;
  await nextTick();
  expect(host.querySelector("article.v-card")).toBe(card);
  expect(first.mock.calls).toEqual([[card], [null]]);
  expect(second.mock.calls).toEqual([[card]]);
  owner.value = undefined;
  await nextTick();
  expect(host.querySelector("article.v-card")).toBe(card);
  expect(second.mock.calls).toEqual([[card], [null]]);
  cleanups.pop()?.();
  expect(second.mock.calls).toEqual([[card], [null]]);
});

it("preserves the native inline action and focus when its callback owner changes", async () => {
  const first = vi.fn<ElementRef>();
  const second = vi.fn<ElementRef>();
  const owner = shallowRef<ElementRef | undefined>(first);
  const onClick = vi.fn();
  const action = { key: "open", label: "Open" };
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup: () => () =>
      h(RowActions<Person>, {
        controls: [
          {
            key: "open",
            label: "Open",
            action,
            attrs: { ref: owner.value, onClick },
          },
        ],
        label: "Actions",
        classNames: {},
      }),
  }).use(createVuetify({ ssr: true }));
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  await nextTick();
  const button = host.querySelector("button.v-btn");
  if (!(button instanceof HTMLButtonElement))
    throw new Error("Missing action button");
  expect(first.mock.calls).toEqual([[button]]);
  button.focus();
  owner.value = second;
  await nextTick();
  expect(first.mock.calls).toEqual([[button], [null]]);
  expect(second.mock.calls).toEqual([[button]]);
  expect(document.activeElement).toBe(button);
  button.click();
  expect(onClick).toHaveBeenCalledOnce();
  owner.value = undefined;
  await nextTick();
  expect(host.querySelector("button.v-btn")).toBe(button);
  expect(second.mock.calls).toEqual([[button], [null]]);
});

it.each(surfaces)(
  "owns $name native refs across replacement, removal, stable updates and unmount",
  async ({ component, tag }) => {
    const first = vi.fn<ElementRef>();
    const second = vi.fn<ElementRef>();
    const owner = shallowRef<ElementRef | undefined>();
    const decoration = shallowRef("initial");
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      setup: () => () =>
        h(VuetifySurface, {
          component,
          attrs: { tag, ref: owner.value, "data-decoration": decoration.value },
        }),
    }).use(
      createVuetify({
        ssr: true,
        icons: { defaultSet: "mdi", aliases, sets: { mdi } },
      })
    );
    app.mount(host);
    cleanups.push(() => {
      app.unmount();
      host.remove();
    });
    await nextTick();
    const target = host.firstElementChild;
    expect(target?.tagName).toBe(tag.toUpperCase());
    owner.value = first;
    await nextTick();
    expect(first.mock.calls).toEqual([[target]]);
    expect(host.firstElementChild).toBe(target);
    decoration.value = "updated";
    await nextTick();
    expect(first.mock.calls).toEqual([[target]]);
    expect(host.firstElementChild).toBe(target);
    owner.value = second;
    await nextTick();
    expect(first.mock.calls).toEqual([[target], [null]]);
    expect(second.mock.calls).toEqual([[target]]);
    expect(first.mock.invocationCallOrder[1]).toBeLessThan(
      second.mock.invocationCallOrder[0]!
    );
    owner.value = undefined;
    await nextTick();
    expect(second.mock.calls).toEqual([[target], [null]]);
    owner.value = first;
    await nextTick();
    expect(first.mock.calls).toEqual([[target], [null], [target]]);
    expect(host.firstElementChild).toBe(target);
    cleanups.pop()?.();
    expect(first.mock.calls).toEqual([[target], [null], [target], [null]]);
  }
);

it("releases the native card root when its public tag changes on the same instance", async () => {
  const callback = vi.fn<ElementRef>();
  const tag = shallowRef("article");
  const host = document.createElement("div");
  const app = createApp({
    setup: () => () =>
      h(VuetifySurface, {
        component: VCard,
        attrs: { tag: tag.value, ref: callback },
      }),
  }).use(createVuetify({ ssr: true }));
  app.mount(host);
  cleanups.push(() => app.unmount());
  await nextTick();
  const first = host.firstElementChild;
  tag.value = "section";
  await nextTick();
  const second = host.firstElementChild;
  expect(second?.tagName).toBe("SECTION");
  expect(callback.mock.calls).toEqual([[first], [null], [second]]);
  cleanups.pop()?.();
  expect(callback.mock.calls).toEqual([[first], [null], [second], [null]]);
});
