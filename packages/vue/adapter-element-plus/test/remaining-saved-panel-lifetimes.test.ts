import {
  SavedViewsPanelChrome,
  type SavedViewsPanelSlots,
} from "@adapttable/vue/adapter";
import { expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { elementSavedViewsPanelSlots } from "../src/views/elementSavedViewsControls";
import { mount } from "./mount";
async function tick() {
  await nextTick();
  await nextTick();
}
it("retires captured management callbacks after view replacement and KeepAlive reactivation", async () => {
  const apply = vi.fn();
  const views = shallowRef([{ name: "First", search: "" }]);
  const shown = shallowRef(true);
  const callbacks: (() => void)[] = [];
  const native = elementSavedViewsPanelSlots(() => ({}));
  const slots: SavedViewsPanelSlots = {
    ...native,
    Row: (props) => {
      callbacks.push(props.onApply);
      return native.Row(props);
    },
  };
  const Child = defineComponent(
    () => () =>
      h(SavedViewsPanelChrome, {
        views: views.value,
        onApply: apply,
        onRename: vi.fn(),
        onMove: vi.fn(),
        onSetDefault: vi.fn(),
        onRemove: vi.fn(),
        slots,
      })
  );
  mount(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("span")) })
  );
  await tick();
  expect(document.querySelector(".el-card .el-button")).not.toBeNull();
  const replaced = callbacks.at(-1)!;
  views.value = [{ name: "Second", search: "" }];
  await tick();
  replaced();
  await tick();
  expect(apply).not.toHaveBeenCalled();
  const inactive = callbacks.at(-1)!;
  shown.value = false;
  await tick();
  shown.value = true;
  await tick();
  inactive();
  await tick();
  expect(apply).not.toHaveBeenCalled();
  callbacks.at(-1)!();
  await tick();
  expect(apply).toHaveBeenCalledExactlyOnceWith("Second");
});
