import { PopoverArrow } from "reka-ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { Button } from "../src/components/button";
import Card from "../src/components/card/Card.vue";
import { Checkbox } from "../src/components/checkbox";
import { Input } from "../src/components/input";
import { NativeSelect } from "../src/components/native-select";
import { Popover, PopoverContent } from "../src/components/popover";
const PortaledContent = defineComponent(
  (props: {
    readonly elementRef?: (element: Element | null) => void;
    readonly class?: string;
  }) =>
    () =>
      h(Popover, { open: true }, () =>
        h(
          PopoverContent,
          {
            elementRef: props.elementRef,
            class: props.class,
            "data-adapttable-part": "semantic-popover",
          },
          () => "Content"
        )
      ),
  { inheritAttrs: false, props: ["elementRef", "class"] }
);
beforeEach(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    }
  )
);
afterEach(() => vi.unstubAllGlobals());

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

describe("shadcn semantic ref ownership", () => {
  it.each([Button, Checkbox, Input, NativeSelect, Card, PortaledContent])(
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
      if (component === PortaledContent) {
        expect(target).toBe(
          document.querySelector(
            '[role="dialog"][data-slot="popover-content"][data-adapttable-part="semantic-popover"]'
          )
        );
        expect(target?.classList.contains("before")).toBe(true);
        expect(target?.hasAttribute("data-reka-popper-content-wrapper")).toBe(
          false
        );
      }
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

  it.each([Input, PortaledContent])(
    "does not attach a replacement after release synchronously destroys its scope",
    async (component) => {
      const calls: [string, Element | null][] = [];
      let stopOnRelease = false;
      const owner = shallowRef<(value: Element | null) => void>(
        () => undefined
      );
      const root = document.createElement("div");
      document.body.append(root);
      const app = createApp(
        defineComponent({
          setup: () => () => h(component, { elementRef: owner.value }),
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
    }
  );
  it("preserves asChild composition, caller attrs and arrow on the actual semantic target", async () => {
    const calls: (Element | null)[] = [];
    const elementRef = (target: Element | null) => calls.push(target);
    const clicks = vi.fn();
    const childRef = vi.fn();
    const root = document.createElement("div");
    document.body.append(root);
    const app = createApp({
      render: () =>
        h(Popover, { open: true }, () =>
          h(
            PopoverContent,
            {
              asChild: true,
              elementRef,
              class: "caller-content",
              style: { color: "rgb(1, 2, 3)" },
              "data-adapttable-part": "semantic-composed",
              "aria-label": "Composed panel",
              onClick: clicks,
            },
            () =>
              h("section", { ref: childRef, class: "child-content" }, [
                h(PopoverArrow, { "data-testid": "arrow" }),
                h("span", "Content"),
              ])
          )
        ),
    });
    app.mount(root);
    cleanups.push(() => {
      app.unmount();
      root.remove();
    });
    await nextTick();
    const target = document.querySelector<HTMLElement>(
      '[data-adapttable-part="semantic-composed"]'
    );
    expect(target).not.toBeNull();
    expect(target?.tagName).toBe("SECTION");
    expect(calls).toEqual([target]);
    expect(childRef).toHaveBeenCalled();
    expect(childRef.mock.calls.every(([node]) => node === target)).toBe(true);
    expect(target?.getAttribute("role")).toBe("dialog");
    expect(target?.getAttribute("data-slot")).toBe("popover-content");
    expect(target?.getAttribute("aria-label")).toBe("Composed panel");
    expect(target?.classList.contains("caller-content")).toBe(true);
    expect(target?.classList.contains("child-content")).toBe(true);
    expect(target?.classList.contains("data-[state=closed]:zoom-out-95")).toBe(
      true
    );
    expect(target?.style.color).toBe("rgb(1, 2, 3)");
    expect(target?.querySelector('svg[data-testid="arrow"]')).not.toBeNull();
    target?.click();
    expect(clicks).toHaveBeenCalledOnce();
  });
});
