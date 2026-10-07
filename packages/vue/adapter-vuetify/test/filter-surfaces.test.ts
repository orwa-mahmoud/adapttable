import type { FilterPanelSurfaceProps } from "@adapttable/vue/adapter";
import {
  createApp,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable } from "../src";
import VuetifyInput from "../src/controls/VuetifyInput.vue";
import VuetifySelect from "../src/controls/VuetifySelect.vue";
import { filters } from "../src/filters";
import VuetifyFilterDrawer from "../src/filters/VuetifyFilterDrawer.vue";
import VuetifyFilterPopover from "../src/filters/VuetifyFilterPopover.vue";
import { headerFilters } from "../src/header-filters";

const cleanups: (() => void)[] = [];
function vuetify() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}
function node<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
function part(name: string) {
  return `[data-adapttable-part="${name}"]`;
}
async function settle() {
  await nextTick();
  await nextTick();
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
}
async function delay() {
  await new Promise((resolve) => setTimeout(resolve, 25));
  await settle();
}
function fixture(modal: boolean, content?: VNodeChild) {
  const open = shallowRef(true);
  const accept = shallowRef(false);
  const mounted = shallowRef(true);
  const anchor = document.createElement("button");
  anchor.textContent = "Open filters";
  const outside = document.createElement("button");
  outside.textContent = "Outside";
  const host = document.createElement("div");
  document.body.append(anchor, host, outside);
  anchor.focus();
  const close = vi.fn(
    (reason: Parameters<FilterPanelSurfaceProps["onClose"]>[0]) => {
      if (accept.value) open.value = false;
      return reason;
    }
  );
  const Surface = modal ? VuetifyFilterDrawer : VuetifyFilterPopover;
  const app = createApp({
    setup: () => () =>
      mounted.value
        ? h(Surface, {
            open: open.value,
            anchor,
            label: "People filters",
            dir: "rtl",
            className: "host-surface",
            onClose: close,
            children:
              content ??
              h(VuetifyInput, {
                attrs: { "aria-label": "Filter people" },
                value: "",
                onChange: () => undefined,
              }),
          })
        : null,
  }).use(vuetify());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    anchor.remove();
    host.remove();
    outside.remove();
  });
  return { open, accept, anchor, outside, close, mounted };
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

it.each([false, true])(
  "preserves focus on rejected Escape and accepts controlled dismissal, modal=%s",
  async (modal) => {
    const state = fixture(modal);
    await delay();
    const surface = node(
      document,
      part(modal ? "filters-panel" : "filters-popover")
    );
    expect(surface.classList.contains("v-card")).toBe(true);
    expect(surface.classList.contains("host-surface")).toBe(true);
    expect(surface.getAttribute("dir")).toBe("rtl");
    const semanticSurface = modal ? surface.closest(".v-dialog") : surface;
    expect(semanticSurface?.getAttribute("role")).toBe("dialog");
    expect(semanticSurface?.getAttribute("aria-label")).toBe("People filters");
    const input = node<HTMLInputElement>(surface, "input");
    input.focus();
    await key(input, "Escape");
    expect(state.close).toHaveBeenCalledExactlyOnceWith("escape");
    expect(state.open.value).toBe(true);
    expect(document.activeElement).toBe(input);
    state.accept.value = true;
    await key(input, "Escape");
    await delay();
    expect(state.open.value).toBe(false);
    // VMenu visibility-based restoration requires real layout; the browser suite covers it.
    if (modal) expect(document.activeElement).toBe(state.anchor);
  }
);

it("exposes one named Vuetify modal dialog around the visual drawer panel", async () => {
  fixture(true);
  await delay();
  const dialogs = document.querySelectorAll('[role="dialog"]');
  expect(dialogs).toHaveLength(1);
  expect(dialogs[0]?.getAttribute("aria-label")).toBe("People filters");
  expect(dialogs[0]?.getAttribute("aria-modal")).toBe("true");
  expect(dialogs[0]?.querySelector(part("filters-panel"))).not.toBeNull();
});

it("lets Vuetify own the nested select menu before dismissing the filter popover", async () => {
  const state = fixture(
    false,
    h(VuetifySelect, {
      attrs: { "aria-label": "Team" },
      value: "a",
      options: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ],
      onChange: () => undefined,
    })
  );
  await delay();
  const input = node<HTMLInputElement>(
    document,
    `${part("filters-popover")} input:not([type=hidden])`
  );
  input.focus();
  await key(input, "Enter");
  await delay();
  expect(document.querySelector(".v-select--active-menu")).not.toBeNull();
  await key(input, "Escape");
  expect(state.close).not.toHaveBeenCalled();
  expect(document.querySelector(".v-select--active-menu")).toBeNull();
  await delay();
  await key(input, "Escape");
  expect(state.close).toHaveBeenCalledExactlyOnceWith("escape");
});

it("uses Vuetify's outside gesture boundary without closing after an inside press", async () => {
  const state = fixture(false);
  await delay();
  const input = node<HTMLInputElement>(
    document,
    `${part("filters-popover")} input:not([type=hidden])`
  );
  input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  state.outside.click();
  await delay();
  expect(state.close).not.toHaveBeenCalled();
  state.outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  state.outside.focus();
  state.outside.click();
  await delay();
  expect(state.close).toHaveBeenCalledExactlyOnceWith("outside");
  expect(state.open.value).toBe(true);
  expect(document.activeElement).toBe(state.outside);
  expect(document.querySelector(part("filters-backdrop"))).toBeNull();
});

it("makes the marked Vuetify backdrop the actual drawer gesture surface", async () => {
  const state = fixture(true);
  await delay();
  const backdrop = node(document, part("filters-backdrop"));
  const panel = node(document, part("filters-panel"));
  expect(backdrop.classList.contains("v-sheet")).toBe(true);
  expect(backdrop.getAttribute("aria-hidden")).toBe("true");
  panel.dispatchEvent(
    new PointerEvent("pointerdown", { button: 0, bubbles: true })
  );
  backdrop.click();
  await settle();
  expect(state.close).not.toHaveBeenCalled();
  backdrop.dispatchEvent(
    new PointerEvent("pointerdown", { button: 0, bubbles: true })
  );
  backdrop.click();
  await settle();
  expect(state.close).toHaveBeenCalledExactlyOnceWith("outside");
  expect(state.open.value).toBe(true);
  state.accept.value = true;
  backdrop.dispatchEvent(
    new PointerEvent("pointerdown", { button: 0, bubbles: true })
  );
  backdrop.click();
  await settle();
  expect(state.open.value).toBe(false);
});

it("retires an open overlay and its keyboard listeners on owner removal", async () => {
  const state = fixture(false);
  await delay();
  state.mounted.value = false;
  await settle();
  expect(document.querySelector(part("filters-popover"))).toBeNull();
  await key(state.outside, "Escape");
  expect(state.close).not.toHaveBeenCalled();
});

it("leaves backdrop activation to an opening nested menu", async () => {
  const state = fixture(
    true,
    h(VuetifySelect, {
      attrs: { "aria-label": "Team" },
      value: "a",
      options: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ],
      onChange: () => undefined,
    })
  );
  await delay();
  const input = node<HTMLInputElement>(
    document,
    `${part("filters-panel")} input:not([type=hidden])`
  );
  input.focus();
  await key(input, "Enter");
  const backdrop = node(document, part("filters-backdrop"));
  backdrop.dispatchEvent(
    new PointerEvent("pointerdown", { button: 0, bubbles: true })
  );
  backdrop.click();
  await settle();
  expect(state.close).not.toHaveBeenCalled();
});

it("retires a queued outside gesture when its surface unmounts", async () => {
  const state = fixture(false);
  await delay();
  state.outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  state.outside.click();
  state.mounted.value = false;
  await settle();
  await delay();
  expect(state.close).not.toHaveBeenCalled();
});

it.each(["popover", "drawer"] as const)(
  "retires an open %s portal across KeepAlive and ignores detached input writes",
  async (mode) => {
    const host = document.createElement("div");
    document.body.append(host);
    const visible = shallowRef(true);
    const features = [
      filters<{ id: string; name: string }>(
        [{ key: "name", type: "text", label: "Person" }],
        { mode }
      ),
    ];
    const tableProps = {
      data: [
        { id: "a", name: "Ada" },
        { id: "g", name: "Grace" },
      ],
      columns: [{ key: "name", header: "Person" }],
      rowKey: (row: { id: string }) => row.id,
      urlSync: false,
      forceMobile: false,
      searchable: false,
      features,
    };
    const app = createApp({
      render: () =>
        h(
          KeepAlive,
          {},
          {
            default: () =>
              visible.value
                ? h(DataTable<{ id: string; name: string }>, tableProps)
                : null,
          }
        ),
    }).use(vuetify());
    app.mount(host);
    let disposed = false;
    cleanups.push(() => {
      if (!disposed) app.unmount();
      host.remove();
    });
    await settle();
    const trigger = node<HTMLButtonElement>(host, part("filters-button"));
    trigger.focus();
    trigger.click();
    await delay();
    const selector = part(
      mode === "drawer" ? "filters-panel" : "filters-popover"
    );
    const surface = node(document, selector);
    const input = node<HTMLInputElement>(
      surface,
      `${part("filter-input")} input`
    );
    input.focus();
    const focus = vi.spyOn(trigger, "focus");
    visible.value = false;
    await delay();
    expect(document.querySelector(selector)).toBeNull();
    expect(focus).not.toHaveBeenCalled();
    input.value = "Grace";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await key(input, "Escape");
    visible.value = true;
    await delay();
    expect(host.querySelectorAll("tbody [data-row-id]")).toHaveLength(2);
    const restored = node<HTMLButtonElement>(host, part("filters-button"));
    expect(restored.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector(selector)).not.toBeNull();
    const resumedInput = node<HTMLInputElement>(document, `${selector} input`);
    resumedInput.focus();
    await key(resumedInput, "Escape");
    expect(restored.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(restored);
    restored.click();
    await delay();
    app.unmount();
    disposed = true;
    await delay();
    expect(document.querySelector(selector)).toBeNull();
    expect(document.querySelector(part("filters-backdrop"))).toBeNull();
  }
);

it.each(["popover", "drawer"] as const)(
  "composes real %s filter surfaces, host filtering and chip removal",
  async (mode) => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () =>
        h(DataTable<{ id: string; name: string }>, {
          data: [
            { id: "a", name: "Ada" },
            { id: "g", name: "Grace" },
          ],
          columns: [{ key: "name", header: "Person" }],
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: false,
          searchable: false,
          features: [
            filters<{ id: string; name: string }>(
              [{ key: "name", type: "text", label: "Person" }],
              { mode }
            ),
            headerFilters(),
          ],
        }),
    }).use(vuetify());
    app.mount(host);
    cleanups.push(() => {
      app.unmount();
      host.remove();
    });
    await settle();
    const trigger = node<HTMLButtonElement>(host, part("filters-button"));
    expect(trigger.classList.contains("v-btn")).toBe(true);
    trigger.focus();
    trigger.click();
    await delay();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const surface = node(
      document,
      part(mode === "drawer" ? "filters-panel" : "filters-popover")
    );
    const input = node<HTMLInputElement>(
      surface,
      `${part("filter-input")} input`
    );
    input.value = "Grace";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(host.querySelectorAll("tbody [data-row-id]")).toHaveLength(1);
    const remove = node<HTMLButtonElement>(host, part("chip-remove"));
    expect(remove.classList.contains("v-btn")).toBe(true);
    remove.click();
    await settle();
    expect(host.querySelectorAll("tbody [data-row-id]")).toHaveLength(2);
    input.focus();
    await key(input, "Escape");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  }
);
