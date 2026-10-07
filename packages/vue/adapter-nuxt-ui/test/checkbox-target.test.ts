import type { ElementRef } from "@adapttable/vue";
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { describe, expect, it, vi } from "vitest";
import { createApp, createSSRApp, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import NuxtCheckbox from "../src/controls/NuxtCheckbox.vue";

const settle = async () => {
  await nextTick();
  await nextTick();
};

describe("Nuxt checkbox public native boundary", () => {
  it("owns the real checkbox through its host and reconciles accepted and rejected requests", async () => {
    const a = vi.fn(),
      b = vi.fn();
    const owner = shallowRef<ElementRef<HTMLButtonElement>>(a);
    const checked = shallowRef(false);
    const request = vi.fn();
    let accept = false;
    const root = document.createElement("div");
    document.body.append(root);
    const app = createApp({
      render: () =>
        h(UApp, { toaster: null }, () =>
          h(NuxtCheckbox, {
            control: {
              attrs: { ref: owner.value, id: "native-check" },
              checked: checked.value,
              label: "Available",
              focusRef: owner.value,
              onChange: (value) => {
                request(value);
                if (accept) checked.value = value;
              },
            },
          })
        ),
    }).use(ui);
    try {
      app.mount(root);
      await settle();
      const target = root.querySelector<HTMLButtonElement>(
        'button[role="checkbox"]'
      );
      expect(target).toBeInstanceOf(HTMLButtonElement);
      expect(a.mock.calls).toEqual([[target]]);
      expect(root.querySelector('label[for="native-check"]')?.textContent).toBe(
        "Available"
      );
      target?.focus();
      target?.click();
      await settle();
      expect(request.mock.calls).toEqual([[true]]);
      expect(target?.getAttribute("aria-checked")).toBe("false");
      accept = true;
      target?.click();
      await settle();
      expect(target?.getAttribute("aria-checked")).toBe("true");
      owner.value = b;
      await settle();
      expect(a.mock.calls).toEqual([[target], [null]]);
      expect(b.mock.calls).toEqual([[target]]);
      expect(document.activeElement).toBe(target);
      expect(root.querySelector('button[role="checkbox"]')).toBe(target);
    } finally {
      app.unmount();
      root.remove();
    }
    expect(b.mock.calls.at(-1)).toEqual([null]);
  });
  it("server-renders without accessing a global document", async () => {
    const owner = vi.fn();
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(NuxtCheckbox, {
            control: {
              attrs: { ref: owner },
              checked: false,
              label: "Available",
              onChange: () => undefined,
            },
          }),
      }).use(ui)
    );
    expect(html).toContain('role="checkbox"');
    expect(owner).not.toHaveBeenCalled();
  });
});
