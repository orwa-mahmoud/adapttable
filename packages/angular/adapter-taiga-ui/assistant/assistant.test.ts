import {
  type TableAssistantProps,
  type TableAssistantView,
} from "@adapttable/angular";
import { Component, computed, signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdaptAssistantBadge,
  AdaptAssistantButton,
  AdaptAssistantInput,
  AdaptAssistantLanguageChip,
  AdaptAssistantMenu,
  AdaptAssistantPanel,
  AdaptAssistantSheet,
  AdaptAssistantWindow,
  AdaptTableAssistant,
  TABLE_ASSISTANT_SLOTS,
  tableAssistant,
} from "./assistant";

/** Mounted native controls: no browser interaction is delegated to the binding. */

const VIEW: TableAssistantView = {
  status: "ready",
  messages: [],
  draft: "",
  setDraft: () => undefined,
  send: () => undefined,
  stop: () => undefined,
  suggestions: [],
  runSuggestion: () => undefined,
};
@Component({
  imports: [AdaptTableAssistant],
  template: `<adapt-table-assistant [props]="props()" />`,
})
class Host {
  readonly open = signal(true);
  readonly view = signal(VIEW);
  readonly extras = signal<Partial<TableAssistantProps>>({});
  readonly props = computed((): TableAssistantProps => ({
    assistant: this.view(),
    open: this.open(),
    onOpenChange: (value) => {
      this.open.set(value);
    },
    ...this.extras(),
  }));
}
/** Keep the exported sheet slot mounted while the host changes its open prop. */
@Component({
  imports: [AdaptAssistantSheet],
  template: `
    <ng-template #contents><p>Retained conversation</p></ng-template>
    <adapt-assistant-sheet
      [props]="{
        label: label(),
        part: 'assistant-sheet',
        open: open(),
        onClose: close,
        children: contents,
      }"
    />
  `,
})
class SheetHost {
  readonly open = signal(false);
  readonly label = signal("Conversation");
  readonly close = () => {
    this.open.set(false);
  };
}
const fixtures: ComponentFixture<Host>[] = [];
async function mount(
  extras: Partial<TableAssistantProps> = {},
  view: Partial<TableAssistantView> = {}
) {
  const fixture = TestBed.createComponent(Host);
  fixtures.push(fixture);
  document.body.append(fixture.nativeElement);
  fixture.componentInstance.extras.set(extras);
  fixture.componentInstance.view.set({ ...VIEW, ...view });
  await settle(fixture);
  return fixture;
}
async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}
const part = <T extends HTMLElement = HTMLElement>(name: string): T | null =>
  document.querySelector<T>(
    `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
  );
afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.destroy();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("native assistant", () => {
  it("composes its own complete slot set without importing an AI runtime", () => {
    expect(tableAssistant().id).toBe("table-assistant");
    expect(tableAssistant().renders).toHaveLength(1);
    expect(TABLE_ASSISTANT_SLOTS).toEqual({
      Button: AdaptAssistantButton,
      Composer: AdaptAssistantInput,
      Badge: AdaptAssistantBadge,
      Panel: AdaptAssistantPanel,
      Sheet: AdaptAssistantSheet,
      Window: AdaptAssistantWindow,
      Menu: AdaptAssistantMenu,
      LanguageChip: AdaptAssistantLanguageChip,
    });
  });
  it("uses native buttons and a textarea and retains accessible icon-only labels", async () => {
    const send = vi.fn();
    const setDraft = vi.fn();
    const fixture = await mount(
      { className: "native-conversation" },
      { draft: "Hello", send, setDraft }
    );
    expect(part("assistant-panel")?.tagName).toBe("SECTION");
    expect(part("assistant-panel")?.className).toBe("native-conversation");
    const input = part<HTMLTextAreaElement>("assistant-input");
    expect(input?.tagName).toBe("TEXTAREA");
    expect(input?.value).toBe("Hello");
    if (input) {
      input.value = "Updated";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    expect(setDraft).toHaveBeenCalledWith("Updated");
    const sendButton = part<HTMLButtonElement>("assistant-send");
    expect(sendButton?.tagName).toBe("BUTTON");
    expect(sendButton?.getAttribute("aria-label")).toBe("Send");
    expect(sendButton?.querySelector("svg")).not.toBeNull();
    expect(sendButton?.textContent?.trim()).toBe("");
    sendButton?.click();
    expect(send).toHaveBeenCalledOnce();
    input?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(send).toHaveBeenCalledTimes(2);
    fixture.componentInstance.view.update((view) => ({ ...view, draft: "" }));
    await settle(fixture);
    expect(part<HTMLButtonElement>("assistant-send")?.disabled).toBe(true);
  });
  it("keeps native examples in a disclosure and consumes only its own Escape", async () => {
    const runSuggestion = vi.fn();
    const fixture = await mount(
      {},
      {
        suggestions: [
          {
            id: "sort",
            title: "Sort salary",
            description: "Highest first",
            kind: "sort",
          },
        ],
        runSuggestion,
      }
    );
    const details = part<HTMLDetailsElement>("assistant-examples");
    expect(details?.tagName).toBe("DETAILS");
    expect(part("assistant-examples-menu")?.tagName).toBe("SUMMARY");
    expect(part("assistant-examples-list")?.tagName).toBe("MENU");
    expect(part("assistant-examples-item")?.textContent).toContain(
      "Highest first"
    );
    if (details) details.open = true;
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    part("assistant-examples-item")?.dispatchEvent(escape);
    await settle(fixture);
    expect(escape.defaultPrevented).toBe(true);
    expect(details?.open).toBe(false);
    expect(fixture.componentInstance.open()).toBe(true);
    expect(document.activeElement).toBe(part("assistant-examples-menu"));
    if (details) details.open = true;
    part("assistant-examples-item")?.click();
    await settle(fixture);
    expect(details?.open).toBe(false);
    expect(runSuggestion).toHaveBeenCalledWith("sort");
    part("assistant-examples-menu")?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle(fixture);
    expect(fixture.componentInstance.open()).toBe(false);
  });
  it("does not open or run examples while the connection is unusable", async () => {
    const runSuggestion = vi.fn();
    await mount(
      {},
      {
        status: "connecting",
        runSuggestion,
        suggestions: [{ id: "one", title: "Example" }],
      }
    );
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    part("assistant-examples-menu")?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(part("assistant-examples-menu")?.getAttribute("aria-disabled")).toBe(
      "true"
    );
    expect(part<HTMLButtonElement>("assistant-examples-item")?.disabled).toBe(
      true
    );
    part("assistant-examples-item")?.click();
    expect(runSuggestion).not.toHaveBeenCalled();
  });
  it("shows a hand-sized native launcher and restores it on close", async () => {
    const fixture = await mount();
    fixture.componentInstance.open.set(false);
    await settle(fixture);
    const launcher = part("assistant-launcher");
    expect(launcher?.style.inlineSize).toBe("56px");
    expect(launcher?.style.borderRadius).toBe("50%");
    expect(launcher?.getAttribute("aria-label")).toBe("Ask AI");
    launcher?.click();
    await settle(fixture);
    expect(document.activeElement).toBe(part("assistant-input"));
    part("assistant-close")?.click();
    await settle(fixture);
    expect(document.activeElement).toBe(part("assistant-launcher"));
  });
  it("presents floating conversations nonmodally and scopes the boundary", async () => {
    vi.stubGlobal("innerWidth", 1200);
    const fixture = await mount({ presentation: "floating" });
    const dialog = part<HTMLDialogElement>("assistant-window");
    expect(dialog?.tagName).toBe("DIALOG");
    expect(dialog?.open).toBe(true);
    expect(dialog?.style.position).toBe("fixed");
    expect(dialog?.style.inlineSize).toContain("400px");
    expect(dialog?.hasAttribute("aria-modal")).toBe(false);
    fixture.componentInstance.extras.set({
      presentation: "floating",
      boundary: { current: document.body },
    });
    await settle(fixture);
    expect(part("assistant-window")?.style.position).toBe("absolute");
  });
  it("opens a genuine modal sheet, preserves direction and routes native cancel", async () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    const prototype = HTMLDialogElement.prototype;
    const original = prototype.showModal;
    Object.defineProperty(prototype, "showModal", {
      configurable: true,
      value: showModal,
    });
    try {
      const fixture = await mount({ presentation: "sheet", dir: "rtl" });
      expect(showModal).toHaveBeenCalledOnce();
      const dialog = part<HTMLDialogElement>("assistant-sheet");
      expect(dialog?.open).toBe(true);
      expect(dialog?.dir).toBe("rtl");
      const cancel = new Event("cancel", { cancelable: true });
      dialog?.dispatchEvent(cancel);
      await settle(fixture);
      expect(cancel.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.open()).toBe(false);
    } finally {
      Object.defineProperty(prototype, "showModal", {
        configurable: true,
        value: original,
      });
    }
  });
  it("degrades the sheet to an open native dialog when showModal is unavailable", async () => {
    const prototype = HTMLDialogElement.prototype;
    const original = prototype.showModal;
    Object.defineProperty(prototype, "showModal", {
      configurable: true,
      value: undefined,
    });
    try {
      await mount({ presentation: "sheet" });
      expect(part<HTMLDialogElement>("assistant-sheet")?.open).toBe(true);
    } finally {
      Object.defineProperty(prototype, "showModal", {
        configurable: true,
        value: original,
      });
    }
  });
  it("closes and reopens the same native sheet without duplicate modal calls", async () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    const close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    const prototype = HTMLDialogElement.prototype;
    const originalShow = Object.getOwnPropertyDescriptor(
      prototype,
      "showModal"
    );
    const originalClose = Object.getOwnPropertyDescriptor(prototype, "close");
    Object.defineProperty(prototype, "showModal", {
      configurable: true,
      value: showModal,
    });
    Object.defineProperty(prototype, "close", {
      configurable: true,
      value: close,
    });
    const fixture = TestBed.createComponent(SheetHost);
    document.body.append(fixture.nativeElement);
    try {
      await settle(fixture);
      const dialog = part<HTMLDialogElement>("assistant-sheet");
      expect(dialog?.open).toBe(false);
      expect(showModal).not.toHaveBeenCalled();
      expect(close).not.toHaveBeenCalled();
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(dialog?.open).toBe(true);
      expect(showModal).toHaveBeenCalledOnce();
      fixture.componentInstance.label.set("Updated conversation");
      await settle(fixture);
      expect(dialog?.getAttribute("aria-label")).toBe("Updated conversation");
      expect(showModal).toHaveBeenCalledOnce();
      expect(close).not.toHaveBeenCalled();
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      expect(dialog?.open).toBe(false);
      expect(close).toHaveBeenCalledOnce();
      fixture.componentInstance.label.set("Closed conversation");
      await settle(fixture);
      expect(close).toHaveBeenCalledOnce();
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(part("assistant-sheet")).toBe(dialog);
      expect(dialog?.open).toBe(true);
      expect(dialog?.textContent).toContain("Retained conversation");
      expect(showModal).toHaveBeenCalledTimes(2);
    } finally {
      fixture.destroy();
      if (originalShow)
        Object.defineProperty(prototype, "showModal", originalShow);
      else Reflect.deleteProperty(prototype, "showModal");
      if (originalClose)
        Object.defineProperty(prototype, "close", originalClose);
      else Reflect.deleteProperty(prototype, "close");
    }
  });
  it("closes and reopens the retained sheet without dialog methods in older browsers", async () => {
    const prototype = HTMLDialogElement.prototype;
    const originalShow = Object.getOwnPropertyDescriptor(
      prototype,
      "showModal"
    );
    const originalClose = Object.getOwnPropertyDescriptor(prototype, "close");
    Object.defineProperty(prototype, "showModal", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(prototype, "close", {
      configurable: true,
      value: undefined,
    });
    const fixture = TestBed.createComponent(SheetHost);
    document.body.append(fixture.nativeElement);
    try {
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      const dialog = part<HTMLDialogElement>("assistant-sheet");
      expect(dialog?.open).toBe(true);
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      expect(dialog?.open).toBe(false);
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(part("assistant-sheet")).toBe(dialog);
      expect(dialog?.open).toBe(true);
      expect(dialog?.textContent).toContain("Retained conversation");
    } finally {
      fixture.destroy();
      if (originalShow)
        Object.defineProperty(prototype, "showModal", originalShow);
      else Reflect.deleteProperty(prototype, "showModal");
      if (originalClose)
        Object.defineProperty(prototype, "close", originalClose);
      else Reflect.deleteProperty(prototype, "close");
    }
  });
  it("allows enabled disclosure activation but refuses a late selection after disconnect", async () => {
    const runSuggestion = vi.fn();
    const fixture = await mount(
      {},
      {
        suggestions: [{ id: "one", title: "Example" }],
        runSuggestion,
      }
    );
    const trigger = part("assistant-examples-menu");
    const activation = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    trigger?.dispatchEvent(activation);
    expect(activation.defaultPrevented).toBe(false);
    const details = part<HTMLDetailsElement>("assistant-examples");
    expect(details?.open).toBe(true);
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    trigger?.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
    expect(details?.open).toBe(true);
    fixture.componentInstance.view.update((view) => ({
      ...view,
      status: "disconnected",
    }));
    await settle(fixture);
    const item = part<HTMLButtonElement>("assistant-examples-item");
    expect(item?.disabled).toBe(true);
    // A dispatched event can still reach a disabled native element. The
    // component must recheck current availability before running a command.
    item?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(runSuggestion).not.toHaveBeenCalled();
    expect(fixture.componentInstance.open()).toBe(true);
  });
  it("offers native language selection only with available multilingual dictation", async () => {
    const setLanguage = vi.fn();
    const start = vi.fn();
    const stop = vi.fn();
    const speech = {
      available: true,
      state: { status: "idle" as const, language: "en", interim: "" },
      languages: ["en", "fr"],
      setLanguage,
      start,
      stop,
    };
    const fixture = await mount({ speech });
    const select = part<HTMLSelectElement>("assistant-voice-language");
    expect(select?.tagName).toBe("SELECT");
    expect(select?.options.length).toBe(2);
    if (select) {
      select.value = "fr";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    expect(setLanguage).toHaveBeenCalledWith("fr");
    part("assistant-voice")?.click();
    expect(start).toHaveBeenCalledOnce();
    fixture.componentInstance.extras.set({
      speech: { ...speech, state: { ...speech.state, status: "listening" } },
    });
    await settle(fixture);
    expect(part<HTMLSelectElement>("assistant-voice-language")?.disabled).toBe(
      true
    );
    part("assistant-voice")?.click();
    expect(stop).toHaveBeenCalledOnce();
    fixture.componentInstance.extras.set({
      speech: { ...speech, languages: ["en"] },
    });
    await settle(fixture);
    expect(part("assistant-voice-language")).toBeNull();
  });
  it("renders allowance names as native button content while keeping revoke names", async () => {
    const revokeAlwaysAllow = vi.fn();
    await mount(
      {},
      {
        alwaysAllowed: [{ capability: "edit", name: "Cell editing" }],
        revokeAlwaysAllow,
      }
    );
    const button = part("assistant-always-allowed-revoke");
    expect(button?.textContent?.trim()).toBe("Cell editing");
    expect(button?.getAttribute("aria-label")).toBe("Ask about edit again");
    button?.click();
    expect(revokeAlwaysAllow).toHaveBeenCalledWith("edit");
  });
});
