import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import {
  TableAssistant,
  tableAssistant,
  type TableAssistantProps,
} from "../src/assistant";

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
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
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
it("selects a language through the genuine Select, then disables it while listening", async () => {
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
  const trigger = element<HTMLButtonElement>(part("assistant-voice-language"));
  trigger.focus();
  await key(trigger, "ArrowDown");
  const french = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((node) => node.textContent === "fr");
  if (!french) throw new Error("Missing French option");
  french.focus();
  await key(french, "Enter");
  expect(language).toHaveBeenCalledExactlyOnceWith("fr");
  expect(trigger.textContent).toContain("en");
  expect(trigger.textContent).not.toContain("fr");
  element<HTMLButtonElement>(part("assistant-voice")).click();
  expect(start).toHaveBeenCalledTimes(1);
  speech.value = {
    ...speech.value,
    state: { status: "listening", language: "en", interim: "Ada" },
  };
  await flush();
  expect(trigger.disabled).toBe(true);
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
  old.focus();
  await key(old, "Enter");
  expect(selected).toHaveBeenCalledExactlyOnceWith("one");
  trigger.click();
  await flush();
  const retired = element<HTMLElement>('[role="menuitem"]');
  assistant.value = {
    ...assistant.value,
    suggestions: [{ id: "two", title: "Current shortcut" }],
  };
  await flush();
  expect(document.querySelector('[role="menu"]')).toBeNull();
  retired.click();
  await flush();
  expect(selected).toHaveBeenCalledTimes(1);
  trigger.click();
  await flush();
  const current = element<HTMLElement>('[role="menuitem"]');
  expect(current.textContent).toBe("Current shortcut");
  current.focus();
  await key(current, "Enter");
  expect(selected).toHaveBeenLastCalledWith("two");
});
it("routes actual sheet backdrop dismissal once and honors rejected then accepted host close", async () => {
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
    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 0 })
    );
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
