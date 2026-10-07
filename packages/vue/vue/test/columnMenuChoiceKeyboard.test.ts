import { resolveLabels } from "@adapttable/core";
import { expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { useColumnLayout } from "../src/columns/columnLayout";
import {
  ColumnMenuChrome,
  type ColumnMenuSlots,
} from "../src/columns/columnMenuChrome";
import type { ColumnMenuSlotProps } from "../src/columns/columnMenuContracts";
import { useColumnMenu } from "../src/columns/useColumnMenu";
import { managedOverlayPanel } from "../src/overlayPanel";
interface Row {
  name: string;
}
function element<T extends HTMLElement>(root: ParentNode, part: string): T {
  const target = root.querySelector<T>(`[data-adapttable-part="${part}"]`);
  if (!target) throw new Error(`Missing ${part}`);
  return target;
}
function keyboard(value: unknown): value is (event: KeyboardEvent) => void {
  return typeof value === "function";
}
it("exposes the same guarded submenu Escape handler on each choice without closing the panel", async () => {
  const value = shallowRef("sum");
  const choices: Parameters<ColumnMenuSlots["Choice"]>[0][] = [];
  const featureHost: NonNullable<ColumnMenuSlotProps<Row>["featureHost"]> = {
    filterTypes: [],
    filterExtends: [],
    editors: new Map(),
    aggregators: new Map(),
    writers: [],
    panels: [],
    commands: [],
    contextMenuItems: [],
    columnMenuActions: [
      () => ({
        kind: "choice",
        id: "aggregate",
        label: "Aggregate",
        value: value.value,
        disabled: false,
        options: [
          { value: "sum", label: "Sum" },
          { value: "avg", label: "Average" },
        ],
        onChange: (next) => {
          value.value = next;
        },
      }),
    ],
  };
  const slots: ColumnMenuSlots = {
    Trigger: ({ attrs, label }) => h("button", attrs, label),
    Button: ({ attrs, label }) => h("button", attrs, label),
    Input: ({ attrs, value }) => h("input", { ...attrs, value }),
    Choice: (control) => {
      choices.push(control);
      return h(
        "select",
        { ...control.attrs, value: control.value },
        control.options.map((option) =>
          h("option", { value: option.value }, option.label)
        )
      );
    },
    Panel: managedOverlayPanel((control) =>
      h("div", control.attrs, [control.content])
    ),
  };
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup() {
        const columns = [{ key: "name", header: "Name" }];
        const layout = useColumnLayout<Row>(columns, () => ({}));
        const model = useColumnMenu(() => ({
          allColumns: columns,
          layout: layout.value,
          labels: resolveLabels(undefined),
          onAutoSize: () => undefined,
          featureHost,
        }));
        return () => h(ColumnMenuChrome, { model, slots });
      },
    })
  );
  try {
    app.mount(root);
    await nextTick();
    const trigger = element<HTMLButtonElement>(root, "column-menu-button");
    trigger.click();
    await nextTick();
    const more = element<HTMLButtonElement>(root, "column-menu-more");
    more.click();
    await nextTick();
    const first = choices.at(-1)?.attrs.onKeydown;
    if (!keyboard(first))
      throw new Error("Choice is missing its owner-level Escape handler");
    value.value = "avg";
    await nextTick();
    expect(choices.at(-1)?.attrs.onKeydown).toBe(first);
    element<HTMLSelectElement>(root, "column-menu-choice-select").focus();
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    first(event);
    await nextTick();
    expect(event.defaultPrevented).toBe(true);
    expect(
      root.querySelector('[data-adapttable-part="column-menu-submenu"]')
    ).toBeNull();
    expect(document.activeElement).toBe(more);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(element(root, "column-menu-panel")).toBeDefined();
    const repeated = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    first(repeated);
    expect(repeated.defaultPrevented).toBe(false);
  } finally {
    app.unmount();
    root.remove();
  }
});
