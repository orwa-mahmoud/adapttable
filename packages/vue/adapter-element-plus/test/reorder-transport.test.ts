import type { RowReorderControlSlots } from "@adapttable/vue/adapter";
import { expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { elementReorderControls } from "../src/reorder/elementReorderControls";
import { mount, node } from "./mount";

type HandleProps = Parameters<RowReorderControlSlots["Handle"]>[0];

it("forwards native drag and keyboard transports with the actual button owner", async () => {
  const dragging = ref(false);
  const onDragStart = vi.fn<HandleProps["dragProps"]["onDragStart"]>(
    (event) => {
      expect(event.currentTarget).toBe(button);
      expect(event.clientY).toBe(73);
      event.preventDefault();
      dragging.value = true;
    }
  );
  const onDragEnd = vi.fn(() => {
    dragging.value = false;
  });
  const onKeyDown = vi.fn<HandleProps["onKeyDown"]>((event) => {
    expect(event.currentTarget).toBe(button);
    expect(event.key).toBe("ArrowDown");
    event.preventDefault();
  });
  const { root } = mount(() =>
    elementReorderControls.Handle({
      label: "Move Ada",
      pressed: dragging.value,
      dragging: dragging.value,
      disabled: false,
      className: "host-grip",
      dragProps: { draggable: true, onDragStart, onDragEnd },
      onKeyDown,
    })
  );
  const button = node<HTMLButtonElement>(root, "button.host-grip");
  expect(button.classList.contains("el-button")).toBe(true);
  expect(button.draggable).toBe(true);
  button.dispatchEvent(new Event("dragstart", { bubbles: true }));
  expect(onDragStart).not.toHaveBeenCalled();
  const dataTransfer = {
    effectAllowed: "none",
    setData: vi.fn(),
    getData: vi.fn(),
  };
  const start = new MouseEvent("dragstart", {
    clientY: 73,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(start, "dataTransfer", { value: dataTransfer });
  button.dispatchEvent(start);
  await nextTick();
  expect(onDragStart).toHaveBeenCalledTimes(1);
  expect(onDragStart.mock.calls[0]![0].dataTransfer).toBe(dataTransfer);
  expect(start.defaultPrevented).toBe(true);
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(button.getAttribute("data-dragging")).toBe("");
  const key = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    bubbles: true,
    cancelable: true,
  });
  button.dispatchEvent(key);
  expect(onKeyDown).toHaveBeenCalledTimes(1);
  expect(key.defaultPrevented).toBe(true);
  button.dispatchEvent(new Event("dragend", { bubbles: true }));
  await nextTick();
  expect(onDragEnd).toHaveBeenCalledTimes(1);
  expect(button.getAttribute("aria-pressed")).toBe("false");
  expect(button.hasAttribute("data-dragging")).toBe(false);
});
