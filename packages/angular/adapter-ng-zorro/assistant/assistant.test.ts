/** Mounted NG-ZORRO controls preserve the assistant's interaction contract. */
import type { TableAssistantProps } from "@adapttable/angular";
import type { TableAssistantView } from "@adapttable/angular/adapter";
import { Component, computed, signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { kitSelector } from "../testUtils";
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
    onOpenChange: (value) => this.open.set(value),
    ...this.extras(),
  }));
}
/** Keep the same exported sheet slot mounted across visibility changes. */
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
        className: 'conversation-sheet',
        dir: 'rtl',
      }"
    />
  `,
})
class SheetHost {
  readonly open = signal(false);
  readonly label = signal("Conversation");
  readonly close = () => this.open.set(false);
}
async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}
async function mount(
  extras: Partial<TableAssistantProps> = {},
  view: Partial<TableAssistantView> = {}
) {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement);
  fixture.componentInstance.extras.set(extras);
  fixture.componentInstance.view.set({ ...VIEW, ...view });
  await settle(fixture);
  return fixture;
}
const find = (name: string): HTMLElement | null =>
  document.querySelector(kitSelector(name));
function part<T extends HTMLElement = HTMLElement>(name: string): T {
  const element = find(name);
  expect(element, name).not.toBeNull();
  return element as T;
}
function node<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  expect(element, selector).not.toBeNull();
  return element!;
}
function escape(element: HTMLElement) {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    keyCode: 27,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
  return event;
}
afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("NG-ZORRO assistant", () => {
  it("composes its complete slot set without importing an AI runtime", () => {
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
  it("sends from the kit button and textarea with exact draft and keyboard callbacks", async () => {
    const send = vi.fn();
    const setDraft = vi.fn();
    const fixture = await mount(
      { className: "conversation" },
      { draft: "Hello", send, setDraft }
    );
    expect(part("assistant-panel").tagName).toBe("NZ-CARD");
    expect(part("assistant-panel").getAttribute("role")).toBe("region");
    expect(part("assistant-panel").classList.contains("conversation")).toBe(
      true
    );
    expect(part("assistant-panel").classList.contains("ant-card")).toBe(true);
    const input = part<HTMLTextAreaElement>("assistant-input");
    expect(input.classList.contains("ant-input")).toBe(true);
    expect(input.value).toBe("Hello");
    input.value = "Updated";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(setDraft).toHaveBeenCalledExactlyOnceWith("Updated");
    const sendButton = part<HTMLButtonElement>("assistant-send");
    expect(sendButton.classList.contains("ant-btn")).toBe(true);
    expect(sendButton.getAttribute("aria-label")).toBe("Send");
    expect(sendButton.querySelector("svg")).not.toBeNull();
    expect(sendButton.textContent?.trim()).toBe("");
    sendButton.click();
    expect(send).toHaveBeenCalledOnce();
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(send).toHaveBeenCalledTimes(2);
    fixture.componentInstance.view.update((view) => ({ ...view, draft: "" }));
    await settle(fixture);
    expect(part<HTMLButtonElement>("assistant-send").disabled).toBe(true);
  });
  it.each([
    ["ready", "Ready", "neutral", ""],
    ["connecting", "Connecting…", "busy", "ant-tag-processing"],
    ["awaiting-approval", "Waiting for you", "warning", "ant-tag-warning"],
    ["error", "Error", "danger", "ant-tag-error"],
  ] as const)(
    "renders the %s connection as a named kit tag",
    async (status, label, tone, color) => {
      await mount({}, { status });
      const tag = part("assistant-connection");
      expect(tag.tagName).toBe("NZ-TAG");
      expect(tag.textContent?.trim()).toBe(label);
      expect(tag.getAttribute("data-tone")).toBe(tone);
      expect(tag.classList.contains("ant-tag")).toBe(true);
      expect(
        color
          ? tag.classList.contains(color)
          : tag.classList.contains("ant-tag-processing")
      ).toBe(Boolean(color));
    }
  );
  it("selects a real dropdown example and consumes only the nested Escape", async () => {
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
    const trigger = part<HTMLButtonElement>("assistant-examples-menu");
    expect(trigger.classList.contains("ant-btn")).toBe(true);
    trigger.click();
    await settle(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(find("assistant-examples-list")).not.toBeNull();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(
      part("assistant-examples-list").classList.contains("ant-dropdown-menu")
    ).toBe(true);
    expect(part("assistant-examples-item").textContent).toContain(
      "Highest first"
    );
    const event = escape(part("assistant-examples-item"));
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(find("assistant-examples-list")).toBeNull();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(fixture.componentInstance.open()).toBe(true);
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    await settle(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(find("assistant-examples-list")).not.toBeNull();
    });
    part("assistant-examples-item").click();
    await settle(fixture);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(runSuggestion).toHaveBeenCalledExactlyOnceWith("sort");
    expect(document.activeElement).toBe(trigger);
    escape(trigger);
    await settle(fixture);
    expect(fixture.componentInstance.open()).toBe(false);
  });
  it("disables disconnected examples and refuses a late rendered selection", async () => {
    const runSuggestion = vi.fn();
    const fixture = await mount(
      {},
      { suggestions: [{ id: "one", title: "Example" }], runSuggestion }
    );
    const trigger = part<HTMLButtonElement>("assistant-examples-menu");
    trigger.click();
    await settle(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(find("assistant-examples-list")).not.toBeNull();
    });
    const item = part<HTMLButtonElement>("assistant-examples-item");
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    trigger.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
    fixture.componentInstance.view.update((view) => ({
      ...view,
      status: "disconnected",
    }));
    await settle(fixture);
    expect(trigger.disabled).toBe(true);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(find("assistant-examples-item")).toBeNull();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(runSuggestion).not.toHaveBeenCalled();
    expect(fixture.componentInstance.open()).toBe(true);
  });
  it("does not open the disabled dropdown while connecting", async () => {
    const runSuggestion = vi.fn();
    const fixture = await mount(
      {},
      {
        status: "connecting",
        suggestions: [{ id: "one", title: "Example" }],
        runSuggestion,
      }
    );
    const trigger = part<HTMLButtonElement>("assistant-examples-menu");
    expect(trigger.disabled).toBe(true);
    trigger.click();
    await settle(fixture);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(find("assistant-examples-item")).toBeNull();
    expect(runSuggestion).not.toHaveBeenCalled();
  });
  it("uses a hand-sized launcher and restores focus after closing", async () => {
    const fixture = await mount();
    fixture.componentInstance.open.set(false);
    await settle(fixture);
    const launcher = part("assistant-launcher");
    expect(launcher.style.inlineSize).toBe("56px");
    expect(launcher.style.borderRadius).toBe("50%");
    expect(launcher.getAttribute("aria-label")).toBe("Ask AI");
    expect(launcher.classList.contains("ant-btn")).toBe(true);
    launcher.click();
    await settle(fixture);
    expect(document.activeElement).toBe(part("assistant-input"));
    part("assistant-close").click();
    await settle(fixture);
    expect(document.activeElement).toBe(part("assistant-launcher"));
  });
  it("presents a nonmodal floating kit card and scopes its boundary", async () => {
    vi.stubGlobal("innerWidth", 1200);
    const fixture = await mount({ presentation: "floating" });
    const window = part("assistant-window");
    expect(window.tagName).toBe("NZ-CARD");
    expect(window.getAttribute("role")).toBe("dialog");
    expect(window.style.position).toBe("fixed");
    expect(window.style.inlineSize).toContain("400px");
    expect(window.hasAttribute("aria-modal")).toBe(false);
    fixture.componentInstance.extras.set({
      presentation: "floating",
      boundary: { current: document.body },
    });
    await settle(fixture);
    expect(part("assistant-window").style.position).toBe("absolute");
  });
  it("opens a genuine bottom drawer with RTL, focus and mask dismissal", async () => {
    const fixture = await mount({
      presentation: "sheet",
      dir: "rtl",
      className: "sheet-style",
    });
    const sheet = part("assistant-sheet");
    expect(sheet.getAttribute("role")).toBe("dialog");
    expect(sheet.getAttribute("aria-modal")).toBe("true");
    expect(sheet.dir).toBe("rtl");
    expect(sheet.classList.contains("sheet-style")).toBe(true);
    expect(
      sheet.closest(".ant-drawer")?.classList.contains("ant-drawer-bottom")
    ).toBe(true);
    expect(
      sheet.closest(".ant-drawer")?.classList.contains("ant-drawer-rtl")
    ).toBe(true);
    expect(document.activeElement).toBe(part("assistant-input"));
    node(".ant-drawer-mask").click();
    await settle(fixture);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(part("assistant-launcher"));
  });
  it("routes sheet Escape to the close callback and restores its launcher", async () => {
    const fixture = await mount({ presentation: "sheet" });
    const event = escape(part("assistant-input"));
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(part("assistant-launcher"));
  });
  it("closes and reopens the retained drawer slot with updated accessible names", async () => {
    const fixture = TestBed.createComponent(SheetHost);
    document.body.append(fixture.nativeElement);
    await settle(fixture);
    expect(document.querySelector(".ant-drawer-open")).toBeNull();
    expect(document.querySelector(".ant-drawer-mask")).toBeNull();
    fixture.componentInstance.open.set(true);
    await settle(fixture);
    expect(part("assistant-sheet").getAttribute("aria-label")).toBe(
      "Conversation"
    );
    fixture.componentInstance.label.set("Updated conversation");
    await settle(fixture);
    expect(part("assistant-sheet").getAttribute("aria-label")).toBe(
      "Updated conversation"
    );
    expect(
      part("assistant-sheet").classList.contains("conversation-sheet")
    ).toBe(true);
    const event = escape(part("assistant-sheet"));
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.querySelector(".ant-drawer-open")).toBeNull();
    expect(document.querySelector(".ant-drawer-mask")).toBeNull();
    fixture.componentInstance.label.set("Reopened conversation");
    fixture.componentInstance.open.set(true);
    await settle(fixture);
    expect(part("assistant-sheet").getAttribute("aria-label")).toBe(
      "Reopened conversation"
    );
    expect(part("assistant-sheet").textContent).toContain(
      "Retained conversation"
    );
  });
  it("changes dictation language through the real select and disables it while listening", async () => {
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
    const select = part("assistant-voice-language");
    expect(select.tagName).toBe("NZ-SELECT");
    const input = select.querySelector<HTMLInputElement>("input")!;
    expect(input.getAttribute("aria-label")).toBe("Dictation language");
    expect(input.getAttribute("role")).toBe("combobox");
    select.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await settle(fixture);
    await vi.waitFor(() => {
      expect(document.querySelectorAll("nz-option-item")).toHaveLength(2);
    });
    const options = [
      ...document.querySelectorAll<HTMLElement>("nz-option-item"),
    ];
    expect(options).toHaveLength(2);
    options[1]!.click();
    await settle(fixture);
    expect(setLanguage).toHaveBeenCalledExactlyOnceWith("fr");
    part("assistant-voice").click();
    expect(start).toHaveBeenCalledOnce();
    fixture.componentInstance.extras.set({
      speech: { ...speech, state: { ...speech.state, status: "listening" } },
    });
    await settle(fixture);
    expect(input.disabled).toBe(true);
    part("assistant-voice").click();
    expect(stop).toHaveBeenCalledOnce();
    fixture.componentInstance.extras.set({
      speech: { ...speech, languages: ["en"] },
    });
    await settle(fixture);
    expect(find("assistant-voice-language")).toBeNull();
  });
  it("keeps nested language Escape inside the dropdown before closing the sheet", async () => {
    const fixture = await mount({
      presentation: "sheet",
      speech: {
        available: true,
        state: { status: "idle", language: "en", interim: "" },
        languages: ["en", "fr"],
        setLanguage: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      },
    });
    const select = part("assistant-voice-language");
    select.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await settle(fixture);
    expect(select.classList.contains("ant-select-open")).toBe(true);
    const input = select.querySelector<HTMLInputElement>("input")!;
    const event = escape(input);
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(select.classList.contains("ant-select-open")).toBe(false);
    expect(fixture.componentInstance.open()).toBe(true);
    escape(input);
    await settle(fixture);
    expect(fixture.componentInstance.open()).toBe(false);
  });
  it("refuses the modal proposal without approving or changing host data", async () => {
    const rows = [{ id: "ada", name: "Ada" }];
    const approve = vi.fn(() => {
      rows[0]!.name = "Augusta";
    });
    const reject = vi.fn();
    const fixture = await mount({
      approval: {
        presentation: "modal",
        proposals: [
          { rowKey: "ada", column: "name", before: "Ada", after: "Augusta" },
        ],
        decisions: ["pending"],
        approve,
        reject,
      },
    });
    const modal = part("assistant-approval-modal");
    expect(modal.getAttribute("aria-modal")).toBe("true");
    const rejectButton = modal.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="agent-approval-reject"]'
    )!;
    expect(rejectButton.classList.contains("ant-btn")).toBe(true);
    rejectButton.click();
    await settle(fixture);
    expect(reject).toHaveBeenCalledExactlyOnceWith();
    expect(approve).not.toHaveBeenCalled();
    expect(rows).toEqual([{ id: "ada", name: "Ada" }]);
  });
  it("renders allowance names in kit buttons and preserves the revoke label", async () => {
    const revokeAlwaysAllow = vi.fn();
    await mount(
      {},
      {
        alwaysAllowed: [{ capability: "edit", name: "Cell editing" }],
        revokeAlwaysAllow,
      }
    );
    const button = part("assistant-always-allowed-revoke");
    expect(button.classList.contains("ant-btn")).toBe(true);
    expect(button.textContent?.trim()).toBe("Cell editing");
    expect(button.getAttribute("aria-label")).toBe("Ask about edit again");
    button.click();
    expect(revokeAlwaysAllow).toHaveBeenCalledExactlyOnceWith("edit");
  });
});
