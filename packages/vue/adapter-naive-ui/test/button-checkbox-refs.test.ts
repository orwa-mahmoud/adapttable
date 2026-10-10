import type { Attrs, ElementRef } from "@adapttable/vue";
import { NCard, NTable } from "naive-ui";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";

import { naiveButton } from "../src/controls/button";
import { naiveCheckbox } from "../src/controls/checkbox";
import { naiveElement } from "../src/renderers/nativeElement";

const cleanups = new Set<() => void>();
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(host);
  const unmount = () => {
    app.unmount();
    host.remove();
    cleanups.delete(unmount);
  };
  cleanups.add(unmount);
  return { host, unmount };
}
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
});

function control(kind: "button" | "checkbox", attrs: Attrs, changed = false) {
  if (kind === "button") {
    return naiveButton(attrs, changed ? "Updated" : "Initial");
  }
  return naiveCheckbox({
    attrs,
    checked: changed,
    indeterminate: false,
    onToggle: vi.fn(),
  });
}

describe.each(["button", "checkbox"] as const)(
  "Naive %s ref ownership",
  (kind) => {
    const selector = kind === "button" ? "button" : '[role="checkbox"]';

    it("releases a replaced callback before attaching the new owner and on unmount", async () => {
      const first = vi.fn();
      const second = vi.fn();
      const callback = shallowRef<ElementRef>(first);
      const view = mount(() => control(kind, { ref: callback.value }));
      await nextTick();
      const target = view.host.querySelector<HTMLElement>(selector)!;
      expect(first).toHaveBeenCalledExactlyOnceWith(target);
      target.focus();
      expect(document.activeElement).toBe(target);

      callback.value = second;
      await nextTick();
      expect(first.mock.calls).toEqual([[target], [null]]);
      expect(second).toHaveBeenCalledExactlyOnceWith(target);
      expect(first.mock.invocationCallOrder.at(-1)).toBeLessThan(
        second.mock.invocationCallOrder[0]!
      );
      expect(view.host.querySelector(selector)).toBe(target);
      expect(document.activeElement).toBe(target);

      view.unmount();
      expect(second.mock.calls).toEqual([[target], [null]]);
      await nextTick();
      expect(first).toHaveBeenCalledTimes(2);
      expect(second).toHaveBeenCalledTimes(2);
    });

    it("keeps the focused native target when a callback is removed and restored", async () => {
      const receive = vi.fn();
      const callback = shallowRef<ElementRef | undefined>(receive);
      const view = mount(() => control(kind, { ref: callback.value }));
      await nextTick();
      const target = view.host.querySelector<HTMLElement>(selector)!;
      target.focus();
      callback.value = undefined;
      await nextTick();
      expect(receive.mock.calls).toEqual([[target], [null]]);
      expect(view.host.querySelector(selector)).toBe(target);
      expect(target.isConnected).toBe(true);
      expect(document.activeElement).toBe(target);

      callback.value = receive;
      await nextTick();
      expect(receive.mock.calls).toEqual([[target], [null], [target]]);
      expect(view.host.querySelector(selector)).toBe(target);
      expect(document.activeElement).toBe(target);
      view.unmount();
      expect(receive.mock.calls).toEqual([[target], [null], [target], [null]]);
    });

    it("does not notify a stable callback again during ordinary controlled renders", async () => {
      const receive = vi.fn();
      const changed = shallowRef(false);
      const view = mount(() =>
        control(kind, { ref: receive, "aria-label": "Action" }, changed.value)
      );
      await nextTick();
      const target = view.host.querySelector<HTMLElement>(selector)!;
      expect(receive).toHaveBeenCalledExactlyOnceWith(target);
      target.focus();
      changed.value = true;
      await nextTick();
      expect(receive).toHaveBeenCalledExactlyOnceWith(target);
      expect(view.host.querySelector(selector)).toBe(target);
      expect(document.activeElement).toBe(target);
      if (kind === "button") expect(target.textContent).toContain("Updated");
      else expect(target.getAttribute("aria-checked")).toBe("true");
    });

    it("releases a keyed target before delivering its replacement", async () => {
      const receive = vi.fn();
      const key = shallowRef("initial");
      const view = mount(() => control(kind, { key: key.value, ref: receive }));
      await nextTick();
      const target = view.host.querySelector<HTMLElement>(selector)!;
      key.value = "replacement";
      await nextTick();
      const replacement = view.host.querySelector<HTMLElement>(selector)!;
      expect(replacement).not.toBe(target);
      expect(target.isConnected).toBe(false);
      expect(receive.mock.calls).toEqual([[target], [null], [replacement]]);
      replacement.focus();
      expect(document.activeElement).toBe(replacement);
      view.unmount();
      expect(receive.mock.calls).toEqual([
        [target],
        [null],
        [replacement],
        [null],
      ]);
    });
  }
);

it("releases NButton's native root when its public tag changes", async () => {
  const receive = vi.fn();
  const tag = shallowRef<"button" | "span">("button");
  const view = mount(() =>
    naiveButton({ ref: receive, tabindex: 0 }, "Resize", { tag: tag.value })
  );
  await nextTick();
  const button = view.host.querySelector("button")!;
  expect(receive).toHaveBeenCalledExactlyOnceWith(button);
  tag.value = "span";
  await nextTick();
  const replacement = view.host.querySelector<HTMLElement>("span.n-button")!;
  expect(button.isConnected).toBe(false);
  expect(receive.mock.calls).toEqual([[button], [null], [replacement]]);
  replacement.focus();
  expect(document.activeElement).toBe(replacement);
  view.unmount();
  expect(receive.mock.calls).toEqual([[button], [null], [replacement], [null]]);
});

describe.each([
  ["table", NTable, "table.n-table"],
  ["card", NCard, ".n-card"],
] as const)("Naive %s renderer ref ownership", (_kind, component, selector) => {
  it("keeps the same focused root across callback addition, replacement and removal", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const callback = shallowRef<ElementRef>();
    const label = shallowRef("Initial");
    const view = mount(() =>
      naiveElement(component, {
        ref: callback.value,
        tabindex: 0,
        "aria-label": label.value,
        "data-adapttable-part": "ref-target",
        class: "custom-target",
      })
    );
    await nextTick();
    const target = view.host.querySelector<HTMLElement>(selector)!;
    target.focus();
    expect(document.activeElement).toBe(target);
    callback.value = first;
    await nextTick();
    expect(view.host.querySelector(selector)).toBe(target);
    expect(first).toHaveBeenCalledExactlyOnceWith(target);
    expect(document.activeElement).toBe(target);

    label.value = "Updated";
    await nextTick();
    expect(first).toHaveBeenCalledExactlyOnceWith(target);
    expect(target.getAttribute("aria-label")).toBe("Updated");
    callback.value = second;
    await nextTick();
    expect(first.mock.calls).toEqual([[target], [null]]);
    expect(second).toHaveBeenCalledExactlyOnceWith(target);
    expect(first.mock.invocationCallOrder.at(-1)).toBeLessThan(
      second.mock.invocationCallOrder[0]!
    );
    callback.value = undefined;
    await nextTick();
    expect(second.mock.calls).toEqual([[target], [null]]);
    expect(view.host.querySelector(selector)).toBe(target);
    expect(target.isConnected).toBe(true);
    expect(document.activeElement).toBe(target);
    expect(target.dataset.adapttablePart).toBe("ref-target");
    expect(target.classList.contains("custom-target")).toBe(true);
    view.unmount();
    await nextTick();
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
  });
});
