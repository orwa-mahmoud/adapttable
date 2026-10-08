import { expect, it, vi } from "vitest";
import { computed, h, nextTick, ref } from "vue";

import { elementGroupingControls } from "../src/grouping/elementGroupingControls";
import { mount, node } from "./mount";

it("forwards grouping drop transport and shows active insertion/removal targets", async () => {
  const active = ref(false);
  const onDrop = vi.fn();
  const onDragEnter = vi.fn();
  const onDragOver = vi.fn();
  const onDragLeave = vi.fn();
  const slots = elementGroupingControls(
    computed(() => ({
      groupingDropZone: "host-drop",
      groupingRemoveZone: "host-remove",
    }))
  );
  const dropProps = { onDragEnter, onDragOver, onDragLeave, onDrop };
  const { root } = mount(() =>
    h("div", [
      slots.DropZone({
        label: "Drop here",
        empty: false,
        active: active.value,
        dragging: active.value,
        dropProps,
        "data-adapttable-part": "grouping-drop-zone",
      }),
      slots.RemoveZone({
        label: "Remove grouping",
        active: active.value,
        dropProps,
        "data-adapttable-part": "grouping-remove-zone",
      }),
    ])
  );
  const drop = node<HTMLElement>(root, ".host-drop");
  const remove = node<HTMLElement>(root, ".host-remove");
  expect(drop.hasAttribute("data-active")).toBe(false);
  expect(drop.hasAttribute("data-dragging")).toBe(false);
  expect(remove.hasAttribute("data-active")).toBe(false);
  active.value = true;
  await nextTick();
  expect(drop.getAttribute("data-active")).toBe("");
  expect(drop.getAttribute("data-dragging")).toBe("");
  expect(remove.getAttribute("data-active")).toBe("");
  expect(remove.getAttribute("aria-label")).toBe("Remove grouping");
  for (const target of [drop, remove]) {
    for (const name of ["dragenter", "dragover", "dragleave", "drop"])
      target.dispatchEvent(
        new Event(name, { bubbles: true, cancelable: true })
      );
  }
  for (const handler of [onDragEnter, onDragOver, onDragLeave, onDrop])
    expect(handler).toHaveBeenCalledTimes(2);
});

it("identifies host-owned aggregates and keeps their unavailable controls absent", async () => {
  const readOnly = ref(true);
  const slots = elementGroupingControls(
    computed(() => ({ groupingAggregationItem: "host-aggregate" }))
  );
  const { root } = mount(() =>
    slots.AggregationItem({
      label: "Amount",
      readOnly: readOnly.value,
      readOnlyLabel: "Managed by your app",
      children: readOnly.value ? null : h("span", "Operation selector"),
      "data-adapttable-part": "grouping-aggregation-item",
    })
  );
  const item = node<HTMLElement>(root, ".host-aggregate");
  expect(item.dataset.readOnly).toBe("");
  expect(item.textContent).toBe("AmountManaged by your app");
  expect(item.querySelector("button, input, select")).toBeNull();
  readOnly.value = false;
  await nextTick();
  expect(item.hasAttribute("data-read-only")).toBe(false);
  expect(item.textContent).toBe("AmountOperation selector");
});
