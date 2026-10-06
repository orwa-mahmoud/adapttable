import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { Button } from "../src/components/button";
import Card from "../src/components/card/Card.vue";
import { Checkbox } from "../src/components/checkbox";
import { Input } from "../src/components/input";
import { NativeSelect } from "../src/components/native-select";

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

describe("shadcn semantic ref ownership", () => {
  it.each([Button, Checkbox, Input, NativeSelect, Card])(
    "releases replacement owners and avoids stale or repeated attachments",
    async (component) => {
      const calls: [string, Element | null][] = [];
      const first = (value: Element | null) => calls.push(["first", value]);
      const second = (value: Element | null) => calls.push(["second", value]);
      const owner = shallowRef<((value: Element | null) => void) | undefined>(
        first
      );
      const className = shallowRef("before");
      const root = document.createElement("div");
      document.body.append(root);
      const app = createApp(
        defineComponent({
          setup: () => () =>
            h(
              component,
              {
                modelValue: "",
                elementRef: owner.value,
                class: className.value,
              },
              () => "Content"
            ),
        })
      );
      app.mount(root);
      cleanups.push(() => {
        app.unmount();
        root.remove();
      });
      await nextTick();
      const target = calls[0]?.[1];
      expect(target).toBeInstanceOf(Element);
      expect(calls).toEqual([["first", target]]);
      className.value = "after";
      await nextTick();
      expect(calls).toEqual([["first", target]]);
      owner.value = second;
      await nextTick();
      expect(calls).toEqual([
        ["first", target],
        ["first", null],
        ["second", target],
      ]);
      owner.value = undefined;
      await nextTick();
      expect(calls.at(-1)).toEqual(["second", null]);
      owner.value = second;
      await nextTick();
      expect(calls.at(-1)).toEqual(["second", target]);
    }
  );

  it("does not attach a replacement after release synchronously destroys its scope", async () => {
    const calls: [string, Element | null][] = [];
    let stopOnRelease = false;
    const owner = shallowRef<(value: Element | null) => void>(() => undefined);
    const root = document.createElement("div");
    document.body.append(root);
    const app = createApp(
      defineComponent({
        setup: () => () => h(Input, { elementRef: owner.value }),
      })
    );
    owner.value = (value) => {
      calls.push(["first", value]);
      if (value === null && stopOnRelease) app.unmount();
    };
    app.mount(root);
    await nextTick();
    stopOnRelease = true;
    owner.value = (value) => calls.push(["second", value]);
    await nextTick();
    expect(calls.map(([name]) => name)).toEqual(["first", "first"]);
    expect(calls.at(-1)?.[1]).toBeNull();
    expect(root.childElementCount).toBe(0);
    root.remove();
  });
});
