import type { TableSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import type {
  FilterDef,
  FilterFormSource,
  FilterOption,
} from "@adapttable/vue/filters";
import { describe, expect, it, vi } from "vitest";
import { computed, createSSRApp, defineComponent, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { provideClassNames } from "../src/classNamesContext";
import { filters } from "../src/filters";
import { NativeFilterField } from "../src/filters/NativeFilterField";
import { NativeFilterSurface } from "../src/filters/NativeFilterSurface";
import { NativeFilterTree } from "../src/filters/NativeFilterTree";
import { NativeHeaderFilter } from "../src/filters/NativeHeaderFilter";
import { headerFilters } from "../src/header-filters";
import {
  click,
  deferred,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";

interface Row {
  id: string;
  name: string;
  amount: number;
  active: boolean;
}
const rows: readonly Row[] = [
  { id: "1", name: "Ada", amount: 2, active: true },
  { id: "2", name: "Grace", amount: 3, active: false },
];
const labels = resolveLabels(undefined);
function bag(accept = true) {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const request = vi.fn(
    (key: string, value: Parameters<FilterFormSource<Row>["setExtra"]>[1]) => {
      if (accept) extra.value = { ...extra.value, [key]: value };
    }
  );
  const patches = vi.fn(
    (patch: Parameters<FilterFormSource<Row>["setExtras"]>[0]) => {
      if (accept) extra.value = { ...extra.value, ...patch };
    }
  );
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra: request,
    setExtras: patches,
    allFilteredRows: rows,
  }));
  return { extra, request, patches, source };
}
function field(def: FilterDef<Row>, accept = true) {
  const state = bag(accept);
  const view = mountNative(
    () =>
      h(NativeFilterField<Row>, { def, source: state.source.value, labels }),
    {
      filterInput: "native-input",
      filterSelect: "native-select",
      filterCheckbox: "native-checkbox",
      filterField: "native-field",
    }
  );
  return { ...state, ...view };
}

describe("native filter controls", () => {
  it("restores rejected text/select/checkbox writes and forwards each request once", async () => {
    const text = field({ key: "name", type: "text" }, false);
    const input = find<HTMLInputElement>(text.host, "input");
    await write(input, "Rejected");
    expect(input.value).toBe("");
    expect(text.patches).toHaveBeenCalledOnce();
    expect(input.className).toBe("native-input");
    expect(input.getAttribute("aria-label")).toBe("Name");
    const select = field(
      {
        key: "name",
        type: "select",
        options: [{ value: "Ada", label: "Ada" }],
      },
      false
    );
    await write(find(select.host, "select"), "Ada", "change");
    expect(find<HTMLSelectElement>(select.host, "select").value).toBe("");
    expect(select.request).toHaveBeenCalledOnce();
    const multi = field(
      {
        key: "name",
        type: "multiSelect",
        options: [{ value: "Ada", label: "Ada" }],
      },
      false
    );
    find<HTMLInputElement>(multi.host, "input").click();
    await tick();
    expect(find<HTMLInputElement>(multi.host, "input").checked).toBe(false);
    expect(multi.request).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
  });
  it("renders native boolean, range and multi-select widgets from the binding registry", async () => {
    const boolean = field({ key: "active", type: "boolean" });
    await write(find(boolean.host, "select"), "true", "change");
    expect(boolean.extra.value.active).toBe("true");
    const range = field({ key: "amount", type: "numberRange" });
    await write(find<HTMLSelectElement>(range.host, "select"), "eq", "change");
    const inputs = range.host.querySelectorAll<HTMLInputElement>(
      'input[type="number"]'
    );
    expect(inputs.length).toBeGreaterThan(0);
    await write(inputs[0]!, "2");
    expect(JSON.stringify(range.extra.value)).toContain("2");
    const multi = field({
      key: "name",
      type: "multiSelect",
      options: [
        { value: "Ada", label: "Ada" },
        { value: "Grace", label: "Grace" },
      ],
    });
    find<HTMLInputElement>(multi.host, "input").click();
    await tick();
    expect(multi.extra.value.name).toEqual(["Ada"]);
    expect(find<HTMLInputElement>(multi.host, "input").checked).toBe(true);
  });
  it("loads choices once and ignores stale results after definition replacement", async () => {
    const first = deferred<readonly FilterOption[]>();
    const second = deferred<readonly FilterOption[]>();
    const initial = vi.fn(() => first.promise);
    const next = vi.fn(() => second.promise);
    const state = bag();
    const definition = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "select",
      options: initial,
    });
    const view = mountNative(() =>
      h(NativeFilterField<Row>, {
        def: definition.value,
        source: state.source.value,
        labels,
      })
    );
    await tick();
    expect(initial).toHaveBeenCalledOnce();
    expect(
      find(view.host, part("filter-field")).getAttribute("aria-busy")
    ).toBe("true");
    definition.value = { key: "name", type: "select", options: next };
    await tick();
    second.resolve([{ value: "new", label: "New" }]);
    first.resolve([{ value: "old", label: "Old" }]);
    await tick();
    expect(next).toHaveBeenCalledOnce();
    expect(view.host.textContent).toContain("New");
    expect(view.host.textContent).not.toContain("Old");
    expect(
      find(view.host, part("filter-field")).hasAttribute("aria-busy")
    ).toBe(false);
  });
  it("uses the binding checklist search/count and toggles without reducer copies", async () => {
    const view = field({ key: "name", type: "checklist" });
    await write(
      find<HTMLInputElement>(view.host, 'input[type="search"]'),
      "Ada"
    );
    expect(view.host.querySelectorAll('input[type="checkbox"]')).toHaveLength(
      1
    );
    find<HTMLInputElement>(view.host, 'input[type="checkbox"]').click();
    await tick();
    expect(view.extra.value.name).toEqual(["Ada"]);
    expect(find(view.host, part("filter-checklist-count")).textContent).toBe(
      "1"
    );
  });
  it("runs recursive tree actions through a host-owned controlled source", async () => {
    const tree =
      shallowRef<
        Parameters<NonNullable<TableSource<Row>["setFilterTree"]>>[0]
      >();
    const request = vi.fn((value: typeof tree.value) => {
      tree.value = value;
    });
    const view = mountNative(() =>
      h(NativeFilterTree<Row>, {
        defs: [{ key: "name", type: "text" }],
        source: { filterTree: tree.value, setFilterTree: request },
        defaultExpanded: true,
      })
    );
    find<HTMLButtonElement>(
      view.host,
      part("filter-tree-actions") + " button:nth-child(2)"
    ).click();
    await tick();
    const groups = view.host.querySelectorAll(part("filter-tree-group"));
    find(
      groups[1]!,
      part("filter-tree-actions") + " button:first-child"
    ).click();
    await tick();
    expect(
      view.host.querySelectorAll(part("filter-tree-condition"))
    ).toHaveLength(1);
    await write(find<HTMLInputElement>(view.host, "input"), "Ada");
    expect(JSON.stringify(tree.value)).toContain("Ada");
    await click(view.host, "filter-tree-remove");
    expect(
      view.host.querySelectorAll(part("filter-tree-condition"))
    ).toHaveLength(0);
  });
  it("opens the native popover in RTL, restores focus on Escape and filters the actual table", async () => {
    const view = mountNative(() =>
      h(DataTable<Row>, {
        data: rows,
        columns: [{ key: "name" }],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        dir: "rtl",
        features: [
          filters<Row>([{ key: "name", type: "text" }], { tree: true }),
          headerFilters(),
        ],
      })
    );
    await click(view.host, "filters-button");
    const surface = find(document.body, part("filters-popover"));
    expect(surface.getAttribute("dir")).toBe("rtl");
    expect(surface.getAttribute("popover")).toBe("manual");
    expect(surface.hasAttribute("aria-modal")).toBe(false);
    expect(surface.querySelector(part("filter-tree"))).not.toBeNull();
    await write(find(surface, 'input[type="text"]'), "Ada");
    expect(find(view.host, "tbody").textContent).toContain("Ada");
    expect(find(view.host, "tbody").textContent).not.toContain("Grace");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await tick();
    expect(document.body.querySelector(part("filters-popover"))).toBeNull();
    expect(document.activeElement).toBe(
      find(view.host, part("filters-button"))
    );
    expect(
      find(view.host, part("filters-button")).getAttribute("aria-expanded")
    ).toBe("false");
  });
  it("header close-on-select dismisses once and keeps current controlled filter", async () => {
    const state = bag();
    const view = mountNative(() =>
      h(NativeHeaderFilter<Row>, {
        def: {
          key: "name",
          type: "select",
          options: [{ value: "Ada", label: "Ada" }],
        },
        source: state.source.value,
        labels,
        closeOnSelect: true,
      })
    );
    await click(view.host, "filter-header-trigger");
    await write(
      find(document.body, `${part("filter-header-popover")} select`),
      "Ada",
      "change"
    );
    expect(state.request).toHaveBeenCalledExactlyOnceWith("name", "Ada");
    expect(
      document.body.querySelector(part("filter-header-popover"))
    ).toBeNull();
    expect(
      find(view.host, part("filter-header-trigger")).hasAttribute("data-active")
    ).toBe(true);
  });
  it("dismisses on outside pointer and modal backdrop without retaining listeners", async () => {
    const close = vi.fn();
    const view = mountNative(() =>
      h(NativeFilterSurface, {
        open: true,
        modal: true,
        label: "Filters",
        dir: "ltr",
        anchor: null,
        children: h("span", "Contents"),
        onClose: close,
      })
    );
    await tick();
    const dialog = find<HTMLDialogElement>(document.body, "dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    find(document.body, part("filters-backdrop")).dispatchEvent(
      new MouseEvent("click", { clientX: 20, clientY: 20, bubbles: true })
    );
    expect(close).toHaveBeenCalledExactlyOnceWith("outside");
    view.stop();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(close).toHaveBeenCalledOnce();
  });
  it("SSR starts no options request and hydration preserves ids without warnings", async () => {
    const load = vi.fn(() => Promise.resolve([{ value: "Ada", label: "Ada" }]));
    const state = bag();
    const Root = defineComponent({
      setup() {
        provideClassNames(() => ({}));
        return () =>
          h(NativeFilterField<Row>, {
            def: { key: "name", type: "select", options: load },
            source: state.source.value,
            labels,
          });
      },
    });
    const html = await renderToString(createSSRApp(Root));
    expect(load).not.toHaveBeenCalled();
    const target = document.createElement("div");
    target.innerHTML = html;
    document.body.append(target);
    const id = find<HTMLSelectElement>(target, "select").id;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = createSSRApp(Root);
    app.mount(target);
    await tick();
    expect(load).toHaveBeenCalledOnce();
    expect(find<HTMLSelectElement>(target, "select").id).toBe(id);
    expect(warn).not.toHaveBeenCalled();
    app.unmount();
    target.remove();
  });
});

describe("native filter surface and extra control branches", () => {
  it("changes native tree select controls and disclosure without leaving stale DOM state", async () => {
    const tree =
      shallowRef<
        Parameters<NonNullable<TableSource<Row>["setFilterTree"]>>[0]
      >();
    const view = mountNative(() =>
      h(NativeFilterTree<Row>, {
        defs: [
          { key: "name", type: "text" },
          { key: "active", type: "boolean" },
        ],
        source: {
          filterTree: tree.value,
          setFilterTree: (next) => {
            tree.value = next;
          },
        },
      })
    );
    const details = find<HTMLDetailsElement>(view.host, "details");
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    await tick();
    await write(
      find<HTMLSelectElement>(
        view.host,
        part("filter-tree-group") +
          " > " +
          part("filter-field") +
          " " +
          part("filter-operator")
      ),
      "or",
      "change"
    );
    find<HTMLButtonElement>(
      view.host,
      part("filter-tree-actions") + " button:first-child"
    ).click();
    await tick();
    const condition = find(view.host, part("filter-tree-condition"));
    await write(
      find<HTMLSelectElement>(condition, part("filter-select")),
      "active",
      "change"
    );
    const selects = condition.querySelectorAll<HTMLSelectElement>(
      part("filter-select")
    );
    await write(selects[1]!, "true", "change");
    expect(tree.value?.combinator).toBe("or");
    expect(JSON.stringify(tree.value)).toContain("active");
    expect(JSON.stringify(tree.value)).toContain("true");
    details.open = false;
    details.dispatchEvent(new Event("toggle"));
    await tick();
    expect(details.open).toBe(false);
  });
  it("drawer native clear/done buttons work with localized captions", async () => {
    const view = mountNative(() =>
      h(DataTable<Row>, {
        data: rows,
        columns: [{ key: "name" }],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        labels: { filtersDone: "Fertig", clearAll: "Leeren" },
        features: [
          filters<Row>([{ key: "name", type: "text" }], { mode: "drawer" }),
        ],
      })
    );
    await click(view.host, "filters-button");
    const surface = find(document.body, part("filters-panel"));
    await write(find(surface, "input"), "Ada");
    await click(surface, "filters-clear");
    expect(find<HTMLInputElement>(surface, "input").value).toBe("");
    expect(find(surface, part("filters-done")).textContent).toBe("Fertig");
    await click(surface, "filters-done");
    expect(document.body.querySelector(part("filters-panel"))).toBeNull();
  });
  it("native popover API positions above a low anchor, observes layout, and cleans up", async () => {
    const open = shallowRef(true);
    const direction = shallowRef<"ltr" | "rtl">("ltr");
    const anchor = document.createElement("button");
    document.body.append(anchor);
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(
      new DOMRect(100, 760, 30, 20)
    );
    const close = vi.fn();
    const shown = vi.fn();
    const hidden = vi.fn();
    const observed = vi.fn();
    const disconnected = vi.fn();
    const descriptors = ["showPopover", "hidePopover"].map(
      (key) =>
        [
          key,
          Object.getOwnPropertyDescriptor(HTMLElement.prototype, key),
        ] as const
    );
    Object.defineProperty(HTMLElement.prototype, "showPopover", {
      configurable: true,
      value: shown,
    });
    Object.defineProperty(HTMLElement.prototype, "hidePopover", {
      configurable: true,
      value: hidden,
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observed;
        disconnect = disconnected;
        unobserve = vi.fn();
      }
    );
    try {
      const view = mountNative(() =>
        h(NativeFilterSurface, {
          open: open.value,
          modal: false,
          label: "Position",
          dir: direction.value,
          anchor,
          children: h("span", "No controls"),
          onClose: close,
        })
      );
      await tick();
      const surface = find<HTMLElement>(document.body, part("filters-popover"));
      vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 220, 180)
      );
      window.dispatchEvent(new Event("resize"));
      await tick();
      expect(surface.style.top).toBe("572px");
      expect(surface.style.left).toBe("100px");
      expect(document.activeElement).toBe(surface);
      direction.value = "rtl";
      await tick();
      expect(surface.style.left).toBe("8px");
      anchor.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      surface.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(close).not.toHaveBeenCalled();
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(close).toHaveBeenCalledWith("outside");
      const ignored = new KeyboardEvent("keydown", {
        key: "Escape",
        cancelable: true,
      });
      ignored.preventDefault();
      document.dispatchEvent(ignored);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(close).toHaveBeenCalledTimes(1);
      expect(shown).toHaveBeenCalledTimes(2);
      expect(observed).toHaveBeenCalledTimes(2);
      expect(hidden).toHaveBeenCalledOnce();
      open.value = false;
      await tick();
      expect(disconnected).toHaveBeenCalledTimes(2);
      view.stop();
    } finally {
      for (const [key, descriptor] of descriptors) {
        if (descriptor)
          Object.defineProperty(HTMLElement.prototype, key, descriptor);
        else Reflect.deleteProperty(HTMLElement.prototype, key);
      }
      vi.unstubAllGlobals();
      anchor.remove();
    }
  });
  it("native modal API opens and closes once and cancel requests Escape dismissal", async () => {
    const open = shallowRef(true);
    const close = vi.fn();
    const show = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    const hide = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    const descriptors = ["showModal", "close"].map(
      (key) =>
        [
          key,
          Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, key),
        ] as const
    );
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: show,
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: hide,
    });
    try {
      const view = mountNative(() =>
        h(NativeFilterSurface, {
          open: open.value,
          modal: true,
          label: "Modal",
          dir: "ltr",
          anchor: null,
          children: h("button", "Inside"),
          onClose: close,
        })
      );
      await tick();
      const dialog = find<HTMLDialogElement>(document.body, "dialog");
      find(dialog, "button").click();
      expect(close).not.toHaveBeenCalled();
      const cancel = new Event("cancel", { cancelable: true });
      dialog.dispatchEvent(cancel);
      expect(cancel.defaultPrevented).toBe(true);
      expect(close).toHaveBeenCalledWith("escape");
      view.stop();
      expect(show).toHaveBeenCalledOnce();
      expect(hide).toHaveBeenCalledOnce();
    } finally {
      for (const [key, descriptor] of descriptors) {
        if (descriptor)
          Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
        else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
      }
    }
  });
});
