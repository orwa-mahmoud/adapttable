import { afterEach, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import {
  TableAssistant,
  tableAssistant,
  type TableAssistantProps,
} from "../src/assistant";
import { mount as mountApp } from "./mount";

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
function mount(render: () => ReturnType<typeof h>) {
  const view = mountApp(render);
  stops.push(view.unmount);
  return view.root;
}
async function choose(root: HTMLElement, label: string) {
  root.querySelector<HTMLInputElement>('input[role="combobox"]')?.click();
  await flush();
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((node) => node.textContent?.trim() === label);
  if (!option) throw new Error(`Missing option ${label}`);
  option.click();
  await flush();
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
it("selects a language through the genuine ElSelect, then disables it while listening", async () => {
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
  expect(trigger.classList.contains("el-select")).toBe(true);
  await choose(trigger, "fr");
  expect(language).toHaveBeenCalledExactlyOnceWith("fr");
  // The select stays on the host's language until the host changes it.
  expect(
    trigger.querySelector(".el-select__placeholder")?.textContent?.trim()
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
  // Element's dropdown leaves through its own transition before it unmounts.
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
    const overlay = element<HTMLElement>(".el-overlay");
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
