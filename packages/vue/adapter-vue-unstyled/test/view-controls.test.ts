import type { SavedView } from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";
import { fullscreen } from "../src/fullscreen";
import {
  savedViews,
  SavedViewsPanel,
  type SavedViewsPanelProps,
} from "../src/saved-views";
import {
  clickControl,
  findControl,
  keyControl,
  mountControl,
  mountViews,
  part,
  selectDensity,
  setText,
  testUrlAdapter,
  viewDefaults,
  type ViewRow,
  viewStorage,
} from "./view-controls.helpers";

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const stop of cleanup.splice(0).reverse()) stop();
  vi.restoreAllMocks();
});
const features = () => [
  densityChooser(),
  fullscreen(),
  savedViews({ storageKey: "views", storage: null }),
];

function fullscreenBrowser() {
  let promoted: Element | null = null;
  const original = [
    [document, "fullscreenEnabled"],
    [document, "fullscreenElement"],
    [document, "exitFullscreen"],
    [HTMLElement.prototype, "requestFullscreen"],
  ] as const;
  const descriptors = original.map(([target, key]) =>
    Object.getOwnPropertyDescriptor(target, key)
  );
  const exit = vi.fn(() => {
    promoted = null;
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  const request = vi.fn(function (this: HTMLElement) {
    promoted = this.closest(part("root"));
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  Object.defineProperties(document, {
    fullscreenEnabled: { configurable: true, value: true },
    fullscreenElement: { configurable: true, get: () => promoted },
    exitFullscreen: { configurable: true, value: exit },
  });
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  cleanup.push(() =>
    original.forEach(([target, key], index) => {
      const descriptor = descriptors[index];
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    })
  );
  return { request, exit, current: () => promoted };
}

describe("native view-control feature fills", () => {
  it("uses a distinct required contribution for every opt-in feature and renders no absent controls", async () => {
    const definitions = features();
    expect(
      definitions.map((feature) => feature.requiredSlots?.[0])
    ).toHaveLength(3);
    expect(
      new Set(definitions.map((feature) => feature.requiredSlots?.[0])).size
    ).toBe(3);
    const fixture = mountViews({ searchable: false });
    cleanup.push(fixture.stop);
    expect(fixture.root.querySelector(part("toolbar"))).toBeNull();
    fixture.props.value = { ...fixture.props.value, features: definitions };
    await nextTick();
    expect(fixture.root.querySelector(part("density-toggle"))).not.toBeNull();
    expect(fixture.root.querySelector(part("views-button"))).not.toBeNull();
    expect(fixture.root.querySelector(part("fullscreen-toggle"))).toBeNull();
    expect(fixture.root.querySelector('input[type="search"]')).toBeNull();
  });

  it("forwards localized labels, RTL, all saved-view classes, and mobile density state without search", async () => {
    const classNames = {
      densitySelect: "density",
      viewsMenu: "menu",
      viewsButton: "trigger",
      viewsPanel: "panel",
      viewsRow: "row",
      viewsItem: "item",
      viewsDelete: "delete",
      viewsDivider: "divider",
      viewsSaveRow: "save-row",
      viewsInput: "input",
      viewsSave: "save",
    };
    const fixture = mountViews({
      features: features(),
      searchable: false,
      forceMobile: true,
      dir: "rtl",
      classNames,
      labels: {
        density: "Densité",
        densityCompact: "Compacte",
        densityComfortable: "Confortable",
        savedViews: "Vues",
        viewName: "Nom",
        saveView: "Enregistrer",
        deleteView: "Supprimer",
      },
    });
    cleanup.push(fixture.stop);
    await nextTick();
    const select = findControl<HTMLSelectElement>(
      fixture.root,
      part("density-toggle")
    );
    expect(select.tagName).toBe("SELECT");
    expect(select.className).toBe("density");
    expect(select.getAttribute("dir")).toBe("rtl");
    expect(select.getAttribute("aria-label")).toBe("Densité");
    expect(Array.from(select.options, (option) => option.text)).toEqual([
      "Confortable",
      "Compacte",
    ]);
    await selectDensity(fixture.root, "compact");
    expect(select.value).toBe("compact");
    expect(
      findControl(fixture.root, part("root")).getAttribute("data-density")
    ).toBe("compact");
    expect(fixture.root.querySelector(part("cards"))).not.toBeNull();
    await clickControl(fixture.root, part("views-button"));
    const panel = findControl(fixture.root, part("views-panel"));
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-label")).toBe("Vues");
    expect(panel.getAttribute("dir")).toBe("rtl");
    expect(panel.hasAttribute("aria-modal")).toBe(false);
    await setText(fixture.root, part("views-input"), "Mobile");
    await clickControl(fixture.root, part("views-save"));
    for (const [key, name] of Object.entries(classNames).filter(
      ([key]) => key !== "densitySelect"
    )) {
      const kebab = key.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
      );
      expect(findControl(fixture.root, part(kebab)).className).toBe(name);
    }
    expect(
      findControl(fixture.root, part("views-delete")).getAttribute("aria-label")
    ).toBe("Supprimer: Mobile");
  });

  it("restores a rejected native select request and accepts host changes with exactly one observer and event", async () => {
    const observer = vi.fn();
    const update = vi.fn();
    const fixture = mountViews(
      {
        density: "comfortable",
        features: [densityChooser()],
        onDensityChange: observer,
      },
      { "onUpdate:density": update }
    );
    cleanup.push(fixture.stop);
    await selectDensity(fixture.root, "compact");
    expect(
      findControl<HTMLSelectElement>(fixture.root, part("density-toggle")).value
    ).toBe("comfortable");
    expect(observer).toHaveBeenCalledExactlyOnceWith("compact");
    expect(update).toHaveBeenCalledExactlyOnceWith("compact");
    fixture.props.value = { ...fixture.props.value, density: "compact" };
    await nextTick();
    expect(
      findControl<HTMLSelectElement>(fixture.root, part("density-toggle")).value
    ).toBe("compact");
    expect(update).toHaveBeenCalledTimes(1);
    update.mockImplementation((density: "compact" | "comfortable") => {
      fixture.props.value = { ...fixture.props.value, density };
    });
    await selectDensity(fixture.root, "comfortable");
    expect(
      findControl<HTMLSelectElement>(fixture.root, part("density-toggle")).value
    ).toBe("comfortable");
    expect(update).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenCalledTimes(2);
  });

  it("captures pending search and density together, preserves other tables, and restores disclosure focus", async () => {
    const adapter = testUrlAdapter("other.q=Grace");
    const fixture = mountViews({
      features: features(),
      urlSync: true,
      urlAdapter: adapter,
      urlKey: "one",
    });
    cleanup.push(fixture.stop);
    const other = mountViews({
      features: [densityChooser()],
      urlSync: true,
      urlAdapter: adapter,
      urlKey: "other",
    });
    cleanup.push(other.stop);
    await setText(fixture.root, 'input[type="search"]', "Ada");
    await selectDensity(fixture.root, "compact");
    const trigger = findControl<HTMLButtonElement>(
      fixture.root,
      part("views-button")
    );
    await keyControl(trigger, "ArrowDown");
    const input = findControl<HTMLInputElement>(
      fixture.root,
      part("views-input")
    );
    expect(document.activeElement).toBe(input);
    expect(trigger.getAttribute("aria-controls")).toBe(
      findControl(fixture.root, part("views-panel")).id
    );
    await setText(fixture.root, part("views-input"), "Compact Ada");
    await keyControl(input, "Enter", true);
    expect(fixture.root.querySelector(part("views-item"))).toBeNull();
    await keyControl(input, "Enter");
    expect(input.value).toBe("");
    await keyControl(input, "Escape");
    expect(document.activeElement).toBe(trigger);
    await setText(fixture.root, 'input[type="search"]', "Grace");
    await selectDensity(fixture.root, "comfortable");
    await clickControl(fixture.root, part("views-button"));
    await clickControl(fixture.root, part("views-item"));
    expect(
      findControl<HTMLSelectElement>(fixture.root, part("density-toggle")).value
    ).toBe("compact");
    expect(
      findControl<HTMLInputElement>(fixture.root, 'input[type="search"]').value
    ).toBe("Ada");
    expect(fixture.root.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(adapter.getSearch()).toContain("other.q=Grace");
    expect(
      findControl<HTMLSelectElement>(other.root, part("density-toggle")).value
    ).toBe("comfortable");
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await clickControl(fixture.root, part("views-button"));
    await clickControl(fixture.root, part("views-delete"));
    expect(fixture.root.querySelector(part("views-item"))).toBeNull();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps controlled density authoritative after applying a saved capture and protects read-only views", async () => {
    const storage = viewStorage([
      { name: "Team", search: "density=compact", readOnly: true },
    ]);
    const fixture = mountViews({
      density: "comfortable",
      features: [
        densityChooser(),
        savedViews({ storageKey: "views", storage }),
      ],
    });
    cleanup.push(fixture.stop);
    await nextTick();
    await clickControl(fixture.root, part("views-button"));
    expect(
      findControl<HTMLButtonElement>(fixture.root, part("views-delete"))
        .disabled
    ).toBe(true);
    await setText(fixture.root, part("views-input"), "Team");
    expect(
      findControl<HTMLButtonElement>(fixture.root, part("views-save")).disabled
    ).toBe(true);
    await keyControl(findControl(fixture.root, part("views-input")), "Enter");
    expect(storage.getItem("views")).toContain('"search":"density=compact"');
    await clickControl(fixture.root, part("views-item"));
    expect(
      findControl<HTMLSelectElement>(fixture.root, part("density-toggle")).value
    ).toBe("comfortable");
    await clickControl(fixture.root, part("views-button"));
    fixture.props.value = { ...fixture.props.value, features: [] };
    await nextTick();
    expect(fixture.root.querySelector(part("views-menu"))).toBeNull();
    expect(fixture.root.querySelector(part("density-toggle"))).toBeNull();
  });

  it("uses the real stable fullscreen root and keeps saved-view panels within it through state changes", async () => {
    const browser = fullscreenBrowser();
    const fixture = mountViews({
      features: features(),
      classNames: { fullscreenButton: "fullscreen" },
      labels: { enterFullscreen: "Agrandir", exitFullscreen: "Réduire" },
    });
    cleanup.push(fixture.stop);
    await nextTick();
    const root = findControl<HTMLElement>(fixture.root, part("root"));
    const button = findControl<HTMLButtonElement>(
      fixture.root,
      part("fullscreen-toggle")
    );
    expect(button.className).toBe("fullscreen");
    expect(button.getAttribute("aria-label")).toBe("Agrandir");
    await clickControl(fixture.root, part("fullscreen-toggle"));
    expect(browser.current()).toBe(root);
    expect(browser.request).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Réduire");
    await selectDensity(fixture.root, "compact");
    expect(browser.current()).toBe(root);
    expect(browser.exit).not.toHaveBeenCalled();
    await clickControl(fixture.root, part("views-button"));
    expect(root.contains(findControl(fixture.root, part("views-panel")))).toBe(
      true
    );
    await keyControl(document, "Escape");
    expect(fixture.root.querySelector(part("views-panel"))).toBeNull();
    await browser.exit();
    await nextTick();
    expect(button.getAttribute("aria-pressed")).toBe("false");
    await clickControl(fixture.root, part("fullscreen-toggle"));
    fixture.props.value = { ...fixture.props.value, features: [] };
    await nextTick();
    expect(browser.current()).toBeNull();
    expect(fixture.root.querySelector(part("fullscreen-toggle"))).toBeNull();
  });

  it("hydrates density and saved-view markup without mismatch, then activates controls", async () => {
    const component = defineComponent({
      setup: () => () =>
        h(DataTable<ViewRow>, {
          ...viewDefaults,
          searchable: false,
          defaultDensity: "compact",
          dir: "rtl",
          features: features(),
        }),
    });
    const html = await renderToString(createSSRApp(component));
    const root = document.createElement("div");
    root.innerHTML = html;
    document.body.append(root);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const app = createSSRApp(component);
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
    });
    await nextTick();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(
      findControl<HTMLSelectElement>(root, part("density-toggle")).value
    ).toBe("compact");
    await selectDensity(root, "comfortable");
    expect(findControl(root, part("root")).getAttribute("data-density")).toBe(
      "comfortable"
    );
    await clickControl(root, part("views-button"));
    expect(findControl(root, part("views-panel")).getAttribute("dir")).toBe(
      "rtl"
    );
  });
});

describe("native saved-view management panel", () => {
  it("preserves neutral order, disabled actions, badges, footer and rename keyboard semantics", async () => {
    const views = shallowRef<readonly SavedView[]>([
      { name: "First", search: "", isDefault: true },
      { name: "Team", search: "", readOnly: true },
    ]);
    const onApply = vi.fn();
    const onMove = vi.fn();
    const onSetDefault = vi.fn();
    const onRemove = vi.fn();
    const onRename = vi.fn((from: string, to: string) => {
      views.value = views.value.map((view) =>
        view.name === from ? { ...view, name: to } : view
      );
    });
    const props: Omit<SavedViewsPanelProps, "views"> = {
      onApply,
      onMove,
      onSetDefault,
      onRemove,
      onRename,
      className: "management",
      footer: h("small", "End"),
      labels: {
        renameView: "Rename",
        moveViewUp: "Up",
        moveViewDown: "Down",
        setDefaultView: "Default",
        deleteView: "Delete",
        defaultViewBadge: "Default badge",
        readOnlyViewBadge: "Read only",
        applyView: "Apply",
        viewName: "Name",
      },
    };
    const fixture = mountControl(() =>
      h(SavedViewsPanel, { ...props, views: views.value })
    );
    cleanup.push(fixture.stop);
    await nextTick();
    expect(findControl(fixture.root, part("saved-views-panel")).className).toBe(
      "management"
    );
    expect(fixture.root.textContent).toContain("Default badge");
    expect(fixture.root.textContent).toContain("Read only");
    expect(fixture.root.textContent).toContain("End");
    const rows = fixture.root.querySelectorAll(part("saved-view-row"));
    const first = rows[0]!;
    const second = rows[1]!;
    expect(
      Array.from(first.querySelectorAll("button[aria-label]"), (button) =>
        button.getAttribute("aria-label")
      )
    ).toEqual(["Rename", "Up", "Down", "Default", "Delete"]);
    expect(
      findControl<HTMLButtonElement>(first, '[aria-label="Up"]').disabled
    ).toBe(true);
    expect(
      findControl<HTMLButtonElement>(
        first,
        '[aria-label="Default"]'
      ).getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      Array.from(
        second.querySelectorAll<HTMLButtonElement>("button[aria-label]")
      ).every((button) => button.disabled)
    ).toBe(true);
    await clickControl(first, 'button[title="Apply"]');
    expect(onApply).toHaveBeenCalledExactlyOnceWith("First");
    await clickControl(first, '[aria-label="Down"]');
    expect(onMove).toHaveBeenCalledExactlyOnceWith("First", 1);
    await clickControl(first, '[aria-label="Default"]');
    expect(onSetDefault).toHaveBeenCalledExactlyOnceWith("First");
    await clickControl(first, '[aria-label="Rename"]');
    const input = findControl<HTMLInputElement>(first, "input");
    expect(document.activeElement).toBe(input);
    await setText(first, "input", "Renamed");
    await keyControl(input, "Enter", true);
    expect(onRename).not.toHaveBeenCalled();
    await keyControl(input, "Enter");
    expect(onRename).toHaveBeenCalledExactlyOnceWith("First", "Renamed");
    const renamed = findControl(fixture.root, part("saved-view-row"));
    await clickControl(renamed, '[aria-label="Rename"]');
    await setText(renamed, "input", "Cancelled");
    await keyControl(findControl(renamed, "input"), "Escape");
    expect(fixture.root.querySelector("input")).toBeNull();
    expect(onRename).toHaveBeenCalledTimes(1);
    await clickControl(renamed, '[aria-label="Delete"]');
    expect(onRemove).toHaveBeenCalledExactlyOnceWith("Renamed");
  });

  it("renders the empty management state and releases the rename input when its view disappears", async () => {
    const views = shallowRef<readonly SavedView[]>([]);
    const fixture = mountControl(() =>
      h(SavedViewsPanel, {
        views: views.value,
        labels: { renameView: "Rename" },
        onApply: vi.fn(),
        onRename: vi.fn(),
        onMove: vi.fn(),
        onSetDefault: vi.fn(),
        onRemove: vi.fn(),
      })
    );
    cleanup.push(fixture.stop);
    expect(fixture.root.querySelector("p")?.textContent).toBe("Saved views");
    views.value = [{ name: "Temporary", search: "" }];
    await nextTick();
    await clickControl(fixture.root, 'button[aria-label="Rename"]');
    expect(fixture.root.querySelector("input")).not.toBeNull();
    views.value = [];
    await nextTick();
    expect(fixture.root.querySelector("input")).toBeNull();
  });
});

it("ignores detached native control events and invalid select values without issuing requests", async () => {
  const {
    nativeDensityControl,
    nativeSavedViewsMenuSlots,
    nativeSavedViewsPanelSlots,
  } = await import("../src/viewControls/nativeControls");
  const { isVNode } = await import("vue");
  const changed = vi.fn();
  const density = nativeDensityControl({
    attrs: {},
    value: "comfortable",
    options: [
      { value: "compact", label: "Compact" },
      { value: "comfortable", label: "Comfortable" },
    ],
    onChange: changed,
  });
  const menuInput = nativeSavedViewsMenuSlots.Input({
    attrs: {},
    value: "",
    onChange: changed,
  });
  const panelInput = nativeSavedViewsPanelSlots(() => ({})).Input({
    label: "Name",
    ref: () => undefined,
    value: "",
    onChange: changed,
    onCommit: vi.fn(),
    onCancel: vi.fn(),
  });
  for (const [node, name, event] of [
    [density, "onChange", "change"],
    [menuInput, "onInput", "input"],
    [panelInput, "onInput", "input"],
  ] as const) {
    if (!isVNode(node)) throw new Error("Expected native control vnode");
    const listener: unknown = node.props?.[name];
    if (typeof listener !== "function")
      throw new Error("Expected native event listener");
    listener(new Event(event));
  }
  expect(changed).not.toHaveBeenCalled();
  const fixture = mountViews({
    density: "comfortable",
    features: [densityChooser()],
    onDensityChange: changed,
  });
  cleanup.push(fixture.stop);
  const select = findControl<HTMLSelectElement>(
    fixture.root,
    part("density-toggle")
  );
  select.value = "unsupported";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await nextTick();
  expect(changed).not.toHaveBeenCalled();
  expect(select.value).toBe("comfortable");
});
