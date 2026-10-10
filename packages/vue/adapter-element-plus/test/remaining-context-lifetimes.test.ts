import {
  ContextMenuChrome,
  type ContextMenuSlots,
} from "@adapttable/vue/adapter";
import { expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { elementContextMenuSlots } from "../src/actions/elementRemainingControls";
import { mount } from "./mount";
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
it("retires genuine Element menu callbacks after target/item replacement and KeepAlive reactivation", async () => {
  const run = vi.fn();
  const close = vi.fn();
  const at = shallowRef({ x: 10, y: 20 });
  const items = shallowRef([{ key: "one", label: "First", onSelect: run }]);
  const shown = shallowRef(true);
  const callbacks: (() => void)[] = [];
  const native = elementContextMenuSlots();
  const slots: ContextMenuSlots = {
    ...native,
    Item: (props) => {
      callbacks.push(props.onSelect);
      return native.Item(props);
    },
  };
  const Child = defineComponent(
    () => () =>
      h(ContextMenuChrome, {
        at: at.value,
        items: items.value,
        onClose: close,
        slots,
      })
  );
  const view = mount(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("span")) })
  );
  await tick();
  expect(document.querySelector(".el-dropdown-menu__item")).not.toBeNull();
  const oldTarget = callbacks[0]!;
  at.value = { x: 50, y: 60 };
  await tick();
  oldTarget();
  await tick();
  expect(run).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  const oldItems = callbacks.at(-1)!;
  items.value = [{ key: "two", label: "Second", onSelect: run }];
  await tick();
  oldItems();
  await tick();
  expect(run).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  const oldActive = callbacks.at(-1)!;
  shown.value = false;
  await tick();
  shown.value = true;
  await tick();
  oldActive();
  await tick();
  expect(run).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  callbacks.at(-1)!();
  await tick();
  expect(run).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
  const disposed = callbacks.at(-1)!;
  view.unmount();
  disposed();
  await tick();
  expect(run).toHaveBeenCalledTimes(1);
});
