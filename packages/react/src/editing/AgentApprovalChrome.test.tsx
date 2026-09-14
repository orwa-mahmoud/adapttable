/**
 * The approval strip above the table.
 *
 * It draws only for approvals the table owns, and what it draws comes from
 * the shared review model — so these tests cover the framing and the
 * exclusivity, and `approvalReview.test.ts` covers the counting.
 */
import { defaultLabels } from "@adapttable/core";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { agentApprovalTestSlots } from "../internal/chromeTestSlots";
import {
  AgentApprovalChrome,
  type AgentApprovalPending,
} from "./AgentApprovalChrome";

function part(name: string) {
  return document.querySelector(`[data-adapttable-part="${name}"]`);
}

function parts(name: string) {
  return [...document.querySelectorAll(`[data-adapttable-part="${name}"]`)];
}

function pending(
  patch: Partial<AgentApprovalPending> = {}
): AgentApprovalPending {
  return {
    proposals: [{ rowKey: "r1", column: "salary", before: 100, after: 200 }],
    decisions: ["pending"],
    presentation: "table",
    approve: () => undefined,
    reject: () => undefined,
    ...patch,
  };
}

describe("when the strip draws at all", () => {
  it("draws nothing with no pending approval", () => {
    const { container } = render(
      <AgentApprovalChrome slots={agentApprovalTestSlots} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("draws nothing for an approval another surface owns", () => {
    // The assistant window is reviewing this one. A second set of buttons
    // above the table would be a second answer to one question.
    const { container } = render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        pending={pending({ presentation: "widget" })}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("draws the review when the table owns it", () => {
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        pending={pending()}
      />
    );
    expect(part("agent-approval")).not.toBeNull();
    expect(part("approval-review-summary")).toHaveTextContent(
      "1 proposed change"
    );
    expect(part("agent-approval-approve")).toHaveTextContent("Approve all");
    expect(part("agent-approval-reject")).toHaveTextContent("Reject all");
  });
});

describe("what the reader can act on", () => {
  it("names the row and shows the change", () => {
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        pending={pending({
          proposals: [
            {
              rowKey: "r1",
              rowLabel: "Ada Lovelace",
              column: "salary",
              before: 100,
              after: 200,
            },
          ],
        })}
      />
    );
    expect(part("approval-review-change")).toHaveTextContent(
      "Ada Lovelace · salary: 100 → 200"
    );
  });

  it("says Unavailable rather than drawing an empty cell", () => {
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        pending={pending({
          proposals: [
            {
              rowKey: "r1",
              column: "ssn",
              beforeUnavailable: true,
              after: "x",
            },
          ],
        })}
      />
    );
    expect(part("approval-review-change")).toHaveTextContent("Unavailable → x");
  });

  it("offers per-row controls only when the write can be split", () => {
    const decideAt = vi.fn();
    const { rerender } = render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        pending={pending()}
      />
    );
    expect(parts("approval-review-row-approve")).toHaveLength(0);

    rerender(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        pending={pending({ decideAt })}
      />
    );
    fireEvent.click(part("approval-review-row-approve")!);
    expect(decideAt).toHaveBeenCalledWith(0, true);
  });

  it("shows three changes, then opens the rest in place", () => {
    const many = Array.from({ length: 6 }, (_, index) => ({
      rowKey: `r${String(index)}`,
      column: "salary",
      after: index,
    }));
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        pending={pending({
          proposals: many,
          decisions: many.map(() => "pending" as const),
        })}
      />
    );
    expect(parts("agent-approval-row")).toHaveLength(3);
    expect(part("approval-review-expand")).toHaveTextContent(
      "Review all 6 changes"
    );

    fireEvent.click(part("approval-review-expand")!);
    expect(parts("agent-approval-row")).toHaveLength(6);
    // And back, without a second overlay opening anywhere.
    fireEvent.click(part("approval-review-back")!);
    expect(parts("agent-approval-row")).toHaveLength(3);
  });

  it("describes an operation by name and arguments, inventing no rows", () => {
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        pending={pending({
          proposals: [],
          decisions: [],
          operation: {
            capability: "staff.activateAll",
            title: "Activate everyone",
            arguments: { status: "Active" },
          },
        })}
      />
    );
    expect(part("approval-review-operation-name")).toHaveTextContent(
      "Activate everyone"
    );
    // Pairs a reader can read, not the JSON the capability will receive.
    const args = part("approval-review-operation-arguments")!;
    expect(args).toHaveTextContent("Status");
    expect(args).toHaveTextContent("Active");
    expect(args.textContent).not.toContain("{");
    expect(parts("agent-approval-row")).toHaveLength(0);
    expect(parts("approval-review-row-approve")).toHaveLength(0);
  });
});

describe("keyboard and focus", () => {
  it("moves focus into the reject control and Escape rejects", () => {
    const reject = vi.fn();
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        pending={pending({ reject })}
      />
    );
    expect(document.activeElement).toBe(part("agent-approval-reject"));

    fireEvent.keyDown(part("agent-approval")!, { key: "Escape" });
    expect(reject).toHaveBeenCalledTimes(1);
  });

  it("does not treat Enter as a silent confirm", () => {
    const approve = vi.fn();
    render(
      <AgentApprovalChrome
        slots={agentApprovalTestSlots}
        labels={defaultLabels}
        pending={pending({ approve })}
      />
    );
    fireEvent.keyDown(part("agent-approval")!, { key: "Enter" });
    expect(approve).not.toHaveBeenCalled();
  });
});
