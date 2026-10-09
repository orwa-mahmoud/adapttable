import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createCommentVNode,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

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

it.each([false, true])(
  "keeps compound select labels valid through SSR and hydration (mobile=%s)",
  async (forceMobile) => {
    const props = shallowRef<DataTableProps<Row>>({
      ...options,
      forceMobile,
      columns: [{ key: "name", sortable: true }],
    });
    const slots: DataTableSurfaceSlots<Row> = {
      ...paint(),
      Select: ({ attrs, label, value, options: choices, onChange }) =>
        h("label", { "data-kit-select": true }, [
          h("span", label),
          h(
            "select",
            {
              ...attrs,
              value,
              onChange: (event: Event) => {
                if (event.target instanceof HTMLSelectElement)
                  onChange(event.target.value);
              },
            },
            choices.map((choice) =>
              h("option", { value: choice.value }, choice.label)
            )
          ),
        ]),
    };
    const Table = defineComponent({
      setup() {
        const model = useDataTableShell(() => props.value);
        return () =>
          h(DataTableSurfaceChrome<Row>, {
            model,
            options: props.value,
            slots,
            content: {},
            rootRef: () => undefined,
            scrollRef: () => undefined,
          });
      },
    });
    const root = document.createElement("div");
    root.innerHTML = await renderToString(createSSRApp(Table));
    document.body.append(root);
    const selects = [...root.querySelectorAll("select")];
    expect(selects).toHaveLength(forceMobile ? 2 : 1);
    expect(root.querySelector("label label")).toBeNull();
    for (const select of selects) {
      expect(select.labels).toHaveLength(1);
      expect(select.getAttribute("aria-label")).toBeTruthy();
    }
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    const app = createSSRApp(Table);
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
      warn.mockRestore();
      error.mockRestore();
    });
    await nextTick();
    expect([...root.querySelectorAll("select")]).toEqual(selects);
    selects[0]?.focus();
    props.value = { ...props.value, classNames: { root: "updated" } };
    await nextTick();
    expect(document.activeElement).toBe(selects[0]);
    expect([...root.querySelectorAll("select")]).toEqual(selects);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  }
);

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

describe("paged footer", () => {
  it("moves between pages and page sizes through the kit's buttons and select", async () => {
    const data = Array.from({ length: 12 }, (_, index) => ({
      id: String(index),
      name: `Person ${index}`,
    }));
    const props: DataTableProps<Row> = {
      ...options,
      data,
      forceMobile: false,
    };
    const slots: DataTableSurfaceSlots<Row> = {
      ...paint(),
      Button: ({ attrs, content }) => h("button", attrs, [content]),
      Select: ({ attrs, value, options: choices, onChange }) =>
        h(
          "select",
          {
            ...attrs,
            value,
            onChange: (event: Event) => {
              if (event.target instanceof HTMLSelectElement)
                onChange(event.target.value);
            },
          },
          choices.map((choice) =>
            h("option", { value: choice.value }, choice.label)
          )
        ),
    };
    const Table = defineComponent({
      setup() {
        const model = useDataTableShell(() => props);
        return () =>
          h(DataTableSurfaceChrome<Row>, {
            model,
            options: props,
            slots,
            content: {},
            rootRef: () => undefined,
            scrollRef: () => undefined,
          });
      },
    });
    const root = document.createElement("div");
    document.body.append(root);
    const app = createApp(Table);
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
    });
    await nextTick();
    const part = (name: string) =>
      root.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
    const current = () =>
      root.querySelector('[data-adapttable-part="page-number"][aria-current]')
        ?.textContent;
    expect(current()).toBe("1");
    expect(part("page-prev")?.hasAttribute("disabled")).toBe(true);
    expect(part("page-ellipsis")?.textContent).toBe("…");
    part("page-next")?.click();
    await nextTick();
    expect(current()).toBe("2");
    part("page-prev")?.click();
    await nextTick();
    expect(current()).toBe("1");
    const last = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="page-number"]'
      ),
    ].at(-1);
    last?.click();
    await nextTick();
    expect(current()).toBe("12");
    expect(part("page-next")?.hasAttribute("disabled")).toBe(true);
    const size = root.querySelector<HTMLSelectElement>(
      'select[data-adapttable-part="rows-per-page"]'
    );
    if (!size) throw new Error("Missing rows-per-page select");
    const larger = [...size.options]
      .map((option) => Number(option.value))
      .find((value) => value > 1 && value < data.length);
    if (larger === undefined) throw new Error("Missing a larger page size");
    size.value = String(larger);
    size.dispatchEvent(new Event("change"));
    await nextTick();
    expect(
      root.querySelectorAll('[data-adapttable-part="page-number"]')
    ).toHaveLength(Math.ceil(data.length / larger));
  });
});
