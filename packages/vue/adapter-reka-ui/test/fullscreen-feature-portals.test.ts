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
import { tableAssistant, type TableAssistantProps } from "../src/assistant";
import { fullscreen } from "../src/fullscreen";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0).reverse()) stop();
  document.body.replaceChildren();
});
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
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
  await flush();
}
function fullscreenDriver() {
  const current = shallowRef<HTMLElement | null>(null);
  const saved: [object, string, PropertyDescriptor | undefined][] = [];
  const patch = (
    target: object,
    name: string,
    descriptor: PropertyDescriptor
  ) => {
    saved.push([target, name, Object.getOwnPropertyDescriptor(target, name)]);
    Object.defineProperty(target, name, { configurable: true, ...descriptor });
  };
  patch(document, "fullscreenEnabled", { value: true });
  patch(document, "fullscreenElement", { get: () => current.value });
  patch(HTMLElement.prototype, "requestFullscreen", {
    value: function (this: HTMLElement) {
      current.value = this;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    },
  });
  patch(document, "exitFullscreen", {
    value: () => {
      current.value = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    },
  });
  stops.push(() => {
    saved.reverse();
    for (const [target, name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(target, name, descriptor);
      else Reflect.deleteProperty(target, name);
    }
  });
  return () => {
    if (!current.value) throw new Error("The table did not enter fullscreen");
    return current.value;
  };
}

const surfaces = [
  { kind: "move", selector: part("row-move-menu-content"), role: "menu" },
  {
    kind: "confirmation",
    selector: part("row-move-confirmation"),
    role: "alertdialog",
  },
  { kind: "sheet", selector: part("assistant-sheet"), role: "dialog" },
  { kind: "examples", selector: '[role="menu"]', role: "menu" },
] as const;

function fixture(kind: (typeof surfaces)[number]["kind"], cached = false) {
  const current = fullscreenDriver();
  const shown = shallowRef(true);
  const open = shallowRef(false);
  const acceptClose = shallowRef(true);
  const close = vi.fn((value: boolean) => {
    if (value || acceptClose.value) open.value = value;
  });
  const moved = vi.fn();
  const suggested = vi.fn();
  const assistant: TableAssistantProps["assistant"] = {
    status: "ready",
    messages: [],
    draft: "",
    setDraft: vi.fn(),
    send: vi.fn(),
    stop: vi.fn(),
    suggestions: [{ id: "x", title: "Example" }],
    runSuggestion: suggested,
  };
  const rows = [
    { id: "a", team: "Core" },
    { id: "b", team: "Ops" },
  ];
  const features =
    kind === "move" || kind === "confirmation"
      ? [
          fullscreen(),
          groupingPanel("team"),
          rowReorder<(typeof rows)[number]>(vi.fn(), {
            movePolicy: "confirm",
            onGroupMove: moved,
          }),
        ]
      : [fullscreen(), tableAssistant()];
  const Table = defineComponent({
    render: () =>
      h(DataTable<(typeof rows)[number]>, {
        data: rows,
        columns: [{ key: "team", groupable: true }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        features,
        assistant:
          kind === "sheet" || kind === "examples"
            ? {
                assistant,
                open: open.value,
                onOpenChange: close,
                presentation: "sheet",
              }
            : undefined,
      }),
  });
  const Other = defineComponent({ render: () => h("p", "Paused") });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () => {
      const table = shown.value ? h(Table) : null;
      return h("div", [
        h("input", { id: "fullscreen-outside" }),
        cached
          ? h(KeepAlive, null, {
              default: () => (shown.value ? h(Table) : h(Other)),
            })
          : table,
      ]);
    },
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return {
    current,
    shown,
    open,
    close,
    acceptClose,
    moved,
    suggested,
    async show() {
      await flush();
      element(part("fullscreen-toggle")).click();
      await flush();
      const selector =
        kind === "move" || kind === "confirmation"
          ? `[data-row-id="a"] ${part("row-move-menu-trigger")}`
          : part("assistant-launcher");
      const trigger = element(selector);
      trigger.focus();
      trigger.click();
      await flush();
      if (kind === "confirmation") {
        const item = element(
          `${part("row-move-menu-item")}:not([aria-disabled="true"])`
        );
        item.focus();
        await key(item, "Enter");
      } else if (kind === "examples") {
        element(part("assistant-examples-menu")).click();
        await flush();
      }
      return trigger;
    },
  };
}

it.each(surfaces)(
  "keeps the $kind portal inside fullscreen and moves the same target on live exit/entry",
  async ({ kind, selector, role }) => {
    const state = fixture(kind);
    await state.show();
    const root = state.current();
    const target = element(selector);
    expect(root.contains(target)).toBe(true);
    expect(target.getAttribute("role")).toBe(role);
    expect(document.querySelectorAll(selector)).toHaveLength(1);
    const focus = document.activeElement;
    await document.exitFullscreen();
    await flush();
    expect(element(selector)).toBe(target);
    expect(root.contains(target)).toBe(false);
    expect(document.body.contains(target)).toBe(true);
    expect(document.querySelectorAll(selector)).toHaveLength(1);
    await root.requestFullscreen();
    await flush();
    expect(element(selector)).toBe(target);
    expect(root.contains(target)).toBe(true);
    expect(document.querySelectorAll(selector)).toHaveLength(1);
    expect(focus?.isConnected).toBe(true);
    expect(state.moved).not.toHaveBeenCalled();
    expect(state.suggested).not.toHaveBeenCalled();
  }
);

it.each(surfaces)(
  "retires the fullscreen $kind portal through KeepAlive without reclaiming focus",
  async ({ kind, selector }) => {
    const state = fixture(kind, true);
    await state.show();
    const target = element(selector);
    expect(state.current().contains(target)).toBe(true);
    state.shown.value = false;
    await nextTick();
    const outside = element("#fullscreen-outside");
    outside.focus();
    await flush();
    expect(document.querySelector(selector)).toBeNull();
    expect(document.activeElement).toBe(outside);
    expect(document.body.style.pointerEvents).not.toBe("none");
    await key(target, "Enter");
    expect(state.moved).not.toHaveBeenCalled();
    expect(state.suggested).not.toHaveBeenCalled();
    state.shown.value = true;
    await flush();
    if (kind === "sheet") {
      expect(document.querySelectorAll(selector)).toHaveLength(1);
      expect(element(selector)).not.toBe(target);
    } else {
      expect(document.querySelector(selector)).toBeNull();
    }
  }
);

it("preserves controlled rejection and nested Escape ownership after moving the assistant portals", async () => {
  const state = fixture("examples");
  state.acceptClose.value = false;
  await state.show();
  const sheet = element(part("assistant-sheet"));
  const menu = element('[role="menu"]');
  await document.exitFullscreen();
  await flush();
  expect(element('[role="menu"]')).toBe(menu);
  await key(element('[role="menuitem"]'), "Escape");
  expect(document.querySelector('[role="menu"]')).toBeNull();
  expect(element(part("assistant-sheet"))).toBe(sheet);
  expect(state.close.mock.calls).toEqual([[true]]);
  expect(document.activeElement).toBe(element(part("assistant-examples-menu")));
  await key(element(part("assistant-input")), "Escape");
  expect(state.close.mock.calls).toEqual([[true], [false]]);
  expect(element(part("assistant-sheet"))).toBe(sheet);
  state.acceptClose.value = true;
  await key(element(part("assistant-input")), "Escape");
  expect(document.querySelector(part("assistant-sheet"))).toBeNull();
  expect(state.close.mock.calls).toEqual([[true], [false], [false]]);
  expect(document.activeElement).toBe(element(part("assistant-launcher")));
});

it.each(surfaces)(
  "disposes the fullscreen $kind portal and releases its outside interaction lock",
  async ({ kind, selector }) => {
    const state = fixture(kind);
    await state.show();
    const target = element(selector);
    state.shown.value = false;
    await nextTick();
    const outside = element("#fullscreen-outside");
    outside.focus();
    await flush();
    expect(document.querySelector(selector)).toBeNull();
    expect(document.activeElement).toBe(outside);
    expect(document.body.style.pointerEvents).not.toBe("none");
    await key(target, "Enter");
    expect(state.moved).not.toHaveBeenCalled();
    expect(state.suggested).not.toHaveBeenCalled();
  }
);
