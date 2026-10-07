import type { ElementRef } from "@adapttable/vue";
import type { ManagedOverlayPanelProps } from "@adapttable/vue/adapter";
import { createApp, createSSRApp, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import VuetifyManagedPopover from "../src/columns/VuetifyManagedPopover.vue";
import VuetifyInput from "../src/controls/VuetifyInput.vue";

const cleanups: (() => void)[] = [];
function vuetify() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}
async function settle() {
  await nextTick();
  await nextTick();
}
async function delay() {
  await new Promise((resolve) => setTimeout(resolve, 25));
  await settle();
}
function node<T extends HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}
function fixture(owner?: ElementRef) {
  const anchor = document.createElement("button");
  anchor.textContent = "Open";
  document.body.append(anchor);
  const host = document.createElement("div");
  document.body.append(host);
  const mounted = shallowRef(true);
  const current = shallowRef(true);
  const close = vi.fn();
  const control = shallowRef<ManagedOverlayPanelProps>({
    anchor,
    open: true,
    isCurrent: () => current.value,
    onClose: close,
    attrs: {
      ref: owner,
      id: "managed-dialog",
      role: "dialog",
      "aria-label": "Columns",
    },
    content: h(VuetifyInput, {
      attrs: { "aria-label": "Search columns" },
      value: "",
      onChange: () => undefined,
    }),
  });
  const app = createApp({
    setup: () => () =>
      mounted.value
        ? h(VuetifyManagedPopover, { control: control.value })
        : null,
  }).use(vuetify());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
    anchor.remove();
  });
  return { control, mounted, current, close, anchor };
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

it("hands native card refs between callback owners without repaint notifications or remounts", async () => {
  const first = vi.fn<ElementRef>();
  const second = vi.fn<ElementRef>();
  const f = fixture(first);
  await delay();
  const card = node<HTMLElement>("#managed-dialog");
  expect(card.classList.contains("v-card")).toBe(true);
  expect(first).toHaveBeenCalledExactlyOnceWith(card);
  f.control.value = {
    ...f.control.value,
    attrs: { ...f.control.value.attrs, class: "decoration" },
  };
  await settle();
  expect(first).toHaveBeenCalledTimes(1);
  expect(node("#managed-dialog")).toBe(card);
  f.control.value = {
    ...f.control.value,
    attrs: { ...f.control.value.attrs, ref: second },
  };
  await settle();
  expect(first.mock.calls).toEqual([[card], [null]]);
  expect(second.mock.calls).toEqual([[card]]);
  const { ref: removed, ...attrs } = f.control.value.attrs;
  expect(removed).toBe(second);
  f.control.value = { ...f.control.value, attrs };
  await settle();
  expect(second.mock.calls).toEqual([[card], [null]]);
  expect(node("#managed-dialog")).toBe(card);
  f.control.value = { ...f.control.value, attrs: { ...attrs, ref: second } };
  await settle();
  expect(second.mock.calls).toEqual([[card], [null], [card]]);
  f.mounted.value = false;
  await settle();
  expect(second.mock.calls).toEqual([[card], [null], [card], [null]]);
});

it("detects a public VCard tag replacement while the component stays mounted", async () => {
  const received = vi.fn<ElementRef>();
  const f = fixture(received);
  await delay();
  const before = node("#managed-dialog");
  f.control.value = {
    ...f.control.value,
    attrs: { ...f.control.value.attrs, tag: "section" },
  };
  await settle();
  const after = node("#managed-dialog");
  expect(after.tagName).toBe("SECTION");
  expect(after).not.toBe(before);
  expect(received.mock.calls).toEqual([[before], [null], [after]]);
});

it("preserves input focus when a managed close is rejected and ignores retired owners", async () => {
  const f = fixture();
  await delay();
  const input = node<HTMLInputElement>("#managed-dialog input");
  input.focus();
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
  expect(f.close).toHaveBeenCalledExactlyOnceWith("escape");
  expect(document.activeElement).toBe(input);
  expect(node("#managed-dialog")).toBeTruthy();
  f.current.value = false;
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  await settle();
  expect(f.close).toHaveBeenCalledTimes(1);
  expect(event.defaultPrevented).toBe(false);
});

it("does not steal focus after a close request replaces the managed owner", async () => {
  const f = fixture();
  await delay();
  const input = node<HTMLInputElement>("#managed-dialog input");
  input.focus();
  const restored = vi.spyOn(f.anchor, "focus");
  f.control.value = {
    ...f.control.value,
    onClose: () => {
      f.current.value = false;
      f.mounted.value = false;
    },
  };
  await settle();
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
  expect(restored).not.toHaveBeenCalled();
  expect(document.querySelector("#managed-dialog")).toBeNull();
});

it("keeps native panel callbacks inert during server rendering", async () => {
  const callback = vi.fn<ElementRef>();
  const app = createSSRApp({
    render: () =>
      h(VuetifyManagedPopover, {
        control: {
          open: false,
          anchor: null,
          isCurrent: () => true,
          onClose: () => undefined,
          attrs: { ref: callback, role: "dialog" },
          content: "Columns",
        },
      }),
  }).use(vuetify());
  await renderToString(app);
  expect(callback).not.toHaveBeenCalled();
});
