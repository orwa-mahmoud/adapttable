import type { RowMoveMenuSlotProps } from "@adapttable/vue/adapter";
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
import { rekaManagedPanel } from "../src/controls/managedPanel";
import { filters } from "../src/filters";
import { RekaMoveMenu } from "../src/reorder/MoveMenu";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
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
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
function confirmation(
  onConfirm: () => void,
  onCancel: () => void
): NonNullable<RowMoveMenuSlotProps["confirmation"]> {
  return {
    title: "Move row?",
    description: "Move Ada to another group",
    confirmLabel: "Move",
    cancelLabel: "Cancel",
    onConfirm,
    onCancel,
  };
}
it("rejects detached move-confirmation buttons after the host replaces the pending request", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const cancel = vi.fn();
  const pending = shallowRef<RowMoveMenuSlotProps["confirmation"]>();
  mount(() =>
    h(RekaMoveMenu, {
      label: "Move row",
      items: [
        {
          id: "ops",
          label: "Operations",
          disabled: false,
          onSelect: () => {
            pending.value = confirmation(first, cancel);
          },
        },
      ],
      confirmation: pending.value,
    })
  );
  await flush();
  const trigger = element<HTMLButtonElement>(part("row-move-menu-trigger"));
  trigger.click();
  await flush();
  const choice = element(part("row-move-menu-item"));
  choice.focus();
  await key(choice, "Enter");
  const retired = element<HTMLButtonElement>(part("row-move-confirm"));
  pending.value = undefined;
  await flush();
  pending.value = confirmation(second, cancel);
  await flush();
  retired.click();
  await flush();
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  element<HTMLButtonElement>(part("row-move-confirm")).click();
  await flush();
  expect(second).toHaveBeenCalledTimes(1);
});
it("retires an active move confirmation through KeepAlive without a stale action or focus theft", async () => {
  const shown = shallowRef(true);
  const confirmed = vi.fn();
  const cancelled = vi.fn();
  const pending = shallowRef<RowMoveMenuSlotProps["confirmation"]>(
    confirmation(confirmed, cancelled)
  );
  const Menu = defineComponent({
    render: () =>
      h(RekaMoveMenu, {
        label: "Move row",
        items: [],
        confirmation: pending.value,
      }),
  });
  const Other = defineComponent({ render: () => h("p", "Paused") });
  mount(() =>
    h("div", [
      h("input", { id: "move-outside" }),
      h(KeepAlive, null, { default: () => (shown.value ? h(Menu) : h(Other)) }),
    ])
  );
  await flush();
  const retired = element<HTMLButtonElement>(part("row-move-confirm"));
  shown.value = false;
  await nextTick();
  const outside = element<HTMLInputElement>("#move-outside");
  outside.focus();
  await flush();
  expect(document.querySelector(part("row-move-confirmation"))).toBeNull();
  expect(document.activeElement).toBe(outside);
  retired.click();
  await flush();
  expect(confirmed).not.toHaveBeenCalled();
  expect(cancelled).not.toHaveBeenCalled();
  shown.value = true;
  await flush();
  expect(document.querySelector(part("row-move-confirmation"))).not.toBeNull();
  retired.click();
  expect(confirmed).not.toHaveBeenCalled();
  await key(element(part("row-move-cancel")), "Escape");
  expect(cancelled).toHaveBeenCalledTimes(1);
});
it("rejects removed move destinations, disabled choices, and allows the current enabled destination", async () => {
  const old = vi.fn();
  const next = vi.fn();
  const denied = vi.fn();
  const items = shallowRef<RowMoveMenuSlotProps["items"]>([
    { id: "old", label: "Old group", disabled: false, onSelect: old },
  ]);
  mount(() => h(RekaMoveMenu, { label: "Move row", items: items.value }));
  await flush();
  const trigger = element<HTMLButtonElement>(part("row-move-menu-trigger"));
  trigger.click();
  await flush();
  const retired = element(part("row-move-menu-item"));
  items.value = [
    {
      id: "blocked",
      label: "Blocked",
      disabled: true,
      disabledReason: "Not available",
      onSelect: denied,
    },
    { id: "next", label: "Next group", disabled: false, onSelect: next },
  ];
  await flush();
  retired.click();
  await flush();
  expect(old).not.toHaveBeenCalled();
  const blocked = element<HTMLButtonElement>(
    `${part("row-move-menu-item")}[data-disabled]`
  );
  expect(blocked.getAttribute("title")).toBe("Not available");
  blocked.click();
  expect(denied).not.toHaveBeenCalled();
  const current = [
    ...document.querySelectorAll<HTMLElement>(part("row-move-menu-item")),
  ].find((node) => node.textContent === "Next group");
  if (!current) throw new Error("Missing next group");
  current.focus();
  await key(current, "Enter");
  expect(next).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(trigger);
});
it("keeps an outside click's focus and handles a filter-trigger click as one close", async () => {
  const host = mount(() =>
    h("div", [
      h("input", { id: "filter-outside" }),
      h(DataTable<{ id: string; name: string }>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        features: [
          filters<{ id: string; name: string }>([
            { key: "name", type: "text" },
          ]),
        ],
      }),
    ])
  );
  await flush();
  const trigger = element<HTMLButtonElement>(part("filters-button"));
  trigger.click();
  await flush();
  expect(document.querySelector(part("filters-popover"))).not.toBeNull();
  const outside = element<HTMLInputElement>("#filter-outside");
  outside.dispatchEvent(
    new MouseEvent("pointerdown", { bubbles: true, button: 0 })
  );
  outside.focus();
  await flush();
  expect(document.querySelector(part("filters-popover"))).toBeNull();
  expect(document.activeElement).toBe(outside);
  trigger.click();
  await flush();
  trigger.dispatchEvent(
    new MouseEvent("pointerdown", { bubbles: true, button: 0 })
  );
  trigger.click();
  await flush();
  expect(document.querySelector(part("filters-popover"))).toBeNull();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(host.textContent).toContain("Ada");
});

it("honors a custom managed panel's RTL direction, accessible name, container, and return focus", async () => {
  const anchor = document.createElement("button");
  anchor.textContent = "Custom properties";
  document.body.append(anchor);
  const container = document.createElement("section");
  document.body.append(container);
  anchor.focus();
  const open = shallowRef(true);
  const closed = vi.fn();
  mount(() =>
    h("div", [
      rekaManagedPanel({
        attrs: { "aria-label": "Custom properties", dir: "rtl" },
        content: h(
          "button",
          { type: "button", id: "custom-panel-control" },
          "Property"
        ),
        container,
        anchor,
        open: open.value,
        isCurrent: () => true,
        onClose: (reason) => {
          closed(reason);
          open.value = false;
        },
      }),
    ])
  );
  await flush();
  const panel = element(part("filters-popover"));
  expect(panel.getAttribute("aria-label")).toBe("Custom properties");
  expect(panel.getAttribute("dir")).toBe("rtl");
  expect(container.contains(panel)).toBe(true);
  await key(element("#custom-panel-control"), "Escape");
  expect(closed).toHaveBeenCalledExactlyOnceWith("escape");
  expect(document.querySelector(part("filters-popover"))).toBeNull();
  expect(document.activeElement).toBe(anchor);
});
