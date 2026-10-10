import type { FilterDef, TableFeature } from "@adapttable/vue";
import {
  type FilterPanelSurfaceProps,
  resolveLabels,
} from "@adapttable/vue/adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable, type DataTableProps } from "../src";
import { filters } from "../src/filters";
import { FilterDrawer } from "../src/filters/FilterDrawer";
import { FilterHeaderControl } from "../src/filters/FilterHeaderControl";
import { FilterPopover } from "../src/filters/FilterPopover";
import { FilterTrigger } from "../src/filters/FilterTrigger";
import { usePanelClose } from "../src/filters/usePanelClose";

interface Row {
  id: string;
  name: string;
  score: number;
}
const data: Row[] = [
  { id: "a", name: "Ada", score: 12 },
  { id: "b", name: "Bea", score: 25 },
];
const defs: FilterDef<Row>[] = [{ key: "name", type: "text" }];
const labels = resolveLabels({});
const cleanup: (() => void)[] = [];
beforeEach(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    }
  )
);
afterEach(() => {
  cleanup.splice(0).forEach((run) => run());
  vi.unstubAllGlobals();
});
const part = (value: string) => `[data-adapttable-part="${value}"]`;
function get<T extends Element>(root: ParentNode, selector: string): T {
  const value = root.querySelector<T>(selector);
  if (!value) throw new Error(`Missing ${selector}`);
  return value;
}
function mount(render: () => VNode) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(root);
  cleanup.push(() => {
    app.unmount();
    root.remove();
  });
  return { root, app };
}
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
async function input(element: HTMLInputElement, value: string) {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}
function visible(element: HTMLElement) {
  vi.spyOn(element, "getClientRects").mockReturnValue([
    new DOMRect(0, 0, 100, 44),
  ] as unknown as DOMRectList);
}
function table(
  mode: "popover" | "drawer",
  extra: Partial<DataTableProps<Row>> = {}
) {
  return mount(() =>
    h(DataTable<Row>, {
      data,
      columns: [
        { key: "name", header: "Name" },
        { key: "score", header: "Score" },
      ],
      rowKey: (row) => row.id,
      features: [filters(defs, { mode, tree: true })],
      urlSync: false,
      forceMobile: false,
      ...extra,
    })
  );
}

describe("shadcn full filter panel", () => {
  it("is opt-in and renders one actual trigger, binding fields, chips, and clear requests", async () => {
    const absent = mount(() =>
      h(DataTable<Row>, {
        data,
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
      })
    );
    expect(absent.root.querySelector(part("filters-button"))).toBeNull();
    const { root } = table("popover", {
      classNames: {
        filtersButton: "host-trigger",
        filtersIcon: "host-icon",
        filtersCount: "host-count",
        filtersForm: "host-form",
        chips: "host-chips",
        chip: "host-chip",
        chipRemove: "host-remove",
      },
    });
    const trigger = get<HTMLButtonElement>(root, part("filters-button"));
    visible(trigger);
    expect(trigger.dataset.slot).toBe("button");
    expect(trigger.classList.contains("host-trigger")).toBe(true);
    expect(
      get(root, part("filters-icon")).classList.contains("host-icon")
    ).toBe(true);
    expect(root.querySelectorAll(part("filters-button"))).toHaveLength(1);
    trigger.click();
    await settle();
    const panel = get<HTMLElement>(document, part("filters-popover"));
    expect(panel.querySelector('[data-slot="sheet-overlay"]')).toBeNull();
    expect(document.querySelector('[data-slot="popover-trigger"]')).toBeNull();
    expect(
      get(panel, part("filters-form")).classList.contains("host-form")
    ).toBe(true);
    expect(get<HTMLButtonElement>(panel, part("filters-clear")).disabled).toBe(
      true
    );
    await input(get(panel, "input"), "Ada");
    expect(root.querySelector("tbody")?.textContent).not.toContain("Bea");
    expect(get(root, part("chips")).classList.contains("host-chips")).toBe(
      true
    );
    expect(
      get(root, part("chip-remove")).classList.contains("host-remove")
    ).toBe(true);
    expect(
      get(root, part("filters-count")).classList.contains("host-count")
    ).toBe(true);
    get<HTMLButtonElement>(panel, part("filters-done")).click();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    get<HTMLButtonElement>(root, part("chip-remove")).click();
    await settle();
    expect(root.querySelector(part("chips"))).toBeNull();
    expect(root.querySelector("tbody")?.textContent).toContain("Bea");
  });

  it.each(["popover", "drawer"] as const)(
    "restores the visible trigger after %s Escape and explicit Done",
    async (mode) => {
      const { root } = table(mode);
      const trigger = get<HTMLButtonElement>(root, part("filters-button"));
      visible(trigger);
      trigger.focus();
      trigger.click();
      await settle();
      const selector = part(
        mode === "drawer" ? "filters-panel" : "filters-popover"
      );
      get(document, selector).dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      await settle();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(trigger);
      trigger.click();
      await settle();
      get<HTMLButtonElement>(document, part("filters-done")).click();
      await settle();
      expect(document.activeElement).toBe(trigger);
      expect(document.querySelector(selector)).toBeNull();
    }
  );

  it("uses real Sheet dialog labels, one Cancel control, a real backdrop, and RTL placement", async () => {
    const warnings = vi.spyOn(console, "warn");
    const { root } = table("drawer", {
      dir: "rtl",
      classNames: {
        filtersPanel: "panel-hook",
        filtersDrawer: "drawer-hook",
        filtersBackdrop: "backdrop-hook",
        filtersClose: "cancel-hook",
        filtersTitle: "title-hook",
      },
    });
    get<HTMLButtonElement>(root, part("filters-button")).click();
    await settle();
    const dialog = get<HTMLElement>(document, '[data-slot="sheet-content"]');
    const backdrop = get(document, part("filters-backdrop"));
    expect(dialog.dataset.adapttablePart).toBe("filters-panel");
    expect(dialog.dir).toBe("rtl");
    expect(dialog.classList.contains("left-0")).toBe(true);
    expect(dialog.classList.contains("drawer-hook")).toBe(true);
    expect(dialog.classList.contains("panel-hook")).toBe(true);
    expect(backdrop.getAttribute("data-slot")).toBe("sheet-overlay");
    expect(backdrop.classList.contains("backdrop-hook")).toBe(true);
    const titleId = dialog.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId ?? "")?.textContent).toBe(
      labels.filters
    );
    expect(dialog.hasAttribute("aria-describedby")).toBe(false);
    const cancels = [...dialog.querySelectorAll("button")].filter(
      (button) => button.textContent === labels.cancel
    );
    expect(cancels).toHaveLength(1);
    expect(cancels[0]?.classList.contains("cancel-hook")).toBe(true);
    expect(dialog.querySelectorAll('[data-slot="sheet-close"]')).toHaveLength(
      0
    );
    expect(
      [...dialog.querySelectorAll("button")].map((button) => button.textContent)
    ).toEqual([
      labels.cancel,
      labels.filterTree,
      labels.clearAll,
      labels.filtersDone,
    ]);
    expect(warnings.mock.calls.flat().join(" ")).not.toMatch(
      /DialogTitle|DialogDescription|Missing.*description/
    );
    warnings.mockRestore();
  });

  it("preserves outside focus when dismissing a popover", async () => {
    const { root } = table("popover");
    const trigger = get<HTMLButtonElement>(root, part("filters-button"));
    visible(trigger);
    trigger.click();
    await settle();
    const outside = document.createElement("button");
    document.body.append(outside);
    cleanup.push(() => outside.remove());
    outside.focus();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(outside);
  });

  it("closes the Sheet from its actual backdrop without focusing an unrelated control", async () => {
    const { root } = table("drawer");
    const trigger = get<HTMLButtonElement>(root, part("filters-button"));
    visible(trigger);
    trigger.click();
    await settle();
    const focus = vi.spyOn(trigger, "focus");
    const backdrop = get(document, part("filters-backdrop"));
    backdrop.dispatchEvent(
      new MouseEvent("pointerdown", {
        button: 0,
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(focus).not.toHaveBeenCalled();
  });

  it("closes an already-open trigger on its pointer sequence without reopening", async () => {
    const { root } = table("popover");
    const trigger = get<HTMLButtonElement>(root, part("filters-button"));
    trigger.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true })
    );
    trigger.click();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true })
    );
    trigger.click();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true })
    );
    trigger.click();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("uses localized panel, dialog, and action labels including Cancel focus", async () => {
    const translated = {
      filters: "Filtrar",
      cancel: "Cancelar",
      clearAll: "Borrar",
      filtersDone: "Listo",
    };
    const { root } = table("drawer", { labels: translated });
    const trigger = get<HTMLButtonElement>(root, part("filters-button"));
    visible(trigger);
    expect(trigger.textContent).toContain("Filtrar");
    trigger.click();
    await settle();
    const dialog = get(document, part("filters-panel"));
    expect(get(dialog, '[data-slot="sheet-title"]').textContent).toBe(
      "Filtrar"
    );
    expect(get(dialog, part("filters-done")).textContent).toBe("Listo");
    const cancel = get<HTMLButtonElement>(dialog, part("filters-close"));
    expect(cancel.textContent).toBe("Cancelar");
    cancel.click();
    await settle();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps the tree and clear-all controls connected to the same filter source", async () => {
    const { root } = table("popover");
    get<HTMLButtonElement>(root, part("filters-button")).click();
    await settle();
    const panel = get(document, part("filters-popover"));
    get<HTMLButtonElement>(panel, part("filter-tree-summary")).click();
    await settle();
    const add = [...panel.querySelectorAll("button")].find(
      (button) => button.textContent === labels.filterAddCondition
    );
    add?.click();
    await settle();
    const condition = get(panel, part("filter-tree-condition"));
    await input(get(condition, "input"), "Ada");
    expect(root.querySelector("tbody")?.textContent).not.toContain("Bea");
    expect(root.querySelector(part("chips"))).not.toBeNull();
    get<HTMLButtonElement>(panel, part("filters-clear")).click();
    await settle();
    expect(root.querySelector(part("chips"))).toBeNull();
    expect(root.querySelector("tbody")?.textContent).toContain("Bea");
  });

  it.each(["popover", "drawer"] as const)(
    "releases open %s content on feature removal",
    async (mode) => {
      const features = shallowRef<readonly TableFeature<Row>[]>([
        filters(defs, { mode }),
      ]);
      const { root } = mount(() =>
        h(DataTable<Row>, {
          data,
          columns: [{ key: "name" }],
          rowKey: (row) => row.id,
          features: features.value,
          urlSync: false,
        })
      );
      get<HTMLButtonElement>(root, part("filters-button")).click();
      await settle();
      features.value = [];
      await settle();
      expect(document.querySelector(part("filters-popover"))).toBeNull();
      expect(document.querySelector(part("filters-panel"))).toBeNull();
      expect(document.querySelector(part("filters-backdrop"))).toBeNull();
      expect(root.querySelector(part("filters-button"))).toBeNull();
    }
  );

  it("keeps a complete filter panel in mobile cards and renders a closed SSR trigger", async () => {
    const { root } = table("drawer", { forceMobile: true });
    expect(root.querySelector("table")).toBeNull();
    get<HTMLButtonElement>(root, part("filters-button")).click();
    await settle();
    expect(document.querySelector(part("filters-panel"))).not.toBeNull();
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            data,
            columns: [{ key: "name" }],
            rowKey: (row) => row.id,
            features: [filters(defs, { mode: "drawer" })],
            urlSync: false,
          }),
      })
    );
    expect(html).toContain('data-adapttable-part="filters-button"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-slot="sheet-content"');
  });
});

describe("shadcn filter surface ownership", () => {
  it.each(["popover", "drawer"] as const)(
    "keeps rejected %s close requests controlled and portals into the requested fullscreen host",
    async (mode) => {
      const container = document.createElement("div");
      document.body.append(container);
      cleanup.push(() => container.remove());
      const close = vi.fn();
      const common: FilterPanelSurfaceProps = {
        open: true,
        anchor: null,
        label: "Controlled filters",
        dir: "rtl",
        container,
        onClose: close,
        children: h("div", "Content"),
      };
      mount(() =>
        mode === "popover"
          ? h(FilterPopover, common)
          : h(FilterDrawer, {
              ...common,
              closeLabel: labels.cancel,
              classNames: {},
            })
      );
      await settle();
      const content = get<HTMLElement>(container, '[role="dialog"]');
      content.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      await settle();
      expect(close).toHaveBeenCalledExactlyOnceWith("escape");
      expect(content.isConnected).toBe(true);
      expect(content.dataset.state).toBe("open");
      expect(content.dir).toBe("rtl");
    }
  );

  it("lets a nested native-kit popover own the first Escape inside Sheet", async () => {
    const open = shallowRef(true);
    const close = vi.fn(() => {
      open.value = false;
    });
    mount(() =>
      h(FilterDrawer, {
        open: open.value,
        anchor: null,
        label: "Outer",
        closeLabel: labels.cancel,
        classNames: {},
        dir: "rtl",
        onClose: close,
        children: h(FilterHeaderControl<Row>, {
          def: {
            key: "name",
            type: "multiSelect",
            options: [{ value: "Ada", label: "Ada" }],
          },
          source: {
            extra: {},
            setExtra: vi.fn(),
            setExtras: vi.fn(),
            allFilteredRows: data,
          },
          labels,
        }),
      })
    );
    await settle();
    const outer = get(document, part("filters-panel"));
    get<HTMLButtonElement>(outer, "button").click();
    await settle();
    const inner = get(document, part("filter-header-menu"));
    inner.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(close).not.toHaveBeenCalled();
    expect(open.value).toBe(true);
    outer.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(close).toHaveBeenCalledExactlyOnceWith("escape");
  });

  it("owns a single trigger target without ref churn across model repaint", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const callback = shallowRef(first);
    const count = shallowRef(0);
    const { root, app } = mount(() =>
      h(FilterTrigger, {
        classNames: {},
        control: {
          label: "Filters",
          count: count.value,
          attrs: { "data-adapttable-part": "filters-button" },
          triggerRef: callback.value,
          onPointerDown: vi.fn(),
          onClick: vi.fn(),
        },
      })
    );
    const button = get<HTMLButtonElement>(root, "button");
    expect(first).toHaveBeenCalledExactlyOnceWith(button);
    count.value++;
    await nextTick();
    expect(first).toHaveBeenCalledOnce();
    expect(root.querySelectorAll("button")).toHaveLength(1);
    callback.value = second;
    await nextTick();
    expect(first).toHaveBeenLastCalledWith(null);
    expect(second).toHaveBeenCalledExactlyOnceWith(button);
    app.unmount();
    await nextTick();
    expect(second).toHaveBeenLastCalledWith(null);
  });

  it("cancels delayed focus when a close phase is superseded by reopening or outside dismissal", async () => {
    const anchor = document.createElement("button");
    document.body.append(anchor);
    cleanup.push(() => anchor.remove());
    visible(anchor);
    const focus = vi.spyOn(anchor, "focus");
    const scope = effectScope();
    cleanup.push(() => scope.stop());
    const open = shallowRef(true);
    const controller = scope.run(() =>
      usePanelClose(() => ({
        open: open.value,
        anchor,
        close: () => {
          open.value = false;
        },
      }))
    );
    if (!controller) throw new Error("Missing close controller");
    controller.close("done");
    controller.onCloseAutoFocus(new Event("close", { cancelable: true }));
    open.value = true;
    await nextTick();
    expect(focus).not.toHaveBeenCalled();
    controller.close("done");
    controller.onCloseAutoFocus(new Event("close", { cancelable: true }));
    open.value = true;
    controller.close("outside");
    await nextTick();
    expect(focus).not.toHaveBeenCalled();
  });

  it("cancels focus when close is rejected, the trigger is hidden, or the scope is synchronously disposed", async () => {
    const anchor = document.createElement("button");
    document.body.append(anchor);
    cleanup.push(() => anchor.remove());
    visible(anchor);
    const focus = vi.spyOn(anchor, "focus");
    const scope = effectScope();
    const open = shallowRef(true);
    let accept = false;
    let dispose = false;
    const controller = scope.run(() =>
      usePanelClose(() => ({
        open: open.value,
        anchor,
        close: () => {
          if (accept) open.value = false;
          if (dispose) scope.stop();
        },
      }))
    );
    if (!controller) throw new Error("Missing close controller");
    cleanup.push(() => scope.stop());
    controller.close("done");
    controller.onCloseAutoFocus(new Event("close", { cancelable: true }));
    await nextTick();
    expect(focus).not.toHaveBeenCalled();
    accept = true;
    anchor.hidden = true;
    controller.close("escape");
    controller.onCloseAutoFocus(new Event("close", { cancelable: true }));
    await nextTick();
    expect(focus).not.toHaveBeenCalled();
    anchor.hidden = false;
    open.value = true;
    dispose = true;
    controller.close("done");
    controller.onCloseAutoFocus(new Event("close", { cancelable: true }));
    await nextTick();
    expect(focus).not.toHaveBeenCalled();
  });
});
