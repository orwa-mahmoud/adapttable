import {
  createFeatureState,
  filterViewKey,
  provideFeatureState,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  watchEffect,
} from "vue";

import { DataTable } from "../src";
import { filters } from "../src/filters";
import { NativeFiltersPanel } from "../src/filters/NativeFiltersPanel";
import { NativeFilterSurface } from "../src/filters/NativeFilterSurface";
import { click, find, mountNative, part, tick } from "./filter-editing-helpers";

const focus = HTMLElement.prototype.focus;
const cleanups: (() => void)[] = [];
const descriptors = ["showModal", "close"].map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name)
);
function activeModal() {
  return document.querySelector<HTMLDialogElement>("dialog[open]") ?? undefined;
}
let prior: Element | null = null;
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      prior = document.activeElement;
      this.open = true;
      this.querySelector<HTMLElement>("input")?.focus();
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
      if (prior instanceof HTMLElement) prior.focus();
    },
  });
  vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (
    this: HTMLElement
  ) {
    const modal = activeModal();
    if (!modal?.open || modal.contains(this)) focus.call(this);
  });
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  ["showModal", "close"].forEach((name, index) => {
    const descriptor = descriptors[index];
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  });
  prior = null;
});
function fixture() {
  const open = shallowRef(true);
  const mode = shallowRef(true);
  const anchor = shallowRef(document.createElement("button"));
  const previous = document.createElement("button");
  const other = document.createElement("button");
  document.body.append(anchor.value, previous, other);
  previous.focus();
  let accepted = true;
  let afterClose: () => void = () => undefined;
  const close = vi.fn(() => {
    if (accepted) open.value = false;
    anchor.value.focus();
    afterClose();
  });
  const view = mountNative(() =>
    h(NativeFilterSurface, {
      open: open.value,
      modal: mode.value,
      dir: "ltr",
      label: "Filters",
      anchor: anchor.value,
      children: h("input"),
      onClose: close,
    })
  );
  const stop = () => {
    view.stop();
    anchor.value.remove();
    previous.remove();
    other.remove();
  };
  cleanups.push(stop);
  return {
    ...view,
    open,
    mode,
    anchor,
    previous,
    other,
    close,
    reject: () => {
      accepted = false;
    },
    afterClose: (run: () => void) => {
      afterClose = run;
    },
  };
}
function escape() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
  );
}
describe("native dialog close focus", () => {
  it("restores the trigger after accepted Escape and native pre-open restoration", async () => {
    const view = fixture();
    await tick();
    expect(activeModal()?.open).toBe(true);
    escape();
    expect(document.activeElement).not.toBe(view.anchor.value);
    await tick();
    expect(view.close).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(view.anchor.value);
    expect(document.body.querySelector(part("filters-panel"))).toBeNull();
  });
  it("restores the trigger after the real Done button closes a resumed drawer", async () => {
    const showing = shallowRef(true);
    const previous = document.createElement("button");
    document.body.append(previous);
    cleanups.push(() => previous.remove());
    const Table = defineComponent(
      () => () =>
        h(DataTable<{ id: string; name: string }>, {
          data: [{ id: "1", name: "Ada" }],
          columns: [{ key: "name" }],
          rowKey: (row) => row.id,
          urlSync: false,
          features: [
            filters<{ id: string; name: string }>(
              [{ key: "name", type: "text" }],
              { mode: "drawer" }
            ),
          ],
        })
    );
    const Other = defineComponent(() => () => h("span", "Away"));
    const view = mountNative(() =>
      h(KeepAlive, null, {
        default: () => (showing.value ? h(Table) : h(Other)),
      })
    );
    await tick();
    await click(view.host, "filters-button");
    showing.value = false;
    await tick();
    previous.focus();
    showing.value = true;
    await tick();
    expect(activeModal()?.open).toBe(true);
    const trigger = find(view.host, part("filters-button"));
    await click(document.body, "filters-done");
    expect(activeModal()).toBeUndefined();
    expect(document.activeElement).toBe(trigger);
  });
  it("preserves a rejected controlled close", async () => {
    const view = fixture();
    view.reject();
    await tick();
    const input = find(document.body, `${part("filters-panel")} input`);
    escape();
    await tick();
    expect(activeModal()?.open).toBe(true);
    expect(document.activeElement).toBe(input);
  });
  it("lets distinct host focus after native close win", async () => {
    const view = fixture();
    view.afterClose(() => {
      void nextTick(() => view.other.focus());
    });
    await tick();
    escape();
    await tick();
    expect(document.activeElement).toBe(view.other);
  });
  it.each(["escape", "outside"] as const)(
    "restores focus for real Done after a rejected %s request",
    async (reason) => {
      interface Row {
        id: string;
        name: string;
      }
      const previous = document.createElement("button");
      document.body.append(previous);
      cleanups.push(() => previous.remove());
      const Panel = defineComponent({
        setup() {
          const shell = useDataTableShell<Row>({
            data: [{ id: "1", name: "Ada" }],
            columns: [{ key: "name" }],
            rowKey: (row) => row.id,
            urlSync: false,
            features: [
              filters<Row>([{ key: "name", type: "text" }], { mode: "drawer" }),
            ],
          });
          const state = createFeatureState();
          const model = shell.state.get(filterViewKey<Row>());
          watchEffect(() => {
            const current = model.value;
            state.set(
              filterViewKey<Row>(),
              current && {
                ...current,
                close: (request) => {
                  if (request === "done") current.close(request);
                },
              }
            );
          });
          provideFeatureState(state);
          return () => h(NativeFiltersPanel);
        },
      });
      const view = mountNative(() => h(Panel));
      await tick();
      previous.focus();
      await click(view.host, "filters-button");
      expect(prior).toBe(previous);
      if (reason === "escape") escape();
      else
        document.body.dispatchEvent(
          new MouseEvent("pointerdown", { bubbles: true })
        );
      await tick();
      expect(activeModal()?.open).toBe(true);
      const done = find(document.body, part("filters-done"));
      done.focus();
      done.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      await click(document.body, "filters-done");
      expect(activeModal()).toBeUndefined();
      expect(document.activeElement).toBe(
        find(view.host, part("filters-button"))
      );
    }
  );
  it("uses the same accepted-close restoration for native cancel", async () => {
    const view = fixture();
    await tick();
    const event = new Event("cancel", { cancelable: true });
    find(document.body, "dialog").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await tick();
    expect(document.activeElement).toBe(view.anchor.value);
  });
  it.each(["pointerdown", "keydown"] as const)(
    "retires pending restoration after another %s interaction",
    async (type) => {
      const view = fixture();
      await tick();
      const input = find(document.body, `${part("filters-panel")} input`);
      escape();
      input.dispatchEvent(
        type === "keydown"
          ? new KeyboardEvent(type, { key: "ArrowDown", bubbles: true })
          : new MouseEvent(type, { bubbles: true })
      );
      await tick();
      expect(document.activeElement).toBe(view.previous);
    }
  );
  it.each(["reopen", "replace", "disconnect", "dispose", "mode"] as const)(
    "retires focus restoration on %s",
    async (change) => {
      const view = fixture();
      await tick();
      const original = view.anchor.value;
      view.afterClose(() => {
        if (change === "reopen") view.open.value = true;
        if (change === "replace") view.anchor.value = view.other;
        if (change === "disconnect") original.remove();
        if (change === "dispose") view.stop();
        if (change === "mode") view.mode.value = false;
      });
      escape();
      await tick();
      expect(document.activeElement).not.toBe(original);
      original.remove();
    }
  );
});
