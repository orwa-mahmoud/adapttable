import type { FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { afterEach, expect, it, vi } from "vitest";
import { computed, createApp, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { TableAssistant, type TableAssistantProps } from "../src/assistant";
import { provideRekaClasses } from "../src/context";
import { rekaSelect } from "../src/controls/select";
import { FilterField } from "../src/filters";
import { FilterHeaderRow } from "../src/header-filters";
import { PivotPanel, type PivotPanelProps } from "../src/pivot";
import { SavedViewsPanel } from "../src/saved-views";
import { sidePanel } from "../src/side-panel";
import {
  rekaColumnGroupToggle,
  rekaHierarchyControls,
  rekaResizeHandle,
} from "../src/tableControls";

interface Row {
  id: string;
  name: string;
  amount: number;
}
const data: Row[] = [{ id: "a", name: "Ada", amount: 2 }];
const base: DataTableProps<Row> = {
  data,
  columns: [{ key: "name" }, { key: "amount" }],
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
};
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup() {
      provideRekaClasses(() => ({}));
      return render;
    },
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
async function choose(trigger: HTMLElement, label: string) {
  trigger.focus();
  await key(trigger, "ArrowDown");
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((node) => node.textContent?.trim() === label);
  if (!option) throw new Error(`Missing ${label}`);
  option.focus();
  await key(option, "Enter");
}
function form() {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    extra.value = { ...extra.value, [key]: value };
  });
  const setExtras = vi.fn<FilterFormSource<Row>["setExtras"]>((patch) => {
    extra.value = { ...extra.value, ...patch };
  });
  return {
    extra,
    setExtra,
    source: computed<FilterFormSource<Row>>(() => ({
      extra: extra.value,
      setExtra,
      setExtras,
      allFilteredRows: data,
    })),
  };
}
it("preserves header filter row geometry while its real input writes the host filter", async () => {
  const state = form();
  const host = mount(() =>
    h("table", [
      h("thead", [
        h(FilterHeaderRow<Row>, {
          columns: [{ key: "amount" }, { key: "name" }],
          defs: [{ key: "name", type: "text", label: "Name" }],
          source: state.source.value,
          labels: resolveLabels(undefined),
          selection: true,
          showActions: true,
          columnSpacers: { start: 40, end: 90 },
          classNames: {
            filterHeaderRow: "consumer-row",
            filterHeaderInput: "consumer-input",
          },
        }),
      ]),
    ])
  );
  await flush();
  expect(element(part("filter-header-row"), host).tagName).toBe("TR");
  expect(
    element(part("filter-header-row"), host).classList.contains("consumer-row")
  ).toBe(true);
  const input = element<HTMLInputElement>("input", host);
  expect(input.classList.contains("consumer-input")).toBe(true);
  input.value = "Ada";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(state.extra.value.name).toBe("Ada");
  expect(host.querySelectorAll("th").length).toBeGreaterThanOrEqual(4);
});
it("uses a labeled checklist field and a native choice field with controlled writes", async () => {
  const state = form();
  const multi = shallowRef(true);
  const host = mount(() =>
    h(FilterField<Row>, {
      def: {
        key: "name",
        type: multi.value ? "checklist" : "select",
        options: [
          { value: "Ada", label: "Ada" },
          { value: "Grace", label: "Grace" },
        ],
        label: "Person",
      },
      source: state.source.value,
      labels: resolveLabels(undefined),
    })
  );
  await flush();
  expect(element("legend", host).textContent).toBe("Person");
  element<HTMLButtonElement>('[role="checkbox"]', host).click();
  await flush();
  expect(state.extra.value.name).toEqual(["Ada"]);
  multi.value = false;
  state.extra.value = {};
  await flush();
  await choose(element('[role="combobox"]', host), "Grace");
  expect(state.extra.value.name).toBe("Grace");
});
it("keeps native Select form metadata, empty values, disabled choices, and open callbacks", async () => {
  const value = shallowRef("unknown");
  const disabled = shallowRef(true);
  const changed = vi.fn();
  const opened = vi.fn();
  const host = mount(() =>
    h("form", { id: "native-form" }, [
      rekaSelect({
        attrs: {
          name: "choice",
          form: "native-form",
          required: true,
          disabled: disabled.value,
          dir: "rtl",
          "aria-label": "Choice",
        },
        value: value.value,
        options: [
          { value: "", label: "Any" },
          { value: "a", label: "Alpha" },
          { value: "b", label: "Unavailable", disabled: true },
        ],
        onChange: changed,
        onOpenChange: opened,
      }),
    ])
  );
  await flush();
  const trigger = element<HTMLButtonElement>('[role="combobox"]', host);
  expect(trigger.disabled).toBe(true);
  expect(trigger.textContent).toContain("unknown");
  disabled.value = false;
  value.value = "a";
  await flush();
  await choose(trigger, "Any");
  expect(changed).toHaveBeenCalledExactlyOnceWith("");
  expect(opened.mock.calls).toEqual([[true], [false]]);
  expect(trigger.textContent).toContain("Alpha");
  await key(trigger, "ArrowDown");
  const unavailable = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((node) => node.textContent?.trim() === "Unavailable");
  expect(unavailable?.getAttribute("aria-disabled")).toBe("true");
  unavailable?.click();
  expect(changed).toHaveBeenCalledTimes(1);
  await key(element('[role="listbox"]'), "Escape");
});
it("keeps column grouping and hierarchy targets semantic during collapsed and loading states", async () => {
  const expanded = shallowRef(false);
  const loading = shallowRef(true);
  const toggle = vi.fn();
  const ref = vi.fn();
  const { TreeToggle, RowDetailToggle } = rekaHierarchyControls<Row>();
  if (!TreeToggle || !RowDetailToggle)
    throw new Error("Missing hierarchy controls");
  const host = mount(() =>
    h("div", [
      rekaColumnGroupToggle({
        cell: {
          id: "profile",
          label: "Profile",
          key: "profile",
          span: 2,
          hideLabel: false,
          collapsible: true,
          collapsed: !expanded.value,
        },
        labels: resolveLabels(undefined),
        onToggle: toggle,
      }),
      TreeToggle({
        attrs: { "aria-label": "Expand row" },
        expanded: expanded.value,
        loading: loading.value,
      }),
      RowDetailToggle({
        attrs: { "aria-label": "Row details" },
        expanded: expanded.value,
      }),
      rekaResizeHandle({
        attrs: {
          ref,
          role: "separator",
          "aria-label": "Resize amount",
          tabindex: 0,
          onKeydown: toggle,
        },
      }),
    ])
  );
  await flush();
  const group = element<HTMLButtonElement>(part("column-group-toggle"), host);
  expect(group.getAttribute("aria-expanded")).toBe("false");
  group.click();
  expect(toggle).toHaveBeenCalledWith("profile");
  expect(element('[aria-label="Expand row"]', host).textContent).toBe("…");
  expanded.value = true;
  loading.value = false;
  await flush();
  expect(group.getAttribute("aria-expanded")).toBe("true");
  expect(element('[aria-label="Expand row"]', host).textContent).toBe("−");
  expect(element('[aria-label="Row details"]', host).textContent).toBe("−");
  const resize = element('[role="separator"]', host);
  expect(ref).toHaveBeenCalledWith(resize);
  await key(resize, "ArrowRight");
  expect(toggle).toHaveBeenCalledTimes(2);
});
it("renders an untabbed side panel from host content and routes close to the host", async () => {
  const open = shallowRef<string | null>("detail");
  const close = vi.fn();
  const content = shallowRef(false);
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      features: [
        sidePanel({
          open,
          onOpenChange: close,
          panels: [
            {
              key: "detail",
              label: "Details",
              content: content.value
                ? () => h("p", "Callable details")
                : "Static details",
            },
          ],
        }),
      ],
    })
  );
  await flush();
  expect(host.textContent).toContain("Static details");
  expect(host.querySelector('[role="tablist"]')).toBeNull();
  content.value = true;
  await flush();
  expect(host.textContent).toContain("Callable details");
  element<HTMLButtonElement>(part("side-panel-close"), host).click();
  await flush();
  expect(close).toHaveBeenCalledWith(null);
  expect(host.querySelector(part("side-panel"))).not.toBeNull();
  open.value = null;
  await flush();
  expect(host.querySelector(part("side-panel"))).toBeNull();
});
it("moves, aggregates, and removes pivot fields through actual controls", async () => {
  const config = shallowRef<PivotPanelProps["config"]>({
    rows: ["name", "amount"],
    columns: [],
    measures: [{ key: "amount", agg: "sum" }],
  });
  const change = vi.fn((next: PivotPanelProps["config"]) => {
    config.value = next;
  });
  const host = mount(() =>
    h(PivotPanel, {
      config: config.value,
      fields: [
        { key: "name", label: "Name" },
        { key: "amount", label: "Amount" },
      ],
      onChange: change,
    })
  );
  await flush();
  const move = [
    ...host.querySelectorAll<HTMLButtonElement>('[data-zone="rows"] button'),
  ].find(
    (node) =>
      node.getAttribute("aria-label")?.startsWith("Move down") && !node.disabled
  );
  if (!move) throw new Error("Missing move down");
  move.click();
  await flush();
  expect(config.value.rows).toEqual(["amount", "name"]);
  await choose(
    element('[data-zone="measures"] [role="combobox"]', host),
    "Average"
  );
  expect(config.value.measures[0]?.agg).toBe("avg");
  const remove = [
    ...host.querySelectorAll<HTMLButtonElement>('[data-zone="rows"] button'),
  ].find((node) => node.getAttribute("aria-label")?.startsWith("Remove"));
  if (!remove) throw new Error("Missing remove");
  remove.click();
  await flush();
  expect(config.value.rows).toEqual(["name"]);
});
it("renders an empty saved-views panel without consumer classes", async () => {
  const host = mount(() =>
    h(SavedViewsPanel, {
      views: [],
      onApply: vi.fn(),
      onRemove: vi.fn(),
      onRename: vi.fn(),
      onMove: vi.fn(),
      onSetDefault: vi.fn(),
    })
  );
  await flush();
  expect(host.textContent?.trim()).not.toBe("");
  expect(host.querySelector(part("saved-view-row"))).toBeNull();
});
it("keeps assistant panels and floating windows under controlled host presentation", async () => {
  const presentation = shallowRef<TableAssistantProps["presentation"]>("panel");
  const setDraft = vi.fn();
  const assistant: TableAssistantProps["assistant"] = {
    status: "ready",
    messages: [],
    draft: "original",
    setDraft,
    send: vi.fn(),
    stop: vi.fn(),
    suggestions: [],
    runSuggestion: vi.fn(),
  };
  const host = mount(() =>
    h(TableAssistant, {
      assistant,
      open: true,
      onOpenChange: vi.fn(),
      presentation: presentation.value,
    })
  );
  await flush();
  expect(host.querySelector(part("assistant-panel"))).not.toBeNull();
  const composer = element<HTMLTextAreaElement>(part("assistant-input"), host);
  composer.value = "rejected";
  composer.dispatchEvent(new Event("input", { bubbles: true }));
  expect(setDraft).toHaveBeenCalledWith("rejected");
  expect(composer.value).toBe("original");
  presentation.value = "floating";
  await flush();
  expect(document.querySelector(part("assistant-window"))).not.toBeNull();
});
