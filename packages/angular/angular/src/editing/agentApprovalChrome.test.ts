/** Table-owned review: exclusive presentation, keyboard and focus lifecycle. */
import type { AgentApprovalPending, TableLabels } from "@adapttable/core";
import type { AgentApprovalButtonProps } from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdaptAgentApprovalChrome,
  type AgentApprovalListProps,
  type AgentApprovalSlots,
} from "./agentApprovalChrome";

@Component({
  template: `<button
    type="button"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    (click)="props().onClick()"
  >
    {{ props().label }}
  </button>`,
})
class KitButton {
  readonly props = input.required<AgentApprovalButtonProps>();
}

@Component({
  imports: [NgTemplateOutlet],
  template: `<ul
    [attr.data-adapttable-part]="props().part"
    [attr.aria-label]="props().label"
    [class]="props().className"
  >
    @if (props().children; as children) {
      <ng-container [ngTemplateOutlet]="children" />
    }
  </ul>`,
})
class KitList {
  readonly props = input.required<AgentApprovalListProps>();
}

const SLOTS: AgentApprovalSlots = {
  Approve: KitButton,
  Reject: KitButton,
  Action: KitButton,
  List: KitList,
};

function pending(
  patch: Partial<AgentApprovalPending> = {}
): AgentApprovalPending {
  return {
    proposals: [{ rowKey: "ada", column: "salary", before: 100, after: 200 }],
    decisions: ["pending"],
    presentation: "table",
    approve: vi.fn(),
    reject: vi.fn(),
    ...patch,
  };
}

function many(): AgentApprovalPending {
  return pending({
    proposals: Array.from({ length: 6 }, (_, index) => ({
      rowKey: `r${String(index)}`,
      column: "salary",
      after: index,
    })),
    decisions: Array.from({ length: 6 }, () => "pending" as const),
  });
}

async function mount(
  value?: AgentApprovalPending | null,
  labels?: TableLabels
) {
  const fixture = TestBed.createComponent(AdaptAgentApprovalChrome);
  fixture.componentRef.setInput("slots", SLOTS);
  fixture.componentRef.setInput("pending", value);
  fixture.componentRef.setInput("labels", labels);
  const root: HTMLElement = fixture.nativeElement;
  document.body.append(root);
  fixture.detectChanges();
  await fixture.whenStable();
  return {
    fixture,
    root,
    part: (name: string) =>
      root.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`),
    parts: (name: string) => [
      ...root.querySelectorAll<HTMLElement>(`[data-adapttable-part="${name}"]`),
    ],
  };
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
});

describe("AdaptAgentApprovalChrome", () => {
  it("has no review or controls while nothing is pending", async () => {
    const { root } = await mount();
    expect(root.children).toHaveLength(0);
  });

  it.each(["widget", "modal"] as const)(
    "does not duplicate a decision owned by the %s surface",
    async (presentation) => {
      const value = pending({ presentation });
      const { root } = await mount(value);
      expect(root.children).toHaveLength(0);
      expect(value.approve).not.toHaveBeenCalled();
      expect(value.reject).not.toHaveBeenCalled();
    }
  );

  it("announces the localized review and forwards the classes to kit controls", async () => {
    const { fixture, part } = await mount(pending(), {
      proposalSummary: () => "Une modification proposée",
      approveProposal: "Approuver",
      rejectProposal: "Refuser",
    });
    fixture.componentRef.setInput("className", "review-surface");
    fixture.componentRef.setInput("buttonClassName", "review-control");
    fixture.detectChanges();
    expect(part("agent-approval")?.getAttribute("aria-label")).toBe(
      "Une modification proposée"
    );
    expect(part("agent-approval")?.className).toBe("review-surface");
    expect(part("agent-approval-list")?.className).toBe("review-surface");
    expect(part("agent-approval-approve")?.className).toBe("review-control");
    expect(part("agent-approval-approve")?.textContent?.trim()).toBe(
      "Approuver"
    );
    const status = part("agent-approval-status")!;
    expect(status.textContent).toBe("Une modification proposée");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("aria-atomic")).toBe("true");
    expect(status.hasAttribute("role")).toBe(false);
    expect(status.style.position).toBe("absolute");
  });

  it("focuses Reject on arrival, prevents Escape and calls only rejection", async () => {
    const value = pending();
    const { part } = await mount(value);
    expect(document.activeElement).toBe(part("agent-approval-reject"));
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    part("agent-approval-reject")!.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(value.reject).toHaveBeenCalledExactlyOnceWith();
    expect(value.approve).not.toHaveBeenCalled();
  });

  it("leaves Enter and unrelated keys alone instead of silently approving", async () => {
    const value = pending();
    const { part } = await mount(value);
    for (const key of ["Enter", "ArrowDown", "a"]) {
      const event = new KeyboardEvent("keydown", { key, cancelable: true });
      part("agent-approval")!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(value.approve).not.toHaveBeenCalled();
    expect(value.reject).not.toHaveBeenCalled();
  });

  it("routes the two summary controls to their exact callbacks", async () => {
    const value = pending();
    const { part } = await mount(value);
    part("agent-approval-approve")!.click();
    part("agent-approval-reject")!.click();
    expect(value.approve).toHaveBeenCalledExactlyOnceWith();
    expect(value.reject).toHaveBeenCalledExactlyOnceWith();
  });

  it("restores the connected opener after a pending review is removed", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { fixture, part } = await mount(pending());
    expect(document.activeElement).toBe(part("agent-approval-reject"));
    fixture.componentRef.setInput("pending", null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("agent-approval")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("restores focus on destruction but never steals focus the reader moved elsewhere", async () => {
    const opener = document.createElement("button");
    const elsewhere = document.createElement("button");
    document.body.append(opener, elsewhere);
    opener.focus();
    const first = await mount(pending());
    first.fixture.destroy();
    expect(document.activeElement).toBe(opener);
    const second = await mount(pending());
    elsewhere.focus();
    second.fixture.componentRef.setInput("pending", null);
    second.fixture.detectChanges();
    await second.fixture.whenStable();
    expect(document.activeElement).toBe(elsewhere);
  });

  it("does not try to restore a removed opener", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { fixture } = await mount(pending());
    opener.remove();
    fixture.componentRef.setInput("pending", null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(document.body);
  });

  it("keeps the reader's row focus while decisions and the tally update", async () => {
    const value = { ...many(), decideAt: vi.fn() };
    const { fixture, parts, part } = await mount(value);
    const rowApprove = parts("approval-review-row-approve")[1]!;
    rowApprove.focus();
    rowApprove.click();
    expect(value.decideAt).toHaveBeenCalledExactlyOnceWith(1, true);
    fixture.componentRef.setInput("pending", {
      ...value,
      decisions: [
        "pending",
        "approved",
        "pending",
        "pending",
        "pending",
        "pending",
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(rowApprove);
    expect(part("approval-review-tally")?.textContent).toContain("1 approved");
    expect(part("agent-approval-approve")?.textContent).toContain(
      "Approve remaining"
    );
  });

  it("opens every change, returns to the preview and resets after dismissal", async () => {
    const value = many();
    const { fixture, part, parts } = await mount(value);
    expect(parts("agent-approval-row")).toHaveLength(3);
    part("approval-review-expand")!.click();
    fixture.detectChanges();
    expect(parts("agent-approval-row")).toHaveLength(6);
    expect(part("approval-review-expand")).toBeNull();
    part("approval-review-back")!.click();
    fixture.detectChanges();
    expect(parts("agent-approval-row")).toHaveLength(3);
    part("approval-review-expand")!.click();
    fixture.detectChanges();
    fixture.componentRef.setInput("pending", null);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentRef.setInput("pending", many());
    fixture.detectChanges();
    await fixture.whenStable();
    expect(parts("agent-approval-row")).toHaveLength(3);
    expect(value.approve).not.toHaveBeenCalled();
    expect(value.reject).not.toHaveBeenCalled();
  });

  it("focuses a newly arriving review without requiring an intermediate empty render", async () => {
    const { fixture, part } = await mount(many());
    part("approval-review-expand")!.click();
    fixture.detectChanges();
    part("agent-approval-approve")!.focus();
    fixture.componentRef.setInput("pending", many());
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(part("agent-approval-reject"));
    expect(part("approval-review-back")).toBeNull();
  });

  it("removes table controls when ownership transfers to the assistant", async () => {
    const value = pending();
    const { fixture, part } = await mount(value);
    fixture.componentRef.setInput("pending", {
      ...value,
      presentation: "widget",
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("agent-approval")).toBeNull();
    expect(value.reject).not.toHaveBeenCalled();
  });
});
