import { defineComponent, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../src";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { click, find, mount, part, tick, write } from "./editing-helpers";

const rows = [
  { id: "a", name: "Ada" },
  { id: "g", name: "Grace" },
];
type Row = (typeof rows)[number];
const base = {
  data: rows,
  columns: [{ key: "name", sortable: true }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
};
async function key(
  target: EventTarget,
  value: string,
  more: KeyboardEventInit = {}
) {
  const event = new KeyboardEvent("keydown", {
    key: value,
    code: value,
    bubbles: true,
    cancelable: true,
    ...more,
  });
  target.dispatchEvent(event);
  await tick();
  return event;
}

it("runs commands after native modal removal and restores its real trigger in RTL", async () => {
  const selected = vi.fn(() =>
    expect(document.querySelector(part("command-palette"))).toBeNull()
  );
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      dir: "rtl",
      features: [
        commandPalette({
          button: true,
          commands: [
            { key: "record", label: "Record command", onSelect: selected },
          ],
        }),
      ],
    })
  );
  await tick();
  const trigger = find<HTMLElement>(host, part("command-palette-button"));
  trigger.focus();
  await click(host, "command-palette-button");
  const panel = find(document, part("command-palette"));
  expect(panel.classList.contains("n-card")).toBe(true);
  expect(panel.getAttribute("dir")).toBe("rtl");
  const input = find<HTMLInputElement>(panel, part("command-input"));
  expect(document.activeElement).toBe(input);
  expect(input.closest(".n-input")).not.toBeNull();
  await write(input, "Record command");
  await key(input, "Enter");
  expect(selected).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(trigger);
});

it("preserves controlled rejection and handled, composing, and nested Escape ownership", async () => {
  const open = shallowRef(false);
  const requests = vi.fn();
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      features: [
        commandPalette({
          button: true,
          open,
          onOpenChange: requests,
          commands: [],
        }),
      ],
    })
  );
  await tick();
  await click(host, "command-palette-button");
  expect(requests).toHaveBeenLastCalledWith(true);
  expect(document.querySelector(part("command-palette"))).toBeNull();
  open.value = true;
  await tick();
  const input = find<HTMLInputElement>(document, part("command-input"));
  await write(input, "No matching command");
  expect(find(document, part("command-empty")).textContent).toBeTruthy();
  const handled = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    bubbles: true,
    cancelable: true,
  });
  handled.preventDefault();
  input.dispatchEvent(handled);
  await tick();
  expect(requests).toHaveBeenLastCalledWith(true);
  await key(input, "Escape", { isComposing: true });
  expect(requests).toHaveBeenLastCalledWith(true);
  const nested = document.createElement("div");
  nested.setAttribute("role", "menu");
  const child = document.createElement("button");
  nested.append(child);
  find(document, part("command-palette")).append(nested);
  await key(child, "Escape");
  expect(requests).toHaveBeenLastCalledWith(true);
  nested.remove();
  await key(input, "Escape");
  expect(requests).toHaveBeenLastCalledWith(false);
  expect(document.querySelector(part("command-palette"))).not.toBeNull();
  open.value = false;
  await tick();
  expect(document.querySelector(part("command-palette"))).toBeNull();
});

it.each([false, true])(
  "renders genuine context buttons and restores cell focus (mobile=%s)",
  async (forceMobile) => {
    const selected = vi.fn();
    const { host } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile,
        features: [
          contextMenu<Row>({
            items: () => [
              { key: "inspect", label: "Inspect row", onSelect: selected },
            ],
          }),
        ],
      })
    );
    await tick();
    const cell = find<HTMLElement>(
      host,
      part(forceMobile ? "card-value" : "cell")
    );
    cell.tabIndex = 0;
    cell.focus();
    cell.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 15,
      })
    );
    await tick();
    expect(find(host, '[role="menu"]').classList.contains("n-card")).toBe(true);
    await key(find(host, '[role="menuitem"]'), "End");
    const action = document.activeElement;
    if (!(action instanceof HTMLButtonElement))
      throw new Error("Context focus is not a native button");
    expect(action.classList.contains("n-button")).toBe(true);
    expect(action.textContent?.trim()).toBe("Inspect row");
    action.click();
    await tick();
    expect(selected).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(cell);
  }
);

it.each([false, true])(
  "uses shared prefix navigation and preserves native Tab traversal (backwards=%s)",
  async (backwards) => {
    const selected = vi.fn();
    const { host } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          contextMenu<Row>({
            items: () => [
              { key: "alpha", label: "Alpha", onSelect: selected },
              {
                key: "blocked",
                label: "Blocked",
                disabled: true,
                onSelect: selected,
              },
              { key: "bravo", label: "Bravo", onSelect: selected },
              { key: "briar", label: "Briar", onSelect: selected },
            ],
          }),
        ],
      })
    );
    await tick();
    const cell = find<HTMLElement>(host, part("cell"));
    cell.tabIndex = 0;
    cell.focus();
    cell.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
    );
    await tick();
    const focused = () => {
      const element = document.activeElement;
      if (!(element instanceof HTMLButtonElement))
        throw new Error("Missing native menu focus");
      return element;
    };
    await key(focused(), "End");
    expect(focused().textContent?.trim()).toBe("Briar");
    await key(focused(), "ArrowDown");
    expect(focused().textContent?.trim()).toBe("Copy");
    await key(focused(), "Home");
    await key(focused(), "b");
    expect(focused().textContent?.trim()).toBe("Bravo");
    await key(focused(), "r");
    expect(focused().textContent?.trim()).toBe("Bravo");
    await key(focused(), "Home");
    await key(focused(), "b");
    await key(focused(), "b");
    expect(focused().textContent?.trim()).toBe("Briar");
    const menu = find(host, '[role="menu"]');
    const nested = document.createElement("div");
    nested.setAttribute("role", "menu");
    const child = document.createElement("button");
    child.setAttribute("role", "menuitem");
    child.textContent = "Nested";
    nested.append(child);
    menu.append(nested);
    await key(focused(), "End");
    expect(focused().textContent?.trim()).toBe("Briar");
    await key(child, "Escape");
    expect(host.querySelector('[role="menu"]')).toBe(menu);
    await key(focused(), "Escape", { isComposing: true });
    expect(host.querySelector('[role="menu"]')).toBe(menu);
    const tab = await key(focused(), "Tab", { shiftKey: backwards });
    expect(tab.defaultPrevented).toBe(false);
    expect(selected).not.toHaveBeenCalled();
    expect(host.querySelector('[role="menu"]')).toBeNull();
  }
);

it("retires an open context menu and retained actions across KeepAlive", async () => {
  const visible = shallowRef(true);
  const selected = vi.fn();
  const features = [
    contextMenu<Row>({
      items: () => [{ key: "record", label: "Record", onSelect: selected }],
    }),
  ];
  const View = defineComponent({
    setup: () => () => h(DataTable<Row>, { ...base, features }),
  });
  const { host } = mount(() =>
    h(KeepAlive, null, { default: () => (visible.value ? h(View) : null) })
  );
  await tick();
  find(host, part("cell")).dispatchEvent(
    new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
  );
  await tick();
  const actions = [
    ...host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
  ];
  const retained = actions.find(
    (button) => button.textContent?.trim() === "Record"
  );
  if (!retained) throw new Error("Missing retained menu action");
  visible.value = false;
  await tick();
  retained.click();
  expect(selected).not.toHaveBeenCalled();
  visible.value = true;
  await tick();
  retained.click();
  expect(selected).not.toHaveBeenCalled();
  expect(host.querySelector('[role="menu"]')).toBeNull();
});
