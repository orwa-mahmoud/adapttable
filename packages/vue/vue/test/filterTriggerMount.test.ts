import {
  ACTIVE_FILTER_CHIPS,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/binding";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { resolveLabels, useElementRef } from "../src/adapter";
import {
  type ComposedFeature,
  extendFeature,
} from "../src/features/tableFeature";
import { filters, filterViewKey } from "../src/filters";
import { useHeaderFilter } from "../src/filters/headerFilterChrome";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  name: string;
}
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture");
  return value;
}
function fixture() {
  const scope = effectScope();
  stops.push(() => scope.stop());
  const feature = () =>
    extendFeature(filters<Row>([{ key: "name", type: "text" }]), [
      slotRender(TOOLBAR_EXTRAS, () => null),
      slotRender(ACTIVE_FILTER_CHIPS, () => null),
    ]);
  const features = shallowRef<readonly ComposedFeature<Row>[]>([feature()]);
  const shell = required(
    scope.run(() =>
      useDataTableShell({
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        features,
      })
    )
  );
  return { scope, shell, features, feature };
}
const RefControl = defineComponent(
  (props: { owner: (element: HTMLElement | null) => void }) => {
    const element = shallowRef<HTMLElement | null>(null);
    useElementRef(
      () => element.value,
      () => props.owner
    );
    return () => h("button", { ref: element }, "Open");
  },
  { props: ["owner"] }
);
function mountedModel(kind: string) {
  const visible = shallowRef(true);
  const attached = shallowRef(true);
  let anchor: () => HTMLElement | null = () => null;
  let callback = vi.fn<(element: HTMLElement | null) => void>();
  const Host = defineComponent({
    setup() {
      const { shell } = fixture();
      const header = useHeaderFilter({
        id: "mounted-header",
        def: { key: "name", type: "text" },
        source: shell.source.value,
        labels: resolveLabels({}),
      });
      const model = () =>
        kind === "filter"
          ? shell.state.get(filterViewKey<Row>()).value
          : header.value;
      anchor = () => model()?.anchor ?? null;
      const owner = required(model()).trigger.triggerRef;
      callback = vi.fn(owner);
      return () => (attached.value ? h(RefControl, { owner: callback }) : null);
    },
  });
  const renderHost = () => (visible.value ? h(Host) : h("p", "Hidden"));
  const App = defineComponent({
    setup: () => () => h(KeepAlive, null, { default: renderHost }),
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(App);
  app.mount(host);
  let mounted = true;
  const stop = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    host.remove();
  };
  stops.push(stop);
  return { host, visible, attached, callback, anchor: () => anchor(), stop };
}
it.each(["filter", "header"])(
  "retains a %s trigger through mount and activity changes without repeated registration",
  async (kind) => {
    const view = mountedModel(kind);
    await nextTick();
    const button = view.host.querySelector("button");
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(view.anchor()).toBe(button);
    expect(view.callback.mock.calls).toEqual([[button]]);
    view.visible.value = false;
    await nextTick();
    expect(view.anchor()).toBeNull();
    expect(view.callback.mock.calls).toEqual([[button]]);
    view.visible.value = true;
    await nextTick();
    expect(view.anchor()).toBe(button);
    expect(view.callback.mock.calls).toEqual([[button]]);
    view.visible.value = false;
    await nextTick();
    view.attached.value = false;
    await nextTick();
    expect(view.callback.mock.calls).toEqual([[button], [null]]);
    expect(view.anchor()).toBeNull();
    view.visible.value = true;
    await nextTick();
    expect(view.anchor()).toBeNull();
    expect(view.host.querySelector("button")).toBeNull();
    view.attached.value = true;
    await nextTick();
    const replacement = view.host.querySelector("button");
    expect(replacement).toBeInstanceOf(HTMLButtonElement);
    expect(replacement).not.toBe(button);
    expect(view.anchor()).toBe(replacement);
    expect(view.callback.mock.calls).toEqual([[button], [null], [replacement]]);
    view.stop();
    expect(view.callback.mock.calls).toEqual([
      [button],
      [null],
      [replacement],
      [null],
    ]);
    view.callback(button);
    view.callback(null);
    expect(view.anchor()).toBeNull();
  }
);
