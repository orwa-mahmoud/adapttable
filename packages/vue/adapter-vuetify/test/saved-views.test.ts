import {
  type SavedView,
  type SavedViewsStore,
  useSavedViews,
  type UseSavedViewsOptions,
} from "@adapttable/vue";
import { resolveLabels, SavedViewsMenuChrome } from "@adapttable/vue/adapter";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable } from "../src";
import {
  savedViews,
  SavedViewsPanel,
  type SavedViewsPanelProps,
} from "../src/saved-views";
import {
  vuetifySavedViewsMenuSlots,
  vuetifySavedViewsPanelSlots,
} from "../src/views/savedViewControls";

const labels = resolveLabels(undefined);
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const cleanups: (() => void)[] = [];
const initial: readonly SavedView[] = [
  { name: "First", search: "q=first", isDefault: true },
  { name: "Second", search: "q=second" },
  { name: "Team", search: "q=team", readOnly: true },
];
function vuetify() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}
function node<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}
async function settle() {
  await nextTick();
  await nextTick();
}
async function delay() {
  await new Promise((resolve) => setTimeout(resolve, 25));
  await settle();
}
async function key(target: HTMLElement, name: string, isComposing = false) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: name,
      bubbles: true,
      cancelable: true,
      isComposing,
    })
  );
  await settle();
}
async function write(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render }).use(vuetify());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}
function row(host: ParentNode, name: string) {
  const result = [
    ...host.querySelectorAll<HTMLElement>(part("saved-view-row")),
  ].find((item) => item.querySelector("button")?.textContent?.trim() === name);
  if (!result) throw new Error(`Missing view ${name}`);
  return result;
}
function action(row: ParentNode, label: string) {
  return node<HTMLButtonElement>(row, `button[aria-label="${label}"]`);
}
function panelFixture() {
  const views = shallowRef(initial);
  const onApply = vi.fn();
  const onRename = vi.fn();
  const onMove = vi.fn();
  const onSetDefault = vi.fn();
  const onRemove = vi.fn();
  const names = shallowRef({
    viewsPanel: "host-panel",
    viewsRow: "host-row",
    viewsItem: "host-item",
    viewsDelete: "host-action",
    viewsInput: "host-input",
  });
  const props = (): SavedViewsPanelProps => ({
    views: views.value,
    onApply,
    onRename,
    onMove,
    onSetDefault,
    onRemove,
    className: "surface",
    classNames: names.value,
    footer: h("span", "Stored by your application"),
  });
  const host = mount(() => h(SavedViewsPanel, props()));
  return {
    host,
    views,
    names,
    props,
    onApply,
    onRename,
    onMove,
    onSetDefault,
    onRemove,
  };
}
function storeFixture(views: readonly SavedView[] = initial) {
  const list = vi.fn(() => Promise.resolve(views));
  const save = vi.fn((_view: SavedView) => Promise.resolve());
  const remove = vi.fn((_name: string) => Promise.resolve());
  const store: SavedViewsStore = { list, save, remove };
  return { store, list, save, remove };
}
async function open(host: ParentNode) {
  await settle();
  const trigger = node<HTMLButtonElement>(host, part("views-button"));
  trigger.focus();
  await key(trigger, "ArrowDown");
  await delay();
  return trigger;
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

it("fills only the binding's saved-view channel with the existing managed surface", () => {
  const feature = savedViews({ storageKey: "test", storage: null });
  expect(feature.id).toBe("saved-views");
  expect(feature.renders?.map((fill) => fill.slot.id)).toEqual([
    "vue-saved-views-control",
  ]);
  expect(vuetifySavedViewsMenuSlots.Panel.interactionOwner).toBe("kit");
});

it("renders every ordered panel control with genuine Vuetify surfaces, classes and badges", async () => {
  const f = panelFixture();
  await settle();
  const surface = node(f.host, part("saved-views-panel"));
  expect(surface.tagName).toBe("SECTION");
  expect(surface.classList.contains("v-card")).toBe(true);
  expect(surface.classList.contains("host-panel")).toBe(true);
  expect(surface.classList.contains("surface")).toBe(true);
  expect(node(f.host, part("saved-views-title")).tagName).toBe("H2");
  expect(node(f.host, part("saved-views-footer")).textContent).toBe(
    "Stored by your application"
  );
  const first = row(f.host, "First");
  expect(first.classList.contains("v-sheet")).toBe(true);
  expect(first.classList.contains("host-row")).toBe(true);
  const controls = [
    ...first.querySelectorAll<HTMLButtonElement>(
      `${part("saved-view-controls")} button`
    ),
  ];
  expect(controls.map((button) => button.getAttribute("aria-label"))).toEqual([
    labels.renameView,
    labels.moveViewUp,
    labels.moveViewDown,
    labels.setDefaultView,
    labels.deleteView,
  ]);
  expect(
    controls.every(
      (button) =>
        button.classList.contains("v-btn") &&
        button.classList.contains("host-action")
    )
  ).toBe(true);
  expect(controls[1]?.disabled).toBe(true);
  expect(controls[3]?.getAttribute("aria-pressed")).toBe("true");
  expect(
    node(first, part("saved-view-default")).classList.contains("v-chip")
  ).toBe(true);
  const readonly = row(f.host, "Team");
  expect(node(readonly, part("saved-view-readonly")).textContent).toBe(
    labels.readOnlyViewBadge
  );
  expect(
    [
      ...readonly.querySelectorAll<HTMLButtonElement>(
        `${part("saved-view-controls")} button`
      ),
    ].every((button) => button.disabled)
  ).toBe(true);
  node<HTMLButtonElement>(readonly, "button").click();
  expect(f.onApply).toHaveBeenCalledExactlyOnceWith("Team");
});

it("requests apply, order, default and removal without mutating the controlled list", async () => {
  const f = panelFixture();
  await settle();
  const second = row(f.host, "Second");
  node<HTMLButtonElement>(second, "button").click();
  action(second, labels.moveViewUp).click();
  action(second, labels.moveViewDown).click();
  action(second, labels.setDefaultView).click();
  action(second, labels.deleteView).click();
  await settle();
  expect(f.onApply).toHaveBeenCalledExactlyOnceWith("Second");
  expect(f.onMove.mock.calls).toEqual([
    ["Second", -1],
    ["Second", 1],
  ]);
  expect(f.onSetDefault).toHaveBeenCalledExactlyOnceWith("Second");
  expect(f.onRemove).toHaveBeenCalledExactlyOnceWith("Second");
  expect(f.host.querySelectorAll(part("saved-view-row"))).toHaveLength(3);
  expect(
    row(f.host, "First").querySelector(part("saved-view-default"))
  ).not.toBeNull();
  f.views.value = [initial[1]!, initial[0]!];
  await settle();
  expect(node(f.host, part("saved-view-row")).textContent).toContain("Second");
  expect(action(row(f.host, "Second"), labels.moveViewUp).disabled).toBe(true);
  expect(action(row(f.host, "First"), labels.moveViewDown).disabled).toBe(true);
});

it("focuses the native rename input and submits the exact draft only after IME composition", async () => {
  const f = panelFixture();
  await settle();
  action(row(f.host, "Second"), labels.renameView).click();
  await settle();
  const input = node<HTMLInputElement>(f.host, "input");
  expect(document.activeElement).toBe(input);
  expect(input.getAttribute("aria-label")).toBe(labels.viewName);
  expect(input.closest(".host-input.v-text-field")).not.toBeNull();
  await write(input, "  Personal  ");
  await key(input, "Enter", true);
  expect(f.onRename).not.toHaveBeenCalled();
  expect(f.host.querySelector("input")).toBe(input);
  await key(input, "Enter");
  expect(f.onRename).toHaveBeenCalledExactlyOnceWith("Second", "  Personal  ");
  expect(f.host.querySelector("input")).toBeNull();
  expect(row(f.host, "Second")).toBeTruthy();
});

it("cancels rename on Escape or externally changed read-only ownership", async () => {
  const f = panelFixture();
  await settle();
  action(row(f.host, "Second"), labels.renameView).click();
  await settle();
  let input = node<HTMLInputElement>(f.host, "input");
  await write(input, "Abandoned");
  await key(input, "Escape", true);
  expect(f.host.querySelector("input")).toBe(input);
  await key(input, "Escape");
  expect(f.host.querySelector("input")).toBeNull();
  expect(f.onRename).not.toHaveBeenCalled();
  action(row(f.host, "Second"), labels.renameView).click();
  await settle();
  input = node<HTMLInputElement>(f.host, "input");
  f.views.value = initial.map((view) =>
    view.name === "Second" ? { ...view, readOnly: true } : view
  );
  await settle();
  expect(f.host.querySelector("input")).toBeNull();
  await key(input, "Enter");
  expect(f.onRename).not.toHaveBeenCalled();
});

it("uses the binding model to validate rename and persist the accepted order and default", async () => {
  const f = storeFixture();
  const reorder = vi.fn((_names: readonly string[]) => Promise.resolve());
  const View = defineComponent({
    setup() {
      const model = useSavedViews({
        storageKey: "managed",
        store: { ...f.store, reorder },
        urlSync: false,
      });
      return () =>
        h(SavedViewsPanel, {
          views: model.views.value,
          onApply: model.apply,
          onRename: model.rename,
          onMove: model.move,
          onSetDefault: model.setDefault,
          onRemove: model.remove,
        });
    },
  });
  const host = mount(() => h(View));
  await settle();
  action(row(host, "Second"), labels.renameView).click();
  await settle();
  await write(node<HTMLInputElement>(host, "input"), "  ");
  await key(node(host, "input"), "Enter");
  expect(f.save).not.toHaveBeenCalled();
  expect(row(host, "Second")).toBeTruthy();
  action(row(host, "Second"), labels.renameView).click();
  await settle();
  await write(node<HTMLInputElement>(host, "input"), "  Personal  ");
  await key(node(host, "input"), "Enter");
  expect(row(host, "Personal")).toBeTruthy();
  expect(f.save).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Personal" })
  );
  action(row(host, "Personal"), labels.moveViewUp).click();
  await settle();
  expect(node(host, part("saved-view-row")).textContent).toContain("Personal");
  expect(reorder).toHaveBeenLastCalledWith(["Personal", "First", "Team"]);
  action(row(host, "Personal"), labels.setDefaultView).click();
  await settle();
  expect(
    row(host, "Personal").querySelector(part("saved-view-default"))
  ).not.toBeNull();
  expect(
    row(host, "First").querySelector(part("saved-view-default"))
  ).toBeNull();
  action(row(host, "Personal"), labels.deleteView).click();
  await settle();
  expect(f.remove).toHaveBeenCalledWith("Personal");
  expect(host.querySelectorAll(part("saved-view-row"))).toHaveLength(2);
});

it("keeps the input target stable across controlled edits and retires callback refs", async () => {
  const events: [string, HTMLInputElement | null][] = [];
  const first = vi.fn((input: HTMLInputElement | null) => {
    events.push(["first", input]);
  });
  const second = vi.fn((input: HTMLInputElement | null) => {
    events.push(["second", input]);
  });
  const owner = shallowRef(first);
  const visible = shallowRef(true);
  const value = shallowRef("First");
  const onChange = vi.fn();
  const slots = vuetifySavedViewsPanelSlots(() => ({}));
  const host = mount(() =>
    h(
      "div",
      visible.value
        ? [
            slots.Input({
              label: "Rename",
              ref: owner.value,
              value: value.value,
              onChange,
              onCommit: () => undefined,
              onCancel: () => undefined,
            }),
          ]
        : []
    )
  );
  await settle();
  const input = node<HTMLInputElement>(host, "input");
  expect(first).toHaveBeenCalledExactlyOnceWith(input);
  await write(input, "Rejected");
  expect(onChange).toHaveBeenCalledExactlyOnceWith("Rejected");
  expect(input.value).toBe("First");
  value.value = "Accepted";
  await settle();
  expect(host.querySelector("input")).toBe(input);
  expect(first).toHaveBeenCalledTimes(1);
  owner.value = second;
  await settle();
  expect(first.mock.calls).toEqual([[input], [null]]);
  expect(second.mock.calls).toEqual([[input]]);
  expect(events).toEqual([
    ["first", input],
    ["first", null],
    ["second", input],
  ]);
  visible.value = false;
  await settle();
  expect(second.mock.calls).toEqual([[input], [null]]);
});

it("uses one live saved-view model through DataTable and an RTL managed menu", async () => {
  const f = storeFixture();
  const options = shallowRef<UseSavedViewsOptions>({
    storageKey: "menu",
    store: f.store,
  });
  const features = [savedViews(() => options.value)];
  const host = mount(() =>
    h(DataTable<{ id: string }>, {
      data: [{ id: "one" }],
      columns: [{ key: "id", header: "ID" }],
      rowKey: (row) => row.id,
      features,
      urlSync: false,
      forceMobile: false,
      dir: "rtl",
      classNames: {
        viewsButton: "host-trigger",
        viewsPanel: "host-menu",
        viewsInput: "host-save-input",
      },
    })
  );
  const trigger = await open(host);
  expect(f.list).toHaveBeenCalledOnce();
  expect(trigger.classList.contains("v-btn")).toBe(true);
  expect(trigger.classList.contains("host-trigger")).toBe(true);
  const panel = node(document, part("views-panel"));
  expect(panel.classList.contains("v-card")).toBe(true);
  expect(panel.classList.contains("host-menu")).toBe(true);
  expect(panel.getAttribute("dir")).toBe("rtl");
  expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
  expect(document.querySelectorAll(`[id="${panel.id}"]`)).toHaveLength(1);
  const input = node<HTMLInputElement>(panel, "input");
  expect(input.closest(".host-save-input.v-text-field")).not.toBeNull();
  expect(input.getAttribute("aria-label")).toBe(labels.viewName);
  await write(input, "Team");
  expect(node<HTMLButtonElement>(panel, part("views-save")).disabled).toBe(
    true
  );
  await write(input, " New view ");
  await key(input, "Enter", true);
  expect(f.save).not.toHaveBeenCalled();
  await key(input, "Enter");
  expect(f.save).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ name: "New view" })
  );
  expect(input.value).toBe("");
  expect(panel.textContent).toContain("New view");
  input.focus();
  await key(input, "Escape");
  expect(document.querySelector(part("views-panel"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  await open(host);
  expect(f.list).toHaveBeenCalledOnce();
});

it("applies and deletes via the model while retaining the supplied overlay container", async () => {
  const f = storeFixture();
  const container = document.createElement("section");
  document.body.append(container);
  cleanups.push(() => container.remove());
  const View = defineComponent({
    setup() {
      const model = useSavedViews({
        storageKey: "contained",
        store: f.store,
        urlSync: false,
      });
      return () =>
        h(SavedViewsMenuChrome, {
          savedViews: model,
          labels,
          dir: "ltr",
          container,
          slots: vuetifySavedViewsMenuSlots,
        });
    },
  });
  const host = mount(() => h(View));
  const trigger = await open(host);
  const panel = node(container, part("views-panel"));
  const buttons = [
    ...panel.querySelectorAll<HTMLButtonElement>(part("views-delete")),
  ];
  expect(buttons[2]?.disabled).toBe(true);
  buttons[1]?.click();
  await settle();
  expect(f.remove).toHaveBeenCalledExactlyOnceWith("Second");
  expect(panel.textContent).not.toContain("Second");
  node<HTMLButtonElement>(panel, part("views-item")).click();
  await settle();
  expect(document.querySelector(part("views-panel"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("retires an open menu and its pending input when KeepAlive deactivates it", async () => {
  const f = storeFixture();
  const visible = shallowRef(true);
  const View = defineComponent({
    setup() {
      const model = useSavedViews({
        storageKey: "lifetime",
        store: f.store,
        urlSync: false,
      });
      return () =>
        h(SavedViewsMenuChrome, {
          savedViews: model,
          labels,
          dir: "ltr",
          slots: vuetifySavedViewsMenuSlots,
        });
    },
  });
  const host = mount(() =>
    h(KeepAlive, {}, { default: () => (visible.value ? h(View) : null) })
  );
  const trigger = await open(host);
  const input = node<HTMLInputElement>(
    document,
    `${part("views-panel")} input`
  );
  await write(input, "Stale");
  input.focus();
  const focus = vi.spyOn(trigger, "focus");
  visible.value = false;
  await settle();
  await key(input, "Enter");
  expect(f.save).not.toHaveBeenCalled();
  expect(document.querySelector(part("views-panel"))).toBeNull();
  expect(focus).not.toHaveBeenCalled();
  visible.value = true;
  await settle();
  expect(node(host, part("views-button")).getAttribute("aria-expanded")).toBe(
    "false"
  );
});

it("server-renders genuine empty and populated panels and a closed toolbar without native refs", async () => {
  const f = panelFixture();
  const owner = vi.fn<(input: HTMLInputElement | null) => void>();
  const slots = vuetifySavedViewsPanelSlots(() => ({}));
  const app = createSSRApp({
    render: () =>
      h("div", [
        h(SavedViewsPanel, f.props()),
        h(SavedViewsPanel, { ...f.props(), views: [], footer: undefined }),
        h(DataTable<{ id: string }>, {
          data: [],
          columns: [{ key: "id", header: "ID" }],
          rowKey: (row) => row.id,
          urlSync: false,
          features: [savedViews({ storageKey: "ssr", storage: null })],
        }),
        slots.Input({
          label: "Name",
          ref: owner,
          value: "First",
          onChange: () => undefined,
          onCommit: () => undefined,
          onCancel: () => undefined,
        }),
      ]),
  }).use(vuetify());
  const html = await renderToString(app);
  expect(html).toContain('data-adapttable-part="saved-views-panel"');
  expect(html).toContain("v-card");
  expect(html).toContain("v-chip");
  expect(html).toContain('data-adapttable-part="views-button"');
  expect(html).not.toContain('data-adapttable-part="views-panel"');
  expect(owner).not.toHaveBeenCalled();
});

it("preserves a native rename draft, caret and focus through parent styling updates", async () => {
  const f = panelFixture();
  await settle();
  action(row(f.host, "Second"), labels.renameView).click();
  await settle();
  const input = node<HTMLInputElement>(f.host, "input");
  await write(input, "Unsent draft");
  input.setSelectionRange(2, 4);
  f.names.value = {
    ...f.names.value,
    viewsInput: "updated-input",
    viewsPanel: "updated-panel",
  };
  await settle();
  expect(node(f.host, "input")).toBe(input);
  expect(input.value).toBe("Unsent draft");
  expect(input.closest(".updated-input.v-text-field")).not.toBeNull();
  expect(document.activeElement).toBe(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([2, 4]);
  await key(input, "Enter");
  expect(f.onRename).toHaveBeenCalledExactlyOnceWith("Second", "Unsent draft");
});
