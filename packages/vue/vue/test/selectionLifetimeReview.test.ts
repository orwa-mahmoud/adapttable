import { expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  reactive,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { type RowSelection, useRowSelection } from "../src/selection/selection";

it("retires all SelectionState actions on reordered rows but keeps off-page IDs", () => {
  const scope = effectScope();
  const a = { id: "a" };
  const b = { id: "b" };
  const rows = shallowRef([a, b]);
  const changes = vi.fn();
  const selection = scope.run(() =>
    useRowSelection({
      rows,
      rowKey: (r) => r.id,
      defaultSelectedIds: ["off-page"],
      acrossPages: true,
      onSelectionChange: changes,
    })
  )!;
  const retained = selection.state.value;
  rows.value = [b, a];
  retained.toggle("a");
  retained.toggleAll();
  retained.clear();
  retained.replace(["x"]);
  retained.toggleGroupLeaves(["a"]);
  retained.selectAllMatching();
  expect(changes).not.toHaveBeenCalled();
  expect(selection.allMatching.value).toBe(false);
  expect([...selection.selectedIds.value]).toEqual(["off-page"]);
  selection.state.value.toggleAll();
  expect([...selection.selectedIds.value]).toEqual(["off-page", "b", "a"]);
  scope.stop();
});

it("handles reactive in-place ID change and preserves non-key field changes", () => {
  const scope = effectScope();
  const row = reactive({ id: "a", name: "A" });
  const selection = scope.run(() =>
    useRowSelection({ rows: [row], rowKey: (r) => r.id })
  )!;
  const retained = selection.rowCheckboxAttrs("a");
  row.name = "new name";
  retained.onChange();
  expect([...selection.selectedIds.value]).toEqual(["a"]);
  row.id = "b";
  retained.onChange();
  expect([...selection.selectedIds.value]).toEqual(["a"]);
  selection.rowCheckboxAttrs("b").onChange();
  expect([...selection.selectedIds.value]).toEqual(["a", "b"]);
  scope.stop();
});

it("prevents disabled state actions from reviving, but admits new controls and downgrades acrossPages", () => {
  const scope = effectScope();
  const enabled = shallowRef(false);
  const acrossPages = shallowRef(true);
  const selection = scope.run(() =>
    useRowSelection({
      enabled,
      rows: [{ id: "a" }],
      rowKey: (r) => r.id,
      acrossPages,
    })
  )!;
  const disabled = selection.state.value;
  expect(selection.rowCheckboxAttrs("a").disabled).toBe(true);
  enabled.value = true;
  disabled.toggle("a");
  disabled.selectAllMatching();
  expect(selection.selectedCount.value).toBe(0);
  expect(selection.allMatching.value).toBe(false);
  const first = selection.state.value;
  first.toggle("a");
  first.selectAllMatching();
  expect(selection.allMatching.value).toBe(true);
  enabled.value = false;
  selection.clear();
  selection.replace([]);
  selection.toggleAll();
  selection.toggleGroupLeaves(["a"]);
  selection.selectAllMatching();
  expect([...selection.selectedIds.value]).toEqual(["a"]);
  acrossPages.value = false;
  expect(selection.allMatching.value).toBe(false);
  enabled.value = true;
  first.clear();
  expect(selection.selectedCount.value).toBe(1);
  selection.state.value.clear();
  expect(selection.selectedCount.value).toBe(0);
  scope.stop();
});

it("keeps callbacks retained across KeepAlive retired after activation and disposal", async () => {
  const shown = shallowRef(true);
  let selection: RowSelection | undefined;
  const Child = defineComponent({
    setup() {
      selection = useRowSelection({ rows: [{ id: "a" }], rowKey: (r) => r.id });
      return () => h("div");
    },
  });
  const app = createApp({
    render: () =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Child) : null) }),
  });
  const host = document.createElement("div");
  app.mount(host);
  await nextTick();
  const old = selection!.state.value;
  old.toggle("a");
  shown.value = false;
  await nextTick();
  old.clear();
  expect(selection!.selectedCount.value).toBe(1);
  shown.value = true;
  await nextTick();
  old.clear();
  expect(selection!.selectedCount.value).toBe(1);
  const current = selection!.state.value;
  current.clear();
  expect(selection!.selectedCount.value).toBe(0);
  app.unmount();
  current.toggle("a");
  selection!.toggle("a");
  expect(selection!.selectedCount.value).toBe(0);
});

it("does not activate selection mutation on SSR", async () => {
  const changes = vi.fn();
  const App = defineComponent({
    setup() {
      const selection = useRowSelection({
        rows: [{ id: "a" }],
        rowKey: (r) => r.id,
        onSelectionChange: changes,
      });
      selection.toggle("a");
      selection.state.value.toggleAll();
      return () => h("input", selection.rowCheckboxAttrs("a"));
    },
  });
  const html = await renderToString(h(App));
  expect(changes).not.toHaveBeenCalled();
  expect(html).toContain("input");
});

it("retires a suspended owner's callback when enablement changes before resuming", async () => {
  const shown = shallowRef(true);
  const enabled = shallowRef(true);
  let selection: RowSelection | undefined;
  const Child = defineComponent({
    setup() {
      selection = useRowSelection({
        enabled,
        rows: [{ id: "a" }],
        rowKey: (r) => r.id,
      });
      return () => h("div");
    },
  });
  const app = createApp({
    render: () =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Child) : null) }),
  });
  const host = document.createElement("div");
  app.mount(host);
  await nextTick();
  try {
    shown.value = false;
    await nextTick();
    const suspended = selection!.rowCheckboxAttrs("a");
    const suspendedState = selection!.state.value;
    enabled.value = false;
    enabled.value = true;
    shown.value = true;
    await nextTick();
    suspended.onChange();
    expect(selection!.selectedCount.value).toBe(0);
    suspendedState.toggle("a");
    expect(selection!.selectedCount.value).toBe(0);
    selection!.rowCheckboxAttrs("a").onChange();
    expect(selection!.selectedCount.value).toBe(1);
  } finally {
    app.unmount();
  }
});

it("does not expose ownership IDs through the mutable SelectionState array", () => {
  const scope = effectScope();
  try {
    const selection = scope.run(() =>
      useRowSelection({ rows: [{ id: "a" }], rowKey: (r) => r.id })
    )!;
    selection.state.value.visibleIds.push("bad");
    selection.headerCheckboxAttrs().onChange();
    expect([...selection.selectedIds.value]).toEqual(["a"]);
  } finally {
    scope.stop();
  }
});
