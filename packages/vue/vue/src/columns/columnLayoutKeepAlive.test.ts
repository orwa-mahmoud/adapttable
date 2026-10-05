import {
  type ColumnLayoutState,
  createMemoryAdapter,
  EMPTY_COLUMN_LAYOUT,
} from "@adapttable/core";
import { expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { useColumnLayoutUrlState } from "../url/useColumnLayoutUrlState";

it("flushes the last active layout before KeepAlive suspension and ignores retained inactive actions", async () => {
  const adapter = createMemoryAdapter("other.q=kept");
  const subscribe = vi.spyOn(adapter, "subscribe");
  const visible = shallowRef(true);
  let state: ReturnType<typeof useColumnLayoutUrlState> | undefined;
  const next: ColumnLayoutState = { ...EMPTY_COLUMN_LAYOUT, hidden: ["email"] };
  const component = defineComponent({
    setup() {
      state = useColumnLayoutUrlState({ urlAdapter: adapter, urlKey: "one" });
      const owned = state;
      return () => h("span", owned.layout.value.hidden.join(","));
    },
  });
  const root = document.createElement("div");
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(KeepAlive, null, {
          default: () => (visible.value ? h(component) : h("div")),
        }),
    })
  );
  app.mount(root);
  try {
    expect(subscribe).toHaveBeenCalledTimes(1);
    state?.onLayoutChange(next);
    visible.value = false;
    await nextTick();
    expect(adapter.getSearch()).toContain("one.colHide=email");
    state?.onLayoutChange(EMPTY_COLUMN_LAYOUT);
    expect(adapter.getSearch()).toContain("one.colHide=email");
    adapter.setSearch("one.colHide=team&other.q=kept");
    visible.value = true;
    await nextTick();
    expect(root.textContent).toBe("team");
    expect(subscribe).toHaveBeenCalledTimes(2);
    state?.onLayoutChange(next);
  } finally {
    app.unmount();
  }
  expect(adapter.getSearch()).toContain("one.colHide=email");
  state?.onLayoutChange(EMPTY_COLUMN_LAYOUT);
  state?.flush();
  expect(adapter.getSearch()).toContain("one.colHide=email");
});
