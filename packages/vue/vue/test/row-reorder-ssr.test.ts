import { afterEach, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { resolveLabels } from "../src/adapter";
import {
  useRowReorder,
  type VueRowReorderModel,
} from "../src/specialized/rowReorder";

const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
const row = { id: "a" };
const menu = {
  kind: "group" as const,
  label: "Move to group",
  targets: [
    {
      id: "two",
      label: "Two",
      request: {
        kind: "group" as const,
        row,
        rowLabel: "A",
        fromGroup: { id: "one", label: "One", levels: [] },
        toGroup: { id: "two", label: "Two", levels: [] },
        position: 0,
      },
    },
  ],
};

it("hydrates a disabled destination projection while retaining controller activity guards", async () => {
  const onRowMove = vi.fn();
  const enabled = shallowRef(false);
  const models: VueRowReorderModel<typeof row>[] = [];
  const View = defineComponent(() => {
    const model = useRowReorder(() => ({
      enabled: enabled.value,
      labels: resolveLabels({}),
      rowAt: () => row,
      getRowId: (value: typeof row) => value.id,
      onRowReorder: vi.fn(),
      onRowMove,
      movePolicy: "auto",
      getMoveMenu: () => menu,
    }));
    return () => {
      const current = model.value;
      models.push(current);
      const value = current.moveMenu?.(row);
      return h(
        "button",
        {
          disabled: !current.enabled,
          onClick: () => {
            const target = current.controller.moveMenu(row)?.targets[0];
            if (target) current.controller.selectMoveTarget(target);
          },
        },
        value?.label
      );
    };
  });
  const markup = await renderToString(createSSRApp(View));
  const server = models.at(-1)!;
  expect(markup).toContain("Move to group");
  expect(markup).toContain("disabled");
  expect(server.controller.moveMenu(row)).toBeUndefined();
  server.controller.selectMoveTarget(menu.targets[0]!);
  expect(onRowMove).not.toHaveBeenCalled();
  const host = document.createElement("div");
  host.innerHTML = markup;
  document.body.append(host);
  const before = host.querySelector("button")!;
  const app = createSSRApp(View);
  app.mount(host);
  stops.push(() => {
    app.unmount();
    host.remove();
  });
  await nextTick();
  await nextTick();
  expect(host.querySelector("button")).toBe(before);
  expect(before.disabled).toBe(true);
  const inactive = models.at(-1)!;
  enabled.value = true;
  await nextTick();
  await nextTick();
  expect(inactive.moveMenu?.(row)).toBeUndefined();
  expect(before.disabled).toBe(false);
  before.click();
  expect(onRowMove).toHaveBeenCalledExactlyOnceWith(menu.targets[0]!.request);
  const current = models.at(-1)!;
  app.unmount();
  expect(current.moveMenu?.(row)).toBeUndefined();
  current.controller.selectMoveTarget(menu.targets[0]!);
  expect(onRowMove).toHaveBeenCalledTimes(1);
  stops.pop();
  host.remove();
});
