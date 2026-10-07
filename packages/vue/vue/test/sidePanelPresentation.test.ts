import { resolveLabels } from "@adapttable/core";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import type { SidePanelControlModel } from "../src/actions/contracts";
import {
  SidePanelChrome,
  type SidePanelPresentation,
  type SidePanelPresentationProps,
  type SidePanelSlots,
} from "../src/actions/sidePanelChrome";
import { toVueAttrs } from "../src/attrs";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
const slots: SidePanelSlots = {
  Frame: ({ children }) => h("aside", [children]),
  Tab: ({ panel, buttonProps }) =>
    h("button", toVueAttrs(buttonProps), panel.label),
  Close: ({ label, onClose }) => h("button", { onClick: onClose }, label),
};
const panels = [
  { key: "a", label: "Alpha", content: "Alpha content" },
  { key: "b", label: "Beta", content: "Beta content" },
];
const currentLabels = resolveLabels({});
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return { host, stop: () => app.unmount() };
}
it("requires a complete renderer and keeps controlled selection rejectable", async () => {
  const requests = vi.fn();
  const model = shallowRef<SidePanelControlModel>({
    panels,
    open: "a",
    onOpenChange: requests,
  });
  const snapshots: SidePanelPresentationProps[] = [];
  const presentation: SidePanelPresentation = (props) => {
    snapshots.push(props);
    return h("section", { "data-presentation": "" }, [
      typeof props.view.selected.content === "function"
        ? props.view.selected.content()
        : props.view.selected.content,
    ]);
  };
  const { host, stop } = mount(() =>
    h(SidePanelChrome, {
      model: model.value,
      labels: currentLabels,
      dir: "ltr",
      presentation,
    })
  );
  await nextTick();
  const first = snapshots.at(-1)!;
  expect(first.isCurrent()).toBe(true);
  expect(host.textContent).toBe("Alpha content");
  first.onSelect("b");
  expect(requests).toHaveBeenLastCalledWith("b");
  expect(host.textContent).toBe("Alpha content");
  first.onSelect("unknown");
  expect(requests).toHaveBeenCalledTimes(1);
  model.value = { panels, open: "b", onOpenChange: requests };
  await nextTick();
  expect(host.textContent).toBe("Beta content");
  first.onClose();
  first.onSelect("a");
  expect(requests).toHaveBeenCalledTimes(1);
  const second = snapshots.at(-1)!;
  second.onClose();
  expect(requests).toHaveBeenLastCalledWith(null);
  stop();
  second.onSelect("a");
  second.onClose();
  expect(requests).toHaveBeenCalledTimes(2);
  stops.pop();
});
it("retires replaced drivers and only accepts Escape outside nested overlays", async () => {
  const close = vi.fn();
  const captured: SidePanelPresentationProps[] = [];
  const make = (): SidePanelPresentation => (props) => {
    captured.push(props);
    return h("section", { onKeydown: props.onBodyKeyDown }, [
      h("button", "Body"),
      h("div", { role: "dialog" }, h("button", "Nested")),
    ]);
  };
  const driver = shallowRef(make());
  const model: SidePanelControlModel = {
    panels,
    open: "a",
    onOpenChange: close,
  };
  const { host } = mount(() =>
    h(SidePanelChrome, {
      model,
      labels: currentLabels,
      dir: "rtl",
      presentation: driver.value,
    })
  );
  await nextTick();
  const prior = captured.at(-1)!;
  driver.value = make();
  await nextTick();
  prior.onClose();
  expect(close).not.toHaveBeenCalled();
  host.querySelector('[role="dialog"] button')?.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  expect(close).not.toHaveBeenCalled();
  host.querySelector("button")?.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  expect(close).toHaveBeenCalledExactlyOnceWith(null);
});
it("keeps the existing required generic controls when no presentation is supplied", async () => {
  const change = vi.fn();
  const model: SidePanelControlModel = {
    panels,
    open: "a",
    onOpenChange: change,
  };
  const { host } = mount(() =>
    h(SidePanelChrome, { model, slots, labels: currentLabels, dir: "ltr" })
  );
  await nextTick();
  const tab = host.querySelector<HTMLElement>('[role="tab"]');
  expect(host.querySelector('[role="tabpanel"]')?.textContent).toBe(
    "Alpha content"
  );
  tab?.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    })
  );
  expect(change).toHaveBeenCalledExactlyOnceWith("b");
});
