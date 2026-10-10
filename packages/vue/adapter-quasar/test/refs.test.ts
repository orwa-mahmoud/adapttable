import type { ElementRef } from "@adapttable/vue";
import { mount } from "@vue/test-utils";
import { QCard, Quasar } from "quasar";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { useQuasarControlRef } from "../src/controls/controlAttrs";
import QuasarPart from "../src/table/QuasarPart.vue";

const settle = async () => {
  await nextTick();
  await nextTick();
};

describe("Quasar public target ownership", () => {
  it("observes a genuine QCard root replacement without changing component identity", async () => {
    const owner = vi.fn();
    const wrapper = mount(QuasarPart, {
      props: { kind: "card", attrs: { tag: "article", ref: owner } },
      global: { plugins: [Quasar] },
    });
    await settle();
    const instance = wrapper.getComponent(QCard).vm;
    const original = wrapper.element;
    await wrapper.setProps({ attrs: { tag: "section", ref: owner } });
    await settle();
    expect(wrapper.getComponent(QCard).vm).toBe(instance);
    expect(wrapper.element.tagName).toBe("SECTION");
    expect(wrapper.element).not.toBe(original);
    expect(owner.mock.calls).toEqual([[original], [null], [wrapper.element]]);
    wrapper.unmount();
    expect(owner).toHaveBeenLastCalledWith(null);
  });

  it("does not attach the second ref channel after synchronous disposal by the first", () => {
    const scope = effectScope();
    const element = document.createElement("input");
    const owner = vi.fn((node: HTMLInputElement | null) => {
      if (node) scope.stop();
    });
    const focus = vi.fn();
    scope.run(() =>
      useQuasarControlRef(
        () => element,
        () => ({ ref: owner }),
        () => focus
      )
    );
    expect(owner.mock.calls).toEqual([[element], [null]]);
    expect(focus).not.toHaveBeenCalled();
  });

  it("deduplicates aliased ref channels and preserves the final owner when channels change", async () => {
    const element = document.createElement("button");
    const a = vi.fn();
    const b = vi.fn();
    const attr = shallowRef<ElementRef<HTMLButtonElement> | undefined>(a);
    const focus = shallowRef<ElementRef<HTMLButtonElement> | undefined>(b);
    const scope = effectScope();
    scope.run(() =>
      useQuasarControlRef(
        () => element,
        () => ({ ref: attr.value }),
        () => focus.value
      )
    );
    expect(a.mock.calls).toEqual([[element]]);
    expect(b.mock.calls).toEqual([[element]]);
    attr.value = b;
    await settle();
    expect(a.mock.calls).toEqual([[element], [null]]);
    expect(b.mock.calls).toEqual([[element], [null], [element]]);
    focus.value = undefined;
    await settle();
    expect(b.mock.calls).toEqual([[element], [null], [element]]);
    scope.stop();
    expect(b.mock.calls).toEqual([[element], [null], [element], [null]]);
  });

  it("uses a callback installed by the retiring owner instead of attaching a superseded owner", async () => {
    const element = document.createElement("button");
    const final = vi.fn();
    const intermediate = vi.fn();
    const owner = shallowRef<ElementRef<HTMLButtonElement>>();
    const first = vi.fn((node: HTMLButtonElement | null) => {
      if (node === null) owner.value = final;
    });
    owner.value = first;
    const scope = effectScope();
    scope.run(() =>
      useQuasarControlRef(
        () => element,
        () => ({ ref: owner.value })
      )
    );
    owner.value = intermediate;
    await settle();
    expect(first.mock.calls).toEqual([[element], [null]]);
    expect(intermediate).not.toHaveBeenCalled();
    expect(final.mock.calls).toEqual([[element]]);
    scope.stop();
    expect(final).toHaveBeenLastCalledWith(null);
  });
});
