import {
  createMemoryAdapter,
  resolveLabels,
  type TableDensity,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";

import { densityChooser } from "../src/features/density";
import type { StaticTableFeature } from "../src/features/tableFeature";
import { SavedViewsMenuChrome } from "../src/url/SavedViewsMenuChrome";
import { SavedViewsPanelChrome } from "../src/url/SavedViewsPanelChrome";
import { useSavedViews } from "../src/url/useSavedViews";
import { useDataTableShell } from "../src/useDataTableShell";
import {
  DensityChooserChrome,
  type DensityChooserSlots,
  FullscreenButtonChrome,
  type ViewControlButtonProps,
} from "../src/viewControls/viewControlsChrome";
import {
  nativeDensity,
  nativeMenuSlots,
  nativePanelSlots,
  nativeSavedViews,
} from "./fixtures/viewControls";
function mount(render: () => ReturnType<typeof h>, setup?: () => void) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup() {
        setup?.();
        return render;
      },
    })
  );
  app.mount(root);
  return {
    root,
    stop: () => {
      app.unmount();
      root.remove();
    },
  };
}
function shellFixture(
  extra: Parameters<typeof useDataTableShell<{ id: string }>>[0]
) {
  const scope = effectScope();
  const shell = scope.run(() => useDataTableShell(extra));
  if (!shell) throw new Error("shell missing");
  return { shell, stop: () => scope.stop() };
}
const columns = [{ key: "id" }];
const base = {
  data: [{ id: "one" }],
  columns,
  rowKey: (row: { id: string }) => row.id,
  urlSync: false,
};
describe("Vue view-control feature composition", () => {
  it("requires dedicated controls, not any unrelated toolbar slot", () => {
    const scope = effectScope();
    expect(() =>
      scope.run(() =>
        useDataTableShell({ ...base, features: [densityChooser()] })
      )
    ).toThrow("vue-density-control");
    scope.stop();
  });
  it("shares the table-local backend for search, density and saved-view capture", () => {
    const other = createMemoryAdapter("other.q=protected");
    const fixture = shellFixture({
      ...base,
      urlAdapter: other,
      features: [
        nativeDensity(),
        nativeSavedViews({ storageKey: "views", storage: null }),
      ],
    });
    fixture.shell.source.value.setSearch("Ada");
    fixture.shell.setDensity("compact");
    fixture.shell.savedViews.value?.save("Compact");
    const saved = fixture.shell.savedViews.value?.views.value[0];
    expect(saved?.search).toContain("q=Ada");
    expect(saved?.search).toContain("density=compact");
    expect(other.getSearch()).toBe("other.q=protected");
    fixture.shell.source.value.setSearch("Grace");
    fixture.shell.setDensity("comfortable");
    fixture.shell.savedViews.value?.apply("Compact");
    expect(fixture.shell.source.value.search).toBe("Ada");
    expect(fixture.shell.density.value).toBe("compact");
    fixture.stop();
  });
  it("keeps controlled density/layout authoritative when a view is applied and the host rejects or later replaces", async () => {
    const density = shallowRef<TableDensity>("comfortable");
    const layout = shallowRef({
      hidden: [] as string[],
      pinned: {},
      order: [] as string[],
      widths: {},
    });
    const change = vi.fn();
    const fixture = shellFixture(() => ({
      ...base,
      density,
      columnLayout: layout,
      onDensityChange: change,
      features: [
        nativeDensity(),
        nativeSavedViews({ storageKey: "views", storage: null }),
      ],
    }));
    fixture.shell.urlAdapter.value.setSearch("density=compact&colHide=id");
    fixture.shell.savedViews.value?.save("Compact");
    fixture.shell.urlAdapter.value.setSearch("");
    fixture.shell.savedViews.value?.apply("Compact");
    expect(fixture.shell.density.value).toBe("comfortable");
    expect(fixture.shell.table.layout.value.state.hidden).toEqual([]);
    fixture.shell.setDensity("compact");
    expect(change).toHaveBeenCalledExactlyOnceWith("compact");
    expect(fixture.shell.density.value).toBe("comfortable");
    density.value = "compact";
    await nextTick();
    expect(fixture.shell.density.value).toBe("compact");
    density.value = "comfortable";
    expect(fixture.shell.density.value).toBe("comfortable");
    fixture.stop();
    fixture.shell.setDensity("compact");
    expect(change).toHaveBeenCalledTimes(1);
  });
  it("replaces/removes features, flushes pending state and invalidates retained actions", () => {
    const features = shallowRef<readonly StaticTableFeature[]>([
      nativeDensity(),
      nativeSavedViews({ storageKey: "views", storage: null }),
    ]);
    const fixture = shellFixture(() => ({
      ...base,
      defaultDensity: "compact",
      features,
    }));
    expect(fixture.shell.density.value).toBe("compact");
    const old = fixture.shell.savedViews.value;
    fixture.shell.setDensity("comfortable");
    features.value = [];
    expect(fixture.shell.urlAdapter.value.getSearch()).toContain(
      "density=comfortable"
    );
    expect(fixture.shell.savedViews.value).toBeUndefined();
    old?.save("ignored");
    expect(old?.views.value).toEqual([]);
    expect(fixture.shell.density.value).toBe("compact");
    fixture.stop();
  });
});
describe("required Chrome controls", () => {
  it("projects localized density and fullscreen semantics without native fallback", () => {
    const Control = vi.fn<DensityChooserSlots["Control"]>(() => null);
    const labels = resolveLabels({
      density: "Densité",
      densityCompact: "Compacte",
      exitFullscreen: "Quitter",
    });
    DensityChooserChrome({
      density: "compact",
      onDensityChange: () => undefined,
      labels,
      dir: "rtl",
      classNames: { densitySelect: "density" },
      slots: { Control },
    });
    expect(Control.mock.calls[0]?.[0]).toMatchObject({
      attrs: { "aria-label": "Densité", dir: "rtl", class: "density" },
      value: "compact",
    });
    const Button = vi.fn<(props: ViewControlButtonProps) => null>(() => null);
    const fullscreen = {
      active: true,
      supported: true,
      toggle: () => undefined,
      exit: () => undefined,
      container: undefined,
    };
    FullscreenButtonChrome({
      fullscreen,
      labels,
      dir: "rtl",
      slots: { Button },
    });
    expect(Button.mock.calls[0]?.[0]).toMatchObject({
      attrs: { "aria-label": "Quitter", "aria-pressed": true },
      label: "Quitter",
    });
    expect(
      FullscreenButtonChrome({
        fullscreen: { ...fullscreen, supported: false },
        labels,
        dir: "rtl",
        slots: { Button },
      })
    ).toBeNull();
  });
  it("owns the saved-view menu keyboard, focus, parts, apply, delete, save and outside dismissal", async () => {
    let state: ReturnType<typeof useSavedViews> | undefined;
    const fixture = mount(
      () =>
        h(SavedViewsMenuChrome, {
          savedViews: state!,
          labels: resolveLabels({}),
          dir: "rtl",
          slots: nativeMenuSlots,
          classNames: { viewsPanel: "panel-class" },
        }),
      () => {
        state = useSavedViews({ storageKey: "views", storage: null });
      }
    );
    await nextTick();
    state?.save("First");
    await nextTick();
    const trigger = fixture.root.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="views-button"]'
    )!;
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    await nextTick();
    const panel = fixture.root.querySelector(
      '[data-adapttable-part="views-panel"]'
    );
    expect(panel?.getAttribute("dir")).toBe("rtl");
    expect(panel?.className).toBe("panel-class");
    expect(document.activeElement?.textContent).toBe("First");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await nextTick();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    await nextTick();
    const input = fixture.root.querySelector<HTMLInputElement>("input")!;
    input.value = "Second";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await nextTick();
    expect(state?.views.value.map((view) => view.name)).toEqual([
      "First",
      "Second",
    ]);
    fixture.root
      .querySelector<HTMLButtonElement>('[data-adapttable-part="views-delete"]')
      ?.click();
    await nextTick();
    expect(state?.views.value.map((view) => view.name)).toEqual(["Second"]);
    fixture.root
      .querySelector<HTMLButtonElement>('[data-adapttable-part="views-item"]')
      ?.click();
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    await nextTick();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fixture.stop();
  });
  it("uses neutral panel controls for rename/escape/read-only/default/move/remove", async () => {
    let state: ReturnType<typeof useSavedViews> | undefined;
    const fixture = mount(
      () =>
        h(SavedViewsPanelChrome, {
          views: state!.views.value,
          onApply: state!.apply,
          onRename: state!.rename,
          onMove: state!.move,
          onSetDefault: state!.setDefault,
          onRemove: state!.remove,
          slots: nativePanelSlots,
          footer: "Footer",
        }),
      () => {
        state = useSavedViews({ storageKey: "views", storage: null });
      }
    );
    await nextTick();
    expect(fixture.root.textContent).toContain("Footer");
    state?.save("First");
    state?.save("Second");
    await nextTick();
    const labels = resolveLabels({});
    const action = (label: string, index = 0) =>
      fixture.root.querySelectorAll<HTMLButtonElement>(
        `button[aria-label="${label}"]`
      )[index];
    action(labels.renameView)?.click();
    await nextTick();
    const input = fixture.root.querySelector<HTMLInputElement>("input")!;
    expect(document.activeElement).toBe(input);
    input.value = "Renamed";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await nextTick();
    expect(state?.views.value[0]?.name).toBe("Renamed");
    action(labels.renameView)?.click();
    await nextTick();
    fixture.root
      .querySelector<HTMLInputElement>("input")
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    await nextTick();
    expect(fixture.root.querySelector("input")).toBeNull();
    action(labels.setDefaultView)?.click();
    await nextTick();
    expect(state?.defaultView.value?.name).toBe("Renamed");
    action(labels.moveViewDown)?.click();
    await nextTick();
    expect(state?.views.value[1]?.name).toBe("Renamed");
    action(labels.deleteView)?.click();
    await nextTick();
    expect(state?.views.value.length).toBe(1);
    fixture.stop();
  });
});

it("wires native density and fullscreen through the same mounted shell", async () => {
  const { ViewControlsFixture } = await import("./fixtures/viewControls");
  let promoted: Element | null = null;
  Object.defineProperty(document, "fullscreenEnabled", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => promoted,
  });
  const request = vi.fn(function requestFullscreen(this: HTMLElement) {
    promoted = this.closest("section");
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: () => {
      promoted = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    },
  });
  const fixture = mount(() => h(ViewControlsFixture));
  await nextTick();
  fixture.root
    .querySelector<HTMLButtonElement>(
      '[data-adapttable-part="fullscreen-button"]'
    )
    ?.click();
  await nextTick();
  expect(request).toHaveBeenCalledTimes(1);
  expect(promoted).toBe(fixture.root.querySelector("section"));
  const density = fixture.root.querySelector<HTMLSelectElement>(
    '[data-adapttable-part="density-select"]'
  )!;
  density.value = "compact";
  density.dispatchEvent(new Event("change", { bubbles: true }));
  await nextTick();
  expect(
    fixture.root.querySelector("section")?.getAttribute("data-density")
  ).toBe("compact");
  expect(promoted).toBe(fixture.root.querySelector("section"));
  fixture.stop();
  expect(promoted).toBeNull();
  Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
});
