import type { AgentApprovalPending } from "@adapttable/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { testSlots } from "../../test/assistant-fixtures";
import {
  ApprovalReviewChrome,
  type ApprovalReviewChromeProps,
} from "./approvalReviewChrome";
import {
  TableAssistantChrome,
  type TableAssistantChromeProps,
} from "./tableAssistantChrome";

const stops: (() => void)[] = [];
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const settle = async () => {
  await nextTick();
  await nextTick();
  await nextTick();
};
const pending = (): AgentApprovalPending => ({
  identity: Object.freeze({}),
  presentation: "widget",
  proposals: [1, 2, 3, 4].map((row) => ({
    rowKey: String(row),
    column: "name",
    after: `Name ${String(row)}`,
  })),
  decisions: ["pending", "pending", "pending", "pending"],
  approve: vi.fn(),
  reject: vi.fn(),
  decideAt: vi.fn(),
});
function mount(patch: Partial<TableAssistantChromeProps> = {}) {
  const props = shallowRef<TableAssistantChromeProps>({
    open: true,
    onOpenChange: vi.fn(),
    greeting: "",
    slots: testSlots,
    assistant: {
      status: "ready",
      messages: [
        { id: "greeting", role: "assistant", text: "Review these changes" },
      ],
      draft: "",
      setDraft: vi.fn(),
      send: vi.fn(),
      stop: vi.fn(),
      suggestions: [],
      runSuggestion: vi.fn(),
    },
    ...patch,
  });
  const visible = shallowRef(true);
  const Child = defineComponent({
    setup: () => () => h(TableAssistantChrome, props.value),
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup: () => () =>
      h(KeepAlive, null, { default: () => (visible.value ? h(Child) : null) }),
  });
  app.mount(root);
  let mounted = true;
  const dispose = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    root.remove();
  };
  stops.push(dispose);
  const all = (part: string) =>
    root.querySelectorAll<HTMLElement>(`[data-adapttable-part="${part}"]`);
  const get = (part: string) => {
    const node = all(part)[0];
    if (!node) throw new Error(part);
    return node;
  };
  const click = async (part: string) => {
    get(part).click();
    await settle();
  };
  return { props, visible, root, app, dispose, all, get, click };
}
describe("assistant semantic surfaces", () => {
  it("moves a real review into the conversation region and restores focus through Back and Escape", async () => {
    const approval = pending();
    const host = mount({ approval });
    await settle();
    expect(host.all("agent-approval-row")).toHaveLength(3);
    await host.click("approval-review-expand");
    expect(host.get("assistant-approval-full").parentElement).toBe(
      host.get("assistant-conversation-region")
    );
    expect(host.get("assistant-conversation").hidden).toBe(true);
    expect(host.all("assistant-input")).toHaveLength(0);
    expect(host.all("agent-approval-row")).toHaveLength(4);
    expect(host.all("agent-approval-approve")).toHaveLength(1);
    expect(document.activeElement).toBe(host.get("approval-review-back"));
    await host.click("approval-review-back");
    expect(host.get("assistant-conversation").hidden).toBe(false);
    expect(document.activeElement).toBe(host.get("approval-review-expand"));
    await host.click("approval-review-expand");
    host.get("approval-review-back").dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(0);
    expect(host.props.value.onOpenChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(host.get("approval-review-expand"));
    await host.click("approval-review-expand");
    host.props.value = {
      ...host.props.value,
      approval: {
        ...approval,
        decisions: ["approved", "pending", "pending", "pending"],
      },
    };
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(1);
    host.props.value = { ...host.props.value, approval: pending() };
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(0);
    expect(host.get("assistant-conversation").hidden).toBe(false);
  });
  it("preserves one transaction across new callbacks but retires a new transaction reusing all proposal objects and IDs", async () => {
    const original = pending();
    const callbacks: (() => void)[] = [];
    const host = mount({
      approval: original,
      slots: {
        ...testSlots,
        Button: (input) => {
          if (input.part === "agent-approval-approve")
            callbacks.push(input.onClick);
          return testSlots.Button(input);
        },
      },
    });
    await settle();
    await host.click("approval-review-expand");
    const retainedApprove = callbacks.at(-1);
    const next = {
      ...original,
      approve: vi.fn(),
      reject: vi.fn(),
      decisions: [
        "approved" as const,
        "pending" as const,
        "pending" as const,
        "pending" as const,
      ],
    };
    host.props.value = { ...host.props.value, approval: next };
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(1);
    retainedApprove?.();
    await settle();
    expect(next.approve).not.toHaveBeenCalled();
    expect(original.approve).not.toHaveBeenCalled();
    await host.click("agent-approval-approve");
    expect(next.approve).toHaveBeenCalledOnce();
    host.props.value = {
      ...host.props.value,
      approval: { ...next, identity: Object.freeze({}) },
    };
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(0);
    expect(document.activeElement).toBe(host.get("approval-review-expand"));
    await host.click("approval-review-expand");
    host.props.value = {
      ...host.props.value,
      assistant: { ...host.props.value.assistant, send: vi.fn() },
    };
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(0);
  });
  it("supports legacy approvals by reference while the host omits an identity token", async () => {
    const approval = { ...pending(), identity: undefined };
    const host = mount({ approval });
    await settle();
    await host.click("approval-review-expand");
    host.props.value = {
      ...host.props.value,
      approval: {
        ...approval,
        approve: vi.fn(),
        decisions: ["approved", "pending", "pending", "pending"],
      },
    };
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(1);
    host.props.value = {
      ...host.props.value,
      approval: { ...approval, proposals: [...approval.proposals] },
    };
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(0);
  });
  it("retires retained expansion and Back events after replacement and KeepAlive suspension", async () => {
    const host = mount({ approval: pending() });
    await settle();
    const expand = host.get("approval-review-expand");
    expand.click();
    host.props.value = { ...host.props.value, approval: pending() };
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(0);
    await host.click("approval-review-expand");
    const back = host.get("approval-review-back");
    host.visible.value = false;
    await settle();
    host.visible.value = true;
    await settle();
    await host.click("approval-review-expand");
    back.click();
    await settle();
    expect(host.all("assistant-approval-full")).toHaveLength(1);
  });
  it("retires retained modal dismissal through KeepAlive even when its approval object is reused", async () => {
    const approval = { ...pending(), presentation: "modal" as const };
    const callbacks: (() => void)[] = [];
    const host = mount({
      approval,
      slots: {
        ...testSlots,
        Sheet: (input) => {
          callbacks.push(input.onClose);
          return testSlots.Sheet(input);
        },
      },
    });
    await settle();
    const retained = callbacks.at(-1);
    host.visible.value = false;
    await settle();
    host.visible.value = true;
    await settle();
    retained?.();
    await settle();
    expect(approval.reject).not.toHaveBeenCalled();
    callbacks.at(-1)?.();
    await settle();
    expect(approval.reject).toHaveBeenCalledOnce();
  });
  it("groups receipts as an accessible list and separates one action undo from turn undo", async () => {
    const undo = vi.fn();
    const undoAction = vi.fn();
    const host = mount({ avatars: { assistant: "Ada Lovelace" } });
    const message = {
      id: "turn",
      role: "assistant" as const,
      text: "Changed",
      receipts: [
        {
          idempotencyKey: "sort",
          status: "executed" as const,
          undoable: true,
          subject: { kind: "sort" },
        },
      ],
    };
    host.props.value = {
      ...host.props.value,
      assistant: {
        ...host.props.value.assistant,
        messages: [message],
        undo: { messageId: "turn", available: true },
        undoTurn: undo,
        undoAction,
      },
    };
    await settle();
    expect(host.get("assistant-initials").textContent).toBe("AL");
    expect(host.get("assistant-message-speaker").textContent).toBe("Assistant");
    expect(host.get("assistant-receipts-toggle").parentElement).toBe(
      host.get("assistant-message-trailing")
    );
    await host.click("assistant-receipts-toggle-button");
    expect(host.get("assistant-receipts").tagName).toBe("UL");
    const group = host.get("assistant-receipts-group");
    expect(group.tagName).toBe("SECTION");
    expect(
      host.root.ownerDocument.getElementById(
        group.getAttribute("aria-labelledby") ?? ""
      )?.textContent
    ).toBe("What this turn changed");
    expect(host.all("assistant-receipts-undo-all-button")).toHaveLength(0);
    expect(
      host.get("assistant-receipt-icon").querySelector("svg path")
    ).not.toBeNull();
    expect(host.get("assistant-receipt-undo").parentElement).toBe(
      host.get("assistant-receipt-outcome")
    );
    await host.click("assistant-receipt-undo-button");
    expect(undoAction).toHaveBeenCalledWith("sort");
    expect(undo).not.toHaveBeenCalled();
    host.props.value = {
      ...host.props.value,
      assistant: {
        ...host.props.value.assistant,
        messages: [
          {
            ...message,
            receipts: [
              ...message.receipts,
              {
                idempotencyKey: "edit",
                status: "staged",
                undoable: true,
                subject: { kind: "edit" },
              },
            ],
          },
        ],
        undo: { messageId: "turn", available: false, blockedCode: "changed" },
      },
    };
    await settle();
    const whole = host.get(
      "assistant-receipts-undo-all-button"
    ) as HTMLButtonElement;
    expect(whole.disabled).toBe(true);
    expect(whole.getAttribute("aria-label")).toBe("Undo all");
    expect(host.get("assistant-receipts-heading").contains(whole)).toBe(true);
    expect(host.get("assistant-undo-reason").textContent).toContain("changed");
    expect(
      host
        .get("assistant-receipt-save")
        .contains(host.get("assistant-receipt-save-badge"))
    ).toBe(true);
    host.props.value = { ...host.props.value, receipts: false };
    await settle();
    expect(host.all("assistant-receipts-group")).toHaveLength(0);
    expect(
      host.get("assistant-undo").contains(host.get("assistant-undo-reason"))
    ).toBe(true);
  });
  it("owns receipt geometry observers across disclosure, KeepAlive and disposal", async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = observe;
        disconnect = disconnect;
      }
    );
    const host = mount();
    host.props.value = {
      ...host.props.value,
      assistant: {
        ...host.props.value.assistant,
        messages: [
          {
            id: "turn",
            role: "assistant",
            text: "Changed",
            receipts: [
              {
                idempotencyKey: "sort",
                status: "executed",
                subject: { kind: "sort" },
              },
            ],
          },
        ],
      },
    };
    await settle();
    await host.click("assistant-receipts-toggle-button");
    expect(observe).toHaveBeenCalledTimes(2);
    host.visible.value = false;
    await settle();
    expect(disconnect).toHaveBeenCalledOnce();
    host.visible.value = true;
    await settle();
    expect(observe).toHaveBeenCalledTimes(4);
    await host.click("assistant-receipts-toggle-button");
    expect(disconnect).toHaveBeenCalledTimes(2);
    await host.click("assistant-receipts-toggle-button");
    expect(observe).toHaveBeenCalledTimes(6);
    host.dispose();
    expect(disconnect).toHaveBeenCalledTimes(3);
  });
  it("gives progress, question choices, allowances and host actions their actual structural targets", async () => {
    const host = mount({
      messageAction: () => ({ label: "Open details", onRun: vi.fn() }),
    });
    host.props.value = {
      ...host.props.value,
      assistant: {
        ...host.props.value.assistant,
        status: "sending",
        busy: true,
        progress: { done: 1, total: 2 },
        alwaysAllowed: [{ capability: "edit.cells" }],
        revokeAlwaysAllow: vi.fn(),
      },
    };
    await settle();
    expect(host.get("assistant-working-dot").getAttribute("aria-hidden")).toBe(
      "true"
    );
    expect(host.get("assistant-working-text").textContent).toContain("1");
    expect(host.get("assistant-always-allowed-item").tagName).toBe("LI");
    expect(
      host
        .get("assistant-always-allowed-item")
        .contains(host.get("assistant-always-allowed-revoke"))
    ).toBe(true);
    expect(
      host
        .get("assistant-message-action")
        .contains(host.get("assistant-message-action-button"))
    ).toBe(true);
    host.props.value = {
      ...host.props.value,
      assistant: {
        ...host.props.value.assistant,
        status: "awaiting-user",
        answer: vi.fn(),
        messages: [
          {
            id: "q",
            role: "assistant",
            text: "Choose",
            question: {
              id: "q",
              question: "Which rows?",
              allowFreeText: false,
              options: [{ id: "all", label: "All rows" }],
            },
          },
        ],
      },
    };
    await settle();
    expect(
      host.get("assistant-question-options").getAttribute("aria-label")
    ).toBe("Which rows?");
    expect(
      host
        .get("assistant-question-options")
        .contains(host.get("assistant-question-option"))
    ).toBe(true);
    expect(host.all("assistant-working")).toHaveLength(0);
  });
});

describe("controlled approval expansion", () => {
  it("keeps an explicit false controlled, honors callback rejection, and never runs a callback after owner disposal", async () => {
    const expand = vi.fn();
    const back = vi.fn();
    const props = shallowRef<ApprovalReviewChromeProps>({
      pending: pending(),
      expanded: false,
      onExpand: expand,
      onBack: back,
      slots: {
        Approve: testSlots.Button,
        Reject: testSlots.Button,
        Action: testSlots.Button,
        List: (input) => h("ul", [input.children]),
      },
    });
    const root = document.createElement("div");
    const app = createApp({
      setup: () => () => h(ApprovalReviewChrome, props.value),
    });
    app.mount(root);
    const find = (part: string) =>
      root.querySelector<HTMLElement>(`[data-adapttable-part="${part}"]`);
    find("approval-review-expand")?.click();
    await settle();
    expect(expand).toHaveBeenCalledOnce();
    expect(find("approval-review-back")).toBeNull();
    props.value = { ...props.value, expanded: true };
    await settle();
    find("approval-review-back")?.click();
    await settle();
    expect(back).toHaveBeenCalledOnce();
    expect(find("approval-review-back")).not.toBeNull();
    props.value = {
      ...props.value,
      expanded: false,
      onExpand: undefined,
      onBack: undefined,
    };
    await settle();
    find("approval-review-expand")?.click();
    await settle();
    props.value = { ...props.value, expanded: undefined };
    await settle();
    expect(find("approval-review-back")).toBeNull();
    props.value = { ...props.value, expanded: true, onBack: back };
    await settle();
    const retained = find("approval-review-back");
    app.unmount();
    retained?.click();
    await settle();
    expect(back).toHaveBeenCalledOnce();
  });
  it("allows expansion callbacks to synchronously unmount or replace the owner", async () => {
    const root = document.createElement("div");
    const request = vi.fn(() => app.unmount());
    const props: ApprovalReviewChromeProps = {
      pending: pending(),
      expanded: false,
      onExpand: request,
      slots: {
        Approve: testSlots.Button,
        Reject: testSlots.Button,
        Action: testSlots.Button,
        List: (input) => h("ul", [input.children]),
      },
    };
    const app = createApp({ render: () => h(ApprovalReviewChrome, props) });
    app.mount(root);
    root
      .querySelector<HTMLElement>(
        '[data-adapttable-part="approval-review-expand"]'
      )
      ?.click();
    await settle();
    expect(request).toHaveBeenCalledOnce();
    expect(root.childElementCount).toBe(0);
  });
});
