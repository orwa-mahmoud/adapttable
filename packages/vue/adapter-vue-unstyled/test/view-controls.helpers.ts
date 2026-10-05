import type {
  LayoutStorage,
  SavedView,
  UrlStateAdapter,
} from "@adapttable/vue/adapter";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

import { DataTable, type DataTableProps } from "../src";

export interface ViewRow {
  readonly id: string;
  readonly name: string;
}
export const viewRows: readonly ViewRow[] = [
  { id: "a", name: "Ada" },
  { id: "g", name: "Grace" },
];
export const viewDefaults: DataTableProps<ViewRow> = {
  data: viewRows,
  columns: [{ key: "name", sortable: true }],
  rowKey: (row) => row.id,
  urlSync: false,
  searchDebounceMs: 0,
};
export function findControl<T extends Element>(
  root: ParentNode,
  selector: string
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}
export const part = (name: string): string =>
  `[data-adapttable-part="${name}"]`;
export function mountViews(
  overrides: Partial<DataTableProps<ViewRow>> = {},
  events: Record<string, unknown> = {}
) {
  const props = shallowRef<DataTableProps<ViewRow>>({
    ...viewDefaults,
    ...overrides,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup: () => () => h(DataTable<ViewRow>, { ...props.value, ...events }),
    })
  );
  app.mount(root);
  return {
    root,
    props,
    stop: () => {
      app.unmount();
      root.remove();
    },
  };
}
export function mountControl(render: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(root);
  return {
    root,
    stop: () => {
      app.unmount();
      root.remove();
    },
  };
}
export async function clickControl(root: ParentNode, selector: string) {
  findControl<HTMLElement>(root, selector).click();
  await nextTick();
}
export async function setText(
  root: ParentNode,
  selector: string,
  value: string
) {
  const input = findControl<HTMLInputElement>(root, selector);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}
export async function selectDensity(
  root: ParentNode,
  value: "compact" | "comfortable"
) {
  const select = findControl<HTMLSelectElement>(root, part("density-toggle"));
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await nextTick();
}
export async function keyControl(
  element: EventTarget,
  key: string,
  composing = false
) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      isComposing: composing,
    })
  );
  await nextTick();
}
export function viewStorage(initial: readonly SavedView[] = []): LayoutStorage {
  const values = new Map([["views", JSON.stringify(initial)]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}
export function testUrlAdapter(seed = ""): UrlStateAdapter {
  let search = seed;
  const listeners = new Set<() => void>();
  return {
    getSearch: () => search,
    setSearch: (next) => {
      search = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
