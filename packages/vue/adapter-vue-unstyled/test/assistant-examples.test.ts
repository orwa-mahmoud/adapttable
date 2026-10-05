import type { TableAssistantMenuProps } from "@adapttable/vue/assistant";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { NativeExamplesMenu } from "../src/assistant/NativeExamplesMenu";

const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
const settle = async () => {
  await nextTick();
  await nextTick();
  await nextTick();
};
function mount() {
  const select = vi.fn();
  const props = shallowRef<TableAssistantMenuProps>({
    label: "Examples",
    part: "assistant-examples-menu",
    className: "examples-trigger",
    maxHeight: "12em",
    items: [
      {
        id: "ada",
        title: "Select Ada",
        description: "Select Ada in the table",
        part: "assistant-examples-item",
      },
      { id: "grace", title: "Select Grace", part: "assistant-examples-item" },
    ],
    onSelect: select,
  });
  const visible = shallowRef(true);
  const Child = defineComponent({
    setup: () => () => h(NativeExamplesMenu, props.value),
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup: () => () =>
      h(KeepAlive, null, { default: () => (visible.value ? h(Child) : null) }),
  });
  app.mount(root);
  let mounted = true;
  const dispose = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    root.remove();
  };
  stops.push(dispose);
  const find = <T extends HTMLElement>(selector: string): T => {
    const value = root.querySelector<T>(selector);
    if (!value) throw new Error(selector);
    return value;
  };
  const key = async (target: HTMLElement, value: string) => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
  };
  return { props, visible, root, select, app, dispose, find, key };
}
describe("native examples disclosure", () => {
  it("renders real descriptions and a scrollable command list, with keyboard navigation, selection and focus return", async () => {
    const host = mount();
    await settle();
    const trigger = host.find("summary");
    const disclosure = host.find<HTMLDetailsElement>("details");
    expect(trigger.className).toBe("examples-trigger");
    expect(host.find("menu").style.maxHeight).toBe("12em");
    expect(host.find("small").textContent).toBe("Select Ada in the table");
    trigger.focus();
    await host.key(trigger, "ArrowDown");
    expect(disclosure.open).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const items = host.root.querySelectorAll<HTMLButtonElement>("menu button");
    expect(document.activeElement).toBe(items[0]);
    await host.key(items[0]!, "End");
    expect(document.activeElement).toBe(items[1]);
    await host.key(items[1]!, "ArrowDown");
    expect(document.activeElement).toBe(items[0]);
    await host.key(items[0]!, "ArrowUp");
    expect(document.activeElement).toBe(items[1]);
    await host.key(items[1]!, "Home");
    expect(document.activeElement).toBe(items[0]);
    items[0]?.click();
    await settle();
    expect(host.select).toHaveBeenCalledExactlyOnceWith("ada");
    expect(disclosure.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    await host.key(trigger, "ArrowUp");
    expect(document.activeElement).toBe(items[1]);
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    items[1]?.dispatchEvent(escape);
    await settle();
    expect(escape.defaultPrevented).toBe(true);
    expect(disclosure.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
  it("closes on disabled replacement and outside pointer, and retires queued choices through replacement, KeepAlive and disposal", async () => {
    const host = mount();
    await settle();
    const trigger = host.find("summary");
    await host.key(trigger, "ArrowDown");
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await settle();
    expect(host.find<HTMLDetailsElement>("details").open).toBe(false);
    await host.key(trigger, "ArrowDown");
    host.props.value = { ...host.props.value, disabled: true };
    await settle();
    expect(host.find<HTMLDetailsElement>("details").open).toBe(false);
    expect(trigger.getAttribute("aria-disabled")).toBe("true");
    trigger.click();
    await settle();
    expect(host.find<HTMLDetailsElement>("details").open).toBe(false);
    expect(host.find<HTMLButtonElement>("menu button").disabled).toBe(true);
    host.props.value = { ...host.props.value, disabled: false };
    await settle();
    host.find("menu button").click();
    host.props.value = { ...host.props.value, onSelect: vi.fn() };
    await settle();
    expect(host.select).not.toHaveBeenCalled();
    expect(host.props.value.onSelect).not.toHaveBeenCalled();
    const retained = host.find("menu button");
    host.visible.value = false;
    await settle();
    retained.click();
    await settle();
    expect(host.props.value.onSelect).not.toHaveBeenCalled();
    host.visible.value = true;
    await settle();
    retained.click();
    await settle();
    // A DOM element reused by Vue receives the new live handler on activation.
    expect(host.props.value.onSelect).toHaveBeenCalledOnce();
    host.find("menu button").click();
    host.dispose();
    await settle();
    expect(host.props.value.onSelect).toHaveBeenCalledOnce();
  });
  it("cancels queued keyboard focus when controlled state disables the menu", async () => {
    const host = mount();
    await settle();
    const trigger = host.find("summary");
    trigger.focus();
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      })
    );
    host.props.value = { ...host.props.value, disabled: true };
    await settle();
    expect(host.find<HTMLDetailsElement>("details").open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    await host.key(trigger, "ArrowDown");
    expect(host.find<HTMLDetailsElement>("details").open).toBe(false);
  });
  it("allows a selected command to synchronously dispose its owner", async () => {
    const host = mount();
    await settle();
    const select = vi.fn(() => host.dispose());
    host.props.value = { ...host.props.value, onSelect: select };
    await settle();
    host.find("menu button").click();
    await settle();
    expect(select).toHaveBeenCalledOnce();
    expect(host.root.childElementCount).toBe(0);
  });
});
