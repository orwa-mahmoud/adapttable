import {
  type TableAssistantProps,
  type TableAssistantView,
} from "@adapttable/angular";
import { Component, computed, signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptTaigaRoot } from "../src/taigaRoot";
import {
  chooseTaigaOption,
  taigaOptions,
  taigaPopup,
} from "../src/taigaTestHelpers";
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
  imports: [AdaptTaigaRoot, AdaptTableAssistant],
  template: `<adapt-taiga-root
    ><adapt-table-assistant [props]="props()"
  /></adapt-taiga-root>`,
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
  imports: [AdaptTaigaRoot, AdaptAssistantSheet],
  template: `
    <ng-template #contents><p>Retained conversation</p></ng-template>
    <adapt-taiga-root
      ><adapt-assistant-sheet
        [props]="{
          label: label(),
          part: 'assistant-sheet',
          open: open(),
          onClose: close,
          children: contents,
        }"
    /></adapt-taiga-root>
  `,
})
class SheetHost {
  readonly open = signal(false);
  readonly label = signal("Conversation");
  readonly close = vi.fn(() => {
    this.open.set(false);
  });
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
    const trigger = part<HTMLButtonElement>("assistant-examples-menu")!;
    expect(part("assistant-examples")?.tagName).toBe("SPAN");
    expect(trigger.tagName).toBe("BUTTON");
    trigger.click();
    await settle(fixture);
    expect(taigaPopup(trigger)).not.toBeNull();
    expect(part("assistant-examples-list")?.tagName).toBe("MENU");
    expect(part("assistant-examples-item")?.textContent).toContain(
      "Highest first"
    );

    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    const stopPropagation = vi.spyOn(escape, "stopPropagation");
    part("assistant-examples-item")!.focus();
    part("assistant-examples-item")!.dispatchEvent(escape);
    await settle(fixture);
    expect(stopPropagation).toHaveBeenCalled();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(fixture.componentInstance.open()).toBe(true);
    expect(document.activeElement).toBe(part("assistant-examples-menu"));
    trigger.click();
    await settle(fixture);
    part("assistant-examples-item")?.click();
    await settle(fixture);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
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
    const fixture = await mount(
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
    await settle(fixture);
    expect(part("assistant-examples-list")).toBeNull();
    expect(part("assistant-examples-menu")?.getAttribute("aria-expanded")).toBe(
      "false"
    );
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
    const dialog = part("assistant-window");
    expect(dialog?.tagName).toBe("SECTION");
    expect(dialog?.getAttribute("role")).toBe("dialog");
    expect(dialog?.closest("tui-popups")).not.toBeNull();
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
  it("opens a native modal sheet, preserves direction and routes Escape", async () => {
    const fixture = await mount({ presentation: "sheet", dir: "rtl" });
    const sheet = part("assistant-sheet")!;
    const modal = sheet.closest("tui-modal")!;
    expect(modal.getAttribute("role")).toBe("dialog");
    expect(modal.getAttribute("aria-modal")).toBe("true");
    expect(sheet.dir).toBe("rtl");
    sheet.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle(fixture);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(part("assistant-sheet")).toBeNull();
  });
  it("opens the native Taiga sheet without HTMLDialogElement methods", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      "showModal"
    );
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: undefined,
    });
    try {
      await mount({ presentation: "sheet" });
      expect(
        part("assistant-sheet")?.closest('[aria-modal="true"]')
      ).not.toBeNull();
    } finally {
      if (descriptor)
        Object.defineProperty(
          HTMLDialogElement.prototype,
          "showModal",
          descriptor
        );
      else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    }
  });
  it("retains the sheet slot through close and reopen without duplicate modals or close callbacks", async () => {
    const fixture = TestBed.createComponent(SheetHost);
    document.body.append(fixture.nativeElement);
    try {
      await settle(fixture);
      const slot = document.querySelector("adapt-assistant-sheet");
      expect(part("assistant-sheet")).toBeNull();
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(document.querySelectorAll("tui-modal")).toHaveLength(1);
      const sheet = part("assistant-sheet")!;
      const modal = sheet.closest("tui-modal")!;
      const name = () =>
        document
          .getElementById(modal.getAttribute("aria-labelledby")!)
          ?.textContent.trim();
      expect(name()).toBe("Conversation");
      fixture.componentInstance.label.set("Updated conversation");
      await settle(fixture);
      expect(name()).toBe("Updated conversation");
      expect(part("assistant-sheet")).toBe(sheet);
      expect(document.querySelectorAll("tui-modal")).toHaveLength(1);
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      expect(part("assistant-sheet")).toBeNull();
      fixture.componentInstance.label.set("Closed conversation");
      await settle(fixture);
      expect(fixture.componentInstance.close).not.toHaveBeenCalled();
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(document.querySelector("adapt-assistant-sheet")).toBe(slot);
      expect(document.querySelectorAll("tui-modal")).toHaveLength(1);
      expect(part("assistant-sheet")?.textContent).toContain(
        "Retained conversation"
      );
      part("assistant-sheet")!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      await settle(fixture);
      expect(fixture.componentInstance.close).toHaveBeenCalledOnce();
      expect(part("assistant-sheet")).toBeNull();
    } finally {
      fixture.destroy();
    }
  });
  it("closes and reopens the retained sheet without HTML dialog methods", async () => {
    const prototype = HTMLDialogElement.prototype;
    const descriptors = ["showModal", "close"].map(
      (key) => [key, Object.getOwnPropertyDescriptor(prototype, key)] as const
    );
    for (const [key] of descriptors)
      Object.defineProperty(prototype, key, {
        configurable: true,
        value: undefined,
      });
    const fixture = TestBed.createComponent(SheetHost);
    document.body.append(fixture.nativeElement);
    try {
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      const slot = document.querySelector("adapt-assistant-sheet");
      expect(
        part("assistant-sheet")?.closest('[aria-modal="true"]')
      ).not.toBeNull();
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      expect(part("assistant-sheet")).toBeNull();
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(document.querySelector("adapt-assistant-sheet")).toBe(slot);
      expect(document.querySelectorAll("tui-modal")).toHaveLength(1);
      expect(part("assistant-sheet")?.textContent).toContain(
        "Retained conversation"
      );
      expect(fixture.componentInstance.close).not.toHaveBeenCalled();
    } finally {
      fixture.destroy();
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(prototype, key, descriptor);
        else Reflect.deleteProperty(prototype, key);
      }
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
    await settle(fixture);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    const item = part<HTMLButtonElement>("assistant-examples-item")!;
    expect(item.disabled).toBe(false);
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    trigger?.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    fixture.componentInstance.view.update((view) => ({
      ...view,
      status: "disconnected",
    }));
    await settle(fixture);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(part("assistant-examples-item")).toBeNull();
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
    const select = part<HTMLInputElement>("assistant-voice-language")!;
    expect(select.tagName).toBe("INPUT");
    expect(await taigaOptions(fixture, select)).toHaveLength(2);
    await chooseTaigaOption(fixture, select, "fr");
    expect(setLanguage).toHaveBeenCalledWith("fr");
    part("assistant-voice")?.click();
    expect(start).toHaveBeenCalledOnce();
    fixture.componentInstance.extras.set({
      speech: { ...speech, state: { ...speech.state, status: "listening" } },
    });
    await settle(fixture);
    expect(part<HTMLInputElement>("assistant-voice-language")?.disabled).toBe(
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
