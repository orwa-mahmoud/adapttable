import { type ComposedFeature } from "@adapttable/vue";
import {
  GROUP_ROW,
  groupRowSlotKey,
  provideDataTableClassNames,
  slotRender,
  TOOLBAR_EXTRAS,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  shallowRef,
} from "vue";

import { DataTable, type DataTableProps } from "../src";
import { provideClassNames, useClassNames } from "../src/classNamesContext";
import {
  NATIVE_GROUP_ROW,
  nativeGroupRowSlotKey,
} from "../src/nativeHierarchyControlSlots";

const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((run) => run()));
it("retains the native context and lazy grouping identities", () => {
  expect(provideClassNames).toBe(provideDataTableClassNames);
  expect(useClassNames).toBe(useDataTableClassNames);
  expect(NATIVE_GROUP_ROW).toBe(GROUP_ROW);
  expect(nativeGroupRowSlotKey).toBe(groupRowSlotKey);
  expect(nativeGroupRowSlotKey<{ id: string }>()).toBe(GROUP_ROW);
});
it("preserves feature component lifetime, input focus and native parts across pagination and mobile updates", async () => {
  const mounted = vi.fn();
  const unmounted = vi.fn();
  const FeatureControl = defineComponent({
    setup() {
      onMounted(mounted);
      onUnmounted(unmounted);
      const names = useClassNames();
      return () =>
        h("input", {
          "data-testid": "feature-input",
          class: names.value.searchInput,
        });
    },
  });
  const feature: ComposedFeature<{ id: string }> = {
    id: "persistent-control",
    renders: [slotRender(TOOLBAR_EXTRAS, () => h(FeatureControl))],
  };
  const props = shallowRef<DataTableProps<{ id: string }>>({
    data: [{ id: "a" }, { id: "b" }],
    columns: [{ key: "id", sortable: true }],
    rowKey: (row) => row.id,
    features: [feature],
    defaults: { limit: 1 },
    paginationMode: "paged",
    urlSync: false,
    classNames: { searchInput: "initial-search" },
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup: () => () => h(DataTable<{ id: string }>, props.value),
  });
  app.mount(root);
  cleanup.push(() => {
    app.unmount();
    root.remove();
  });
  const input = root.querySelector<HTMLInputElement>(
    '[data-testid="feature-input"]'
  );
  if (!input) throw new Error("Missing feature input");
  input.value = "Keep draft";
  input.focus();
  root
    .querySelector<HTMLButtonElement>('[data-adapttable-part="page-next"]')
    ?.click();
  await nextTick();
  props.value = {
    ...props.value,
    forceMobile: true,
    classNames: { searchInput: "updated-search" },
  };
  await nextTick();
  expect(root.querySelector('[data-testid="feature-input"]')).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(input.value).toBe("Keep draft");
  expect(input.className).toBe("updated-search");
  expect(mounted).toHaveBeenCalledOnce();
  expect(unmounted).not.toHaveBeenCalled();
  expect(
    root.querySelector('[data-adapttable-part="search-field"]')?.tagName
  ).toBe("LABEL");
  expect(
    root.querySelector('[data-adapttable-part="sort-select"]')?.tagName
  ).toBe("SELECT");
  expect(
    root.querySelector('[data-adapttable-part="sort-direction"]')?.tagName
  ).toBe("BUTTON");
  expect(
    root.querySelector('[data-adapttable-part="rows-per-page"]')?.tagName
  ).toBe("SELECT");
  cleanup.pop()?.();
  expect(unmounted).toHaveBeenCalledOnce();
});
