import type { AgentApprovalPending } from "@adapttable/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { testSlots } from "../../test/assistant-fixtures";
import {
  AgentApprovalChrome,
  type AgentApprovalChromeProps,
} from "./approvalReviewChrome";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
function mount(pending?: AgentApprovalPending) {
  const input = shallowRef<AgentApprovalChromeProps>({
    pending,
    slots: {
      Approve: testSlots.Button,
      Reject: testSlots.Button,
      Action: testSlots.Button,
      List: (props) =>
        h("ul", { "data-adapttable-part": props.part }, [props.children]),
    },
    className: "review-class",
    buttonClassName: "button-class",
  });
  const root = document.createElement("div");
  const app = createApp({
    setup: () => () => h(AgentApprovalChrome, input.value),
  });
  app.mount(root);
  stops.push(() => app.unmount());
  const find = (part: string) =>
    root.querySelector<HTMLElement>(`[data-adapttable-part="${part}"]`);
  const click = async (part: string) => {
    const element = find(part);
    if (!element) throw new Error(part);
    element.click();
    await nextTick();
    await nextTick();
    await nextTick();
  };
  return { root, input, find, click };
}
describe("approval review", () => {
  it("only owns table approvals, renders exact values, expands and settles per-item and all decisions", async () => {
    const approve = vi.fn();
    const reject = vi.fn();
    const decideAt = vi.fn();
    const alwaysAllow = vi.fn();
    const pending: AgentApprovalPending = {
      presentation: "table",
      proposals: [
        {
          rowKey: "1",
          rowLabel: "Ada",
          column: "x",
          columnLabel: "Salary",
          before: 10,
          after: 12,
          beforeText: "$10",
          afterText: "$12",
        },
        { rowKey: "2", column: "x", beforeUnavailable: true, after: true },
        { rowKey: "3", before: null, after: { enabled: true } },
        { rowKey: "4", before: false, after: "" },
      ],
      decisions: ["approved", "pending", "rejected", "pending"],
      approve,
      reject,
      decideAt,
      alwaysAllow,
    };
    const host = mount(pending);
    expect(host.find("agent-approval")?.hasAttribute("aria-live")).toBe(false);
    expect(host.find("agent-approval-status")?.getAttribute("aria-live")).toBe(
      "polite"
    );
    expect(host.find("agent-approval-status")?.textContent).toBe(
      host.find("approval-review-summary")?.textContent
    );
    expect(host.root.textContent).toContain("$10");
    expect(host.root.textContent).toContain("Salary");
    expect(host.root.textContent).toContain("Unavailable");
    expect(
      host.root.querySelectorAll('[data-adapttable-part="agent-approval-row"]')
    ).toHaveLength(3);
    expect(host.find("approval-review-tally")?.textContent).toContain(
      "1 approved"
    );
    await host.click("approval-review-expand");
    expect(
      host.root.querySelectorAll('[data-adapttable-part="agent-approval-row"]')
    ).toHaveLength(4);
    await host.click("approval-review-row-approve");
    expect(decideAt).toHaveBeenCalledWith(0, true);
    await host.click("approval-review-row-reject");
    expect(decideAt).toHaveBeenCalledWith(0, false);
    await host.click("approval-review-back");
    expect(
      host.root.querySelectorAll('[data-adapttable-part="agent-approval-row"]')
    ).toHaveLength(3);
    await host.click("agent-approval-always-allow");
    expect(alwaysAllow).toHaveBeenCalledOnce();
    await host.click("agent-approval-approve");
    await host.click("agent-approval-reject");
    expect(approve).toHaveBeenCalledOnce();
    expect(reject).toHaveBeenCalledOnce();
    host.input.value = {
      ...host.input.value,
      pending: { ...pending, presentation: "widget" },
    };
    await nextTick();
    expect(host.root.textContent).toBe("");
    host.input.value = { ...host.input.value, pending: undefined };
    await nextTick();
    expect(host.root.textContent).toBe("");
  });
  it("keeps its dedicated live region mounted before arrival and after settlement", async () => {
    const host = mount();
    const status = host.find("agent-approval-status");
    expect(status?.tagName).toBe("DIV");
    expect(status?.textContent).toBe("");
    host.input.value = {
      ...host.input.value,
      pending: {
        presentation: "table",
        proposals: [{ rowKey: "one", after: "new" }],
        decisions: ["pending"],
        approve: vi.fn(),
        reject: vi.fn(),
      },
    };
    await nextTick();
    expect(host.find("agent-approval-status")).toBe(status);
    expect(status?.textContent).toBe(
      host.find("approval-review-summary")?.textContent
    );
    host.input.value = { ...host.input.value, pending: undefined };
    await nextTick();
    expect(host.find("agent-approval-status")).toBe(status);
    expect(status?.textContent).toBe("");
    expect(host.find("agent-approval")).toBeNull();
  });
  it("renders atomic operations without invented row proposals and rejects stale events", async () => {
    const approve = vi.fn();
    const pending: AgentApprovalPending = {
      presentation: "table",
      proposals: [],
      decisions: [],
      operation: {
        capability: "server.update",
        title: "Update matching rows",
        arguments: { includeArchived: false, ids: ["one"], missing: undefined },
      },
      approve,
      reject: vi.fn(),
    };
    const host = mount(pending);
    expect(host.find("approval-review-operation-name")?.textContent).toBe(
      "Update matching rows"
    );
    expect(
      host.find("approval-review-operation-arguments")?.textContent
    ).toContain("false");
    expect(host.find("agent-approval-list")).toBeNull();
    host.find("agent-approval-approve")?.click();
    host.input.value = {
      ...host.input.value,
      pending: {
        ...pending,
        operation: { capability: "other", arguments: "scope" },
      },
    };
    await nextTick();
    await nextTick();
    await nextTick();
    expect(approve).not.toHaveBeenCalled();
    expect(host.find("approval-review-operation-name")?.textContent).toBe(
      "other"
    );
    expect(host.find("approval-review-operation-arguments")?.textContent).toBe(
      "scope"
    );
    host.input.value = {
      ...host.input.value,
      pending: {
        ...pending,
        operation: { capability: "none", arguments: undefined },
      },
    };
    await nextTick();
    expect(host.find("approval-review-operation-arguments")?.textContent).toBe(
      ""
    );
  });
});
