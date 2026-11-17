import { createMemoryAdapter } from "@adapttable/core";
import { createTableStore } from "@adapttable/core/binding";
import { expect, it } from "vitest";
import { createApp, defineComponent, h, provide } from "vue";

import { useHierarchyIds } from "./hierarchy/idState";
import { TABLE_STORE } from "./tableStore";
import { useTableUrlState } from "./url/useTableUrlState";

it("keeps a table's view state and id state in the store it provides", () => {
  const store = createTableStore();
  let ids: ReturnType<typeof useHierarchyIds> | undefined;
  let url: ReturnType<typeof useTableUrlState> | undefined;
  const child = defineComponent({
    setup() {
      ids = useHierarchyIds({});
      url = useTableUrlState({ urlAdapter: createMemoryAdapter() });
      return () => h("span");
    },
  });
  const app = createApp(
    defineComponent({
      setup() {
        provide(TABLE_STORE, store);
        return () => h(child);
      },
    })
  );
  app.mount(document.createElement("div"));
  try {
    const heard: string[] = [];
    ids!.store.subscribe(() => heard.push("ids"));
    const stop = url!.state;
    // Inside the table's batch nothing is published; both land when it ends,
    // which only happens when they share the store.
    store.batch(() => {
      ids!.store.commit(new Set(["a"]));
      url!.setSort("name", "asc");
      expect(heard).toEqual([]);
      expect(stop.value.sortBy).toBeUndefined();
    });
    expect(heard).toEqual(["ids"]);
    expect(url!.state.value.sortBy).toBe("name");
  } finally {
    app.unmount();
  }
});

it("gives a composable outside a table a store of its own", () => {
  let ids: ReturnType<typeof useHierarchyIds> | undefined;
  const app = createApp(
    defineComponent({
      setup() {
        ids = useHierarchyIds({});
        return () => h("span");
      },
    })
  );
  app.mount(document.createElement("div"));
  try {
    ids!.store.commit(new Set(["b"]));
    expect([...ids!.ids.value]).toEqual(["b"]);
  } finally {
    app.unmount();
  }
});
