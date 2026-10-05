import { createMemoryAdapter, resolveLabels } from "@adapttable/core";
import {
  COLUMN_SELECT,
  FIND_BAR,
  slotRender,
  STATUS_BAR,
} from "@adapttable/core/binding";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";

import { extendFeature } from "../src/features/tableFeature";
import { DesktopTableChrome } from "../src/layout/tableChrome";
import { FILL_HANDLE_CONTROL, FIND_BUTTON } from "../src/navigation/contracts";
import {
  cellNavigation,
  columnSelectionCheckbox,
  findInTable,
  selectionStats,
  statusBar,
} from "../src/navigation/features";
import {
  ColumnSelectCheckboxChrome,
  FillHandleChrome,
  FindBarChrome,
  GridFocusAnnouncer,
  SelectionStatsChrome,
  StatusBarChrome,
} from "../src/navigation/navigationChrome";
import { useFindInTable } from "../src/navigation/useFindInTable";
import { useGridFocus } from "../src/navigation/useGridFocus";
import {
  useDataTableShell,
  type UseDataTableShellOptions,
  type UseDataTableShellResult,
} from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
  score: number;
}
const rows = [
  { id: "a", name: "Ada", score: 10 },
  { id: "g", name: "Grace", score: 30 },
];
const columns = [
  { key: "name", header: "Name" },
  { key: "score", header: "Score", editable: true },
];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0).reverse()) stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const draws = [
  slotRender(FILL_HANDLE_CONTROL, (props) =>
    FillHandleChrome({
      ...props,
      slots: {
        Handle: (control) =>
          h("span", {
            ...control.handleProps,
            title: control.label,
            "data-fill": "",
          }),
      },
    })
  ),
  slotRender(COLUMN_SELECT, (props) =>
    ColumnSelectCheckboxChrome({
      ...props,
      slots: {
        Checkbox: (control) =>
          h("input", {
            type: "checkbox",
            checked: control.checked,
            "aria-label": control.label,
            onChange: control.onToggle,
          }),
      },
    })
  ),
  slotRender(FIND_BAR, (props) =>
    FindBarChrome({
      ...props,
      slots: {
        Search: (control) =>
          h("input", {
            value: control.value,
            "aria-label": control.label,
            onInput: (event: Event) => {
              if (event.target instanceof HTMLInputElement)
                control.onChange(event.target.value);
            },
            onKeydown: control.onKeyDown,
          }),
        Button: (control) =>
          h(
            "button",
            { disabled: control.disabled, onClick: control.onClick },
            control.label
          ),
      },
    })
  ),
  slotRender(FIND_BUTTON, (control) =>
    h("button", { onClick: control.onClick }, control.label)
  ),
  slotRender(STATUS_BAR, (props) =>
    StatusBarChrome({
      ...props,
      slots: {
        Bar: (control) =>
          h("footer", [control.items.map((item) => item.text), control.stats]),
        stats: {
          Stats: (control) =>
            h(
              "output",
              control.parts.map((part) => part.text)
            ),
        },
      },
    })
  ),
];
const features = () =>
  [
    cellNavigation(),
    columnSelectionCheckbox(),
    findInTable(),
    selectionStats(),
    statusBar(),
  ].map((feature) => extendFeature(feature, draws));
function mounted(overrides: Partial<UseDataTableShellOptions<Row>> = {}) {
  const options = shallowRef<UseDataTableShellOptions<Row>>({
    data: rows,
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    features: features(),
    ...overrides,
  });
  let captured: UseDataTableShellResult<Row> | undefined;
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup() {
        const shell = useDataTableShell(() => options.value);
        captured = shell;
        return () =>
          h(
            "section",
            {
              ref: (node) => {
                if (node instanceof HTMLElement)
                  shell.setSurface({
                    rootElement: () => node,
                    scrollElement: () => node,
                  });
              },
            },
            [
              shell.renderToolbarExtras(),
              shell.renderNavigationBefore(),
              DesktopTableChrome({
                model: shell.desktop.value,
                slots: {
                  SortButton: (control) =>
                    h("button", control.attrs, [control.content]),
                  SelectionCheckbox: (control) => h("input", control.attrs),
                },
              }),
              shell.renderNavigationAfter(),
            ]
          );
      },
    })
  );
  app.mount(root);
  const stop = () => {
    app.unmount();
    root.remove();
  };
  stops.push(stop);
  if (!captured) throw new Error("Missing shell");
  return { root, shell: captured, options };
}
function element<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}
async function key(
  target: HTMLElement,
  name: string,
  options: KeyboardEventInit = {}
) {
  const event = new KeyboardEvent("keydown", {
    key: name,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  await nextTick();
  return event;
}
it("keeps neutral feature IDs and requires typed adapter controls", () => {
  expect(features().map((feature) => feature.id)).toEqual([
    "cell-navigation",
    "column-selection-checkbox",
    "find-in-table",
    "selection-stats",
    "status-bar",
  ]);
  const scope = effectScope();
  stops.push(() => scope.stop());
  expect(() =>
    scope.run(() =>
      useDataTableShell({
        data: rows,
        columns,
        rowKey: (row) => row.id,
        features: [findInTable()],
      })
    )
  ).toThrow("find-bar");
});
it("projects row focus, column selection, statistics and range callbacks", async () => {
  const report = vi.fn();
  const view = mounted({
    features: [
      extendFeature(cellNavigation({ onRangeChange: report }), draws),
      extendFeature(columnSelectionCheckbox(), draws),
      extendFeature(selectionStats(), draws),
    ],
  });
  await nextTick();
  const focus = view.shell.gridFocus.value;
  if (!focus) throw new Error("Missing grid");
  expect(report).toHaveBeenCalledWith(null);
  expect(focus.cellAt("g", "score")).toEqual({ row: 1, col: 1 });
  focus.selectColumn(1);
  await nextTick();
  expect(focus.getRowPropsAt(1)).toHaveProperty("aria-rowindex", 2);
  expect(view.shell.gridFocus.value?.isColumnSelected(1)).toBe(true);
  expect(view.shell.selectionStats.value?.sum).toBe(40);
  expect(view.shell.gridFocus.value?.getCellPropsAt(1, 1)).toHaveProperty(
    "aria-selected",
    true
  );
  view.shell.gridFocus.value?.toggleColumn(1);
  await nextTick();
  expect(view.shell.selectionStats.value).toBeNull();
  const cell = element(view.root, '[data-grid-cell="0:0"]');
  cell.focus();
  await key(cell, "ArrowDown", { shiftKey: true });
  expect(document.activeElement).toBe(
    element(view.root, '[data-grid-cell="1:0"]')
  );
  await key(element(view.root, '[data-grid-cell="1:0"]'), "ArrowRight");
  expect(report).toHaveBeenLastCalledWith(null);
  view.options.value = { ...view.options.value, features: [] };
  await nextTick();
  focus.selectColumn(1);
  expect(view.shell.gridFocus.value).toBeUndefined();
});
it("uses the actual projected span cells and ignores summary rows", async () => {
  const view = mounted();
  await nextTick();
  const grid = view.shell.gridFocus.value;
  if (!grid) throw new Error("Missing grid");
  expect(grid.getColumnHeaderProps(0)).toHaveProperty("aria-colindex", 1);
  const header = element(view.root, "th");
  header.click();
  await nextTick();
  expect(view.shell.gridFocus.value?.isColumnSelected(0)).toBe(true);
  const cell = element(view.root, '[data-grid-cell="0:0"]');
  cell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  element(view.root, '[data-grid-cell="1:1"]').dispatchEvent(
    new MouseEvent("mouseenter")
  );
  window.dispatchEvent(new MouseEvent("mouseup"));
  await nextTick();
  expect(view.shell.gridFocus.value?.range).toEqual({
    anchor: { row: 0, col: 0 },
    head: { row: 1, col: 1 },
  });
});
it("flushes find before Saved Views, walks the latest hits and rejects stale commands", async () => {
  vi.useFakeTimers();
  const first = createMemoryAdapter();
  const second = createMemoryAdapter("find=Grace");
  const view = mounted({ urlAdapter: first, urlSync: true });
  await nextTick();
  const find = view.shell.find.value;
  if (!find) throw new Error("Missing find");
  find.openBar?.();
  find.setQuery("a");
  await nextTick();
  expect(view.shell.find.value?.matches).toHaveLength(2);
  view.shell.flushViewState();
  expect(new URLSearchParams(first.getSearch()).get("find")).toBe("a");
  first.setSearch("find=Ada");
  await nextTick();
  expect(view.shell.find.value?.query).toBe("Ada");
  view.options.value = { ...view.options.value, urlAdapter: second };
  await nextTick();
  expect(view.shell.find.value?.query).toBe("Grace");
  find.next();
  find.previous();
  await nextTick();
  expect(view.shell.find.value?.index).toBe(0);
  view.options.value = { ...view.options.value, features: [] };
  await nextTick();
  find.openBar?.();
  find.setQuery("stale");
  vi.runAllTimers();
  expect(second.getSearch()).toBe("find=Grace");
});
it("follows activity, disables DOM attributes, and never mutates after disposal", () => {
  const scope = effectScope();
  const active = shallowRef(true);
  const input = shallowRef({ enabled: true, rows, columns, rowCount: 20 });
  const focus = scope.run(() => useGridFocus(input, { active }));
  if (!focus) throw new Error("Missing focus");
  const before = focus.value;
  before.focusCell({ row: 1, col: 1 });
  before.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 1, col: 1 } });
  active.value = false;
  expect(focus.value.enabled).toBe(false);
  expect(focus.value.getGridProps()).not.toHaveProperty("role");
  expect(focus.value.getCellPropsAt(0, 0)).toEqual({});
  expect(focus.value.active).toBeNull();
  active.value = true;
  input.value = { ...input.value, enabled: false };
  expect(focus.value.range).toBeNull();
  scope.stop();
  before.focusCell({ row: 0, col: 0 });
  before.selectColumn(0);
  before.toggleColumn(0);
  before.copyCells();
});
it("supports a disabled standalone find and preserves URL query at server setup", () => {
  const scope = effectScope();
  const enabled = shallowRef(false);
  const adapter = createMemoryAdapter("find=Ada");
  const find = scope.run(() =>
    useFindInTable(() => ({
      rows,
      columns,
      enabled: enabled.value,
      urlAdapter: adapter,
    }))
  );
  if (!find) throw new Error("Missing find");
  expect(find.state.value.openBar).toBeUndefined();
  find.state.value.setQuery("ignored");
  expect(find.state.value.query).toBe("");
  enabled.value = true;
  expect(find.state.value.query).toBe("Ada");
  expect(find.state.value.current).toEqual({ row: 0, col: 0 });
  find.state.value.setOpen(false);
  find.flush();
  expect(new URLSearchParams(adapter.getSearch()).get("find")).toBeNull();
  scope.stop();
});
it("keeps structural Chrome empty when capabilities or selections are absent", () => {
  expect(GridFocusAnnouncer({})).toBeNull();
  expect(
    FillHandleChrome({
      windowIndex: 0,
      col: 0,
      slots: { Handle: () => "unexpected" },
    })
  ).toBeNull();
  expect(
    SelectionStatsChrome({ stats: null, slots: { Stats: () => "unexpected" } })
  ).toBeNull();
  expect(
    StatusBarChrome({
      enabled: false,
      shown: 0,
      selected: 0,
      stats: null,
      slots: { Bar: () => "unexpected", stats: { Stats: () => "unexpected" } },
    })
  ).toBeNull();
  const labels = resolveLabels(undefined);
  const notice = {
    kind: "export-all-page" as const,
    appearance: "one-page" as const,
    message: "Page only",
  };
  expect(
    StatusBarChrome({
      enabled: false,
      shown: 0,
      selected: 0,
      stats: null,
      notices: [notice],
      labels,
      slots: {
        Bar: (props) => props.items[0]?.text,
        stats: { Stats: () => "unexpected" },
      },
    })
  ).toBe("Page only");
});
it("reveals column checkboxes for hover, focus and selection and disposes its media listener", async () => {
  let hovering = true;
  const changed = new Set<() => void>();
  const removed = vi.fn();
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    get matches() {
      return hovering;
    },
    addEventListener: (_type: string, listener: () => void) => {
      changed.add(listener);
    },
    removeEventListener: removed,
  }));
  stops.push(() => vi.unstubAllGlobals());
  const view = mounted({ forceMobile: false });
  await nextTick();
  const wrapper = element(view.root, '[data-adapttable-part="column-select"]');
  expect(wrapper.getAttribute("data-shown")).toBeNull();
  wrapper.dispatchEvent(new Event("pointerenter"));
  await nextTick();
  expect(wrapper.hasAttribute("data-shown")).toBe(true);
  wrapper.dispatchEvent(new Event("pointerleave"));
  await nextTick();
  expect(wrapper.hasAttribute("data-shown")).toBe(false);
  wrapper.dispatchEvent(new FocusEvent("focusin"));
  await nextTick();
  expect(wrapper.hasAttribute("data-shown")).toBe(true);
  wrapper.dispatchEvent(new FocusEvent("focusout"));
  await nextTick();
  expect(wrapper.hasAttribute("data-shown")).toBe(false);
  hovering = false;
  for (const notify of changed) notify();
  await nextTick();
  expect(wrapper.hasAttribute("data-shown")).toBe(true);
  const input = element<HTMLInputElement>(wrapper, "input");
  await key(input, " ");
  wrapper.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  view.options.value = { ...view.options.value, features: [] };
  await nextTick();
  expect(removed).toHaveBeenCalled();
});
