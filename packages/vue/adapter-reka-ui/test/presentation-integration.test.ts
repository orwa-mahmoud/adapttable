import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { DataTable } from "../src";
import { commandPalette } from "../src/command-palette";
import { rekaSelect } from "../src/controls/select";
import { sidePanel } from "../src/side-panel";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop();
  }
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function key(target: HTMLElement, key: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
  await flush();
}
const base = {
  data: [{ id: "a", name: "Ada" }],
  columns: [{ key: "name" }],
  rowKey: (row: { id: string }) => row.id,
  urlSync: false,
  forceMobile: false,
};
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
it("uses real Dialog/Primitive targets while binding preserves disabled active commands and rejected close", async () => {
  const open = shallowRef(false);
  const accept = shallowRef(false);
  const run = vi.fn();
  const disabled = vi.fn();
  const changed = vi.fn((value: boolean) => {
    if (value || accept.value) open.value = value;
  });
  const feature = commandPalette({
    button: true,
    open,
    onOpenChange: changed,
    commands: [
      {
        key: "blocked",
        label: "Custom blocked",
        disabled: true,
        onSelect: disabled,
      },
      { key: "run", label: "Custom run", onSelect: run },
    ],
  });
  const host = mount(() =>
    h(DataTable<{ id: string; name: string }>, {
      ...base,
      features: [feature],
      classNames: {
        commandInput: "consumer-command-input",
        commandItem: "consumer-command-item",
        commandPalette: "consumer-palette",
      },
    })
  );
  await flush();
  const trigger = element<HTMLButtonElement>(part("command-palette-button"));
  trigger.focus();
  trigger.click();
  await flush();
  const input = element<HTMLInputElement>(part("command-input"));
  const dialog = element(part("command-palette"));
  expect(input.tagName).toBe("INPUT");
  expect(input.classList.contains("consumer-command-input")).toBe(true);
  expect(dialog.getAttribute("role")).toBe("dialog");
  expect(dialog.classList.contains("consumer-palette")).toBe(true);
  expect(host.contains(dialog)).toBe(false);
  expect(document.activeElement).toBe(input);
  input.value = "Custom";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  const active = () =>
    document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
  expect(active()?.textContent).toBe("Custom blocked");
  expect(active()?.getAttribute("aria-disabled")).toBe("true");
  await key(input, "Enter");
  expect(disabled).not.toHaveBeenCalled();
  await key(input, "Escape");
  expect(open.value).toBe(true);
  expect(document.activeElement).toBe(input);
  accept.value = true;
  await key(input, "ArrowDown");
  await key(input, "Enter");
  expect(run).toHaveBeenCalledTimes(1);
  expect(open.value).toBe(false);
  expect(document.activeElement).toBe(trigger);
});
it("retires command portals through KeepAlive and resumes the controlled owner without stealing external focus", async () => {
  const visible = shallowRef(true);
  const open = shallowRef(false);
  const feature = commandPalette({
    open,
    button: true,
    onOpenChange: (value) => {
      open.value = value;
    },
  });
  const Table = defineComponent({
    render: () =>
      h(DataTable<{ id: string; name: string }>, {
        ...base,
        features: [feature],
      }),
  });
  const Other = defineComponent({ render: () => h("p", "Paused") });
  mount(() =>
    h("div", [
      h("input", { id: "external-focus" }),
      h(KeepAlive, null, {
        default: () => (visible.value ? h(Table) : h(Other)),
      }),
    ])
  );
  await flush();
  element<HTMLButtonElement>(part("command-palette-button")).click();
  await flush();
  expect(document.querySelectorAll(part("command-palette"))).toHaveLength(1);
  visible.value = false;
  await nextTick();
  const outside = element<HTMLInputElement>("#external-focus");
  outside.focus();
  await flush();
  expect(document.querySelector(part("command-palette"))).toBeNull();
  expect(document.activeElement).toBe(outside);
  visible.value = true;
  await flush();
  expect(document.querySelectorAll(part("command-palette"))).toHaveLength(1);
  expect(document.activeElement).toBe(element(part("command-input")));
  await key(element(part("command-input")), "Escape");
  expect(open.value).toBe(false);
  expect(document.querySelector(part("command-palette"))).toBeNull();
});
it("uses native Tabs with controlled selection, live RTL and nested portaled Select Escape", async () => {
  const open = shallowRef<string | null>("a");
  const accept = shallowRef(false);
  const direction = shallowRef<"ltr" | "rtl">("ltr");
  const choice = shallowRef("one");
  const changed = vi.fn((value: string | null) => {
    if (accept.value) open.value = value;
  });
  const feature = sidePanel({
    open,
    onOpenChange: changed,
    panels: [
      {
        key: "a",
        label: "Alpha",
        content: () =>
          rekaSelect({
            attrs: { "aria-label": "Panel choices" },
            value: choice.value,
            options: [
              { value: "one", label: "One" },
              { value: "two", label: "Two" },
            ],
            onChange: (value) => {
              choice.value = value;
            },
          }),
      },
      { key: "b", label: "Beta", content: "Beta body" },
    ],
  });
  mount(() =>
    h(DataTable<{ id: string; name: string }>, {
      ...base,
      dir: direction.value,
      features: [feature],
      classNames: {
        sidePanelTab: "consumer-tab",
        sidePanelBody: "consumer-panel",
      },
    })
  );
  await flush();
  const tabs = [
    ...document.querySelectorAll<HTMLButtonElement>(part("side-panel-tab")),
  ];
  tabs[0]?.focus();
  await key(tabs[0]!, "ArrowRight");
  expect(open.value).toBe("a");
  expect(changed).toHaveBeenLastCalledWith("b");
  accept.value = true;
  direction.value = "rtl";
  await flush();
  tabs[0]?.focus();
  await key(tabs[0]!, "ArrowLeft");
  expect(open.value).toBe("b");
  const panel = element('[role="tabpanel"][data-state="active"]');
  expect(panel.id).toBe(tabs[1]?.getAttribute("aria-controls"));
  expect(panel.textContent).toBe("Beta body");
  expect(panel.classList.contains("consumer-panel")).toBe(true);
  open.value = "a";
  await flush();
  const select = element<HTMLButtonElement>('[aria-label="Panel choices"]');
  select.focus();
  await key(select, "ArrowDown");
  await key(element('[role="option"][data-reka-collection-item]'), "Escape");
  expect(open.value).toBe("a");
  expect(document.activeElement).toBe(select);
  await key(select, "Escape");
  expect(open.value).toBeNull();
  expect(document.querySelector(part("side-panel"))).toBeNull();
});
