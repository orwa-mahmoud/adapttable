import { afterEach, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import {
  TableAssistant,
  tableAssistant,
  type TableAssistantProps,
} from "../src/assistant";
import { naiveAssistantControls } from "../src/assistant/controls";
import { mount as mountApp } from "./filter-helpers";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function pick(trigger: ParentNode, label: string | RegExp) {
  const input = trigger.querySelector<HTMLInputElement>(
    'input[role="combobox"]'
  );
  if (!input) throw new Error("Missing the select's combobox");
  input.click();
  await flush();
  const option = await vi.waitFor(() => {
    // Give the real vendor ResizeObserver a measurable jsdom viewport, once
    // the menu has mounted; the style write is the mutation that makes it
    // measure again.
    for (const list of document.querySelectorAll<HTMLElement>(
      ".n-virtual-list:not([style*='240px'])"
    )) {
      list.style.height = "240px";
      list.style.width = "240px";
      Object.defineProperties(list, {
        offsetHeight: { configurable: true, value: 240 },
        offsetWidth: { configurable: true, value: 240 },
        clientHeight: { configurable: true, value: 240 },
        clientWidth: { configurable: true, value: 240 },
      });
    }
    const found = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((node) => {
      const text = node.textContent?.trim() ?? "";
      return typeof label === "string" ? text === label : label.test(text);
    });
    if (!found) throw new Error(`Missing option ${String(label)}`);
    return found;
  });
  option.click();
  await flush();
}
function mount(render: () => ReturnType<typeof h>) {
  const view = mountApp(render);
  stops.push(view.stop);
  return view.host;
}
function view(): TableAssistantProps["assistant"] {
  return {
    status: "ready",
    messages: [],
    draft: "",
    setDraft: vi.fn(),
    send: vi.fn(),
    stop: vi.fn(),
    suggestions: [
      { id: "one", title: "Find Ada", description: "Locate a matching row" },
    ],
    runSuggestion: vi.fn(),
  };
}
it("selects a language through the genuine NSelect, then disables it while listening", async () => {
  const language = vi.fn();
  const start = vi.fn();
  const stop = vi.fn();
  const speech = shallowRef<NonNullable<TableAssistantProps["speech"]>>({
    available: true,
    state: { status: "idle", language: "en", interim: "" },
    languages: ["en", "fr"],
    setLanguage: language,
    start,
    stop,
  });
  const assistant = view();
  mount(() =>
    h(TableAssistant, {
      assistant,
      speech: speech.value,
      open: true,
      onOpenChange: vi.fn(),
    })
  );
  await flush();
  const trigger = element<HTMLElement>(part("assistant-voice-language"));
  expect(trigger.querySelector(".n-base-selection")).not.toBeNull();
  await pick(trigger, "fr");
  expect(language).toHaveBeenCalledExactlyOnceWith("fr");
  // The select stays on the host's language until the host changes it.
  expect(
    trigger.querySelector(".n-base-selection-label")?.textContent?.trim()
  ).toBe("en");
  element<HTMLButtonElement>(part("assistant-voice")).click();
  expect(start).toHaveBeenCalledTimes(1);
  speech.value = {
    ...speech.value,
    state: { status: "listening", language: "en", interim: "Ada" },
  };
  await flush();
  expect(
    trigger.querySelector<HTMLInputElement>('input[role="combobox"]')?.disabled
  ).toBe(true);
  expect(element(part("assistant-voice-status")).textContent).toBe("Listening");
  element<HTMLButtonElement>(part("assistant-voice")).click();
  expect(stop).toHaveBeenCalledTimes(1);
});
it("selects current suggestions and rejects a retired menu item after suggestions change", async () => {
  const first = view();
  const selected = vi.fn();
  const assistant = shallowRef<TableAssistantProps["assistant"]>({
    ...first,
    runSuggestion: selected,
  });
  mount(() =>
    h(TableAssistant, {
      assistant: assistant.value,
      open: true,
      onOpenChange: vi.fn(),
    })
  );
  await flush();
  const trigger = element<HTMLButtonElement>(part("assistant-examples-menu"));
  trigger.click();
  await flush();
  const old = element<HTMLElement>('[role="menuitem"]');
  expect(old.textContent).toContain("Locate a matching row");
  old.click();
  await flush();
  expect(selected).toHaveBeenCalledExactlyOnceWith("one");
  trigger.click();
  await flush();
  const retired = element<HTMLElement>('[role="menuitem"]');
  assistant.value = {
    ...assistant.value,
    suggestions: [{ id: "two", title: "Current shortcut" }],
  };
  // The popover leaves through its own transition before it unmounts.
  await vi.waitFor(() =>
    expect(document.querySelector('[role="menu"]')).toBeNull()
  );
  retired.click();
  await flush();
  expect(selected).toHaveBeenCalledTimes(1);
  trigger.click();
  await flush();
  const current = element<HTMLElement>('[role="menuitem"]');
  expect(current.textContent?.trim()).toBe("Current shortcut");
  current.click();
  await flush();
  expect(selected).toHaveBeenLastCalledWith("two");
});
it("moves through shortcuts by key and closes on Tab and an outside click", async () => {
  const assistant: TableAssistantProps["assistant"] = {
    ...view(),
    suggestions: [
      { id: "one", title: "Find Ada" },
      { id: "two", title: "Sort by team" },
    ],
  };
  mount(() =>
    h("div", [
      h("button", { id: "assistant-outside" }, "Outside"),
      h(TableAssistant, { assistant, open: true, onOpenChange: vi.fn() }),
    ])
  );
  await flush();
  const trigger = element<HTMLButtonElement>(part("assistant-examples-menu"));
  const press = async (target: Element, key: string) => {
    const event = new KeyboardEvent("keydown", {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    await flush();
    return event;
  };
  trigger.click();
  await flush();
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  const [first, second] =
    document.querySelectorAll<HTMLElement>('[role="menuitem"]');
  if (!first || !second) throw new Error("Missing the two shortcuts");
  expect(document.activeElement).toBe(first);
  // A key the menu does not handle stays with the browser.
  expect((await press(first, "Shift")).defaultPrevented).toBe(false);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect((await press(first, "ArrowDown")).defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(second);
  await press(second, "Home");
  expect(document.activeElement).toBe(first);
  // Tab closes the menu and leaves the browser's own focus move alone.
  expect((await press(first, "Tab")).defaultPrevented).toBe(false);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  trigger.click();
  await flush();
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  // A click on the trigger toggles the menu once, not through the outside handler.
  for (const type of ["mousedown", "mouseup", "click"])
    trigger.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 }));
  await flush();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  trigger.click();
  await flush();
  const outside = element<HTMLButtonElement>("#assistant-outside");
  for (const type of ["mousedown", "mouseup", "click"])
    outside.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 }));
  await flush();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).not.toBe(trigger);
});
it("renders an icon-only assistant button as its icon, named by its label", async () => {
  const click = vi.fn();
  const button = (iconOnly: boolean, icon?: ReturnType<typeof h>) =>
    naiveAssistantControls.Button({
      part: "assistant-close",
      label: "Close",
      icon,
      iconOnly,
      onClick: click,
    });
  const host = mount(() =>
    h("div", [button(true, h("svg", { class: "glyph" })), button(true)])
  );
  await flush();
  const [glyph, text] = host.querySelectorAll<HTMLButtonElement>("button");
  if (!glyph || !text) throw new Error("Missing the two buttons");
  expect(glyph.getAttribute("aria-label")).toBe("Close");
  expect(glyph.querySelector("svg.glyph")).not.toBeNull();
  expect(glyph.textContent?.trim()).toBe("");
  // Without an icon to show, an icon-only button keeps its visible label.
  expect(text.textContent?.trim()).toBe("Close");
  glyph.click();
  expect(click).toHaveBeenCalledTimes(1);
});
it("routes the drawer overlay dismissal once and honors rejected then accepted host close", async () => {
  const open = shallowRef(true);
  const accept = shallowRef(false);
  const changed = vi.fn((next: boolean) => {
    if (accept.value) open.value = next;
  });
  const assistant = view();
  mount(() =>
    h(TableAssistant, {
      assistant,
      open: open.value,
      onOpenChange: changed,
      presentation: "sheet",
    })
  );
  await flush();
  const dismiss = async () => {
    const overlay = element<HTMLElement>(".n-drawer-mask");
    for (const type of ["mousedown", "mouseup", "click"])
      overlay.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 }));
    await flush();
  };
  await dismiss();
  expect(changed).toHaveBeenCalledExactlyOnceWith(false);
  expect(document.querySelector(part("assistant-sheet"))).not.toBeNull();
  accept.value = true;
  await dismiss();
  expect(changed).toHaveBeenCalledTimes(2);
  expect(document.querySelector(part("assistant-sheet"))).toBeNull();
});
it("renders the registered assistant feature with the table's class context and host draft", async () => {
  const assistant = view();
  const changed = vi.fn();
  const host = mount(() =>
    h(DataTable<{ id: string; name: string }>, {
      data: [{ id: "a", name: "Ada" }],
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      forceMobile: false,
      urlSync: false,
      features: [tableAssistant()],
      assistant: {
        assistant,
        open: true,
        onOpenChange: changed,
        presentation: "panel",
      },
    })
  );
  await flush();
  expect(host.textContent).toContain("Ada");
  expect(host.querySelector(part("assistant-panel"))).not.toBeNull();
  element<HTMLButtonElement>(part("assistant-close")).click();
  await flush();
  expect(changed).toHaveBeenCalledExactlyOnceWith(false);
  expect(host.querySelector(part("assistant-panel"))).not.toBeNull();
});
