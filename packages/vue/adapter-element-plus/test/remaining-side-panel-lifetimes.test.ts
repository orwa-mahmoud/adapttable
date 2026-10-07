import {
  resolveLabels,
  SidePanelChrome,
  type SidePanelControlModel,
  type SidePanelSlots,
} from "@adapttable/vue/adapter";
import { expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { elementSidePanelSlots } from "../src/actions/elementRemainingControls";
import { mount } from "./mount";
async function tick() {
  await nextTick();
  await nextTick();
}
it("retires native side-panel callbacks across owner replacement and cache reactivation", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const shown = shallowRef(true);
  const model = shallowRef<SidePanelControlModel>({
    open: "one",
    panels: [
      { key: "one", label: "One", content: "One body" },
      { key: "two", label: "Two", content: "Two body" },
    ],
    onOpenChange: first,
  });
  const selected: (() => void)[] = [];
  const closed: (() => void)[] = [];
  const native = elementSidePanelSlots();
  const slots: SidePanelSlots = {
    ...native,
    Tab: (props) => {
      selected.push(props.buttonProps.onClick);
      return native.Tab(props);
    },
    Close: (props) => {
      closed.push(props.onClose);
      return native.Close(props);
    },
  };
  const Child = defineComponent(
    () => () =>
      h(SidePanelChrome, {
        model: model.value,
        slots,
        labels: resolveLabels(undefined),
        dir: "rtl",
      })
  );
  const view = mount(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("span")) })
  );
  await tick();
  expect(view.root.querySelector('.el-card button[role="tab"]')).not.toBeNull();
  const oldTab = selected.at(-1)!;
  model.value = { ...model.value, onOpenChange: second };
  await tick();
  oldTab();
  await tick();
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  const oldClose = closed.at(-1)!;
  shown.value = false;
  await tick();
  shown.value = true;
  await tick();
  oldClose();
  await tick();
  expect(second).not.toHaveBeenCalled();
  selected.at(-1)!();
  await tick();
  expect(second).toHaveBeenCalledExactlyOnceWith("two");
});
