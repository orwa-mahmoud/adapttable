/** Shared review body: all proposals, operations and real decision callbacks. */
import {
  type AgentApprovalPending,
  type AgentApprovalProposal,
  approvalReview,
  type TableLabels,
} from "@adapttable/core";
import type { AgentApprovalButtonProps } from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdaptApprovalReviewChrome,
  type AgentApprovalListProps,
  type ApprovalReviewSlots,
} from "./approvalReviewChrome";

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

const SLOTS: ApprovalReviewSlots = {
  Approve: KitButton,
  Reject: KitButton,
  Action: KitButton,
  List: KitList,
};

function pending(
  patch: Partial<AgentApprovalPending> = {}
): AgentApprovalPending {
  return {
    presentation: "widget",
    proposals: [{ rowKey: "ada", column: "salary", before: 100, after: 200 }],
    decisions: ["pending"],
    approve: vi.fn(),
    reject: vi.fn(),
    ...patch,
  };
}

async function mount(value = pending(), labels?: TableLabels) {
  const fixture = TestBed.createComponent(AdaptApprovalReviewChrome);
  fixture.componentRef.setInput("review", approvalReview(value, labels)!);
  fixture.componentRef.setInput("slots", SLOTS);
  fixture.componentRef.setInput("labels", labels);
  fixture.componentRef.setInput("onApprove", value.approve);
  fixture.componentRef.setInput("onReject", value.reject);
  fixture.componentRef.setInput("onDecide", value.decideAt);
  fixture.componentRef.setInput("onAlwaysAllow", value.alwaysAllow);
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

describe("AdaptApprovalReviewChrome", () => {
  it("names each review by its own unique heading and the list by its summary", async () => {
    const first = await mount();
    const second = await mount();
    const heading = first.part("approval-review-summary")!;
    expect(first.part("approval-review")?.getAttribute("aria-labelledby")).toBe(
      heading.id
    );
    expect(heading.id).not.toBe(second.part("approval-review-summary")?.id);
    expect(first.part("agent-approval-list")?.tagName).toBe("UL");
    expect(first.part("agent-approval-list")?.getAttribute("aria-label")).toBe(
      heading.textContent?.trim()
    );
    expect(first.part("agent-approval-row")?.tagName).toBe("LI");
    expect(first.part("agent-approval-row")?.parentElement).toBe(
      first.part("agent-approval-list")
    );
  });

  it("prefers row and column names and the column's formatted values", async () => {
    const { part } = await mount(
      pending({
        proposals: [
          {
            rowKey: "ada",
            rowLabel: "Ada Lovelace",
            column: "salary",
            columnLabel: "Annual salary",
            before: 100,
            beforeText: "$100k",
            after: 200,
            afterText: "$200k",
          },
        ],
      })
    );
    const sentence = "Ada Lovelace · Annual salary: $100k → $200k";
    expect(part("approval-review-change")?.textContent?.trim()).toBe(sentence);
    expect(part("agent-approval-row")?.getAttribute("aria-label")).toBe(
      sentence
    );
  });

  it.each([
    [{ rowKey: "ada" }, "ada"],
    [{ rowKey: "ada", column: "x" }, "ada · x"],
    [{ rowKey: "ada", before: null, after: false }, "ada: — → false"],
    [{ rowKey: "ada", before: true, after: "yes" }, "ada: true → yes"],
    [{ rowKey: "ada", after: { tag: "new" } }, 'ada: — → {"tag":"new"}'],
    [{ rowKey: "ada", before: [1, 2] }, "ada: [1,2] → —"],
    [
      {
        rowKey: "ada",
        beforeUnavailable: true,
        beforeText: "hidden",
        after: "new",
      },
      "ada: Unavailable → new",
    ],
  ] satisfies readonly (readonly [AgentApprovalProposal, string])[])(
    "describes the supplied value honestly: %j",
    async (proposal, sentence) => {
      const { part } = await mount(pending({ proposals: [proposal] }));
      expect(part("approval-review-change")?.textContent?.trim()).toBe(
        sentence
      );
    }
  );

  it("passes the normalized proposal through the localized sentence builder", async () => {
    const proposalChange = vi.fn(() => "Modification traduite");
    const { part } = await mount(
      pending({
        proposals: [
          {
            rowKey: "ada",
            column: "salary",
            beforeUnavailable: true,
            after: 25,
          },
        ],
      }),
      {
        proposalValueUnavailable: "Indisponible",
        proposalChange,
      }
    );
    expect(proposalChange).toHaveBeenCalledWith({
      row: "ada",
      column: "salary",
      before: "Indisponible",
      after: "25",
    });
    expect(part("approval-review-change")?.textContent?.trim()).toBe(
      "Modification traduite"
    );
  });

  it("offers per-row decisions only for multiple, splittable changes", async () => {
    const proposals = [{ rowKey: "ada" }, { rowKey: "grace" }];
    const value = pending({ proposals, decisions: ["pending", "pending"] });
    const { fixture, parts } = await mount(value);
    expect(parts("approval-review-row-actions")).toHaveLength(0);
    const decideAt = vi.fn();
    fixture.componentRef.setInput(
      "review",
      approvalReview({ ...value, decideAt }, undefined)
    );
    fixture.detectChanges();
    expect(parts("approval-review-row-actions")).toHaveLength(0);
    fixture.componentRef.setInput("onDecide", decideAt);
    fixture.detectChanges();
    expect(parts("approval-review-row-actions")).toHaveLength(2);
    parts("approval-review-row-reject")[0]!.click();
    parts("approval-review-row-approve")[1]!.click();
    expect(decideAt.mock.calls).toEqual([
      [0, false],
      [1, true],
    ]);
    fixture.componentRef.setInput(
      "review",
      approvalReview(pending({ decideAt }), undefined)
    );
    fixture.detectChanges();
    expect(parts("approval-review-row-actions")).toHaveLength(0);
  });

  it("keeps each change's original index when expanded and shows its decision", async () => {
    const value = pending({
      proposals: Array.from({ length: 5 }, (_, index) => ({
        rowKey: "same-row",
        column: `column-${String(index)}`,
      })),
      decisions: ["approved", "rejected", "pending", "pending", "pending"],
      decideAt: vi.fn(),
    });
    const { fixture, part, parts } = await mount(value);
    expect(parts("agent-approval-row")).toHaveLength(3);
    fixture.componentRef.setInput("expanded", true);
    fixture.detectChanges();
    const rows = parts("agent-approval-row");
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.getAttribute("data-decision"))).toEqual(
      value.decisions
    );
    expect(rows[1]!.style.textDecoration).toBe("line-through");
    expect(rows[0]!.style.opacity).toBe("0.55");
    expect(rows[2]!.style.opacity).toBe("1");
    parts("approval-review-row-approve")[4]!.click();
    expect(value.decideAt).toHaveBeenCalledExactlyOnceWith(4, true);
    expect(part("approval-review-tally")?.textContent).toContain(
      "1 approved · 1 rejected · 3 left"
    );
    expect(part("agent-approval-approve")?.textContent).toContain(
      "Approve remaining"
    );
    expect(part("agent-approval-reject")?.textContent).toContain(
      "Reject remaining"
    );
  });

  it("draws expansion and back only when each action exists and calls neither decision", async () => {
    const value = pending({
      proposals: Array.from({ length: 4 }, (_, index) => ({
        rowKey: String(index),
      })),
    });
    const { fixture, part } = await mount(value, {
      reviewAllProposals: (count) => `Voir les ${String(count)}`,
      backToConversation: "Retour",
    });
    expect(part("approval-review-expand")).toBeNull();
    const expand = vi.fn();
    const back = vi.fn();
    fixture.componentRef.setInput("onExpand", expand);
    fixture.componentRef.setInput("onBack", back);
    fixture.detectChanges();
    expect(part("approval-review-expand")?.textContent?.trim()).toBe(
      "Voir les 4"
    );
    part("approval-review-expand")!.click();
    expect(expand).toHaveBeenCalledOnce();
    expect(part("approval-review-back")).toBeNull();
    fixture.componentRef.setInput("expanded", true);
    fixture.detectChanges();
    expect(part("approval-review-expand")).toBeNull();
    expect(part("approval-review-back")?.textContent?.trim()).toBe("Retour");
    part("approval-review-back")!.click();
    expect(back).toHaveBeenCalledOnce();
    expect(value.approve).not.toHaveBeenCalled();
    expect(value.reject).not.toHaveBeenCalled();
  });

  it("offers always-allow only while its callback is available", async () => {
    const { fixture, part } = await mount(pending(), {
      alwaysAllowProposal: "Toujours autoriser",
    });
    expect(part("agent-approval-always-allow")).toBeNull();
    const allow = vi.fn();
    fixture.componentRef.setInput("onAlwaysAllow", allow);
    fixture.detectChanges();
    expect(part("agent-approval-always-allow")?.textContent?.trim()).toBe(
      "Toujours autoriser"
    );
    part("agent-approval-always-allow")!.click();
    expect(allow).toHaveBeenCalledExactlyOnceWith();
    fixture.componentRef.setInput("onAlwaysAllow", undefined);
    fixture.detectChanges();
    expect(part("agent-approval-always-allow")).toBeNull();
  });

  it("describes an opaque operation without inventing rows or per-row decisions", async () => {
    const value = pending({
      proposals: [],
      decisions: [],
      decideAt: vi.fn(),
      operation: {
        capability: "staff.activateAll",
        title: "Activate everyone",
        arguments: {
          activeStatus: "Active",
          count: 3,
          confirmed: true,
          nested: { x: 1 },
          absent: undefined,
        },
      },
    });
    const { root, part, parts } = await mount(value);
    expect(part("approval-review-operation-name")?.textContent?.trim()).toBe(
      "Activate everyone"
    );
    expect(
      [...root.querySelectorAll("dt")].map((node) => node.textContent)
    ).toEqual(["Active Status", "Count", "Confirmed", "Nested", "Absent"]);
    expect(
      [...root.querySelectorAll("dd")].map((node) => node.textContent)
    ).toEqual(["Active", "3", "true", '{"x":1}', "—"]);
    expect(part("agent-approval-list")).toBeNull();
    expect(part("approval-review-scroll")).toBeNull();
    expect(parts("approval-review-row-actions")).toHaveLength(0);
    expect(part("approval-review-summary")?.textContent).toContain(
      "1 proposed change"
    );
    part("agent-approval-approve")!.click();
    expect(value.approve).toHaveBeenCalledOnce();
    expect(value.decideAt).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, []],
    [null, ["—"]],
    [false, ["false"]],
    [15, ["15"]],
    ["all", ["all"]],
    [["a", "b"], ['["a","b"]']],
  ])(
    "reads non-object operation arguments without inventing a field name: %j",
    async (args, expected) => {
      const { root, part } = await mount(
        pending({
          proposals: [],
          operation: { capability: "rows.archive", arguments: args },
        })
      );
      expect(part("approval-review-operation-name")?.textContent?.trim()).toBe(
        "rows.archive"
      );
      expect(
        [...root.querySelectorAll("dd")].map((node) => node.textContent)
      ).toEqual(expected);
      expect(
        [...root.querySelectorAll("dt")].every(
          (node) => node.textContent === ""
        )
      ).toBe(true);
    }
  );

  it("provides English back and standing-decision labels when none were overridden", async () => {
    const { fixture, part } = await mount();
    fixture.componentRef.setInput("expanded", true);
    fixture.componentRef.setInput("onBack", vi.fn());
    fixture.componentRef.setInput("onAlwaysAllow", vi.fn());
    fixture.detectChanges();
    expect(part("approval-review-back")?.textContent?.trim()).toBe(
      "Back to conversation"
    );
    expect(part("agent-approval-always-allow")?.textContent?.trim()).toBe(
      "Always allow"
    );
  });
});
