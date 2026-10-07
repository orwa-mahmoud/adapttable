import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { rekaSelect } from "../src/controls/select";

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
it("retires a disabled open Select, rejects its old item, and re-enables it closed", async () => {
  const disabled = shallowRef(false);
  const changed = vi.fn();
  const opened = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h("div", [
        h("input", { id: "select-outside" }),
        rekaSelect({
          attrs: { "aria-label": "Choice", disabled: disabled.value },
          value: "a",
          options: [
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ],
          onChange: changed,
          onOpenChange: opened,
        }),
      ]),
  });
  app.mount(host);
  stop = () => app.unmount();
  await flush();
  const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]');
  const outside = host.querySelector<HTMLInputElement>("#select-outside");
  if (!trigger || !outside) throw new Error("Missing controls");
  trigger.focus();
  await key(trigger, "ArrowDown");
  const beta = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((option) => option.textContent === "Beta");
  if (!beta) throw new Error("Missing Beta");
  disabled.value = true;
  await nextTick();
  outside.focus();
  await flush();
  beta.dispatchEvent(
    new MouseEvent("pointerup", { bubbles: true, cancelable: true })
  );
  await flush();
  await key(beta, "Enter");
  expect(changed).not.toHaveBeenCalled();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.activeElement).toBe(outside);
  expect(opened.mock.calls).toEqual([[true], [false]]);
  disabled.value = false;
  await flush();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  await key(beta, "Enter");
  expect(changed).not.toHaveBeenCalled();
  trigger.focus();
  await key(trigger, "ArrowDown");
  const current = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((option) => option.textContent === "Beta");
  if (!current) throw new Error("Missing current Beta");
  current.focus();
  await key(current, "Enter");
  expect(changed).toHaveBeenCalledExactlyOnceWith("b");
});
