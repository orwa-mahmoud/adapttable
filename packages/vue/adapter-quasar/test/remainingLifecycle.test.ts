import { mount } from "@vue/test-utils";
import { QItem, Quasar } from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { finishOverlayFocus } from "../src/actions/focusHandoff";
import { moveMenuFocus } from "../src/actions/menuFocus";
import { contextMenu } from "../src/context-menu";
import { quasarGroupingSlots } from "../src/grouping/controls";
import { rowReorder } from "../src/row-reorder";

const wrappers: ReturnType<typeof mount>[] = [];
const roots: HTMLElement[] = [];
const native = { attachTo: document.body, global: { plugins: [Quasar] } };
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 45));
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  for (const root of roots.splice(0)) root.remove();
  await settle();
});
const part = (name: string) => `[data-adapttable-part="${name}"]`;

it.each([
  "accepted",
  "newer-focus",
  "newer-modal",
  "retired",
  "disabled",
  "hidden",
  "inert",
  "display-none",
  "visibility-hidden",
  "disconnected",
  "outside-origin",
])(
  "finishes native overlay focus without stealing another owner: %s",
  async (mode) => {
    const host = document.createElement("div");
    roots.push(host);
    document.body.append(host);
    const opener = document.createElement("button");
    const outside = document.createElement("button");
    const surface = document.createElement("div");
    const field = document.createElement("input");
    surface.append(field);
    host.append(opener, outside, surface);
    field.focus();
    if (mode === "outside-origin") outside.focus();
    finishOverlayFocus(opener, surface, () => mode !== "retired");
    surface.remove();
    if (mode === "newer-focus") outside.focus();
    if (mode === "newer-modal") {
      const modal = document.createElement("div");
      modal.setAttribute("aria-modal", "true");
      host.append(modal);
    }
    if (mode === "disabled") opener.disabled = true;
    if (mode === "hidden") host.hidden = true;
    if (mode === "inert") host.setAttribute("inert", "");
    if (mode === "display-none") host.style.display = "none";
    if (mode === "visibility-hidden") host.style.visibility = "hidden";
    if (mode === "disconnected") opener.remove();
    await nextTick();
    if (mode === "accepted") expect(document.activeElement).toBe(opener);
    else expect(document.activeElement).not.toBe(opener);
  }
);
it("tolerates a removed overlay target without assigning focus", async () => {
  const active = document.activeElement;
  finishOverlayFocus(null, null, () => true);
  await nextTick();
  expect(document.activeElement).toBe(active);
});

it("moves native menu item focus with arrows and Home/End while skipping disabled actions", async () => {
  const wrapper = mount(
    defineComponent(
      () => () =>
        h("div", { role: "menu", tabindex: -1, onKeydown: moveMenuFocus }, [
          h(
            QItem,
            { clickable: true, role: "menuitem", tabindex: -1 },
            () => "One"
          ),
          h(
            QItem,
            {
              clickable: true,
              disable: true,
              role: "menuitem",
              "aria-disabled": true,
              tabindex: -1,
            },
            () => "Blocked"
          ),
          h(
            QItem,
            { clickable: true, role: "menuitem", tabindex: -1 },
            () => "Two"
          ),
        ])
    ),
    native
  );
  wrappers.push(wrapper);
  await settle();
  const menu = wrapper.element as HTMLElement;
  const [one, , two] = [
    ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ];
  menu.focus();
  await wrapper.trigger("keydown", { key: "ArrowUp" });
  expect(document.activeElement).toBe(two);
  await wrapper.trigger("keydown", { key: "ArrowUp" });
  expect(document.activeElement).toBe(one);
  await wrapper.trigger("keydown", { key: "ArrowDown" });
  expect(document.activeElement).toBe(two);
  await wrapper.trigger("keydown", { key: "ArrowDown" });
  expect(document.activeElement).toBe(one);
  await wrapper.trigger("keydown", { key: "End" });
  expect(document.activeElement).toBe(two);
  await wrapper.trigger("keydown", { key: "Home" });
  expect(document.activeElement).toBe(one);
  for (const options of [
    { key: "ArrowDown", isComposing: true },
    { key: "q" },
  ]) {
    await wrapper.trigger("keydown", options);
    expect(document.activeElement).toBe(one);
  }
  const prevented = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    bubbles: true,
    cancelable: true,
  });
  prevented.preventDefault();
  one?.dispatchEvent(prevented);
  expect(document.activeElement).toBe(one);
  moveMenuFocus(new KeyboardEvent("keydown", { key: "ArrowDown" }));
});
it("leaves nested menus and menus without enabled items to their own focus owner", async () => {
  const wrapper = mount(
    defineComponent(
      () => () =>
        h("div", { role: "menu", onKeydown: moveMenuFocus }, [
          h("div", { role: "menu" }, [
            h(
              QItem,
              { clickable: true, role: "menuitem", tabindex: -1 },
              () => "Nested"
            ),
          ]),
          h(
            QItem,
            {
              clickable: true,
              disable: true,
              role: "menuitem",
              "aria-disabled": true,
            },
            () => "Disabled"
          ),
        ])
    ),
    native
  );
  wrappers.push(wrapper);
  await settle();
  const nested = wrapper.get('[role="menu"] [role="menuitem"]')
    .element as HTMLElement;
  nested.focus();
  nested.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    })
  );
  expect(document.activeElement).toBe(nested);
  await wrapper.trigger("keydown", { key: "Home" });
  expect(document.activeElement).toBe(nested);
});

it("forwards grouping drag boundaries, read-only aggregate labels and restore controls through native Quasar controls", async () => {
  const dropped = vi.fn();
  const restore = vi.fn();
  const remove = vi.fn();
  const slots = quasarGroupingSlots(
    shallowRef({
      groupingRemoveZone: "host-remove",
      groupingAggregationsRestore: "host-restore",
    })
  );
  const wrapper = mount(
    defineComponent(
      () => () =>
        h("div", [
          slots.RemoveZone({
            label: "Drop to remove",
            active: true,
            dropProps: {
              onDragOver: (event) => event.preventDefault(),
              onDrop: dropped,
              onDragLeave: () => undefined,
            },
            "data-adapttable-part": "grouping-remove-zone",
          }),
          slots.AggregationItem({
            label: "Amount",
            readOnly: true,
            readOnlyLabel: "Read only",
            children: null,
            "data-adapttable-part": "grouping-aggregation-item",
          }),
          slots.AggregationRestore({
            label: "Restore defaults",
            disabled: false,
            onRestore: restore,
            "data-adapttable-part": "grouping-aggregations-restore",
          }),
          slots.Chip({
            label: "Team",
            level: 1,
            dragProps: {
              draggable: true,
              onDragStart: () => undefined,
              onDragEnd: () => undefined,
            },
            keyboardProps: {
              role: "button",
              "aria-label": "Reorder Team",
              tabIndex: 0,
              onKeyDown: () => undefined,
            },
            onRemove: remove,
            removeLabel: "Remove Team",
            "data-adapttable-part": "grouping-chip",
          }),
        ])
    ),
    native
  );
  wrappers.push(wrapper);
  await settle();
  expect(wrapper.text()).toContain("Read only");
  expect(wrapper.get(part("grouping-remove-zone")).classes()).toContain(
    "host-remove"
  );
  await wrapper.get(part("grouping-remove-zone")).trigger("drop");
  expect(dropped).toHaveBeenCalledOnce();
  await wrapper.get(part("grouping-aggregations-restore")).trigger("click");
  expect(restore).toHaveBeenCalledOnce();
  await wrapper.get(part("grouping-chip-remove")).trigger("click");
  expect(remove).toHaveBeenCalledOnce();
});

it("uses canonical row drag handlers and ignores composition before requesting a host reorder", async () => {
  const moved = vi.fn();
  const data = [
    { id: "a", name: "Ada" },
    { id: "b", name: "Bea" },
  ];
  const wrapper = mount(DataTable<(typeof data)[number]>, {
    ...native,
    props: {
      data,
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      searchable: false,
      urlSync: false,
      forceMobile: false,
      features: [rowReorder(moved)],
    },
  });
  wrappers.push(wrapper);
  await settle();
  const grip = wrapper.get(part("row-reorder-handle"));
  await grip.trigger("keydown", { key: " ", isComposing: true });
  expect(grip.attributes("aria-pressed")).toBe("false");
  await grip.trigger("dragstart");
  expect(grip.attributes("aria-pressed")).toBe("false");
  const transfer = {
    setData: vi.fn(),
    getData: () => "a",
    effectAllowed: "",
    dropEffect: "",
  };
  await grip.trigger("dragstart", { dataTransfer: transfer, clientY: 0 });
  expect(transfer.setData).toHaveBeenCalled();
  expect(grip.attributes("aria-pressed")).toBe("true");
  await grip.trigger("dragend");
  expect(grip.attributes("aria-pressed")).toBe("false");
  expect(moved).not.toHaveBeenCalled();
});

it("dismisses a context menu with native Escape without running its actions", async () => {
  const selected = vi.fn();
  const data = [{ id: "a", name: "Ada" }];
  const wrapper = mount(DataTable<(typeof data)[number]>, {
    ...native,
    props: {
      data,
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      searchable: false,
      urlSync: false,
      forceMobile: false,
      features: [
        contextMenu<(typeof data)[number]>({
          items: () => [{ key: "action", label: "Action", onSelect: selected }],
        }),
      ],
    },
  });
  wrappers.push(wrapper);
  await settle();
  await wrapper
    .get('[data-row-id="a"] [data-column-key="name"]')
    .trigger("contextmenu", { clientX: 40, clientY: 50 });
  await settle();
  const menu = document.querySelector<HTMLElement>(part("context-menu"));
  expect(menu).not.toBeNull();
  menu?.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      keyCode: 27,
      bubbles: true,
      cancelable: true,
    })
  );
  menu?.dispatchEvent(
    new KeyboardEvent("keyup", {
      key: "Escape",
      keyCode: 27,
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
  expect(document.querySelector(part("context-menu"))).toBeNull();
  expect(selected).not.toHaveBeenCalled();
});
