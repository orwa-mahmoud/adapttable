import type { ColumnDef } from "@adapttable/vue";
import type { RowMoveMenuSlotProps } from "@adapttable/vue/adapter";
import UApp from "@nuxt/ui/components/App.vue";
import UModal from "@nuxt/ui/components/Modal.vue";
import { expect, it, vi } from "vitest";
import {
  defineComponent,
  h,
  isVNode,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";

import { DataTable, type DataTableProps } from "../src";
import NuxtButton from "../src/controls/NuxtButton.vue";
import NuxtManagedPopover from "../src/controls/NuxtManagedPopover";
import { groupingPanel } from "../src/grouping-panel";
import { NuxtRowMoveMenu } from "../src/reorder/NuxtRowMoveMenu";
import { rowReorder } from "../src/row-reorder";
import { find, mountNuxt, part } from "./actions.helpers";

interface Row {
  id: string;
  team: string;
}
const rows: readonly Row[] = [
  { id: "a", team: "Core" },
  { id: "b", team: "Core" },
  { id: "c", team: "Design" },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "id", header: "ID" },
  { key: "team", header: "Team" },
];
const base: DataTableProps<Row> = {
  data: rows,
  columns,
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
};
async function settle() {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
async function key(element: HTMLElement, key: string) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
  await settle();
}
async function openMove(host: HTMLElement) {
  const trigger = find<HTMLButtonElement>(
    host,
    `[data-row-id="a"] ${part("row-move-menu-trigger")}`
  );
  trigger.focus();
  await key(trigger, "ArrowDown");
  const menu = find(document, part("row-move-menu-content"));
  expect(menu.getAttribute("role")).toBe("menu");
  const target = [
    ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ].find((item) => item.textContent?.includes("Design"));
  if (!target) throw new Error("Missing Design destination");
  expect(target.getAttribute("data-adapttable-part")).toBe(
    "row-move-menu-item"
  );
  target.click();
  await settle();
  return trigger;
}

it("uses native buttons for mobile bounds and preserves host-owned data", async () => {
  const moved = vi.fn();
  const { host } = mountNuxt(() =>
    h(DataTable<Row>, {
      ...base,
      forceMobile: true,
      classNames: {
        rowReorderButtons: "move-buttons",
        rowReorderUp: "move-up",
        rowReorderDown: "move-down",
      },
      features: [rowReorder<Row>(moved)],
    })
  );
  await settle();
  const up = [
    ...host.querySelectorAll<HTMLButtonElement>(part("row-reorder-up")),
  ];
  const down = [
    ...host.querySelectorAll<HTMLButtonElement>(part("row-reorder-down")),
  ];
  expect(up).toHaveLength(3);
  expect(up[0]?.disabled).toBe(true);
  expect(down[2]?.disabled).toBe(true);
  expect(up[0]?.matches(".move-up[data-slot=base]")).toBe(true);
  expect(down[0]?.matches(".move-down[data-slot=base]")).toBe(true);
  expect(
    find(host, part("row-reorder-buttons")).classList.contains("move-buttons")
  ).toBe(true);
  up[0]?.click();
  expect(moved).not.toHaveBeenCalled();
  down[0]?.click();
  await settle();
  expect(moved).toHaveBeenCalledExactlyOnceWith(0, 1, rows[0]);
  expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
});

it("forwards keyboard lift, movement, cancellation, and drag payloads to the one model", async () => {
  const moved = vi.fn();
  const { host } = mountNuxt(() =>
    h(DataTable<Row>, {
      ...base,
      dir: "rtl",
      classNames: { rowReorderHandle: "move-grip" },
      features: [rowReorder<Row>(moved)],
    })
  );
  await settle();
  const grip = find<HTMLButtonElement>(host, part("row-reorder-handle"));
  expect(grip.matches(".move-grip[data-slot=base]")).toBe(true);
  expect(grip.draggable).toBe(true);
  grip.focus();
  await key(grip, " ");
  expect(grip.getAttribute("aria-pressed")).toBe("true");
  await key(grip, "ArrowDown");
  await key(grip, " ");
  expect(moved).toHaveBeenCalledExactlyOnceWith(0, 1, rows[0]);
  expect(find(host, part("row-reorder-announcer")).textContent).toBeTruthy();
  await key(grip, " ");
  await key(grip, "Escape");
  expect(grip.getAttribute("aria-pressed")).toBe("false");
  expect(moved).toHaveBeenCalledTimes(1);
  grip.dispatchEvent(new Event("dragstart", { bubbles: true }));
  await settle();
  expect(grip.getAttribute("aria-pressed")).toBe("false");
  const dataTransfer = {
    setData: vi.fn(),
    getData: vi.fn(() => "0"),
    effectAllowed: "",
    dropEffect: "",
  };
  const event = new Event("dragstart", { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    dataTransfer: { value: dataTransfer },
    clientY: { value: 0 },
  });
  grip.dispatchEvent(event);
  await settle();
  expect(dataTransfer.setData).toHaveBeenCalled();
  expect(grip.hasAttribute("data-dragging")).toBe(true);
  grip.dispatchEvent(new Event("dragend", { bubbles: true }));
  await settle();
  expect(grip.hasAttribute("data-dragging")).toBe(false);
});

it("uses the native destination menu and modal with shared group confirmation and focus return", async () => {
  const moved = vi.fn();
  const { host } = mountNuxt(() =>
    h(DataTable<Row>, {
      ...base,
      features: [
        groupingPanel<Row>("team"),
        rowReorder<Row>(() => undefined, {
          movePolicy: "confirm",
          onGroupMove: moved,
        }),
      ],
    })
  );
  await settle();
  const trigger = await openMove(host);
  let dialog = find(document, part("row-move-confirmation"));
  expect(dialog.getAttribute("role")).toBe("dialog");
  expect(dialog.getAttribute("data-slot")).toBe("content");
  expect(dialog.textContent).toContain("Core");
  expect(dialog.textContent).toContain("Design");
  expect(document.activeElement).toBe(find(dialog, part("row-move-cancel")));
  find(dialog, part("row-move-cancel")).click();
  await settle();
  expect(moved).not.toHaveBeenCalled();
  expect(document.querySelector(part("row-move-confirmation"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
  await openMove(host);
  dialog = find(document, part("row-move-confirmation"));
  find(dialog, part("row-move-confirm")).click();
  await settle();
  expect(moved).toHaveBeenCalledTimes(1);
  expect(moved.mock.calls[0]?.[0]).toBe(rows[0]);
  expect(rows[0]?.team).toBe("Core");
  expect(document.activeElement).toBe(trigger);
});

it("retires an open menu and old table handles across feature removal and KeepAlive", async () => {
  const moved = vi.fn();
  const shown = shallowRef(true);
  const features = shallowRef([rowReorder<Row>(moved)]);
  const Table = defineComponent(
    () => () => h(DataTable<Row>, { ...base, features: features.value })
  );
  const { host } = mountNuxt(() =>
    h(KeepAlive, {}, () => (shown.value ? h(Table) : null))
  );
  await settle();
  const grip = find<HTMLButtonElement>(host, part("row-reorder-handle"));
  await key(grip, " ");
  shown.value = false;
  await settle();
  await key(grip, "ArrowDown");
  await key(grip, " ");
  expect(moved).not.toHaveBeenCalled();
  shown.value = true;
  await settle();
  expect(grip.getAttribute("aria-pressed")).toBe("false");
  features.value = [];
  await settle();
  await key(grip, " ");
  await key(grip, "ArrowDown");
  await key(grip, " ");
  expect(moved).not.toHaveBeenCalled();
  expect(host.querySelector(part("row-reorder-handle"))).toBeNull();
});

interface Owners {
  select?: () => void;
  close?: (open: boolean) => void;
}
function capture(owners: Owners, vnode: VNode) {
  const children = vnode.component?.subTree.children;
  if (!Array.isArray(children)) return;
  for (const child of children) {
    if (!isVNode(child)) continue;
    if (child.type === NuxtManagedPopover) {
      const content = child.props?.control.content as VNode;
      const slots = content.children as { default: () => readonly VNode[] };
      const item = slots.default().find((item) => item.type === NuxtButton);
      owners.select = item?.props?.attrs.onClick as () => void;
    }
    if (child.type === UModal)
      owners.close = child.props?.["onUpdate:open"] as (open: boolean) => void;
  }
}

it("retires retained vendor selections and dialog callbacks on replacement, cache cycles, and disposal", async () => {
  const selected = vi.fn(),
    cancelled = vi.fn(),
    confirmed = vi.fn();
  const shown = shallowRef(true);
  const items = shallowRef<RowMoveMenuSlotProps["items"]>([
    { id: "one", label: "One", disabled: false, onSelect: selected },
  ]);
  const confirmation = shallowRef<RowMoveMenuSlotProps["confirmation"]>({
    title: "Confirm move",
    description: "Move this row",
    confirmLabel: "Move",
    cancelLabel: "Cancel",
    onConfirm: confirmed,
    onCancel: cancelled,
  });
  const owners: Owners = {};
  const Child = defineComponent(
    () => () =>
      h(NuxtRowMoveMenu, {
        label: "Move",
        items: items.value,
        confirmation: confirmation.value,
        onVnodeMounted: (vnode) => capture(owners, vnode),
        onVnodeUpdated: (vnode) => capture(owners, vnode),
      })
  );
  const { host, stop } = mountNuxt(() =>
    h(UApp, { toaster: null }, () =>
      h(KeepAlive, {}, () => (shown.value ? h(Child) : null))
    )
  );
  await settle();
  find(host, part("row-move-menu-trigger")).click();
  await settle();
  const firstSelect = owners.select!,
    firstClose = owners.close!;
  items.value = [
    { id: "two", label: "Two", disabled: false, onSelect: selected },
  ];
  confirmation.value = { ...confirmation.value!, title: "New move" };
  await settle();
  firstSelect();
  firstClose(false);
  expect(selected).not.toHaveBeenCalled();
  expect(cancelled).not.toHaveBeenCalled();
  const cachedSelect = owners.select!,
    cachedClose = owners.close!;
  shown.value = false;
  await settle();
  expect(document.querySelector(part("row-move-confirmation"))).toBeNull();
  shown.value = true;
  await settle();
  cachedSelect();
  cachedClose(false);
  expect(selected).not.toHaveBeenCalled();
  expect(cancelled).not.toHaveBeenCalled();
  find(host, part("row-move-menu-trigger")).click();
  await settle();
  owners.select!();
  owners.close!(false);
  expect(selected).toHaveBeenCalledTimes(1);
  expect(cancelled).toHaveBeenCalledTimes(1);
  expect(confirmed).not.toHaveBeenCalled();
  stop();
  owners.select!();
  owners.close!(false);
  expect(selected).toHaveBeenCalledTimes(1);
  expect(cancelled).toHaveBeenCalledTimes(1);
});

it("contains native menu and confirmation portals in the supplied Nuxt app target and preserves host-directed focus", async () => {
  const selected = vi.fn();
  const confirmation = shallowRef<RowMoveMenuSlotProps["confirmation"]>();
  const container = document.createElement("section");
  const destination = document.createElement("button");
  destination.textContent = "Next host surface";
  document.body.append(container, destination);
  const cancel = vi.fn(() => {
    confirmation.value = undefined;
  });
  const confirm = vi.fn(() => {
    confirmation.value = undefined;
    // The modal's native trap owns focus until its content has unmounted.
    void nextTick(() => destination.focus());
  });
  const items: RowMoveMenuSlotProps["items"] = [
    {
      id: "locked",
      label: "Locked",
      disabled: true,
      disabledReason: "Read only",
      onSelect: selected,
    },
    {
      id: "allowed",
      label: "Allowed",
      disabled: false,
      onSelect: () => {
        selected();
        confirmation.value = {
          title: "Move this row",
          description: "Core to Design",
          confirmLabel: "Move",
          cancelLabel: "Cancel",
          onConfirm: confirm,
          onCancel: cancel,
        };
      },
    },
  ];
  const { host, stop } = mountNuxt(() =>
    h(UApp, { portal: container, toaster: null }, () =>
      h(NuxtRowMoveMenu, {
        label: "Move",
        items,
        confirmation: confirmation.value,
      })
    )
  );
  try {
    await settle();
    const trigger = find<HTMLButtonElement>(
      host,
      part("row-move-menu-trigger")
    );
    trigger.focus();
    await key(trigger, "ArrowDown");
    const menu = find(container, part("row-move-menu-content"));
    expect(host.contains(menu)).toBe(false);
    const choices = [
      ...menu.querySelectorAll<HTMLElement>(part("row-move-menu-item")),
    ];
    expect(choices).toHaveLength(2);
    expect(choices[0]?.getAttribute("aria-disabled")).toBe("true");
    choices[0]?.click();
    expect(selected).not.toHaveBeenCalled();
    choices[1]!.click();
    await settle();
    const dialog = find(container, part("row-move-confirmation"));
    expect(selected).toHaveBeenCalledTimes(1);
    expect(host.contains(dialog)).toBe(false);
    find(dialog, part("row-move-confirm")).click();
    await settle();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(destination);
    expect(container.querySelector(part("row-move-confirmation"))).toBeNull();
  } finally {
    stop();
    container.remove();
    destination.remove();
  }
});

it("wires shared navigation, disabled skipping, typeahead, Tab, and Escape to native menu buttons", async () => {
  const selected = vi.fn();
  const items: RowMoveMenuSlotProps["items"] = [
    { id: "alpha", label: "Alpha", disabled: true, onSelect: selected },
    { id: "beta", label: "Beta", disabled: false, onSelect: selected },
    { id: "gamma", label: "Gamma", disabled: false, onSelect: selected },
  ];
  const { host } = mountNuxt(() =>
    h(UApp, { toaster: null }, () =>
      h(NuxtRowMoveMenu, { label: "Move", items })
    )
  );
  await settle();
  const trigger = find<HTMLButtonElement>(host, part("row-move-menu-trigger"));
  trigger.focus();
  await key(trigger, "ArrowUp");
  let menu = find(document, part("row-move-menu-content"));
  const buttons = [
    ...menu.querySelectorAll<HTMLButtonElement>(part("row-move-menu-item")),
  ];
  expect(document.activeElement).toBe(buttons[2]);
  expect(
    document.getElementById(trigger.getAttribute("aria-controls") ?? "")
  ).toBe(menu);
  await key(buttons[2]!, "Home");
  expect(document.activeElement).toBe(buttons[1]);
  await key(buttons[1]!, "ArrowUp");
  expect(document.activeElement).toBe(buttons[2]);
  await key(buttons[2]!, "b");
  expect(document.activeElement).toBe(buttons[1]);
  const tab = new KeyboardEvent("keydown", {
    key: "Tab",
    bubbles: true,
    cancelable: true,
  });
  buttons[1]!.dispatchEvent(tab);
  await settle();
  expect(tab.defaultPrevented).toBe(false);
  expect(document.querySelector(part("row-move-menu-content"))).toBeNull();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(trigger.hasAttribute("aria-controls")).toBe(false);
  expect(document.activeElement).not.toBe(trigger);
  trigger.focus();
  await key(trigger, "ArrowDown");
  menu = find(document, part("row-move-menu-content"));
  const first = find<HTMLButtonElement>(menu, "button:not([disabled])");
  expect(document.activeElement).toBe(first);
  await key(first, "Escape");
  expect(document.querySelector(part("row-move-menu-content"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(selected).not.toHaveBeenCalled();
});
