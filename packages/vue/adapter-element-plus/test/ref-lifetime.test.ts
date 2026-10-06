import type { ElementRef } from "@adapttable/vue";
import {
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import { ElCard, ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cloneVNode,
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

import { elementButton } from "../src/controls/button";
import { elementSelectionCheckbox } from "../src/controls/checkbox";
import ElementCheckbox from "../src/controls/ElementCheckbox.vue";
import { ElementCard } from "../src/presentation/ElementCard";
import { ElementMobileCards } from "../src/presentation/ElementMobileCards";
import { node } from "./mount";

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));
async function tick() {
  await nextTick();
  await nextTick();
}
function fixture(render: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({ render });
  app.provide(ID_INJECTION_KEY, { prefix: 7000, current: 0 });
  app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  app.mount(root);
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    root.remove();
  };
  cleanups.push(unmount);
  return { root, unmount };
}

describe("Element Plus native target ref ownership", () => {
  it("checkbox: releases a replaced callback before attaching its replacement", async () => {
    const events: [string, HTMLInputElement | null][] = [];
    const first: ElementRef<HTMLInputElement> = (input) =>
      events.push(["first", input]);
    const second: ElementRef<HTMLInputElement> = (input) =>
      events.push(["second", input]);
    const owner = shallowRef(first);
    const { root, unmount } = fixture(() =>
      h(ElementCheckbox, {
        checked: false,
        label: "Row",
        inputRef: owner.value,
      })
    );
    await tick();
    const input = node<HTMLInputElement>(root, "input");
    expect(events).toEqual([["first", input]]);
    owner.value = second;
    await tick();
    expect(events).toEqual([
      ["first", input],
      ["first", null],
      ["second", input],
    ]);
    unmount();
    expect(events.at(-1)).toEqual(["second", null]);
  });
  it("checkbox: releases a callback that synchronously disposes its owner during attachment", async () => {
    const owner = shallowRef<ElementRef<HTMLInputElement>>();
    const view = fixture(() =>
      h(ElementCheckbox, {
        checked: false,
        label: "Row",
        inputRef: owner.value,
      })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    const callback = vi.fn<ElementRef<HTMLInputElement>>((value) => {
      if (value) view.unmount();
    });
    owner.value = callback;
    await tick();
    expect(callback.mock.calls).toEqual([[input], [null]]);
    expect(input.isConnected).toBe(false);
  });
  it("checkbox: does not attach a replacement after the old owner's release disposes the scope", async () => {
    const lifetime: { dispose?: () => void } = {};
    const first = vi.fn<ElementRef<HTMLInputElement>>((value) => {
      if (value === null) lifetime.dispose?.();
    });
    const second = vi.fn<ElementRef<HTMLInputElement>>();
    const owner = shallowRef<ElementRef<HTMLInputElement>>(first);
    const view = fixture(() =>
      h(ElementCheckbox, {
        checked: false,
        label: "Row",
        inputRef: owner.value,
      })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    lifetime.dispose = view.unmount;
    owner.value = second;
    await tick();
    expect(first.mock.calls).toEqual([[input], [null]]);
    expect(second).not.toHaveBeenCalled();
    expect(input.isConnected).toBe(false);
  });
  it("button: avoids duplicate attachment on updates and releases a replaced callback", async () => {
    const first = vi.fn<ElementRef<HTMLElement>>();
    const second = vi.fn<ElementRef<HTMLElement>>();
    const owner = shallowRef<ElementRef<HTMLElement>>(first);
    const label = shallowRef("First");
    const { root, unmount } = fixture(() =>
      elementButton(
        { ref: owner.value, "aria-label": label.value },
        label.value
      )
    );
    await tick();
    const button = node<HTMLButtonElement>(root, "button");
    expect(first.mock.calls).toEqual([[button]]);
    label.value = "Updated";
    await tick();
    expect(first.mock.calls).toEqual([[button]]);
    owner.value = second;
    await tick();
    expect(first.mock.calls).toEqual([[button], [null]]);
    expect(second.mock.calls).toEqual([[button]]);
    unmount();
    expect(second.mock.calls).toEqual([[button], [null]]);
  });
  it("button: releases a callback that synchronously disposes its owner during attachment", async () => {
    const owner = shallowRef<ElementRef<HTMLElement>>();
    const view = fixture(() => elementButton({ ref: owner.value }, "Row"));
    await tick();
    const button = node<HTMLButtonElement>(view.root, "button");
    const callback = vi.fn<ElementRef<HTMLElement>>((value) => {
      if (value) view.unmount();
    });
    owner.value = callback;
    await tick();
    expect(callback.mock.calls).toEqual([[button], [null]]);
    expect(button.isConnected).toBe(false);
  });
  it("mobile card: releases replaced row measurement owners without changing its semantic target", async () => {
    const first = vi.fn<ElementRef<HTMLElement>>();
    const second = vi.fn<ElementRef<HTMLElement>>();
    const owner = shallowRef<ElementRef<HTMLElement>>(first);
    const color = shallowRef("red");
    interface Row {
      id: string;
      name: string;
    }
    const controls: TableChromeSlots<Row> = {
      SortButton: (props) => elementButton(props.attrs, props.content),
      SelectionCheckbox: elementSelectionCheckbox,
    };
    const App = defineComponent({
      setup() {
        const shell = useDataTableShell<Row>(() => ({
          data: [{ id: "a", name: "Ada" }],
          columns: [{ key: "name" }],
          rowKey: (row) => row.id,
          forceMobile: true,
          urlSync: false,
        }));
        return () =>
          h(ElementMobileCards<Row>, {
            controls,
            model: {
              ...shell.mobile.value,
              rows: shell.mobile.value.rows.map((row) => ({
                ...row,
                attrs: {
                  ...row.attrs,
                  ref: owner.value,
                  style: { color: color.value },
                },
              })),
            },
          });
      },
    });
    const { root, unmount } = fixture(() => h(App));
    await tick();
    const card = node<HTMLElement>(root, '[data-adapttable-part="card"]');
    expect(first.mock.calls).toEqual([[card]]);
    color.value = "blue";
    await tick();
    expect(first.mock.calls).toEqual([[card]]);
    owner.value = second;
    await tick();
    expect(first.mock.calls).toEqual([[card], [null]]);
    expect(second.mock.calls).toEqual([[card]]);
    unmount();
    expect(second.mock.calls).toEqual([[card], [null]]);
  });
  it("selection checkbox: preserves the raw native owner across checked updates", async () => {
    const owner = vi.fn<ElementRef<HTMLElement>>();
    const checked = shallowRef(false);
    const { root, unmount } = fixture(() =>
      elementSelectionCheckbox({
        attrs: { ref: owner, "aria-label": "Select row" },
        checked: checked.value,
        indeterminate: false,
        onToggle: () => undefined,
      })
    );
    await tick();
    const input = node<HTMLInputElement>(root, "input");
    expect(owner.mock.calls).toEqual([[input]]);
    checked.value = true;
    await tick();
    expect(input.checked).toBe(true);
    expect(owner.mock.calls).toEqual([[input]]);
    unmount();
    expect(owner.mock.calls).toEqual([[input], [null]]);
  });

  const cases = [
    {
      name: "button",
      selector: "button",
      render: (owner: ElementRef<HTMLElement> | undefined, key: string) =>
        elementButton({ ref: owner, key }, "Control"),
    },
    {
      name: "checkbox",
      selector: "input",
      render: (owner: ElementRef<HTMLElement> | undefined, key: string) =>
        h(ElementCheckbox, {
          key,
          checked: false,
          label: "Control",
          inputRef: owner,
        }),
    },
    {
      name: "card",
      selector: ".el-card",
      render: (owner: ElementRef<HTMLElement> | undefined, key: string) =>
        h(
          ElementCard,
          { key, attrs: { ref: owner, role: "listitem" } },
          { default: () => "Control" }
        ),
    },
  ];
  for (const control of cases) {
    it(`${control.name}: releases callback removal and keyed target replacement exactly once`, async () => {
      const callback = vi.fn<ElementRef<HTMLElement>>();
      const owner = shallowRef<ElementRef<HTMLElement> | undefined>(callback);
      const key = shallowRef("first");
      const { root, unmount } = fixture(() =>
        control.render(owner.value, key.value)
      );
      await tick();
      const first = node<HTMLElement>(root, control.selector);
      expect(callback.mock.calls).toEqual([[first]]);
      owner.value = undefined;
      await tick();
      expect(callback.mock.calls).toEqual([[first], [null]]);
      owner.value = callback;
      await tick();
      expect(callback.mock.calls).toEqual([[first], [null], [first]]);
      key.value = "second";
      await tick();
      const second = node<HTMLElement>(root, control.selector);
      expect(second).not.toBe(first);
      expect(first.isConnected).toBe(false);
      expect(callback.mock.calls).toEqual([
        [first],
        [null],
        [first],
        [null],
        [second],
      ]);
      unmount();
      expect(callback.mock.calls).toEqual([
        [first],
        [null],
        [first],
        [null],
        [second],
        [null],
      ]);
    });
    it(`${control.name}: does not attach a new owner after old-owner release disposes the component`, async () => {
      const lifetime: { dispose?: () => void } = {};
      const first = vi.fn<ElementRef<HTMLElement>>((value) => {
        if (value === null) lifetime.dispose?.();
      });
      const second = vi.fn<ElementRef<HTMLElement>>();
      const owner = shallowRef<ElementRef<HTMLElement>>(first);
      const view = fixture(() => control.render(owner.value, "stable"));
      await tick();
      const target = node<HTMLElement>(view.root, control.selector);
      lifetime.dispose = view.unmount;
      owner.value = second;
      await tick();
      expect(first.mock.calls).toEqual([[target], [null]]);
      expect(second).not.toHaveBeenCalled();
    });
  }
  it("card bridge renders the exact real ElCard without an extra DOM wrapper", async () => {
    const vnode = h(
      ElementCard,
      {
        attrs: {
          role: "listitem",
          "aria-label": "Row card",
          "data-adapttable-part": "card",
          class: "host-card",
        },
      },
      { default: () => "Ada" }
    );
    const { root } = fixture(() => vnode);
    await tick();
    expect(vnode.component?.subTree.type).toBe(ElCard);
    expect(root.children).toHaveLength(1);
    const card = node<HTMLElement>(root, ".el-card");
    expect(card.parentNode).toBe(root);
    expect(card.getAttribute("role")).toBe("listitem");
    expect(card.getAttribute("aria-label")).toBe("Row card");
    expect(card.getAttribute("data-adapttable-part")).toBe("card");
    expect(card.classList.contains("host-card")).toBe(true);
  });
  it("button: forwards attrs and listeners injected by a kit trigger slot", async () => {
    const original = vi.fn();
    const injected = vi.fn();
    const vnode = cloneVNode(
      elementButton(
        {
          onClick: original,
          class: "host-button",
          "aria-label": "Open choices",
        },
        "Open"
      ),
      {
        onClick: injected,
        class: "injected-trigger",
        "aria-expanded": "false",
        "data-slot-owner": "menu",
      }
    );
    const { root } = fixture(() => vnode);
    await tick();
    const button = node<HTMLButtonElement>(root, "button");
    expect(button.classList.contains("host-button")).toBe(true);
    expect(button.classList.contains("injected-trigger")).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("data-slot-owner")).toBe("menu");
    button.click();
    expect(original).toHaveBeenCalledTimes(1);
    expect(injected).toHaveBeenCalledTimes(1);
  });
});
