import { useRowReorder } from "@adapttable/vue";
import type { RowMoveMenuSlotProps } from "@adapttable/vue/adapter";
import { ElDialog, ElSelect } from "element-plus";
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

import { ElementRowMoveMenu } from "../src/reorder/ElementRowMoveMenu";
import { mount } from "./mount";

async function tick() {
  await nextTick();
  await nextTick();
}
function capture(
  owners: { select?: (value: unknown) => void; close?: () => void },
  vnode: VNode
) {
  const children = vnode.component?.subTree.children;
  if (!Array.isArray(children)) throw new Error("Missing native controls");
  for (const child of children) {
    if (!isVNode(child)) continue;
    if (child.type === ElSelect)
      owners.select = child.props?.["onUpdate:modelValue"] as (
        value: unknown
      ) => void;
    if (child.type === ElDialog)
      owners.close = child.props?.beforeClose as () => void;
  }
}

it("retires the native row-move selection when items are replaced or removed", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const row = { id: "a" };
  const options: Parameters<typeof useRowReorder<typeof row>>[0] = {
    enabled: true,
    session: "first",
    labels: {
      rowLifted: String,
      rowMoved: (from, to) => `${from} to ${to}`,
      rowReorderCancelled: "Cancelled",
    },
    rowAt: () => row,
    getRowId: (value) => value.id,
    onRowReorder: () => undefined,
    onRowMove: first,
    movePolicy: "auto",
    getMoveMenu: () => ({
      kind: "group",
      label: "Move",
      targets: [
        {
          id: "one",
          label: "One",
          request: {
            kind: "group",
            row,
            rowLabel: "A",
            fromGroup: { id: "old", label: "Old", levels: [] },
            toGroup: { id: "one", label: "One", levels: [] },
            position: 0,
          },
        },
      ],
    }),
  };
  const configuration = shallowRef(options);
  const owners: { select?: (value: unknown) => void } = {};
  const Control = defineComponent(() => {
    const model = useRowReorder(() => configuration.value);
    return () => {
      const actions = model.value.controller;
      const target = actions.moveMenu(row)?.targets[0];
      const items: RowMoveMenuSlotProps["items"] = target
        ? [
            {
              id: target.id,
              label: target.label,
              disabled: false,
              onSelect: () => actions.selectMoveTarget(target),
            },
          ]
        : [];
      return h(ElementRowMoveMenu, {
        label: "Move",
        items,
        onVnodeMounted: (vnode) => capture(owners, vnode),
        onVnodeUpdated: (vnode) => capture(owners, vnode),
      });
    };
  });
  const view = mount(() => h(Control));
  await tick();
  expect(view.root.querySelector(".el-select")).not.toBeNull();
  const old = owners.select!;
  configuration.value = { ...options, session: "second", onRowMove: second };
  await tick();
  old("one");
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  owners.select!("one");
  expect(second).toHaveBeenCalledTimes(1);
  const removed = owners.select!;
  configuration.value = { ...options, session: "removed", enabled: false };
  await tick();
  removed("one");
  expect(second).toHaveBeenCalledTimes(1);
  view.unmount();
  old("one");
  expect(first).not.toHaveBeenCalled();
});

it("retires native row-move Select and Dialog callbacks across cache reactivation", async () => {
  const select = vi.fn();
  const cancel = vi.fn();
  const confirm = vi.fn();
  const shown = shallowRef(true);
  const items = [
    { id: "one", label: "One", disabled: false, onSelect: select },
  ];
  const confirmation = {
    title: "Confirm move",
    description: "Move this row",
    confirmLabel: "Move",
    cancelLabel: "Cancel",
    onConfirm: confirm,
    onCancel: cancel,
  };
  const owners: { select?: (value: unknown) => void; close?: () => void } = {};
  const Child = defineComponent(
    () => () =>
      h(ElementRowMoveMenu, {
        label: "Move",
        items,
        confirmation,
        onVnodeMounted: (vnode) => capture(owners, vnode),
        onVnodeUpdated: (vnode) => capture(owners, vnode),
      })
  );
  const view = mount(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("span")) })
  );
  await tick();
  const staleSelect = owners.select!;
  const staleClose = owners.close!;
  shown.value = false;
  await tick();
  shown.value = true;
  await tick();
  staleSelect("one");
  staleClose();
  expect(select).not.toHaveBeenCalled();
  expect(cancel).not.toHaveBeenCalled();
  owners.select!("one");
  owners.close!();
  expect(select).toHaveBeenCalledTimes(1);
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
  view.unmount();
  owners.close!();
  expect(cancel).toHaveBeenCalledTimes(1);
});
