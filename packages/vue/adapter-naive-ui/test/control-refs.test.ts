import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";

import { naiveInput } from "../src/controls/input";
import { naiveSelect } from "../src/controls/select";

const cleanups: (() => void)[] = [];
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(host);
  const unmount = () => {
    app.unmount();
    host.remove();
  };
  cleanups.push(unmount);
  return { host, unmount };
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("Naive native-target ref ownership", () => {
  it("uses InputInst refs across input/textarea replacement and clears the prior callback", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const callback = shallowRef(first);
    const type = shallowRef<"text" | "textarea">("text");
    const view = mount(() =>
      naiveInput({
        attrs: { ref: callback.value, "aria-label": "Editor" },
        type: type.value,
        value: "Ada",
        onChange: vi.fn(),
      })
    );
    await nextTick();
    const input = view.host.querySelector("input")!;
    expect(first).toHaveBeenLastCalledWith(input);
    input.focus();
    expect(document.activeElement).toBe(input);
    type.value = "textarea";
    await nextTick();
    const textarea = view.host.querySelector("textarea")!;
    expect(input.isConnected).toBe(false);
    expect(first.mock.calls.slice(-2)).toEqual([[null], [textarea]]);
    textarea.focus();
    expect(document.activeElement).toBe(textarea);
    callback.value = second;
    await nextTick();
    expect(first).toHaveBeenLastCalledWith(null);
    expect(second).toHaveBeenLastCalledWith(textarea);
    expect(first.mock.invocationCallOrder.at(-1)).toBeLessThan(
      second.mock.invocationCallOrder[0]!
    );
    view.unmount();
    cleanups.pop();
    expect(second).toHaveBeenLastCalledWith(null);
    const callCount = second.mock.calls.length;
    await nextTick();
    expect(second).toHaveBeenCalledTimes(callCount);
  });

  it("clears an input ref when the caller removes it without unmounting the input", async () => {
    const callback = vi.fn();
    const attached = shallowRef(true);
    const view = mount(() =>
      naiveInput({
        attrs: { ref: attached.value ? callback : undefined },
        value: "Ada",
        onChange: vi.fn(),
      })
    );
    await nextTick();
    expect(callback).toHaveBeenLastCalledWith(view.host.querySelector("input"));
    attached.value = false;
    await nextTick();
    expect(callback).toHaveBeenLastCalledWith(null);
    expect(view.host.querySelector("input")!.isConnected).toBe(true);
  });

  it("targets the select's public-role input and releases callback and keyed target replacements", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const callback = shallowRef(first);
    const key = shallowRef("first");
    const view = mount(() =>
      naiveSelect({
        attrs: {
          key: key.value,
          ref: callback.value,
          class: "density-host",
          "aria-label": "Density",
          "data-adapttable-part": "density-toggle",
        },
        value: "compact",
        options: [{ value: "compact", label: "Compact" }],
        onChange: vi.fn(),
      })
    );
    await nextTick();
    const host = view.host.querySelector(
      '[data-adapttable-part="density-toggle"]'
    )!;
    const input = host.querySelector<HTMLInputElement>(
      'input[role="combobox"]'
    )!;
    expect(host.classList.contains("density-host")).toBe(true);
    expect(host.classList.contains("n-select")).toBe(true);
    expect(host.querySelectorAll('input[role="combobox"]')).toHaveLength(1);
    expect(first).toHaveBeenLastCalledWith(input);
    input.focus();
    expect(document.activeElement).toBe(input);
    callback.value = second;
    await nextTick();
    expect(first).toHaveBeenLastCalledWith(null);
    expect(second).toHaveBeenLastCalledWith(input);
    expect(first.mock.invocationCallOrder.at(-1)).toBeLessThan(
      second.mock.invocationCallOrder[0]!
    );
    key.value = "replacement";
    await nextTick();
    const replacement = view.host.querySelector<HTMLInputElement>(
      'input[role="combobox"]'
    )!;
    expect(replacement).not.toBe(input);
    expect(input.isConnected).toBe(false);
    expect(second.mock.calls.slice(-2)).toEqual([[null], [replacement]]);
    replacement.focus();
    expect(document.activeElement).toBe(replacement);
    view.unmount();
    cleanups.pop();
    expect(second).toHaveBeenLastCalledWith(null);
    const callCount = second.mock.calls.length;
    await nextTick();
    expect(second).toHaveBeenCalledTimes(callCount);
  });

  it("releases the select target when the caller removes its ref", async () => {
    const callback = vi.fn();
    const attached = shallowRef(true);
    const view = mount(() =>
      naiveSelect({
        attrs: {
          ref: attached.value ? callback : undefined,
          "aria-label": "Density",
        },
        value: "compact",
        options: [{ value: "compact", label: "Compact" }],
        onChange: vi.fn(),
      })
    );
    await nextTick();
    expect(callback).toHaveBeenLastCalledWith(
      view.host.querySelector('input[role="combobox"]')
    );
    attached.value = false;
    await nextTick();
    expect(callback).toHaveBeenLastCalledWith(null);
    expect(view.host.querySelector("input")!.isConnected).toBe(true);
  });
  it.each(["input", "select"])(
    "keeps a stable %s target through ordinary value renders",
    async (kind) => {
      const callback = vi.fn();
      const value = shallowRef("compact");
      const view = mount(() => {
        const control = {
          attrs: { ref: callback, "aria-label": "Value" },
          value: value.value,
          onChange: vi.fn(),
        };
        return kind === "input"
          ? naiveInput(control)
          : naiveSelect({
              ...control,
              options: [
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
              ],
            });
      });
      await nextTick();
      const target = view.host.querySelector("input")!;
      expect(callback).toHaveBeenCalledExactlyOnceWith(target);
      value.value = "comfortable";
      await nextTick();
      expect(callback).toHaveBeenCalledExactlyOnceWith(target);
    }
  );
});
