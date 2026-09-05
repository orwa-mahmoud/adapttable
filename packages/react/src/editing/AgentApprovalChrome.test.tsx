import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { agentApprovalTestSlots } from "../internal/chromeTestSlots";
import { defaultLabels } from "@adapttable/core";
import { AgentApprovalChrome } from "./AgentApprovalChrome";

function part(name: string) {
  return document.querySelector(`[data-adapttable-part="${name}"]`);
}

describe("AgentApprovalChrome", () => {
  it("renders nothing without a pending proposal", () => {
    const { container } = render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        onApprove={() => undefined}
        onReject={() => undefined}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders kit buttons and the proposal list when pending", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        proposals={[
          { rowKey: "5", column: "salary", before: 10, after: 20_000 },
        ]}
        onApprove={onApprove}
        onReject={onReject}
      />
    );
    expect(part("agent-approval")).toBeTruthy();
    expect(part("agent-approval-list")).toBeTruthy();
    expect(part("agent-approval-row")).toHaveTextContent("salary");
    expect(part("agent-approval-approve")).toHaveTextContent("Approve");
    expect(part("agent-approval-reject")).toHaveTextContent("Reject");
    fireEvent.click(part("agent-approval-approve")!);
    expect(onApprove).toHaveBeenCalledTimes(1);
    fireEvent.click(part("agent-approval-reject")!);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the reject control and Escape rejects", () => {
    const onReject = vi.fn();
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        proposals={[{ rowKey: "1", column: "name", after: "Ada" }]}
        onApprove={() => undefined}
        onReject={onReject}
      />
    );
    expect(part("agent-approval-reject")).toHaveFocus();
    fireEvent.keyDown(part("agent-approval")!, { key: "Escape" });
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("stringifies object proposal values and uses built-in copy without labels", () => {
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        proposals={[
          { rowKey: "1", before: { n: 1 }, after: true },
          { rowKey: "2", column: "name", before: null },
        ]}
        onApprove={() => undefined}
        onReject={() => undefined}
      />
    );
    const rows = document.querySelectorAll(
      '[data-adapttable-part="agent-approval-row"]'
    );
    expect(rows[0]).toHaveTextContent('{"n":1}');
    expect(rows[0]).toHaveTextContent("true");
    expect(rows[1]).toHaveTextContent("name");
    expect(rows[1]).toHaveTextContent("—");
    expect(part("agent-approval")).toHaveAttribute(
      "aria-label",
      "2 proposed changes"
    );
  });

  it("does not treat Enter as a silent confirm", () => {
    const onApprove = vi.fn();
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        proposals={[{ rowKey: "1" }]}
        onApprove={onApprove}
        onReject={() => undefined}
      />
    );
    fireEvent.keyDown(part("agent-approval")!, { key: "Enter" });
    expect(onApprove).not.toHaveBeenCalled();
    expect(part("agent-approval")).toHaveAttribute(
      "aria-label",
      "1 proposed change"
    );
  });
});
