import {
  featureSlotKey,
  featureStateKey,
  slotRender,
} from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  onScopeDispose,
  shallowRef,
  watch,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { composeElementRefs, mergeVueAttrs, toVueAttrs } from "../src/attrs";
import { type ColumnDef, renderCell } from "../src/columnDef";
import type { ComposedFeature } from "../src/features/tableFeature";
import { createFeatureState } from "../src/featureState";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import {
  useDataTableShell,
  type UseDataTableShellResult,
} from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
  score: number;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada", score: 2 },
  { id: "g", name: "Grace", score: 1 },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", sortable: true },
  { key: "score", sortable: true },
];
function slots(marker: string): TableChromeSlots<Row> {
  return {
    SortButton: (props) =>
      h("button", { ...props.attrs, "data-kit": marker }, [props.content]),
    SelectionCheckbox: (props) =>
      h("input", { ...props.attrs, "data-kit": marker }),
  };
}
function mount(
  options: Parameters<typeof useDataTableShell<Row>>[0],
  kit = "one"
) {
  let shell: UseDataTableShellResult<Row> | undefined;
  const element = document.createElement("div");
  document.body.append(element);
  const app = createApp(
    defineComponent({
      setup() {
        shell = useDataTableShell(options);
        return () =>
          shell!.table.isMobile.value
            ? MobileCardsChrome({
                model: shell!.mobile.value,
                slots: slots(kit),
              })
            : DesktopTableChrome({
                model: shell!.desktop.value,
                slots: slots(kit),
              });
      },
    })
  );
  app.mount(element);
  if (!shell) throw new Error("shell not created");
  return {
    shell,
    element,
    unmount: () => {
      app.unmount();
      element.remove();
    },
  };
}
describe("shared Vue shell", () => {
  it.each(["one", "two"])(
    "drives sorting, search, paging, selection and mobile with slot set %s",
    async (kit) => {
      const mobile = shallowRef(false);
      const fixture = mount(
        () => ({
          data,
          columns,
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: mobile,
          selectable: true,
          defaults: { limit: 1 },
          paginationMode: "paged",
          searchDebounceMs: 0,
        }),
        kit
      );
      await nextTick();
      const { shell, element } = fixture;
      expect(element.querySelector("th")?.getAttribute("scope")).toBe("col");
      expect(
        element.querySelector("table")?.getAttribute("aria-rowcount")
      ).toBe("2");
      expect(
        element.querySelector("[data-kit]")?.getAttribute("data-kit")
      ).toBe(kit);
      expect(shell.table.rows.value[0]?.id).toBe("a");
      shell.table.toggleSort("score");
      await nextTick();
      expect(shell.table.rows.value[0]?.id).toBe("g");
      expect(
        element
          .querySelector('th[data-column-key="score"]')
          ?.getAttribute("aria-sort")
      ).toBe("ascending");
      shell.selection.value?.toggleAll();
      await nextTick();
      expect(shell.selection.value?.selectedIds.value.has("g")).toBe(true);
      shell.table.setSearch("Ada");
      await nextTick();
      expect(shell.table.rows.value[0]?.id).toBe("a");
      shell.table.setSearch("");
      shell.table.setPage(2);
      await nextTick();
      expect(shell.table.rows.value[0]?.id).toBe("a");
      mobile.value = true;
      await nextTick();
      expect(
        element.querySelector("article")?.getAttribute("aria-posinset")
      ).toBe("2");
      fixture.unmount();
    }
  );
  it("respects rejected and replaced controlled values with one callback", async () => {
    const selectedIds = shallowRef<readonly string[]>([]);
    const onSelectionChange = vi.fn();
    const fixture = mount(() => ({
      data,
      columns,
      rowKey: (row) => row.id,
      urlSync: false,
      selectedIds,
      onSelectionChange,
    }));
    fixture.shell.selection.value?.toggle("a");
    expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(fixture.shell.selection.value?.selectedIds.value.size).toBe(0);
    selectedIds.value = ["g"];
    await nextTick();
    expect(fixture.element.querySelector("input:checked")).not.toBeNull();
    fixture.unmount();
  });
  it("keeps unchanged feature scopes on new arrays, reordered declarations and slot changes", async () => {
    const mounts: string[] = [];
    const cleanups: string[] = [];
    const a: ComposedFeature<Row> = {
      id: "a",
      mount: () => {
        mounts.push("a");
        onScopeDispose(() => cleanups.push("a"));
      },
    };
    const b: ComposedFeature<Row> = {
      id: "b",
      mount: () => {
        mounts.push("b");
        return () => {
          cleanups.push("b");
        };
      },
    };
    const features = shallowRef<readonly ComposedFeature<Row>[]>([a, b]);
    const fixture = mount(() => ({
      data,
      columns,
      rowKey: (row) => row.id,
      urlSync: false,
      features,
    }));
    features.value = [
      b,
      {
        ...a,
        renders: [
          slotRender(
            featureSlotKey<{ value: string }>("custom"),
            ({ value }) => value
          ),
        ],
      },
    ];
    await nextTick();
    expect(mounts).toEqual(["a", "b"]);
    expect(cleanups).toEqual([]);
    features.value = [a];
    await nextTick();
    expect(cleanups).toEqual(["b"]);
    fixture.unmount();
    expect(cleanups).toEqual(["b", "a"]);
  });
  it("releases old state before replacement and ignores disposed async publication", async () => {
    const KEY = featureStateKey<object>("test");
    let late: (() => void) | undefined;
    const features = shallowRef<readonly ComposedFeature<Row>[]>([
      {
        id: "custom",
        mount: (context) => {
          context.state.set(KEY, { old: true });
          late = () => context.state.set(KEY, { late: true });
        },
      },
    ]);
    const fixture = mount(() => ({
      data,
      columns,
      rowKey: (row) => row.id,
      urlSync: false,
      features,
    }));
    features.value = [
      {
        id: "custom",
        mount: (context) => {
          expect(context.state.get(KEY).value).toBeUndefined();
          context.state.set(KEY, { new: true });
        },
      },
    ];
    await nextTick();
    late?.();
    expect(fixture.shell.state.get(KEY).value).toEqual({ new: true });
    fixture.unmount();
    expect(fixture.shell.state.get(KEY).value).toBeUndefined();
  });
  it("renders SSR requests independently with no feature external activity", async () => {
    const active: boolean[] = [];
    const render = (name: string) =>
      renderToString(
        createSSRApp(
          defineComponent({
            setup() {
              const shell = useDataTableShell({
                data: [{ id: name, name, score: 1 }],
                columns,
                rowKey: (row) => row.id,
                urlSync: false,
                features: [
                  {
                    id: "observe",
                    mount: (context) => {
                      active.push(context.active.value);
                    },
                  },
                ],
              });
              return () =>
                DesktopTableChrome({
                  model: shell.desktop.value,
                  slots: slots("ssr"),
                });
            },
          })
        )
      );
    const [one, two] = await Promise.all([render("ONE"), render("TWO")]);
    expect(one).toContain("ONE");
    expect(one).not.toContain("TWO");
    expect(two).toContain("TWO");
    expect(active).toEqual([false, false]);
  });
});
describe("renderers and complete attrs", () => {
  it("uses explicit renderer before table slot before formatted primitive", () => {
    const context = {
      row: data[0]!,
      rowIndex: 0,
      column: {
        key: "score",
        accessor: (row: Row) => row.score,
        cell: ({ value }: { value: number }) => `own:${value}`,
      },
      value: 2,
    };
    expect(renderCell(context, () => "slot")).toBe("own:2");
    expect(
      renderCell({ ...context, column: { key: "score" } }, () => "slot")
    ).toBe("slot");
    expect(renderCell({ ...context, column: { key: "score" } })).toBe("2");
  });
  it("preserves attributes, properties, numeric styles and exact event names", () => {
    const click = vi.fn();
    const input = vi.fn();
    const key = vi.fn();
    const attrs = toVueAttrs({
      role: "grid",
      scope: "col",
      "aria-sort": "ascending",
      "aria-rowcount": 3,
      "aria-colcount": 2,
      "aria-selected": "true",
      tabindex: 0,
      "data-adapttable-part": "head-cell",
      style: { width: 120, opacity: 0.5 },
      indeterminate: true,
      onChange: input,
      onKeyDown: key,
      onDoubleClick: click,
    });
    const root = document.createElement("div");
    const app = createApp({ render: () => h("input", attrs) });
    app.mount(root);
    const node = root.querySelector("input")!;
    expect(node.indeterminate).toBe(true);
    expect(node.getAttribute("scope")).toBe("col");
    expect(node.getAttribute("role")).toBe("grid");
    expect(node.style.width).toBe("120px");
    node.dispatchEvent(new Event("input"));
    node.dispatchEvent(new KeyboardEvent("keydown"));
    node.dispatchEvent(new MouseEvent("dblclick"));
    expect(input).toHaveBeenCalledOnce();
    expect(key).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    app.unmount();
  });
  it("composes listeners once and releases previous ref target", () => {
    const binding = vi.fn();
    const host = vi.fn();
    const result = mergeVueAttrs({ onClick: binding }, { onClick: host });
    const listeners = result.onClick as (() => void)[];
    listeners.forEach((listener) => listener());
    expect(binding).toHaveBeenCalledOnce();
    expect(host).toHaveBeenCalledOnce();
    const ref = vi.fn();
    const compose = composeElementRefs(ref);
    const one = document.createElement("div");
    const two = document.createElement("div");
    compose(one);
    compose(two);
    compose(null);
    expect(ref.mock.calls.map(([value]) => value)).toEqual([
      one,
      null,
      two,
      null,
    ]);
  });
  it("publishes stable handles and revokes only their owning resource", () => {
    const scope = effectScope();
    const state = createFeatureState();
    const KEY = featureStateKey<object>("same");
    const handle = {};
    const listener = vi.fn();
    scope.run(() => watch(state.get(KEY), listener, { flush: "sync" }));
    const first = state.owner();
    for (let publication = 0; publication < 2; publication++)
      first.set(KEY, handle);
    expect(listener).toHaveBeenCalledTimes(2);
    const second = state.owner();
    second.set(KEY, { newer: true });
    first.dispose();
    expect(state.get(KEY).value).toEqual({ newer: true });
    second.dispose();
    expect(state.get(KEY).value).toBeUndefined();
    scope.stop();
  });
});
