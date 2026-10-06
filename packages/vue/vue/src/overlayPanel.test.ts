import { resolveLabels } from "@adapttable/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";

import {
  ColumnMenuChrome,
  type ColumnMenuSlots,
} from "./columns/columnMenuChrome";
import type { ColumnMenuModel } from "./columns/useColumnMenu";
import {
  managedOverlayPanel,
  type ManagedOverlayPanelProps,
  type OverlayPanelProps,
} from "./overlayPanel";
import {
  SavedViewsMenuChrome,
  type SavedViewsMenuSlots,
} from "./url/SavedViewsMenuChrome";
import type { UseSavedViewsResult } from "./url/useSavedViews";

const stops: (() => void)[] = [];
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  document.body.replaceChildren();
});

function savedModel(): UseSavedViewsResult {
  return {
    views: computed(() => []),
    defaultView: computed(() => undefined),
    save: vi.fn(),
    apply: vi.fn(),
    remove: vi.fn(),
    rename: vi.fn(),
    move: vi.fn(),
    setDefault: vi.fn(),
    reload: vi.fn(),
  };
}
function columnsModel(): ColumnMenuModel {
  return {
    active: shallowRef(true),
    presentation: computed(() => ({
      labels: resolveLabels(undefined),
      dir: "ltr" as const,
      classNames: undefined,
      container: undefined,
    })),
    query: shallowRef(""),
    rows: computed(() => []),
    edgeRows: computed(() => []),
    setQuery: vi.fn(),
    showAll: vi.fn(),
    hideAll: vi.fn(),
    unpinAll: vi.fn(),
    reset: vi.fn(),
    autoSize: vi.fn(),
  };
}

function fixture(kind: "saved" | "columns", managed = true) {
  const captures: ManagedOverlayPanelProps[] = [];
  const surfaces: OverlayPanelProps[] = [];
  const surface = (props: OverlayPanelProps) => {
    surfaces.push(props);
    return h("div", props.attrs, [props.content]);
  };
  const Panel = managed
    ? managedOverlayPanel((props) => {
        captures.push(props);
        return surface(props);
      })
    : surface;
  const slots = shallowRef<SavedViewsMenuSlots & ColumnMenuSlots>({
    Trigger: ({ attrs, label }) => h("button", attrs, label),
    Button: ({ attrs, label }) => h("button", attrs, label),
    Input: ({ attrs, value }) => h("input", { ...attrs, value }),
    Choice: ({ attrs, value }) => h("select", { ...attrs, value }),
    Panel,
  });
  const saved = shallowRef(savedModel());
  const columns = shallowRef(columnsModel());
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup: () => () =>
        kind === "saved"
          ? h(SavedViewsMenuChrome, {
              savedViews: saved.value,
              labels: resolveLabels(undefined),
              dir: "ltr",
              slots: slots.value,
            })
          : h(ColumnMenuChrome, { model: columns.value, slots: slots.value }),
    })
  );
  app.mount(root);
  const stop = () => {
    app.unmount();
    root.remove();
  };
  stops.push(stop);
  const trigger = () => {
    const button = root.querySelector<HTMLButtonElement>(
      `[data-adapttable-part="${kind === "saved" ? "views-button" : "column-menu-button"}"]`
    );
    if (!button) throw new Error("Missing trigger");
    return button;
  };
  const open = async () => {
    trigger().click();
    await nextTick();
  };
  const current = () => {
    const value = captures.at(-1);
    if (!value) throw new Error("Missing managed surface");
    return value;
  };
  const lastSurface = () => {
    const value = surfaces.at(-1);
    if (!value) throw new Error("Missing panel surface");
    return value;
  };
  return {
    root,
    slots,
    saved,
    columns,
    trigger,
    open,
    current,
    lastSurface,
    stop,
  };
}

for (const kind of ["saved", "columns"] as const)
  describe(`${kind} managed surface contract`, () => {
    it("leaves document dismissal and initial focus to a required managed driver", async () => {
      const view = fixture(kind);
      view.trigger().focus();
      await view.open();
      expect(view.current().anchor).toBe(view.trigger());
      expect(view.current().open).toBe(true);
      expect(view.current().attrs.style).toBeUndefined();
      expect(document.activeElement).toBe(view.trigger());
      document.body.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true })
      );
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      await nextTick();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("true");
      const outside = document.createElement("button");
      document.body.append(outside);
      outside.focus();
      view.current().onClose("outside");
      view.current().onClose("outside");
      await nextTick();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(outside);
    });

    it("rejects close callbacks from prior openings, models, drivers and disposed surfaces", async () => {
      const view = fixture(kind);
      await view.open();
      const first = view.current();
      first.onClose("done");
      await nextTick();
      await view.open();
      expect(first.isCurrent()).toBe(false);
      first.onClose("outside");
      await nextTick();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("true");
      const second = view.current();
      if (kind === "saved") view.saved.value = savedModel();
      else view.columns.value = columnsModel();
      await nextTick();
      expect(second.isCurrent()).toBe(false);
      second.onClose("escape");
      expect(view.trigger().getAttribute("aria-expanded")).toBe("true");
      const beforeDriver = view.current();
      const nextDriver = managedOverlayPanel((props) =>
        h("div", props.attrs, [props.content])
      );
      view.slots.value = { ...view.slots.value, Panel: nextDriver };
      await nextTick();
      expect(beforeDriver.isCurrent()).toBe(false);
      beforeDriver.onClose("done");
      expect(view.trigger().getAttribute("aria-expanded")).toBe("true");
      view.stop();
      stops.pop();
      expect(beforeDriver.isCurrent()).toBe(false);
    });

    it("retains existing inline Escape, outside-click and focus restoration behavior", async () => {
      const view = fixture(kind, false);
      await view.open();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("true");
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      await nextTick();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(view.trigger());
      await view.open();
      document.body.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true })
      );
      await nextTick();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("false");
    });
  });

it("rejects a managed renderer called without the Chrome lifetime contract", () => {
  const slot = managedOverlayPanel(() => null);
  expect(() => slot({ attrs: {}, content: null, onClose: vi.fn() })).toThrow(
    "Chrome lifetime contract"
  );
});

for (const kind of ["saved", "columns"] as const)
  describe(`${kind} panel ownership lifetime regressions`, () => {
    it("invalidates queued generic opening focus on disposal, even after a late target ref", async () => {
      const view = fixture(kind, false);
      await view.open();
      const firstPanelRef = view.lastSurface().attrs.ref;
      if (typeof firstPanelRef !== "function")
        throw new Error("Missing panel DOM ref");
      view.trigger().click();
      await nextTick();

      const replacement = document.createElement("section");
      const replacementInput = document.createElement("input");
      replacement.append(replacementInput);
      document.body.append(replacement);
      const focus = vi.spyOn(replacementInput, "focus");

      // Queue show()'s nextTick, then retire Chrome before that task runs.
      view.trigger().click();
      view.stop();
      stops.pop();
      // A compound control can release/forward a ref after its owner retires.
      // Such a stale target must not make the queued task focus a replacement.
      firstPanelRef(replacement);
      await nextTick();
      expect(focus).not.toHaveBeenCalled();
      expect(document.activeElement).not.toBe(replacementInput);
      expect(view.columns.value.active.value).toBe(true);
    });

    it("attaches generic dismissal after managed replacement and rejects retired managed focus", async () => {
      const view = fixture(kind);
      await view.open();
      const retired = view.current();
      const managedDriver = view.slots.value.Panel;
      const added = vi.spyOn(document, "addEventListener");
      const outside = document.createElement("button");
      document.body.append(outside);
      view.trigger().focus();
      // Queue a fresh managed opening, then switch drivers before its DOM
      // update and nextTick complete. Its focus work must not transfer owners.
      view.trigger().click();
      await nextTick();
      view.trigger().click();
      outside.focus();
      view.slots.value = {
        ...view.slots.value,
        Panel: (props) => h("div", props.attrs, [props.content]),
      };
      await nextTick();
      expect(
        added.mock.calls.filter(([type]) => type === "pointerdown")
      ).toHaveLength(1);
      expect(
        added.mock.calls.filter(([type]) => type === "keydown")
      ).toHaveLength(1);
      expect(retired.isCurrent()).toBe(false);
      expect(document.activeElement).toBe(outside);

      // Model a delayed managed close/autofocus callback using its public guard.
      retired.onClose("escape");
      if (retired.isCurrent()) retired.anchor?.focus();
      await nextTick();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("true");
      expect(document.activeElement).toBe(outside);

      outside.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      await nextTick();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(outside);
      await view.open();
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      await nextTick();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(view.trigger());

      // Reusing the original driver must not revive its previous lifetime.
      view.slots.value = { ...view.slots.value, Panel: managedDriver };
      await nextTick();
      await view.open();
      expect(retired.isCurrent()).toBe(false);
      retired.onClose("done");
      await nextTick();
      expect(view.trigger().getAttribute("aria-expanded")).toBe("true");
    });
  });
