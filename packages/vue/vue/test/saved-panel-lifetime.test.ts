import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import {
  SavedViewsPanelChrome,
  type SavedViewsPanelSlots,
} from "../src/url/SavedViewsPanelChrome";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
async function tick() {
  await nextTick();
  await nextTick();
}
function fixture() {
  const apply = vi.fn();
  const rename = vi.fn();
  const remove = vi.fn();
  const applied = shallowRef(apply);
  const move = vi.fn();
  const setDefault = vi.fn();
  const views = shallowRef([{ name: "First", search: "" }]);
  const shown = shallowRef(true);
  const rows: Parameters<SavedViewsPanelSlots["Row"]>[0][] = [];
  const inputs: Parameters<SavedViewsPanelSlots["Input"]>[0][] = [];
  const slots: SavedViewsPanelSlots = {
    Surface: (props) => h("section", [props.children]),
    Row: (props) => {
      rows.push(props);
      return h("div", [props.name]);
    },
    Input: (props) => {
      inputs.push(props);
      return h("input", { value: props.value });
    },
    Empty: (props) => h("p", props.message),
  };
  const slotOwner = shallowRef(slots);
  const Child = defineComponent(
    () => () =>
      h(SavedViewsPanelChrome, {
        views: views.value,
        onApply: applied.value,
        onRename: rename,
        onMove: move,
        onSetDefault: setDefault,
        onRemove: remove,
        slots: slotOwner.value,
      })
  );
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("span")) })
  );
  app.mount(root);
  let live = true;
  const stop = () => {
    if (live) {
      live = false;
      app.unmount();
      root.remove();
    }
  };
  stops.push(stop);
  return {
    apply,
    rename,
    remove,
    applied,
    views,
    shown,
    rows,
    inputs,
    stop,
    slots,
    slotOwner,
  };
}
it.each(["replace", "remove", "reactivate", "owner", "dispose"] as const)(
  "retires management callbacks after %s",
  async (kind) => {
    const f = fixture();
    await tick();
    const row = f.rows.at(-1)!;
    if (kind === "replace") f.views.value = [{ name: "Second", search: "" }];
    if (kind === "remove") f.views.value = [];
    if (kind === "reactivate") {
      f.shown.value = false;
      await tick();
      f.shown.value = true;
    }
    if (kind === "owner") f.applied.value = vi.fn();
    if (kind === "dispose") f.stop();
    await tick();
    row.onApply();
    row.controls.find((control) => control.key === "remove")?.onPress?.();
    await tick();
    expect(f.apply).not.toHaveBeenCalled();
    expect(f.applied.value).not.toHaveBeenCalled();
    expect(f.remove).not.toHaveBeenCalled();
  }
);
it("runs the current Apply once with the current view", async () => {
  const f = fixture();
  await tick();
  f.views.value = [{ name: "Second", search: "" }];
  await tick();
  f.rows.at(-1)!.onApply();
  await tick();
  expect(f.apply).toHaveBeenCalledExactlyOnceWith("Second");
});
it("retires old rename input callbacks when a new editing session begins", async () => {
  const f = fixture();
  await tick();
  f.rows.at(-1)!.controls.find((control) => control.key === "rename")!
    .onPress!();
  await tick();
  const old = f.inputs.at(-1)!;
  old.onChange("Old draft");
  old.onCancel();
  await tick();
  f.rows.at(-1)!.controls.find((control) => control.key === "rename")!
    .onPress!();
  await tick();
  old.onChange("Stale draft");
  old.onCommit();
  await tick();
  expect(f.rename).not.toHaveBeenCalled();
  f.inputs.at(-1)!.onChange("Current draft");
  f.inputs.at(-1)!.onCommit();
  await tick();
  expect(f.rename).toHaveBeenCalledExactlyOnceWith("First", "Current draft");
});

it("keeps row callbacks through a new wrapper with identical renderers", async () => {
  const f = fixture();
  await tick();
  const row = f.rows.at(-1)!;
  f.slotOwner.value = { ...f.slotOwner.value };
  await tick();
  row.onApply();
  expect(f.apply).toHaveBeenCalledExactlyOnceWith("First");
});
it("keeps a current rename input through harmless wrapper rerenders", async () => {
  const f = fixture();
  await tick();
  f.rows.at(-1)!.controls.find((control) => control.key === "rename")!
    .onPress!();
  await tick();
  const input = f.inputs.at(-1)!;
  input.onChange("Kept draft");
  f.slotOwner.value = { ...f.slotOwner.value };
  await tick();
  input.onCommit();
  expect(f.rename).toHaveBeenCalledExactlyOnceWith("First", "Kept draft");
});
it.each(["Surface", "Row", "Input", "Empty"] as const)(
  "retires callbacks when the %s renderer changes even inside the same wrapper",
  async (name) => {
    const f = fixture();
    await tick();
    const row = f.rows.at(-1)!;
    Object.assign(f.slots, { [name]: () => null });
    row.onApply();
    expect(f.apply).not.toHaveBeenCalled();
  }
);
