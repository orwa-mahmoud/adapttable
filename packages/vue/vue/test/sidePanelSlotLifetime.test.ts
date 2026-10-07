import { resolveLabels } from "@adapttable/core";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import type { SidePanelControlModel } from "../src/actions/contracts";
import {
  SidePanelChrome,
  type SidePanelPresentation,
  type SidePanelSlots,
} from "../src/actions/sidePanelChrome";
import { toVueAttrs } from "../src/attrs";

const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach((stop) => stop());
  document.body.replaceChildren();
});
const panels = [
  { key: "a / ?", label: "Alpha", content: "Alpha body" },
  { key: "b # []", label: "Beta", content: "Beta body" },
  { key: "ج", label: "Gamma", content: "Gamma body" },
];
const labels = resolveLabels({});
const settle = async () => {
  await nextTick();
  await nextTick();
  await nextTick();
};
function fixture() {
  const calls = vi.fn();
  const model = shallowRef<SidePanelControlModel>({
    panels,
    open: panels[0]!.key,
    onOpenChange: calls,
  });
  const captured: Parameters<SidePanelSlots["Tab"]>[0][] = [];
  const closes: (() => void)[] = [];
  const makeSlots = (): SidePanelSlots => ({
    Frame: ({ children }) => h("aside", [children]),
    Tab: (props) => {
      captured.push(props);
      return h("button", toVueAttrs(props.buttonProps), props.panel.label);
    },
    Close: ({ label, onClose }) => {
      closes.push(onClose);
      return h("button", { onClick: onClose }, label);
    },
  });
  const slots = shallowRef(makeSlots());
  const shown = shallowRef(true);
  const presentation = shallowRef<SidePanelPresentation>();
  const dir = shallowRef<"ltr" | "rtl">("ltr");
  const host = document.createElement("div");
  document.body.append(host);
  const Child = defineComponent({
    setup: () => () =>
      h(SidePanelChrome, {
        model: model.value,
        ...(presentation.value
          ? { presentation: presentation.value }
          : { slots: slots.value }),
        labels,
        dir: dir.value,
      }),
  });
  const app = createApp({
    render: () => h(KeepAlive, () => (shown.value ? h(Child) : null)),
  });
  app.mount(host);
  cleanup.push(() => app.unmount());
  const tabs = () => [
    ...host.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ];
  const key = (button: HTMLElement, value: string) =>
    button.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
      })
    );
  return {
    calls,
    model,
    captured,
    closes,
    slots,
    makeSlots,
    shown,
    presentation,
    dir,
    host,
    tabs,
    key,
    app,
  };
}
it("encodes opaque keys into resolvable unique tab IDs without changing controlled keys", async () => {
  const f = fixture();
  await settle();
  const ids = f.tabs().map((tab) => tab.id);
  expect(new Set(ids).size).toBe(3);
  for (const id of ids) {
    expect(id).not.toMatch(/[\s/#?[\]]/);
    expect(document.getElementById(id)).not.toBeNull();
  }
  expect(
    f.host.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby")
  ).toBe(ids[0]);
  f.tabs()[1]!.click();
  expect(f.calls).toHaveBeenLastCalledWith(panels[1]!.key);
  expect(f.host.querySelector('[role="tabpanel"]')?.textContent).toBe(
    "Alpha body"
  );
});
it("retires generic callbacks after same-DOM model and slot replacement", async () => {
  const f = fixture();
  await settle();
  const old = f.captured.at(-1)!;
  const close = f.closes.at(-1)!;
  const first = f.tabs()[0];
  f.model.value = { ...f.model.value };
  await settle();
  expect(f.tabs()[0]).toBe(first);
  old.buttonProps.onClick();
  close();
  expect(f.calls).not.toHaveBeenCalled();
  const prior = f.captured.at(-1)!;
  f.slots.value = f.makeSlots();
  await settle();
  expect(f.tabs()[0]).toBe(first);
  prior.buttonProps.onClick();
  expect(f.calls).not.toHaveBeenCalled();
  f.tabs()[1]!.click();
  expect(f.calls).toHaveBeenCalledExactlyOnceWith(panels[1]!.key);
});
it("does not steal external focus while a keyboard handoff is queued", async () => {
  const f = fixture();
  await settle();
  const outside = document.createElement("button");
  document.body.append(outside);
  const first = f.tabs()[0]!;
  first.focus();
  f.key(first, "ArrowRight");
  outside.focus();
  await settle();
  expect(document.activeElement).toBe(outside);
});
it("rejects queued focus when the same DOM receives another slot owner", async () => {
  const f = fixture();
  await settle();
  const first = f.tabs()[0]!;
  first.focus();
  f.key(first, "ArrowRight");
  f.slots.value = f.makeSlots();
  await settle();
  expect(f.tabs()[0]).toBe(first);
  expect(document.activeElement).toBe(first);
});
it("hands focus to an accepted controlled selection and supports RTL Home/End", async () => {
  const f = fixture();
  const change = vi.fn((open: string | null) => {
    f.model.value = { ...f.model.value, open };
  });
  f.model.value = { ...f.model.value, onOpenChange: change };
  await settle();
  f.tabs()[0]!.focus();
  f.key(f.tabs()[0]!, "ArrowRight");
  await settle();
  expect(document.activeElement).toBe(f.tabs()[1]);
  expect(f.host.querySelector('[role="tabpanel"]')?.textContent).toBe(
    "Beta body"
  );
  f.dir.value = "rtl";
  await settle();
  f.key(f.tabs()[1]!, "ArrowRight");
  await settle();
  expect(document.activeElement).toBe(f.tabs()[0]);
  f.key(f.tabs()[0]!, "End");
  await settle();
  expect(document.activeElement).toBe(f.tabs()[2]);
  f.key(f.tabs()[2]!, "Home");
  await settle();
  expect(document.activeElement).toBe(f.tabs()[0]);
});
it("retires callbacks across KeepAlive deactivation and disposal", async () => {
  const f = fixture();
  await settle();
  const old = f.captured.at(-1)!;
  const close = f.closes.at(-1)!;
  f.shown.value = false;
  await settle();
  old.buttonProps.onClick();
  close();
  expect(f.calls).not.toHaveBeenCalled();
  f.shown.value = true;
  await settle();
  old.buttonProps.onClick();
  close();
  expect(f.calls).not.toHaveBeenCalled();
  const fresh = f.captured.at(-1)!;
  f.app.unmount();
  cleanup.pop();
  fresh.buttonProps.onClick();
  expect(f.calls).not.toHaveBeenCalled();
});

it("retires a pending generic handoff when replaced by a presentation", async () => {
  const f = fixture();
  await settle();
  const first = f.tabs()[0]!;
  first.focus();
  f.key(first, "ArrowRight");
  f.presentation.value = () => h("section", "New presentation");
  await settle();
  expect(f.host.textContent).toBe("New presentation");
  expect(document.activeElement).not.toBe(first);
});
it("does not hand queued focus to a replacement model owner on the same DOM", async () => {
  const f = fixture();
  await settle();
  const first = f.tabs()[0]!;
  first.focus();
  f.key(first, "ArrowRight");
  f.model.value = { ...f.model.value, onOpenChange: vi.fn() };
  await settle();
  expect(f.tabs()[0]).toBe(first);
  expect(document.activeElement).toBe(first);
});
