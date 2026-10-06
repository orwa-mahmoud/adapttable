/** The real kit strip, its feature slot and per-table state isolation. */
import type {
  AdaptTableFeature,
  ColumnDef,
  FeatureMountContext,
  TableLabels,
} from "@adapttable/angular";
import {
  AGENT_APPROVAL,
  AGENT_APPROVAL_STATE,
  type AgentApprovalPending,
  type AgentApprovalProps,
} from "@adapttable/angular/adapter";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "../src/dataTable";
import { AdaptAgentApproval, agentApproval } from "./agentApproval";

function pending(
  patch: Partial<AgentApprovalPending> = {}
): AgentApprovalPending {
  return {
    presentation: "table",
    proposals: [
      { rowKey: "ada", column: "name", before: "Ada", after: "Augusta" },
    ],
    decisions: ["pending"],
    approve: vi.fn(),
    reject: vi.fn(),
    ...patch,
  };
}

const part = (root: HTMLElement, name: string) =>
  root.querySelector<HTMLElement>(
    `:is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
  );

async function mountStrip(props: AgentApprovalProps) {
  const fixture = TestBed.createComponent(AdaptAgentApproval);
  fixture.componentRef.setInput("props", props);
  const root: HTMLElement = fixture.nativeElement;
  document.body.append(root);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root };
}

interface Row {
  id: string;
  name: string;
}

@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features()"
    [labels]="labels()"
    [forceMobile]="mobile()"
    [urlSync]="false"
  />`,
})
class TableHost {
  readonly features = input.required<readonly AdaptTableFeature[]>();
  readonly mobile = input(false);
  readonly labels = input<TableLabels>();
  readonly rows = [{ id: "ada", name: "Ada" }];
  readonly columns: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];
  readonly rowKey = (row: Row) => row.id;
}

async function mountTable(mobile: boolean, includeApproval = true) {
  let context: FeatureMountContext | undefined;
  const capture: AdaptTableFeature = {
    id: "approval-test-source",
    mount: (value) => {
      context = value;
    },
  };
  const fixture = TestBed.createComponent(TableHost);
  fixture.componentRef.setInput("features", [
    capture,
    ...(includeApproval ? [agentApproval()] : []),
  ]);
  fixture.componentRef.setInput("mobile", mobile);
  fixture.componentRef.setInput("labels", {
    approveProposal: "Accepter",
    rejectProposal: "Refuser",
  });
  const root: HTMLElement = fixture.nativeElement;
  document.body.append(root);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, root, state: context!.state };
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
});

describe("native agentApproval()", () => {
  it("fills only the approval slot with the native strip", () => {
    const feature = agentApproval();
    expect(feature.id).toBe("agent-approval");
    expect(feature.renders).toHaveLength(1);
    expect(feature.renders![0]!.slot).toBe(AGENT_APPROVAL);
    expect(feature.renders![0]!.render({} as never)).toBe(AdaptAgentApproval);
  });

  it("passes the labels and classes through the wrapper and executes its callbacks", async () => {
    const value = pending();
    const { root } = await mountStrip({
      pending: value,
      className: "native-review",
      buttonClassName: "native-button",
      labels: { approveProposal: "Accepter", rejectProposal: "Refuser" },
    });
    expect(part(root, "agent-approval")?.className).toBe("native-review");
    expect(part(root, "agent-approval-list")?.tagName).toBe("UL");
    const reject = part(root, "agent-approval-reject")!;
    const approve = part(root, "agent-approval-approve")!;
    expect(reject.classList.contains("native-button")).toBe(true);
    expect(reject.classList.contains("at-spartan-button")).toBe(true);
    expect(reject.textContent?.trim()).toBe("Refuser");
    expect(approve.textContent?.trim()).toBe("Accepter");
    expect(document.activeElement).toBe(reject);
    reject.click();
    approve.click();
    expect(value.reject).toHaveBeenCalledExactlyOnceWith();
    expect(value.approve).toHaveBeenCalledExactlyOnceWith();
  });

  it("uses quiet native controls for expansion, back and conditional always-allow", async () => {
    const alwaysAllow = vi.fn();
    const value = pending({
      proposals: Array.from({ length: 4 }, (_, index) => ({
        rowKey: String(index),
      })),
      alwaysAllow,
    });
    const { fixture, root } = await mountStrip({ pending: value });
    const expand = part(root, "approval-review-expand")!;
    expect(expand.getAttribute("data-variant")).toBe("quiet");
    expand.click();
    fixture.detectChanges();
    expect(root.querySelectorAll("li")).toHaveLength(4);
    expect(
      part(root, "approval-review-back")?.getAttribute("data-variant")
    ).toBe("quiet");
    const allow = part(root, "agent-approval-always-allow")!;
    expect(allow.getAttribute("data-variant")).toBe("quiet");
    allow.click();
    expect(alwaysAllow).toHaveBeenCalledExactlyOnceWith();
  });

  it.each([false, true])(
    "renders the published approval once in a real table (mobile=%s)",
    async (mobile) => {
      const { fixture, root, state } = await mountTable(mobile);
      expect(part(root, "agent-approval")).toBeNull();
      const value = pending();
      state.set(AGENT_APPROVAL_STATE, value);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(
        root.querySelectorAll('[data-adapttable-part="agent-approval"]')
      ).toHaveLength(1);
      expect(part(root, "agent-approval-approve")?.textContent?.trim()).toBe(
        "Accepter"
      );
      part(root, "agent-approval-approve")!.click();
      expect(value.approve).toHaveBeenCalledExactlyOnceWith();
      state.set(AGENT_APPROVAL_STATE, null);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(part(root, "agent-approval")).toBeNull();
    }
  );

  it("does not draw controls when the feature is omitted or another surface owns them", async () => {
    const without = await mountTable(false, false);
    without.state.set(AGENT_APPROVAL_STATE, pending());
    without.fixture.detectChanges();
    await without.fixture.whenStable();
    expect(part(without.root, "agent-approval")).toBeNull();
    const withFeature = await mountTable(false);
    for (const presentation of ["widget", "modal"] as const) {
      withFeature.state.set(AGENT_APPROVAL_STATE, pending({ presentation }));
      withFeature.fixture.detectChanges();
      await withFeature.fixture.whenStable();
      expect(part(withFeature.root, "agent-approval")).toBeNull();
    }
  });

  it("keeps two mounted tables' approval states and callbacks separate", async () => {
    const first = await mountTable(false);
    const second = await mountTable(false);
    const firstValue = pending();
    const secondValue = pending();
    first.state.set(AGENT_APPROVAL_STATE, firstValue);
    first.fixture.detectChanges();
    await first.fixture.whenStable();
    expect(part(second.root, "agent-approval")).toBeNull();
    second.state.set(AGENT_APPROVAL_STATE, secondValue);
    second.fixture.detectChanges();
    await second.fixture.whenStable();
    part(first.root, "agent-approval-reject")!.click();
    part(second.root, "agent-approval-approve")!.click();
    expect(firstValue.reject).toHaveBeenCalledOnce();
    expect(firstValue.approve).not.toHaveBeenCalled();
    expect(secondValue.approve).toHaveBeenCalledOnce();
    expect(secondValue.reject).not.toHaveBeenCalled();
  });
});
