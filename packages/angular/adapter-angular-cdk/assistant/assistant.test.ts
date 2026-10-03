/** Mounted native controls: no browser interaction is delegated to the binding. */
import type {
  TableAssistantProps,
  TableAssistantView,
} from "@adapttable/angular";
import { Component, computed, signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fixtureOverlayProviders } from "../testing/overlayFixture";
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
  providers: fixtureOverlayProviders,
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
  providers: fixtureOverlayProviders,
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
let owner: HTMLElement | undefined;
async function mount(
  extras: Partial<TableAssistantProps> = {},
  view: Partial<TableAssistantView> = {}
) {
  const fixture = TestBed.createComponent(Host);
  fixtures.push(fixture);
  owner = fixture.nativeElement as HTMLElement;
  document.body.append(owner);
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
  owner?.querySelector<T>(`[data-adapttable-part="${name}"]`) ?? null;
afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.destroy();
  document.body.replaceChildren();
  owner = undefined;
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
    expect(part("assistant-examples")?.tagName).toBe("SPAN");
    const trigger = part<HTMLButtonElement>("assistant-examples-menu");
    expect(trigger?.tagName).toBe("BUTTON");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(part("assistant-examples-list")).toBeNull();
    trigger?.click();
    await settle(fixture);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(part("assistant-examples-list")?.tagName).toBe("MENU");
    expect(part("assistant-examples-item")?.textContent).toContain(
      "Highest first"
    );
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    part("assistant-examples-item")?.dispatchEvent(escape);
    await settle(fixture);
    expect(escape.defaultPrevented).toBe(true);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(fixture.componentInstance.open()).toBe(true);
    expect(document.activeElement).toBe(part("assistant-examples-menu"));
    trigger?.click();
    await settle(fixture);
    part("assistant-examples-item")?.click();
    await settle(fixture);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
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
    const trigger = part<HTMLButtonElement>("assistant-examples-menu");
    expect(trigger?.disabled).toBe(true);
    trigger?.click();
    await settle(fixture);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(part("assistant-examples-list")).toBeNull();
    expect(runSuggestion).not.toHaveBeenCalled();
    fixture.componentInstance.view.update((view) => ({
      ...view,
      status: "ready",
    }));
    await settle(fixture);
    trigger?.click();
    await settle(fixture);
    fixture.componentInstance.view.update((view) => ({
      ...view,
      status: "connecting",
    }));
    await settle(fixture);
    const item = part<HTMLButtonElement>("assistant-examples-item");
    expect(item?.disabled).toBe(true);
    item?.click();
    item?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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
  it("opens a genuine modal sheet, preserves direction and routes native Escape", async () => {
    const fixture = await mount({ presentation: "sheet", dir: "rtl" });
    const dialog = part("assistant-sheet");
    expect(dialog?.getAttribute("role")).toBe("dialog");
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-label")).toBeTruthy();
    expect(dialog?.dir).toBe("rtl");
    expect(owner?.querySelector(".adapt-cdk-backdrop")).not.toBeNull();
    expect(owner?.querySelectorAll(".cdk-focus-trap-anchor")).toHaveLength(2);
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    dialog?.dispatchEvent(escape);
    await settle(fixture);
    expect(escape.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(part("assistant-sheet")).toBeNull();
  });
  it("keeps the CDK modal available when showModal is unavailable", async () => {
    const prototype = HTMLDialogElement.prototype;
    const original = prototype.showModal;
    Object.defineProperty(prototype, "showModal", {
      configurable: true,
      value: undefined,
    });
    try {
      const fixture = await mount({ presentation: "sheet" });
      expect(part("assistant-sheet")?.getAttribute("role")).toBe("dialog");
      expect(part("assistant-sheet")?.getAttribute("aria-modal")).toBe("true");
      const backdrop = owner?.querySelector<HTMLElement>(".adapt-cdk-backdrop");
      expect(backdrop).not.toBeNull();
      backdrop?.click();
      await settle(fixture);
      expect(fixture.componentInstance.open()).toBe(false);
      expect(part("assistant-sheet")).toBeNull();
    } finally {
      Object.defineProperty(prototype, "showModal", {
        configurable: true,
        value: original,
      });
    }
  });
  it("updates, closes and reopens the retained sheet without duplicate portals", async () => {
    const fixture = TestBed.createComponent(SheetHost);
    owner = fixture.nativeElement as HTMLElement;
    document.body.append(owner);
    const element = owner;
    try {
      await settle(fixture);
      expect(part("assistant-sheet")).toBeNull();
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      const dialog = part("assistant-sheet");
      expect(dialog?.getAttribute("role")).toBe("dialog");
      expect(
        element.querySelectorAll('[data-adapttable-part="assistant-sheet"]')
      ).toHaveLength(1);
      fixture.componentInstance.label.set("Updated conversation");
      await settle(fixture);
      expect(part("assistant-sheet")).toBe(dialog);
      expect(dialog?.getAttribute("aria-label")).toBe("Updated conversation");
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      expect(part("assistant-sheet")).toBeNull();
      expect(dialog?.isConnected).toBe(false);
      fixture.componentInstance.label.set("Closed conversation");
      await settle(fixture);
      expect(part("assistant-sheet")).toBeNull();
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(part("assistant-sheet")?.getAttribute("aria-label")).toBe(
        "Closed conversation"
      );
      expect(part("assistant-sheet")?.textContent).toContain(
        "Retained conversation"
      );
      expect(
        element.querySelectorAll('[data-adapttable-part="assistant-sheet"]')
      ).toHaveLength(1);
    } finally {
      fixture.destroy();
    }
    expect(element.querySelector(".cdk-overlay-container")).toBeNull();
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
    owner = fixture.nativeElement as HTMLElement;
    document.body.append(owner);
    try {
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(part("assistant-sheet")?.getAttribute("role")).toBe("dialog");
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      expect(part("assistant-sheet")).toBeNull();
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(part("assistant-sheet")?.getAttribute("aria-modal")).toBe("true");
      expect(part("assistant-sheet")?.textContent).toContain(
        "Retained conversation"
      );
      expect(
        owner.querySelectorAll('[data-adapttable-part="assistant-sheet"]')
      ).toHaveLength(1);
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
    await settle(fixture);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
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
