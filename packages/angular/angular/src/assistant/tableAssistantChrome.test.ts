/** Mounted contract coverage: neutral Chrome renders only kit-supplied controls. */
import type { AgentApprovalPending, TableLabels } from "@adapttable/core";
import type {
  TableAssistantMessageView,
  TableAssistantReceiptView,
  TableAssistantView,
} from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import {
  Component,
  computed,
  input,
  signal,
  type TemplateRef,
} from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptAssistantContent } from "./assistantIcons";
import {
  AdaptAssistantMessage,
  AdaptAssistantReceipt,
  AdaptAssistantWorking,
} from "./assistantMessages";
import { injectAssistantFloatingFits } from "./assistantPlacement";
import type {
  TableAssistantButtonProps,
  TableAssistantComposerProps,
  TableAssistantMenuProps,
  TableAssistantNode,
  TableAssistantProps,
  TableAssistantSlots,
} from "./assistantSlots";
import { AdaptTableAssistantChrome } from "./tableAssistantChrome";

@Component({
  selector: "test-assistant-button",
  imports: [AdaptAssistantContent],
  template: `<button
    [attr.data-adapttable-part]="props().part"
    [attr.aria-label]="props().label"
    [attr.aria-expanded]="props().expanded"
    [attr.data-variant]="props().variant"
    [attr.title]="props().tooltip"
    [disabled]="props().disabled === true"
    (click)="props().onClick()"
  >
    <adapt-assistant-content [content]="props().icon" />
    @if (!props().iconOnly) {
      <adapt-assistant-content [content]="props().children ?? props().label" />
    }
  </button>`,
})
class TestButton {
  readonly props = input.required<TableAssistantButtonProps>();
}
@Component({
  selector: "test-assistant-input",
  template: `<textarea
    [attr.data-adapttable-part]="props().part"
    [attr.aria-label]="props().label"
    [placeholder]="props().placeholder"
    [value]="props().value"
    [disabled]="props().disabled === true"
    (input)="change($event)"
    (keydown)="props().onKeyDown($event)"
  ></textarea>`,
})
class TestInput {
  readonly props = input.required<TableAssistantComposerProps>();
  protected change(event: Event): void {
    this.props().onChange((event.target as HTMLTextAreaElement).value);
  }
}
@Component({
  selector: "test-assistant-badge",
  template: `<span
    [attr.data-adapttable-part]="props().part"
    [attr.data-tone]="props().tone"
    >{{ props().label }}</span
  >`,
})
class TestBadge {
  readonly props = input.required<{
    part: string;
    tone: string;
    label: string;
  }>();
}
@Component({
  selector: "test-assistant-surface",
  imports: [NgTemplateOutlet],
  template: `<section
    [attr.data-adapttable-part]="props().part"
    [attr.aria-label]="props().label"
    [attr.dir]="props().dir"
    [class]="props().className"
    [style]="props().style"
  >
    <ng-container [ngTemplateOutlet]="props().children" />
  </section>`,
})
class TestSurface {
  readonly props = input.required<{
    part: string;
    label: string;
    dir?: string;
    className?: string;
    style?: Record<string, string | number>;
    children: TemplateRef<unknown>;
  }>();
}
@Component({
  selector: "test-assistant-menu",
  imports: [AdaptAssistantContent],
  template: `<div [attr.data-adapttable-part]="props().part">
    <adapt-assistant-content [content]="props().icon" />
    @for (item of props().items; track item.id) {
      <button
        [attr.data-adapttable-part]="item.part"
        [disabled]="props().disabled === true"
        (click)="props().onSelect(item.id)"
      >
        <adapt-assistant-content [content]="item.icon" />{{ item.title }}
      </button>
    }
  </div>`,
})
class TestMenu {
  readonly props = input.required<TableAssistantMenuProps>();
}
@Component({
  selector: "test-assistant-language",
  template: `<select
    [attr.data-adapttable-part]="props().part"
    [disabled]="props().disabled"
    (change)="change($event)"
  >
    @for (value of props().options; track value.value) {
      <option [value]="value.value">{{ value.label }}</option>
    }
  </select>`,
})
class TestLanguage {
  readonly props = input.required<{
    part: string;
    disabled: boolean;
    options: readonly { value: string; label: string }[];
    onChange: (value: string) => void;
  }>();
  protected change(event: Event) {
    this.props().onChange((event.target as HTMLSelectElement).value);
  }
}
const SLOTS: TableAssistantSlots = {
  Button: TestButton,
  Composer: TestInput,
  Badge: TestBadge,
  Panel: TestSurface,
  Sheet: TestSurface,
  Window: TestSurface,
  Menu: TestMenu,
  LanguageChip: TestLanguage,
};
@Component({
  imports: [
    AdaptAssistantMessage,
    AdaptAssistantReceipt,
    AdaptAssistantWorking,
  ],
  template: `
    <adapt-assistant-message [message]="message()" [slots]="slots" />
    <adapt-assistant-receipt [receipt]="receipt()" [slots]="slots" />
    <adapt-assistant-working
      [progress]="{ label: 'Rows', done: 1, total: 2 }"
    />
  `,
})
class LegacyMessagesHost {
  readonly slots = SLOTS;
  readonly message = signal<TableAssistantMessageView>({
    id: "legacy",
    role: "assistant",
    text: "Legacy message",
  });
  readonly receipt = signal<TableAssistantReceiptView>({
    idempotencyKey: "legacy-receipt",
    status: "executed",
    subject: { kind: "edit", before: "Before", after: "After" },
  });
}
const EMPTY: TableAssistantView = {
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
  imports: [AdaptTableAssistantChrome],
  template: `<adapt-table-assistant-chrome
    [props]="props()"
    [slots]="slots()"
  />`,
})
class Host {
  readonly view = signal<TableAssistantView>(EMPTY);
  readonly open = signal(true);
  readonly settings = vi.fn();
  readonly extras = signal<Partial<TableAssistantProps>>({});
  readonly slots = signal(SLOTS);
  readonly props = computed((): TableAssistantProps => ({
    assistant: this.view(),
    open: this.open(),
    onOpenChange: (open) => {
      this.open.set(open);
    },
    ...this.extras(),
  }));
}
const fixtures: ComponentFixture<Host>[] = [];
async function mounted(
  extras: Partial<TableAssistantProps> = {},
  view: Partial<TableAssistantView> = {}
) {
  const fixture = TestBed.createComponent(Host);
  fixtures.push(fixture);
  document.body.append(fixture.nativeElement);
  fixture.componentInstance.extras.set(extras);
  fixture.componentInstance.view.set({ ...EMPTY, ...view });
  await settle(fixture);
  return fixture;
}
async function settle(fixture: ComponentFixture<Host>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}
function part(name: string): HTMLElement | null {
  return document.querySelector(`[data-adapttable-part="${name}"]`);
}
function expectNativeList(name: string, itemParts: readonly string[]): void {
  const list = part(name);
  expect(list?.tagName).toBe("UL");
  expect(list?.hasAttribute("role")).toBe(false);
  const items = [...(list?.children ?? [])];
  expect(items.map((item) => item.tagName)).toEqual(itemParts.map(() => "LI"));
  expect(
    items.map((item) => item.getAttribute("data-adapttable-part"))
  ).toEqual(itemParts);
  for (const item of items) {
    expect(item.parentElement).toBe(list);
    expect(item.hasAttribute("role")).toBe(false);
    if (item.getAttribute("data-adapttable-part") !== "assistant-working")
      expect(item.hasAttribute("aria-hidden")).toBe(false);
  }
  for (const item of list?.querySelectorAll("li") ?? [])
    expect(item.parentElement?.matches("ul,ol")).toBe(true);
}
function click(name: string): void {
  const target = part(name);
  expect(target).not.toBeNull();
  target?.click();
}
afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.destroy();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("AdaptTableAssistantChrome", () => {
  it("names its viewport hook when called outside an injection context", () => {
    expect(injectAssistantFloatingFits).toThrow(
      /injectAssistantFloatingFits\(\).*injection context/
    );
  });
  it("opens from a named launcher, focuses the composer, and returns focus after Escape", async () => {
    const fixture = await mounted({ open: false });
    const host = fixture.componentInstance;
    host.extras.set({});
    host.open.set(false);
    await settle(fixture);
    expect(part("assistant-panel")).toBeNull();
    expect(part("assistant-launcher")?.getAttribute("aria-label")).toBe(
      "Ask AI"
    );
    click("assistant-launcher");
    await settle(fixture);
    expect(part("assistant-panel")).not.toBeNull();
    expect(document.activeElement).toBe(part("assistant-input"));
    part("assistant-input")?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle(fixture);
    expect(host.open()).toBe(false);
    expect(document.activeElement).toBe(part("assistant-launcher"));
  });
  it.each(["panel", "floating", "sheet"] as const)(
    "keeps greeting, pending and streaming rows directly inside the %s list",
    async (presentation) => {
      vi.stubGlobal("innerWidth", 1000);
      const fixture = await mounted({ presentation });
      expectNativeList("assistant-messages", ["assistant-message"]);
      const host = fixture.componentInstance;
      host.extras.set({ presentation, greeting: "" });
      host.view.update((view) => ({
        ...view,
        busy: true,
        status: "sending",
        messages: [{ id: "user", role: "user", text: "Find a row" }],
      }));
      await settle(fixture);
      expectNativeList("assistant-messages", [
        "assistant-message",
        "assistant-working",
      ]);
      const user = part("assistant-message");
      expect(user?.getAttribute("data-role")).toBe("user");
      expect(user?.style.alignItems).toBe("flex-end");
      expect(user?.style.display).toBe("flex");
      expect(part("assistant-working")?.style.display).toBe("flex");
      expect(part("assistant-working")?.getAttribute("aria-hidden")).toBe(
        "true"
      );
      host.view.update((view) => ({
        ...view,
        messages: [
          ...view.messages,
          { id: "answer", role: "assistant", text: "A row", streaming: true },
        ],
      }));
      await settle(fixture);
      expectNativeList("assistant-messages", [
        "assistant-message",
        "assistant-message",
        "assistant-working",
      ]);
      expect(part("assistant-message")).toBe(user);
      expect(document.querySelectorAll('[data-streaming="true"]')).toHaveLength(
        1
      );
      host.view.update((view) => ({
        ...view,
        busy: false,
        status: "ready",
        messages: view.messages.map((message) => ({
          ...message,
          streaming: false,
        })),
      }));
      await settle(fixture);
      expectNativeList("assistant-messages", [
        "assistant-message",
        "assistant-message",
      ]);
      expect(part("assistant-working")).toBeNull();
      expect(part("assistant-message")).toBe(user);
      host.view.update((view) => ({ ...view, messages: [] }));
      await settle(fixture);
      expectNativeList("assistant-messages", []);
    }
  );
  it("preserves custom selectors as semantic list-item hosts without orphaned native items", async () => {
    const fixture = TestBed.createComponent(LegacyMessagesHost);
    document.body.append(fixture.nativeElement);
    try {
      fixture.detectChanges();
      await fixture.whenStable();
      for (const name of [
        "assistant-message",
        "assistant-receipt",
        "assistant-working",
      ]) {
        const item = part(name);
        expect(item?.localName).toBe(`adapt-${name}`);
        expect(item?.getAttribute("role")).toBe("listitem");
        expect(item?.querySelector("li")).toBeNull();
        expect(item?.style.display).toBe("flex");
      }
      expect(part("assistant-message")?.textContent).toContain(
        "Legacy message"
      );
      expect(part("assistant-message")?.style.alignItems).toBe("flex-start");
      expect(part("assistant-receipt-before")?.textContent).toBe("Before");
      expect(part("assistant-working-text")?.textContent).toContain("Rows");
      fixture.componentInstance.message.update((message) => ({
        ...message,
        role: "user",
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(part("assistant-message")?.getAttribute("data-role")).toBe("user");
      expect(part("assistant-message")?.style.alignItems).toBe("flex-end");
    } finally {
      fixture.destroy();
    }
  });
  it("preserves nested-overlay Escape and non-Escape keys", async () => {
    const fixture = await mounted();
    const target = part("assistant-input");
    const nested = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    nested.preventDefault();
    target?.dispatchEvent(nested);
    target?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true })
    );
    await settle(fixture);
    expect(fixture.componentInstance.open()).toBe(true);
    click("assistant-close");
    await settle(fixture);
    expect(fixture.componentInstance.open()).toBe(false);
  });
  it("moves a floating window to a sheet on resize, keeps explicit panels and RTL", async () => {
    vi.stubGlobal("innerWidth", 1000);
    vi.stubGlobal("matchMedia", undefined);
    const fixture = await mounted({
      presentation: "floating",
      dir: "rtl",
      className: "my-chat",
      accent: "purple",
      boundary: { current: document.body },
    });
    expect(part("assistant-window")?.style.position).toBe("absolute");
    expect(part("assistant-window")?.style.insetInlineEnd).toContain("24px");
    expect(part("assistant-window")?.className).toBe("my-chat");
    vi.stubGlobal("innerWidth", 420);
    window.dispatchEvent(new Event("resize"));
    await settle(fixture);
    expect(part("assistant-sheet")?.getAttribute("dir")).toBe("rtl");
    expect(part("assistant-window")).toBeNull();
    click("assistant-back");
    await settle(fixture);
    expect(fixture.componentInstance.open()).toBe(false);
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.extras.set({ presentation: "panel" });
    await settle(fixture);
    expect(part("assistant-panel")).not.toBeNull();
  });
  it("subscribes to and cleans up usable media-query listeners", async () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: add,
      removeEventListener: remove,
    }));
    vi.stubGlobal("innerWidth", 900);
    const fixture = await mounted({ presentation: "floating" });
    const notify = add.mock.calls.find(([name]) => name === "change")?.[1] as
      (() => void) | undefined;
    vi.stubGlobal("innerWidth", 400);
    notify?.();
    await settle(fixture);
    expect(part("assistant-sheet")).not.toBeNull();
    fixture.destroy();
    fixtures.splice(fixtures.indexOf(fixture), 1);
    expect(remove).toHaveBeenCalled();
  });
  it("localizes status without making the transcript a live region", async () => {
    const onSettings = vi.fn();
    const labels: TableLabels = {
      assistantTitle: "Aide",
      assistantConnection: (status) => `État ${status}`,
      assistantSettings: "Réglages",
      assistantEmpty: "Bonjour",
    };
    const fixture = await mounted(
      {
        labels,
        onSettings,
        note: "Preview",
        avatars: { assistant: "Ada Lovelace", user: "   " },
      },
      { status: "awaiting-approval" }
    );
    expect(part("assistant-title")?.textContent).toBe("Aide");
    expect(part("assistant-status")?.textContent).toBe(
      "État awaiting-approval"
    );
    expect(part("assistant-status")?.getAttribute("aria-live")).toBe("polite");
    expect(part("assistant-messages")?.hasAttribute("aria-live")).toBe(false);
    expect(part("assistant-connection")?.getAttribute("data-tone")).toBe(
      "warning"
    );
    expect(part("assistant-initials")?.textContent).toBe("AL");
    expect(part("assistant-empty-note")?.textContent?.trim()).toBe("Preview");
    click("assistant-settings");
    expect(onSettings).toHaveBeenCalledOnce();
    fixture.componentInstance.extras.set({ greeting: "", launcher: false });
    fixture.componentInstance.open.set(false);
    await settle(fixture);
    expect(part("assistant-launcher")).toBeNull();
  });
  it("sends Enter but leaves Shift+Enter and IME untouched, updates drafts and stops a turn", async () => {
    const send = vi.fn();
    const setDraft = vi.fn();
    const stop = vi.fn();
    const fixture = await mounted({}, { draft: "hello", send, setDraft, stop });
    const input = part("assistant-input") as HTMLTextAreaElement;
    input.value = "next";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(setDraft).toHaveBeenCalledWith("next");
    for (const init of [{ shiftKey: true }, { isComposing: true }]) {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
        ...init,
      });
      input.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(send).toHaveBeenCalledOnce();
    click("assistant-send");
    expect(send).toHaveBeenCalledTimes(2);
    fixture.componentInstance.view.update((view) => ({
      ...view,
      busy: true,
      status: "sending",
      progress: { done: 1, total: 2, label: "Rows" },
    }));
    await settle(fixture);
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(send).toHaveBeenCalledTimes(2);
    click("assistant-stop");
    expect(stop).toHaveBeenCalledOnce();
    expect(part("assistant-working-text")?.textContent).toContain("Rows");
  });
  it("answers a parked question through choices or the single composer", async () => {
    const answer = vi.fn();
    const setDraft = vi.fn();
    const fixture = await mounted(
      { greeting: "" },
      {
        status: "sending",
        busy: true,
        draft: "typed answer",
        setDraft,
        answer,
        messages: [
          {
            id: "question",
            role: "assistant",
            text: "Which?",
            question: {
              id: "q",
              question: "Which?",
              allowFreeText: true,
              options: [{ id: "first", label: "First" }],
            },
          },
        ],
      }
    );
    expect(part("assistant-working")).toBeNull();
    expectNativeList("assistant-messages", ["assistant-message"]);
    expect(part("assistant-input")?.getAttribute("placeholder")).toBe(
      "Type an answer"
    );
    click("assistant-question-option");
    expect(answer).toHaveBeenCalledWith({ optionId: "first" });
    click("assistant-send");
    expect(answer).toHaveBeenCalledWith({ text: "typed answer" });
    expect(setDraft).toHaveBeenCalledWith("");
    fixture.componentInstance.view.update((view) => ({ ...view, draft: " " }));
    await settle(fixture);
    part("assistant-input")?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(answer).toHaveBeenCalledTimes(2);
  });
  it("uses a kit menu for suggestions and kit buttons when no menu is supplied", async () => {
    const runSuggestion = vi.fn();
    const fixture = await mounted(
      {},
      {
        suggestions: [
          {
            id: "sort",
            title: "Sort rows",
            kind: "sort",
            description: "By value",
          },
          { id: "custom", title: "Custom" },
        ],
        runSuggestion,
      }
    );
    click("assistant-examples-item");
    expect(runSuggestion).toHaveBeenCalledWith("sort");
    expect(part("assistant-examples-menu")).not.toBeNull();
    fixture.componentInstance.slots.set({
      Button: TestButton,
      Composer: TestInput,
      Badge: TestBadge,
      Panel: TestSurface,
      Sheet: TestSurface,
      Window: TestSurface,
    });
    await settle(fixture);
    expect(part("assistant-examples-menu")).toBeNull();
    click("assistant-examples-item");
    expect(runSuggestion).toHaveBeenCalledTimes(2);
  });
  it("renders disconnected, failed and resumable states with localized notices", async () => {
    const resume = vi.fn();
    const fixture = await mounted({}, { status: "disconnected" });
    expect(part("assistant-unavailable")).not.toBeNull();
    expect((part("assistant-input") as HTMLTextAreaElement).disabled).toBe(
      true
    );
    expect((part("assistant-send") as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance.view.update((view) => ({
      ...view,
      resumable: { text: "Pending" },
      resume,
    }));
    await settle(fixture);
    expect(part("assistant-unavailable")).toBeNull();
    click("assistant-rejoin");
    expect(resume).toHaveBeenCalledOnce();
    fixture.componentInstance.extras.set({
      labels: {
        assistantUnresolved: (code) =>
          code === "partial" ? "Partly done" : undefined,
      },
    });
    fixture.componentInstance.view.update((view) => ({
      ...view,
      error: "fallback",
      errorCode: "partial",
    }));
    await settle(fixture);
    expect(part("assistant-error")?.textContent?.trim()).toBe("Partly done");
    expect(part("assistant-error")?.getAttribute("role")).toBe("alert");
    fixture.componentInstance.view.update((view) => ({
      ...view,
      errorCode: "other",
    }));
    await settle(fixture);
    expect(part("assistant-error")?.textContent?.trim()).toBe("fallback");
  });
  it("dictates, changes language, announces listening once and omits unavailable voice", async () => {
    const start = vi.fn();
    const stop = vi.fn();
    const setLanguage = vi.fn();
    const speech = {
      available: true,
      state: { status: "idle" as const, language: "en", interim: "" },
      languages: ["en", "fr"],
      start,
      stop,
      setLanguage,
    };
    const fixture = await mounted({ speech });
    click("assistant-voice");
    expect(start).toHaveBeenCalledOnce();
    const select = part("assistant-voice-language") as HTMLSelectElement;
    select.value = "fr";
    select.dispatchEvent(new Event("change"));
    expect(setLanguage).toHaveBeenCalledWith("fr");
    fixture.componentInstance.extras.set({
      speech: { ...speech, state: { ...speech.state, status: "listening" } },
    });
    await settle(fixture);
    expect(part("assistant-voice-status")?.textContent).toBe("Listening");
    expect(
      (part("assistant-voice-language") as HTMLSelectElement).disabled
    ).toBe(true);
    click("assistant-voice");
    expect(stop).toHaveBeenCalledOnce();
    fixture.componentInstance.extras.set({
      speech: { ...speech, available: false },
    });
    await settle(fixture);
    expect(part("assistant-voice")).toBeNull();
    expect(part("assistant-voice-language")).toBeNull();
  });
  it("keeps untrusted text literal, indicates streaming and groups consecutive speakers", async () => {
    await mounted(
      { greeting: "", avatars: { user: "   " } },
      {
        messages: [
          { id: "u1", role: "user", text: "<script>bad()</script>" },
          { id: "u2", role: "user", text: "second" },
          { id: "a", role: "assistant", text: "", transcribing: true },
          { id: "s", role: "assistant", text: "partial", streaming: true },
        ],
      }
    );
    expect(part("assistant-messages")?.querySelector("script")).toBeNull();
    expect(part("assistant-messages")?.textContent).toContain(
      "<script>bad()</script>"
    );
    expect(part("assistant-messages")?.textContent).toContain("Voice message");
    expect(document.querySelectorAll('[data-streaming="true"]')).toHaveLength(
      2
    );
    expect(document.querySelectorAll('[data-hidden="true"]')).toHaveLength(2);
  });
  it("reveals factual receipts, details and each undo scope", async () => {
    const undoTurn = vi.fn();
    const undoAction = vi.fn();
    const offer = vi.fn();
    const fixture = await mounted(
      {
        greeting: "",
        messageAction: () => ({ label: "Next step", onRun: offer }),
      },
      {
        undoTurn,
        undoAction,
        undo: { messageId: "a", available: true },
        messages: [
          {
            id: "a",
            role: "assistant",
            text: "Done",
            receipts: [
              {
                idempotencyKey: "one",
                status: "executed",
                subject: {
                  kind: "edit",
                  row: "Ada",
                  column: "Name",
                  before: "A",
                  after: "B",
                },
                undoable: true,
              },
              {
                idempotencyKey: "two",
                status: "staged",
                capabilityKey: "edit.cell",
                subject: {
                  kind: "custom",
                  detail: "Draft",
                  before: "C",
                  after: "D",
                },
                message: "Inspect me",
                undoable: true,
              },
            ],
          },
        ],
      }
    );
    expect(part("assistant-receipts-group")).toBeNull();
    click("assistant-message-action-button");
    expect(offer).toHaveBeenCalledOnce();
    const toggle = part("assistant-receipts-toggle-button");
    toggle?.focus();
    click("assistant-receipts-toggle-button");
    await settle(fixture);
    expect(document.activeElement).toBe(toggle);
    expectNativeList("assistant-receipts", [
      "assistant-receipt",
      "assistant-receipt",
    ]);
    expectNativeList("assistant-messages", ["assistant-message"]);
    expect(part("assistant-receipt")?.getAttribute("data-status")).toBe(
      "executed"
    );
    expect(part("assistant-receipt")?.getAttribute("data-kind")).toBe("edit");
    expect(part("assistant-receipt")?.style.display).toBe("flex");
    expect(part("assistant-receipts-tail")?.style.visibility).toBe("visible");
    expect(part("assistant-receipt-before")?.textContent).toBe("A");
    expect(part("assistant-receipt-after")?.textContent).toBe("B");
    expect(part("assistant-receipt-where")?.textContent).toContain("Ada");
    click("assistant-receipts-undo-all-button");
    expect(undoTurn).toHaveBeenCalledOnce();
    click("assistant-receipt-undo-button");
    expect(undoAction).toHaveBeenCalledWith("one");
    click("assistant-receipt-detail");
    await settle(fixture);
    expect(part("assistant-receipt-message")?.textContent).toContain(
      "Inspect me"
    );
    expect(part("assistant-receipt-capability")?.textContent).toBe("edit.cell");
    click("assistant-receipt-detail");
    await settle(fixture);
    expect(part("assistant-receipt-message")).toBeNull();
    click("assistant-receipts-toggle-button");
    await settle(fixture);
    expect(part("assistant-receipts-group")).toBeNull();
  });
  it("offers a blocked lone undo when receipts are hidden and revokes allowances", async () => {
    const revokeAlwaysAllow = vi.fn();
    const fixture = await mounted(
      {
        greeting: "",
        receipts: false,
        labels: {
          assistantUndoBlocked: () => "Changed elsewhere",
          assistantCapabilityName: (key) =>
            key === "edit" ? "Editing" : undefined,
        },
      },
      {
        undo: { messageId: "a", available: false, blockedCode: "stale" },
        messages: [{ id: "a", role: "assistant", text: "Done" }],
        alwaysAllowed: [
          { capability: "edit", name: "Cell editing" },
          { capability: "custom", name: "Custom name" },
          { capability: "unnamed" },
        ],
        revokeAlwaysAllow,
      }
    );
    expect((part("assistant-undo-button") as HTMLButtonElement).disabled).toBe(
      true
    );
    expect(part("assistant-undo-reason")?.textContent).toBe(
      "Changed elsewhere"
    );
    expect(part("assistant-always-allowed")?.textContent).toContain("Editing");
    click("assistant-always-allowed-revoke");
    expect(revokeAlwaysAllow).toHaveBeenCalledWith("edit");
    fixture.componentInstance.view.update((view) => ({
      ...view,
      alwaysAllowed: [],
    }));
    await settle(fixture);
    expect(part("assistant-always-allowed")).toBeNull();
  });
  it("preserves the reader's scroll position until they request the newest messages", async () => {
    const fixture = await mounted(
      { greeting: "" },
      { messages: [{ id: "one", role: "assistant", text: "One" }] }
    );
    const conversation = part("assistant-conversation")!;
    Object.defineProperties(conversation, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 100 },
    });
    conversation.scrollTop = 400;
    conversation.dispatchEvent(new Event("scroll"));
    fixture.componentInstance.view.update((view) => ({
      ...view,
      messages: [
        ...view.messages,
        { id: "two", role: "assistant", text: "Two" },
      ],
    }));
    await settle(fixture);
    expect(conversation.scrollTop).toBe(400);
    expect(part("assistant-jump-latest")).not.toBeNull();
    click("assistant-jump-latest");
    await settle(fixture);
    expect(conversation.scrollTop).toBe(1000);
    expect(part("assistant-jump-latest")).toBeNull();
    conversation.scrollTop = 852;
    conversation.dispatchEvent(new Event("scroll"));
    fixture.componentInstance.view.update((view) => ({
      ...view,
      messages: [
        ...view.messages,
        { id: "three", role: "assistant", text: "Three" },
      ],
    }));
    await settle(fixture);
    expect(conversation.scrollTop).toBe(1000);
    fixture.componentInstance.view.update((view) => ({
      ...view,
      messages: [],
    }));
    await settle(fixture);
    expect(part("assistant-jump-latest")).toBeNull();
  });
  it("expands widget proposals in place and returns to the conversation", async () => {
    const approve = vi.fn();
    const reject = vi.fn();
    const alwaysAllow = vi.fn();
    const decideAt = vi.fn();
    const approval: AgentApprovalPending = {
      decisions: Array.from({ length: 7 }, () => "pending" as const),
      proposals: Array.from({ length: 7 }, (_, index) => ({
        rowKey: String(index),
        column: "name",
        after: "Updated",
      })),
      approve,
      reject,
      alwaysAllow,
      decideAt,
      presentation: "widget",
    };
    const fixture = await mounted({ approval });
    expect(part("agent-approval-approve")?.getAttribute("data-variant")).toBe(
      "primary"
    );
    expect(part("agent-approval-reject")?.getAttribute("data-variant")).toBe(
      "secondary"
    );
    expect(part("approval-review-expand")?.getAttribute("data-variant")).toBe(
      "subtle"
    );
    click("approval-review-expand");
    await settle(fixture);
    expect(part("assistant-approval-full")).not.toBeNull();
    expect(part("assistant-conversation")?.hidden).toBe(true);
    click("approval-review-back");
    await settle(fixture);
    expect(part("assistant-approval-full")).toBeNull();
    expect(part("assistant-conversation")?.hidden).toBe(false);
    click("agent-approval-always-allow");
    expect(alwaysAllow).toHaveBeenCalledOnce();
    click("agent-approval-approve");
    expect(approve).toHaveBeenCalledOnce();
    click("agent-approval-reject");
    expect(reject).toHaveBeenCalledOnce();
    click("approval-review-expand");
    await settle(fixture);
    fixture.componentInstance.extras.set({});
    await settle(fixture);
    expect(part("assistant-approval-full")).toBeNull();
    expect(part("assistant-conversation")?.hidden).toBe(false);
  });
  it("keeps derived control props stable across unchanged checks", async () => {
    const onRun = vi.fn();
    const messageAction = vi.fn(() => ({ label: "Next", onRun }));
    const answer = vi.fn();
    const revokeAlwaysAllow = vi.fn();
    const fixture = await mounted(
      { greeting: "", messageAction },
      {
        answer,
        revokeAlwaysAllow,
        alwaysAllowed: [{ capability: "edit", name: "Editing" }],
        messages: [
          {
            id: "question",
            role: "assistant",
            text: "Choose",
            question: {
              id: "q",
              question: "Choose",
              allowFreeText: true,
              options: [{ id: "a", label: "First" }],
            },
          },
        ],
      }
    );
    const calls = messageAction.mock.calls.length;
    const choice = part("assistant-question-option");
    const allowance = part("assistant-always-allowed-revoke");
    choice?.focus();
    for (let check = 0; check < 3; check += 1) await settle(fixture);
    expect(document.activeElement).toBe(choice);
    expect(messageAction).toHaveBeenCalledTimes(calls);
    expect(part("assistant-question-option")).toBe(choice);
    expect(part("assistant-always-allowed-revoke")).toBe(allowance);
    click("assistant-question-option");
    expect(answer).toHaveBeenCalledWith({ optionId: "a" });
    click("assistant-always-allowed-revoke");
    expect(revokeAlwaysAllow).toHaveBeenCalledWith("edit");
    click("assistant-message-action-button");
    expect(onRun).toHaveBeenCalledOnce();
  });
  it("renders approval review once in its selected presentation and names waiting on the launcher", async () => {
    const approve = vi.fn();
    const reject = vi.fn();
    const approval: AgentApprovalPending = {
      decisions: ["pending"],
      proposals: [
        {
          rowKey: "one",
          rowLabel: "Ada",
          column: "name",
          before: "A",
          after: "B",
        },
      ],
      approve,
      reject,
      presentation: "widget",
    };
    const fixture = await mounted(
      { approval },
      { busy: true, status: "awaiting-approval" }
    );
    expect(part("assistant-approval")).not.toBeNull();
    expect(part("assistant-working")).toBeNull();
    expectNativeList("assistant-messages", ["assistant-message"]);
    expect(part("assistant-approval-elsewhere")).toBeNull();
    fixture.componentInstance.extras.set({
      approval: { ...approval, presentation: "modal" },
    });
    await settle(fixture);
    expect(part("assistant-approval-modal")).not.toBeNull();
    expect(part("assistant-approval")).toBeNull();
    expect(part("assistant-approval-elsewhere")).not.toBeNull();
    fixture.componentInstance.open.set(false);
    await settle(fixture);
    expect(part("assistant-launcher")?.getAttribute("aria-label")).toContain(
      "waiting"
    );
    expect(part("assistant-launcher-waiting")).not.toBeNull();
    fixture.componentInstance.extras.set({});
    await settle(fixture);
    expect(part("assistant-approval-modal")).toBeNull();
  });
});

@Component({
  imports: [AdaptAssistantContent],
  template: `<ng-template #face><b>Host face</b></ng-template
    ><adapt-assistant-content [content]="face" /><adapt-assistant-content
      [content]="text()"
    /><adapt-assistant-content [content]="nothing" />`,
})
class ContentHost {
  readonly text = signal<TableAssistantNode>("Plain");
  readonly nothing = null;
}
it("renders host avatar templates and strings without converting them to markup", async () => {
  const fixture = TestBed.createComponent(ContentHost);
  fixture.detectChanges();
  await fixture.whenStable();
  expect((fixture.nativeElement as HTMLElement).textContent).toContain(
    "Host face"
  );
  expect((fixture.nativeElement as HTMLElement).textContent).toContain("Plain");
  fixture.destroy();
});
