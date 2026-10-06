import type { ElementRef } from "@adapttable/vue";
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { describe, expect, it } from "vitest";
import { createApp, h, nextTick, ref, shallowRef } from "vue";

import NuxtInput from "../src/controls/NuxtInput.vue";
import NuxtSelect from "../src/controls/NuxtSelect.vue";

async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

describe("Nuxt control native-ref owner composition", () => {
  it.each(["input", "select"] as const)(
    "reconciles converging, diverging, swapped and removed %s owners once",
    async (kind) => {
      const events: [string, HTMLElement | null][] = [];
      const active = new Map<string, HTMLElement | null>();
      const owner =
        (name: string): ElementRef<HTMLElement> =>
        (element) => {
          active.set(name, element);
          events.push([name, element]);
        };
      const a = owner("a"),
        b = owner("b"),
        c = owner("c");
      const focus = shallowRef<ElementRef<HTMLElement> | undefined>(a);
      const attrs = shallowRef<ElementRef<HTMLElement> | undefined>(b);
      const revision = ref(0);
      const root = document.createElement("div");
      document.body.append(root);
      const render = () => {
        const control = {
          value: "one",
          label: "Control",
          attrs: { ref: attrs.value, title: String(revision.value) },
          focusRef: focus.value,
          onChange: () => undefined,
        };
        return kind === "input"
          ? h(NuxtInput, { control })
          : h(NuxtSelect, {
              control: {
                ...control,
                options: [{ value: "one", label: "One" }],
              },
            });
      };
      const app = createApp({
        render: () => h(UApp, { toaster: null }, { default: render }),
      }).use(ui);
      let stopped = false;
      try {
        app.mount(root);
        await settle();
        const target = root.querySelector<HTMLElement>(
          kind === "input" ? "input" : 'button[role="combobox"]'
        );
        expect(target).not.toBeNull();
        expect(events).toEqual([
          ["a", target],
          ["b", target],
        ]);
        target?.focus();
        focus.value = b;
        await settle();
        expect(events.slice(2)).toEqual([
          ["a", null],
          ["b", null],
          ["b", target],
        ]);
        expect(active.get("a")).toBeNull();
        expect(active.get("b")).toBe(target);
        let count = events.length;
        revision.value++;
        await settle();
        expect(events).toHaveLength(count);
        attrs.value = c;
        await settle();
        expect(events.slice(count)).toEqual([
          ["b", null],
          ["b", target],
          ["c", target],
        ]);
        count = events.length;
        focus.value = c;
        attrs.value = b;
        await settle();
        expect(events).toHaveLength(count);
        focus.value = undefined;
        await settle();
        expect(events.slice(count)).toEqual([
          ["b", null],
          ["c", null],
          ["b", target],
        ]);
        expect(active.get("c")).toBeNull();
        expect(active.get("b")).toBe(target);
        count = events.length;
        attrs.value = undefined;
        await settle();
        expect(events.slice(count)).toEqual([["b", null]]);
        count = events.length;
        revision.value++;
        await settle();
        expect(events).toHaveLength(count);
        focus.value = a;
        attrs.value = a;
        await settle();
        expect(events.slice(count)).toEqual([["a", target]]);
        count = events.length;
        focus.value = undefined;
        await settle();
        expect(events).toHaveLength(count);
        expect(
          root.querySelector(
            kind === "input" ? "input" : 'button[role="combobox"]'
          )
        ).toBe(target);
        expect(document.activeElement).toBe(target);
        app.unmount();
        stopped = true;
        expect(events.slice(count)).toEqual([["a", null]]);
        expect(active.get("a")).toBeNull();
      } finally {
        if (!stopped) app.unmount();
        root.remove();
      }
    }
  );
});
