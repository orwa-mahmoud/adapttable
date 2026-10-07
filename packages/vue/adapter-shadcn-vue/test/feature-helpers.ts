import type { ColumnDef, ComposedFeature } from "@adapttable/vue";
import { afterEach } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";

export interface Row {
  id: string;
  name: string;
  amount: number;
  active: boolean;
  tags: string[];
  team: string;
  parent?: string;
}
export const original: Row = {
  id: "a",
  name: "Ada",
  amount: 2,
  active: true,
  tags: ["a"],
  team: "Core",
};
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", header: "Name", editable: true },
  { key: "amount", header: "Amount", editable: true, editor: "number" },
];
const disposers: (() => void)[] = [];
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()));
export function mountFeatures(
  features: readonly ComposedFeature<Row>[],
  options: Partial<DataTableProps<Row>> = {},
  events: Record<string, unknown> = {}
) {
  const rows = shallowRef<readonly Row[]>(options.data ?? [original]);
  const props = shallowRef<DataTableProps<Row>>({
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    forceMobile: false,
    searchable: false,
    ...options,
    features,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(DataTable<Row>, { ...props.value, data: rows.value, ...events }),
    })
  );
  app.mount(root);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    app.unmount();
    root.remove();
  };
  disposers.push(stop);
  return { root, rows, props, stop };
}
export function find<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
export const part = (name: string) => `[data-adapttable-part="${name}"]`;
export async function tick() {
  await nextTick();
  await nextTick();
}
export function key(element: Element, key: string) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}
export async function activate(root: ParentNode, index = 0) {
  const button = root.querySelectorAll<HTMLButtonElement>(
    part("edit-cell-activate")
  )[index];
  if (!button) throw new Error("Missing editor activation button");
  button.focus();
  key(button, "F2");
  await tick();
  return find<HTMLElement>(root, part("edit-cell-editor"));
}
export async function write(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
export function deferred() {
  let resolve: (() => void) | undefined;
  let reject: ((reason: Error) => void) | undefined;
  const promise = new Promise<void>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return {
    promise,
    resolve: () => resolve?.(),
    reject: (reason: Error) => reject?.(reason),
  };
}
