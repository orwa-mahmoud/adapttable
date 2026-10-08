import type { ColumnDef, FilterFormSource } from "@adapttable/vue";
import {
  provideDataTableClassNames,
  resolveLabels,
} from "@adapttable/vue/adapter";
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  createApp,
  createSSRApp,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { filters, NuxtFilterField } from "../src/filters";
import NuxtFilterSurface from "../src/filters/NuxtFilterSurface";

interface Row {
  id: string;
  name: string;
  active: boolean;
  team: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", active: true, team: "core" },
  { id: "b", name: "Bea", active: false, team: "ui" },
];
const columns: readonly ColumnDef<Row>[] = [{ key: "name" }, { key: "team" }];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const stops: (() => void)[] = [];
const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
};
afterEach(async () => {
  for (const stop of stops.splice(0)) stop();
  await settle();
});
function mount(render: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup() {
      provideDataTableClassNames(() => ({}));
      return () => h(UApp, { toaster: null }, { default: render });
    },
  }).use(ui);
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  return root;
}
function target<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.body.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
async function click(selector: string) {
  target(selector).click();
  await settle();
}

describe("Nuxt filtering feature", () => {
  it.each(["popover", "drawer"] as const)(
    "uses a genuine %s surface with live RTL, nested select dismissal and focus restoration",
    async (mode) => {
      const dir = shallowRef<"ltr" | "rtl">("ltr");
      mount(() =>
        h(DataTable<Row>, {
          data: rows,
          columns,
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: false,
          searchable: false,
          dir: dir.value,
          classNames: { filtersBackdrop: "custom-backdrop" },
          features: [
            filters<Row>(
              [
                { key: "name", type: "text" },
                {
                  key: "team",
                  type: "select",
                  options: [
                    { value: "core", label: "Core" },
                    { value: "ui", label: "UI" },
                  ],
                },
              ],
              { tree: true, mode }
            ),
          ],
        })
      );
      await settle();
      const trigger = target<HTMLButtonElement>(part("filters-button"));
      trigger.focus();
      trigger.click();
      await settle();
      const surface = target(
        part(mode === "drawer" ? "filters-panel" : "filters-popover")
      );
      expect(surface.getAttribute("role")).toBe("dialog");
      expect(surface.getAttribute("dir")).toBe("ltr");
      expect(document.querySelectorAll(".custom-backdrop")).toHaveLength(
        mode === "drawer" ? 1 : 0
      );
      dir.value = "rtl";
      await settle();
      expect(surface.getAttribute("dir")).toBe("rtl");
      const select = target<HTMLButtonElement>(
        `${part("filters-form")} button[role="combobox"]`
      );
      select.focus();
      select.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      );
      await settle();
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      target('[role="listbox"]').dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      await settle();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(document.body.contains(surface)).toBe(true);
      surface.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      await settle();
      expect(
        document.querySelector(
          part(mode === "drawer" ? "filters-panel" : "filters-popover")
        )
      ).toBeNull();
      expect(document.activeElement).toBe(trigger);
    }
  );
  it.each([false, true])(
    "respects rejected and accepted controlled text and checkbox writes (accept=%s)",
    async (accept) => {
      const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
      const setExtras = vi.fn(
        (patch: Parameters<FilterFormSource<Row>["setExtras"]>[0]) => {
          if (accept) extra.value = { ...extra.value, ...patch };
        }
      );
      const setExtra = vi.fn(
        (
          key: string,
          value: Parameters<FilterFormSource<Row>["setExtra"]>[1]
        ) => {
          if (accept) extra.value = { ...extra.value, [key]: value };
        }
      );
      const source = computed<FilterFormSource<Row>>(() => ({
        extra: extra.value,
        setExtra,
        setExtras,
        allFilteredRows: rows,
      }));
      mount(() =>
        h("div", [
          h(NuxtFilterField<Row>, {
            def: { key: "name", type: "text" },
            source: source.value,
            labels: resolveLabels(undefined),
          }),
          h(NuxtFilterField<Row>, {
            def: {
              key: "team",
              type: "multiSelect",
              options: [{ value: "core", label: "Core" }],
            },
            source: source.value,
            labels: resolveLabels(undefined),
          }),
        ])
      );
      await settle();
      const input = target<HTMLInputElement>(part("filter-input"));
      input.value = "Ada";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await settle();
      expect(setExtras).toHaveBeenCalledTimes(1);
      expect(input.value).toBe(accept ? "Ada" : "");
      await click('button[role="checkbox"]');
      expect(setExtra).toHaveBeenCalledTimes(1);
      expect(
        target('button[role="checkbox"]').getAttribute("aria-checked")
      ).toBe(String(accept));
    }
  );
  it("retires an open portaled drawer on KeepAlive deactivation", async () => {
    const shown = shallowRef(true);
    const close = vi.fn();
    mount(() =>
      h(KeepAlive, null, {
        default: () =>
          shown.value
            ? h(NuxtFilterSurface, {
                key: "surface",
                open: true,
                modal: true,
                label: "Filters",
                dir: "rtl",
                anchor: null,
                children: h("span", "Content"),
                onClose: close,
              })
            : null,
      })
    );
    await settle();
    expect(document.querySelector(part("filters-panel"))).not.toBeNull();
    shown.value = false;
    await settle();
    expect(document.querySelector(part("filters-panel"))).toBeNull();
    expect(close).not.toHaveBeenCalled();
    shown.value = true;
    await settle();
    expect(document.querySelector(part("filters-panel"))).not.toBeNull();
  });
  it("keeps a controlled surface open when its close request is rejected", async () => {
    const close = vi.fn();
    mount(() =>
      h(NuxtFilterSurface, {
        open: true,
        modal: true,
        label: "Filters",
        dir: "ltr",
        anchor: null,
        children: h("span", "Content"),
        onClose: close,
      })
    );
    await settle();
    target(part("filters-panel")).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(close).toHaveBeenCalledTimes(1);
    expect(document.querySelector(part("filters-panel"))).not.toBeNull();
  });
  it("operates Nuxt Collapsible tree groups and checklist choices through the shared models", async () => {
    mount(() =>
      h(DataTable<Row>, {
        data: rows,
        columns,
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        searchable: false,
        features: [
          filters<Row>(
            [
              {
                key: "team",
                type: "checklist",
                options: [
                  { value: "core", label: "Core" },
                  { value: "ui", label: "UI" },
                ],
              },
            ],
            { tree: true }
          ),
        ],
      })
    );
    await settle();
    await click(part("filters-button"));
    const tree = target(part("filter-tree"));
    const toggle = tree.querySelector<HTMLButtonElement>("button");
    expect(toggle?.dataset.adapttablePart).toBe("filter-tree-summary");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    toggle?.click();
    await settle();
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    const action = Array.from(tree.querySelectorAll("button")).find((button) =>
      button.textContent?.includes(resolveLabels(undefined).filterAddCondition)
    );
    expect(action).toBeDefined();
    action?.click();
    await settle();
    expect(tree.querySelectorAll(part("filter-tree-condition"))).toHaveLength(
      1
    );
    await click(
      `${part("filter-tree-condition")} ${part("filter-tree-remove")}`
    );
    expect(tree.querySelectorAll(part("filter-tree-condition"))).toHaveLength(
      0
    );
    await click(part("filter-checkbox"));
    expect(document.querySelectorAll("tbody tr[data-row-id]")).toHaveLength(1);
    expect(target(part("filter-checkbox")).getAttribute("aria-checked")).toBe(
      "true"
    );
    await click(part("filters-clear"));
    expect(document.querySelectorAll("tbody tr[data-row-id]")).toHaveLength(2);
  });
  it("server-renders generic filtering without opening a portal", async () => {
    const app = createSSRApp({
      render: () =>
        h(DataTable<Row>, {
          data: rows,
          columns,
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: false,
          features: [filters<Row>([{ key: "name", type: "text" }])],
        }),
    }).use(ui);
    const html = await renderToString(app);
    expect(html).toContain('data-adapttable-part="filters-button"');
    expect(html).not.toContain('data-adapttable-part="filters-popover"');
  });
});
