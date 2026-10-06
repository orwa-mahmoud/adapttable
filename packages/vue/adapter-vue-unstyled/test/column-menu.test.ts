import {
  type ColumnDef,
  type ColumnLayoutState,
  useColumnLayout,
} from "@adapttable/vue";
import {
  COLUMN_HEADER_RENAME,
  ColumnHeaderRenameChrome,
  ColumnMenuChrome,
  columnMenuSlotKey,
  type ColumnMenuSlotProps,
  type ColumnMenuSlots,
  featureSlotFillsOf,
  renderFeatureSlot,
  resolveLabels,
  useColumnMenu,
} from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  isVNode,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { ColumnMenu, columnMenu } from "../src/column-menu";
import { nativeColumnMenuSlots } from "../src/columns/nativeColumnMenuControls";
import { NativeColumnMenuPanel } from "../src/columns/NativeColumnMenuPanel";
import {
  clickControl,
  findControl,
  keyControl,
  mountControl,
  part,
  setText,
} from "./view-controls.helpers";
interface Row {
  id: number;
  name: string;
}
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", header: "Name", renameable: true, sortable: true },
  { key: "id", header: "ID", lockVisibility: true },
  { key: "other", header: "Other" },
];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0).reverse()) stop();
});
function fixture(
  overrides: Partial<ColumnMenuSlotProps<Row>> = {},
  controlled?: { value: ColumnLayoutState; accept: boolean }
) {
  const options = shallowRef(overrides);
  const visible = shallowRef(true);
  const state = shallowRef(controlled?.value);
  const changed = vi.fn((next: ColumnLayoutState) => {
    if (controlled?.accept) state.value = next;
  });
  const renamed = vi.fn();
  const onAutoSize = vi.fn();
  const Component = defineComponent({
    setup() {
      const layout = useColumnLayout(columns, () => ({
        columnLayout: state,
        onColumnLayoutChange: changed,
        onColumnRename: renamed,
      }));
      return () =>
        h(ColumnMenu<Row>, {
          allColumns: columns,
          layout: layout.value,
          labels: resolveLabels(undefined),
          onAutoSize,
          onRenameColumn: layout.value.setName,
          ...options.value,
        });
    },
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(KeepAlive, null, {
          default: () => (visible.value ? h(Component) : null),
        }),
    })
  );
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  return { root, options, visible, state, changed, renamed, onAutoSize };
}
function row(root: ParentNode, name: string): HTMLElement {
  const item = [
    ...root.querySelectorAll<HTMLElement>(part("column-menu-item")),
  ].find(
    (element) =>
      element.querySelector(part("column-menu-label"))?.textContent === name
  );
  if (!item) throw new Error(`Missing row ${name}`);
  return item;
}
async function action(root: ParentNode, label: string): Promise<void> {
  const button = [
    ...root.querySelectorAll<HTMLButtonElement>(part("column-menu-action")),
  ].find((item) => item.textContent === label);
  if (!button) throw new Error(`Missing action ${label}`);
  button.focus();
  button.click();
  await nextTick();
}
function dispatchAttribute(
  attrs: Readonly<Record<string, unknown>>,
  key: string,
  event: Event
): void {
  const handler = attrs[key];
  if (typeof handler !== "function") throw new Error(`Missing handler ${key}`);
  handler(event);
}
describe("native column manager", () => {
  it("fills both binding channels without changing the public factory identity", () => {
    const feature = columnMenu();
    expect(feature.id).toBe("column-menu");
    expect(feature.renders?.map((fill) => fill.slot.id)).toEqual([
      "column-menu",
      "column-header-rename",
    ]);
  });
  it("uses native controls, localized labels, classes and RTL; closes outside and restores Escape focus", async () => {
    const f = fixture({
      dir: "rtl",
      labels: resolveLabels({ columns: "Colonnes", searchColumns: "Chercher" }),
      classNames: {
        columnMenuButton: "trigger",
        columnMenuPanel: "panel",
        columnMenuSearch: "search",
      },
    });
    const trigger = findControl<HTMLButtonElement>(
      f.root,
      part("column-menu-button")
    );
    expect(trigger.textContent).toBe("Colonnes");
    expect(trigger.className).toBe("trigger");
    await clickControl(f.root, part("column-menu-button"));
    const panel = findControl<HTMLElement>(f.root, part("column-menu-panel"));
    expect(panel.dir).toBe("rtl");
    expect(panel.className).toBe("panel");
    expect(document.activeElement).toBe(
      findControl(f.root, part("column-menu-search"))
    );
    expect(
      findControl<HTMLElement>(f.root, part("column-menu-search")).getAttribute(
        "aria-label"
      )
    ).toBe("Chercher");
    expect(
      f.root.querySelectorAll('button[data-adapttable-part="column-menu-grip"]')
    ).toHaveLength(3);
    await keyControl(findControl(f.root, part("column-menu-search")), "Escape");
    expect(f.root.querySelector(part("column-menu-panel"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await clickControl(f.root, part("column-menu-button"));
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
  it("keeps rejected controlled visibility unchanged, then accepts the same request", async () => {
    const control = {
      value: { order: [], hidden: [], pinned: {}, widths: {} },
      accept: false,
    };
    const f = fixture({}, control);
    await clickControl(f.root, part("column-menu-button"));
    await clickControl(row(f.root, "Name"), part("column-menu-visibility"));
    expect(f.changed).toHaveBeenCalledWith(
      expect.objectContaining({ hidden: ["name"] })
    );
    expect(
      findControl<HTMLElement>(
        row(f.root, "Name"),
        part("column-menu-visibility")
      ).getAttribute("aria-pressed")
    ).toBe("true");
    control.accept = true;
    await clickControl(row(f.root, "Name"), part("column-menu-visibility"));
    expect(
      findControl<HTMLElement>(
        row(f.root, "Name"),
        part("column-menu-visibility")
      ).getAttribute("aria-pressed")
    ).toBe("false");
    expect(
      findControl<HTMLButtonElement>(
        row(f.root, "ID"),
        part("column-menu-visibility")
      ).disabled
    ).toBe(true);
  });
  it("renames with trimmed input, live validation labels and announcements, restoring focus", async () => {
    const f = fixture();
    await clickControl(f.root, part("column-menu-button"));
    await clickControl(row(f.root, "Name"), part("column-menu-more"));
    const label = resolveLabels(undefined);
    await action(f.root, label.renameColumn);
    const input = findControl<HTMLInputElement>(
      f.root,
      part("column-rename-input")
    );
    expect(document.activeElement).toBe(input);
    await setText(f.root, part("column-rename-input"), "  ");
    await keyControl(findControl(f.root, part("column-rename-input")), "Enter");
    expect(
      findControl<HTMLElement>(f.root, part("column-rename-error")).textContent
    ).toBe(label.columnNameRequired);
    f.options.value = {
      ...f.options.value,
      labels: resolveLabels({ columnNameRequired: "Nom requis" }),
    };
    await nextTick();
    await keyControl(findControl(f.root, part("column-rename-input")), "Enter");
    expect(
      findControl<HTMLElement>(f.root, part("column-rename-error")).textContent
    ).toBe("Nom requis");
    await setText(f.root, part("column-rename-input"), "  Display name  ");
    await keyControl(findControl(f.root, part("column-rename-input")), "Enter");
    expect(f.renamed).toHaveBeenCalledWith("name", "Display name");
    expect(row(f.root, "Display name")).toBeTruthy();
    expect(f.root.querySelector(part("column-rename-input"))).toBeNull();
    expect(f.root.textContent).toContain(
      label.columnRenamed({ previous: "Name", name: "Display name" })
    );
    expect(document.activeElement?.textContent).toBe(label.renameColumn);
  });
  it("supports filtered bulk requests, reserved rows, pinning, autosize and reset", async () => {
    const f = fixture({ hasRowActions: true, hasRowReorder: true });
    await clickControl(f.root, part("column-menu-button"));
    expect(f.root.querySelector('[data-actions=""]')).not.toBeNull();
    expect(f.root.querySelector('[data-reorder=""]')).not.toBeNull();
    await setText(f.root, part("column-menu-search"), "name");
    expect(f.root.querySelectorAll(part("column-menu-item"))).toHaveLength(3);
    await clickControl(row(f.root, "Name"), part("column-menu-pin"));
    expect(row(f.root, "Name").getAttribute("data-pinned")).toBe("start");
    await clickControl(f.root, part("column-menu-auto-size"));
    expect(f.onAutoSize).toHaveBeenCalledOnce();
    await clickControl(f.root, part("column-menu-reset"));
    expect(row(f.root, "Name").hasAttribute("data-pinned")).toBe(false);
  });
  it("suspends the menu and cancels focus work during KeepAlive; reopens cleanly", async () => {
    const f = fixture();
    await clickControl(f.root, part("column-menu-button"));
    f.visible.value = false;
    await nextTick();
    expect(f.root.querySelector(part("column-menu-panel"))).toBeNull();
    f.visible.value = true;
    await nextTick();
    expect(
      findControl<HTMLElement>(f.root, part("column-menu-button")).getAttribute(
        "aria-expanded"
      )
    ).toBe("false");
    await clickControl(f.root, part("column-menu-button"));
    expect(f.root.querySelector(part("column-menu-panel"))).not.toBeNull();
  });
  it("provides direct header rename, Escape cancellation and visible original caption", async () => {
    const rename = vi.fn();
    const f = mountControl(() =>
      h(ColumnHeaderRenameChrome, {
        columnKey: "name",
        name: "Name",
        labels: resolveLabels(undefined),
        onRenameColumn: rename,
        children: "Original caption",
        slots: nativeColumnMenuSlots,
      })
    );
    stops.push(f.stop);
    const trigger = findControl<HTMLElement>(
      f.root,
      part("header-rename-button")
    );
    trigger.focus();
    await clickControl(f.root, part("header-rename-button"));
    await setText(f.root, part("header-rename-input"), "Discard");
    await keyControl(
      findControl(f.root, part("header-rename-input")),
      "Escape"
    );
    expect(rename).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
    expect(f.root.textContent).toContain("Original caption");
  });
  it("renders the actual feature fills for both typed positions", async () => {
    const fills = featureSlotFillsOf([columnMenu()]);
    const rename = vi.fn();
    const Component = defineComponent({
      setup() {
        const layout = useColumnLayout(columns, {});
        return () =>
          h("section", [
            ...renderFeatureSlot(columnMenuSlotKey<Row>(), fills, {
              allColumns: columns,
              layout: layout.value,
              labels: resolveLabels(undefined),
              onAutoSize: () => undefined,
            }),
            ...renderFeatureSlot(COLUMN_HEADER_RENAME, fills, {
              columnKey: "name",
              name: "Name",
              labels: resolveLabels(undefined),
              onRenameColumn: rename,
              children: "Caption",
            }),
          ]);
      },
    });
    const f = mountControl(() => h(Component));
    stops.push(f.stop);
    await clickControl(f.root, part("column-menu-button"));
    expect(row(f.root, "Name")).toBeTruthy();
    await clickControl(f.root, part("header-rename-button"));
    await setText(f.root, part("header-rename-input"), "Next");
    findControl<HTMLFormElement>(
      f.root,
      part("header-rename-form")
    ).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();
    expect(rename).toHaveBeenCalledWith("name", "Next");
  });
  it("renders plugin choices as controlled native selects and resolves current plugin state", async () => {
    const chosen = shallowRef("sum");
    const acceptChoice = shallowRef(false);
    const changed = vi.fn((next: string) => {
      if (acceptChoice.value) chosen.value = next;
    });
    const host: NonNullable<ColumnMenuSlotProps<Row>["featureHost"]> = {
      filterTypes: [],
      filterExtends: [],
      editors: new Map(),
      aggregators: new Map(),
      writers: [],
      panels: [],
      commands: [],
      contextMenuItems: [],
      columnMenuActions: [
        () => ({
          kind: "choice",
          id: "aggregate",
          label: "Aggregate",
          value: chosen.value,
          disabled: false,
          options: [
            { value: "sum", label: "Sum" },
            { value: "avg", label: "Average" },
          ],
          onChange: changed,
        }),
      ],
    };
    const f = fixture({
      featureHost: host,
      sortBy: "name",
      sortDir: "asc",
      onSortColumn: vi.fn(),
    });
    await clickControl(f.root, part("column-menu-button"));
    await clickControl(row(f.root, "Name"), part("column-menu-more"));
    const select = findControl<HTMLSelectElement>(
      f.root,
      part("column-menu-choice-select")
    );
    select.value = "avg";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(changed).toHaveBeenCalledWith("avg");
    expect(select.value).toBe("sum");
    acceptChoice.value = true;
    select.value = "avg";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(select.value).toBe("avg");
    const disabled = [
      ...f.root.querySelectorAll<HTMLButtonElement>(part("column-menu-action")),
    ].find(
      (item) => item.textContent === resolveLabels(undefined).sortAscending
    );
    if (!disabled) throw new Error("Missing disabled sort");
    disabled.dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(f.root.querySelector(part("column-menu-submenu"))).not.toBeNull();
    await action(f.root, resolveLabels(undefined).sortDescending);
    expect(f.root.querySelector(part("column-menu-submenu"))).toBeNull();
  });
  it("rejects missing kit controls at runtime without drawing fallback HTML", () => {
    for (const missing of [
      "Trigger",
      "Button",
      "Input",
      "Choice",
      "Panel",
    ] as const) {
      const slots = { ...nativeColumnMenuSlots };
      Reflect.deleteProperty(slots, missing);
      const root = document.createElement("div");
      document.body.append(root);
      const errors: unknown[] = [];
      const app = createApp(
        defineComponent({
          setup() {
            const layout = useColumnLayout(columns, {});
            const model = useColumnMenu(() => ({
              allColumns: columns,
              layout: layout.value,
              labels: resolveLabels(undefined),
              onAutoSize: () => undefined,
            }));
            return () => h(ColumnMenuChrome, { model, slots });
          },
        })
      );
      app.config.errorHandler = (error) => {
        errors.push(error);
      };
      app.mount(root);
      expect(errors).toHaveLength(1);
      expect(String(errors[0])).toContain(`ColumnMenu.${missing}`);
      expect(root.querySelector("button,input,select")).toBeNull();
      app.unmount();
      root.remove();
    }
    const slots = { ...nativeColumnMenuSlots };
    Reflect.deleteProperty(slots, "Input");
    const root = document.createElement("div");
    const errors: unknown[] = [];
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(ColumnHeaderRenameChrome, {
            columnKey: "name",
            name: "Name",
            labels: resolveLabels(undefined),
            onRenameColumn: () => undefined,
            slots,
          }),
      })
    );
    app.config.errorHandler = (error) => {
      errors.push(error);
    };
    app.mount(root);
    expect(String(errors[0])).toContain("ColumnRename.Input");
    app.unmount();
  });
  it("honors nested Escape, ordinary keys, trigger toggling and composition without stray focus", async () => {
    const f = fixture();
    const trigger = findControl<HTMLElement>(
      f.root,
      part("column-menu-button")
    );
    await keyControl(trigger, "ArrowLeft");
    expect(f.root.querySelector(part("column-menu-panel"))).toBeNull();
    await keyControl(trigger, "ArrowDown");
    const search = findControl<HTMLElement>(f.root, part("column-menu-search"));
    search.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await nextTick();
    expect(f.root.querySelector(part("column-menu-panel"))).not.toBeNull();
    await clickControl(row(f.root, "Name"), part("column-menu-more"));
    await keyControl(
      findControl(row(f.root, "Name"), part("column-menu-more")),
      "x"
    );
    await keyControl(
      findControl(row(f.root, "Name"), part("column-menu-more")),
      "Escape"
    );
    expect(f.root.querySelector(part("column-menu-submenu"))).toBeNull();
    expect(f.root.querySelector(part("column-menu-panel"))).not.toBeNull();
    await clickControl(row(f.root, "Name"), part("column-menu-more"));
    await action(f.root, resolveLabels(undefined).renameColumn);
    await setText(f.root, part("column-rename-input"), " ");
    findControl<HTMLElement>(f.root, part("column-rename-input")).dispatchEvent(
      new Event("blur")
    );
    await nextTick();
    expect(f.root.querySelector(part("column-rename-error"))).not.toBeNull();
    await keyControl(
      findControl(f.root, part("column-rename-input")),
      "Enter",
      true
    );
    expect(f.renamed).not.toHaveBeenCalled();
    await clickControl(f.root, part("column-rename-cancel"));
    await clickControl(f.root, part("column-menu-button"));
    trigger.click();
    trigger.click();
    await nextTick();
    expect(f.root.querySelector(part("column-menu-panel"))).toBeNull();
  });
  it("allows kit-surface dismissal and revokes retained trigger callbacks when inactive", async () => {
    let triggerAttrs: Readonly<Record<string, unknown>> = {};
    let closeSurface = (): void => undefined;
    const active = shallowRef(true);
    const slots: ColumnMenuSlots = {
      ...nativeColumnMenuSlots,
      Trigger: (props) => {
        triggerAttrs = props.attrs;
        return nativeColumnMenuSlots.Trigger(props);
      },
      Panel: (props) => {
        closeSurface = props.onClose;
        return nativeColumnMenuSlots.Panel(props);
      },
    };
    const Component = defineComponent({
      setup() {
        const layout = useColumnLayout(columns, {});
        const model = useColumnMenu(() => ({
          allColumns: columns,
          layout: layout.value,
          labels: resolveLabels(undefined),
          onAutoSize: () => undefined,
        }));
        return () =>
          h(ColumnMenuChrome, { model: { ...model, active }, slots });
      },
    });
    const f = mountControl(() => h(Component));
    stops.push(f.stop);
    await clickControl(f.root, part("column-menu-button"));
    closeSurface();
    await nextTick();
    expect(f.root.querySelector(part("column-menu-panel"))).toBeNull();
    active.value = false;
    await nextTick();
    dispatchAttribute(triggerAttrs, "onClick", new Event("click"));
    dispatchAttribute(
      triggerAttrs,
      "onKeydown",
      new KeyboardEvent("keydown", { key: "ArrowDown" })
    );
    await nextTick();
    expect(f.root.querySelector(part("column-menu-panel"))).toBeNull();
  });
  it("cancels an open direct editor when the column identity is replaced", async () => {
    const key = shallowRef("name");
    const renamed = vi.fn();
    const f = mountControl(() =>
      h(ColumnHeaderRenameChrome, {
        columnKey: key.value,
        name: key.value,
        labels: resolveLabels(undefined),
        onRenameColumn: renamed,
        slots: nativeColumnMenuSlots,
      })
    );
    stops.push(f.stop);
    await clickControl(f.root, part("header-rename-button"));
    await setText(f.root, part("header-rename-input"), "Obsolete");
    key.value = "team";
    await nextTick();
    expect(f.root.querySelector(part("header-rename-input"))).toBeNull();
    expect(renamed).not.toHaveBeenCalled();
  });
  it("ignores native control events without the expected DOM target", () => {
    const change = vi.fn();
    const input = nativeColumnMenuSlots.Input({
      attrs: {},
      value: "",
      onChange: change,
    });
    const choice = nativeColumnMenuSlots.Choice({
      attrs: {},
      value: "a",
      options: [{ value: "a", label: "A" }],
      onChange: change,
    });
    if (!isVNode(input) || !isVNode(choice))
      throw new Error("Missing native control nodes");
    dispatchAttribute(input.props ?? {}, "onInput", new Event("input"));
    dispatchAttribute(choice.props ?? {}, "onChange", new Event("change"));
    expect(change).not.toHaveBeenCalled();
  });
  it("clamps the inline native surface at both viewport edges and releases resize listeners", async () => {
    let left = -50;
    let width = 200;
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.getAttribute("data-adapttable-part") !== "column-menu-panel")
          return original.call(this);
        return new DOMRect(left, 40, width, 200);
      }
    );
    const f = fixture();
    await clickControl(f.root, part("column-menu-button"));
    const panel = findControl<HTMLElement>(f.root, part("column-menu-panel"));
    expect(panel.style.transform).toBe("translateX(58px)");
    left = window.innerWidth - 100;
    window.dispatchEvent(new Event("resize"));
    expect(panel.style.transform).toBe("translateX(-108px)");
    left = 20;
    width = 100;
    window.dispatchEvent(new Event("scroll"));
    expect(panel.style.transform).toBe("");
    expect(panel.style.maxHeight).toBe(`${String(window.innerHeight - 48)}px`);
    await clickControl(f.root, part("column-menu-button"));
    left = -100;
    window.dispatchEvent(new Event("resize"));
    expect(panel.style.transform).toBe("");
    vi.restoreAllMocks();
  });
  it("can render into a detached document without a window or global listeners", async () => {
    const doc = document.implementation.createHTMLDocument("Detached");
    const root = doc.createElement("main");
    doc.body.append(root);
    const content = shallowRef("First");
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(NativeColumnMenuPanel, {
            control: {
              attrs: { "data-adapttable-part": "detached-panel" },
              content: content.value,
              onClose: () => undefined,
            },
          }),
      })
    );
    app.mount(root);
    expect(root.textContent).toBe("First");
    content.value = "Next";
    await nextTick();
    expect(root.textContent).toBe("Next");
    app.unmount();
    expect(root.textContent).toBe("");
  });
  it("renders only a closed trigger during SSR", async () => {
    const app = createSSRApp(
      defineComponent({
        setup() {
          const layout = useColumnLayout(columns, {});
          return () =>
            h(ColumnMenu<Row>, {
              allColumns: columns,
              layout: layout.value,
              labels: resolveLabels(undefined),
              onAutoSize: () => undefined,
            });
        },
      })
    );
    const html = await renderToString(app);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-adapttable-part="column-menu-panel"');
  });
});
