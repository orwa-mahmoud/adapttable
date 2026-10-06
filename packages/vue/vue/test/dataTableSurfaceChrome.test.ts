import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createCommentVNode,
  defineComponent,
  effectScope,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  shallowRef,
} from "vue";

import {
  DataTableSurfaceChrome,
  type DataTableSurfaceSlots,
} from "../src/layout/dataTableSurfaceChrome";
import { useFrontendData } from "../src/source/useFrontendData";
import type { DataTableProps } from "../src/tableAdapterContracts";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  name: string;
}
const options: DataTableProps<Row> = {
  data: [
    { id: "a", name: "Ada" },
    { id: "b", name: "Bea" },
  ],
  columns: [{ key: "name" }],
  rowKey: (row) => row.id,
  defaults: { limit: 1 },
  paginationMode: "paged",
  urlSync: false,
};
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((run) => run()));
function paint(): DataTableSurfaceSlots<Row> {
  return {
    Search: ({ attrs, label }) => h("kit-search", attrs, label),
    Select: ({ attrs, value }) => h("kit-select", attrs, value),
    Button: ({ attrs, content }) => h("kit-button", attrs, [content]),
    Loading: () => h("kit-loading"),
    Desktop: () => h("kit-desktop-body"),
    Mobile: () => h("kit-mobile-body"),
  };
}
describe("required table surface paint", () => {
  it.each([
    "Search",
    "Select",
    "Button",
    "Loading",
    "Desktop",
    "Mobile",
  ] as const)("fails explicitly when %s is absent", (name) => {
    const scope = effectScope();
    cleanup.push(() => scope.stop());
    const model = scope.run(() => useDataTableShell(options));
    if (!model) throw new Error("Missing shell");
    const slots = paint();
    Reflect.deleteProperty(slots, name);
    expect(() =>
      DataTableSurfaceChrome(
        {
          model,
          options: { searchable: false },
          slots,
          content: {},
          rootRef: () => undefined,
          scrollRef: () => undefined,
        },
        { attrs: {} }
      )
    ).toThrow(`DataTableSurfaceChrome requires the ${name} slot`);
  });

  it("keeps real refs and stateful content alive across updates and uses only supplied paint", async () => {
    const props = shallowRef(options);
    const rootRef = vi.fn<(element: HTMLElement | null) => void>();
    const scrollRef = vi.fn<(element: HTMLElement | null) => void>();
    const mounts = vi.fn();
    const unmounts = vi.fn();
    const Toolbar = defineComponent({
      setup() {
        onMounted(mounts);
        onUnmounted(unmounts);
        return () => h("kit-toolbar", "Keep me");
      },
    });
    const root = document.createElement("div");
    const click = vi.fn();
    const app = createApp({
      setup() {
        const model = useDataTableShell(() => props.value);
        return () =>
          h(DataTableSurfaceChrome<Row>, {
            model,
            options: props.value,
            slots: paint(),
            content: { toolbar: () => h(Toolbar) },
            rootRef,
            scrollRef,
            id: "host-root",
            class: "host-class",
            onClick: click,
          });
      },
    });
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
    });
    const surface = root.querySelector<HTMLElement>(
      '[data-adapttable-part="root"]'
    );
    const scroll = root.querySelector('[data-adapttable-part="scroll-box"]');
    expect(rootRef).toHaveBeenLastCalledWith(surface);
    expect(scrollRef).toHaveBeenLastCalledWith(scroll);
    expect(surface?.id).toBe("host-root");
    expect(surface?.className).toBe("host-class");
    surface?.click();
    expect(click).toHaveBeenCalledOnce();
    expect(root.querySelector("button, input, select")).toBeNull();
    expect(root.querySelector("kit-search")).not.toBeNull();
    expect(root.querySelector("kit-desktop-body")).not.toBeNull();
    expect(root.querySelector("table, tbody, tr, td")).toBeNull();
    expect(root.querySelector("kit-select")).not.toBeNull();
    expect(root.querySelector("kit-button")).not.toBeNull();
    const toolbar = root.querySelector("kit-toolbar");
    props.value = {
      ...props.value,
      forceMobile: true,
      classNames: { root: "kit-root" },
    };
    await nextTick();
    expect(root.querySelector("kit-toolbar")).toBe(toolbar);
    expect(root.querySelector("kit-desktop-body")).toBeNull();
    expect(root.querySelector("kit-mobile-body")).not.toBeNull();
    expect(mounts).toHaveBeenCalledOnce();
    expect(unmounts).not.toHaveBeenCalled();
    expect(surface?.className).toBe("host-class kit-root");
    cleanup.pop()?.();
    expect(rootRef).toHaveBeenLastCalledWith(null);
    expect(scrollRef).toHaveBeenLastCalledWith(null);
    expect(unmounts).toHaveBeenCalledOnce();
  });

  it("uses Vue slot fallbacks for empty content and accepts scalar or VNode content", async () => {
    const props = shallowRef<DataTableProps<Row>>({
      ...options,
      data: [],
      isLoading: true,
    });
    const custom = shallowRef(false);
    const root = document.createElement("div");
    const app = createApp({
      setup() {
        const model = useDataTableShell(() => props.value);
        return () =>
          h(DataTableSurfaceChrome<Row>, {
            model,
            options: props.value,
            slots: paint(),
            content: {
              loading: () =>
                custom.value
                  ? h("kit-custom-loading", "Loading override")
                  : createCommentVNode(),
              empty: () => (custom.value ? "Empty override" : []),
            },
            rootRef: () => undefined,
            scrollRef: () => undefined,
          });
      },
    });
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
    });
    expect(root.querySelector("kit-loading")).not.toBeNull();
    custom.value = true;
    await nextTick();
    expect(root.querySelector("kit-loading")).toBeNull();
    expect(root.querySelector("kit-custom-loading")).not.toBeNull();
    props.value = { ...props.value, isLoading: false };
    await nextTick();
    expect(root.querySelector("output")?.textContent).toBe("Empty override");
    custom.value = false;
    await nextTick();
    expect(root.querySelector("output")?.textContent).toBe("No data");
  });
});

const ModelSearch = defineComponent({
  inheritAttrs: false,
  props: { modelValue: { type: String, required: true } },
  emits: { "update:modelValue": (_value: string) => true },
  setup(props, { attrs, emit }) {
    return () =>
      h("input", {
        ...attrs,
        value: props.modelValue,
        onInput: (event: Event) => {
          if (event.target instanceof HTMLInputElement)
            emit("update:modelValue", event.target.value);
        },
      });
  },
});

it.each([
  ["native", true],
  ["native", false],
  ["model", true],
  ["model", false],
] as const)(
  "requests %s search exactly once (accepted=%s) and preserves its draft on unrelated renders",
  async (kind, accepted) => {
    const appearance = shallowRef("initial-search");
    let model: ReturnType<typeof useDataTableShell<Row>> | undefined;
    let request: ReturnType<typeof vi.fn<(value: string) => void>> | undefined;
    const callbacks: ((value: string) => void)[] = [];
    const root = document.createElement("div");
    document.body.append(root);
    const app = createApp({
      setup() {
        const base = useFrontendData<Row>({
          data: [
            { id: "a", name: "Ada" },
            { id: "b", name: "Bea" },
          ],
          columns: [{ key: "name" }],
          getRowId: (row) => row.id,
          getSearchText: (row) => row.name,
          defaults: { limit: 2 },
          urlSync: false,
        });
        request = vi.fn((value: string) => {
          if (accepted) base.value.setSearch(value);
        });
        const setSearch = request;
        const shell = useDataTableShell<Row>(() => ({
          ...options,
          source: { ...base.value, setSearch },
          searchDebounceMs: 0,
        }));
        model = shell;
        const controls: DataTableSurfaceSlots<Row> = {
          ...paint(),
          Search: ({ attrs, value, onChange }) => {
            callbacks.push(onChange);
            if (kind === "native") return h("input", attrs);
            const { onInput: nativeInput, ...forwarded } = attrs;
            expect(nativeInput).toBeTypeOf("function");
            return h(ModelSearch, {
              ...forwarded,
              modelValue: value,
              "onUpdate:modelValue": onChange,
            });
          },
        };
        return () =>
          h(DataTableSurfaceChrome<Row>, {
            model: shell,
            options: { classNames: { searchInput: appearance.value } },
            slots: controls,
            content: {},
            rootRef: () => undefined,
            scrollRef: () => undefined,
          });
      },
    });
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
    });
    const input = root.querySelector<HTMLInputElement>("input");
    if (!input || !model || !request) throw new Error("Missing search fixture");
    input.focus();
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(request).toHaveBeenCalledExactlyOnceWith("Ada");
    expect(model.source.value.search).toBe(accepted ? "Ada" : "");
    expect(model.table.rows.value.map((row) => row.name)).toEqual(
      accepted ? ["Ada"] : ["Ada", "Bea"]
    );
    expect(model.table.searchValue.value).toBe("Ada");
    expect(input.value).toBe("Ada");
    appearance.value = "updated-search";
    await nextTick();
    expect(root.querySelector("input")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.className).toBe("updated-search");
    expect(input.value).toBe("Ada");
    expect(request).toHaveBeenCalledOnce();
    const onChange = model.table.setSearchValue;
    expect(callbacks.every((callback) => callback === onChange)).toBe(true);
  }
);
