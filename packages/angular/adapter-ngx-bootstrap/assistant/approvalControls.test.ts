/** Native controls preserve the binding's parts, semantics and callbacks. */
import type {
  AgentApprovalButtonProps,
  AgentApprovalListProps,
} from "@adapttable/angular";
import {
  Component,
  computed,
  type TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdaptApprovalAction,
  AdaptApprovalButton,
  AdaptApprovalList,
  AGENT_APPROVAL_SLOTS,
} from "./approvalControls";

@Component({
  imports: [AdaptApprovalList],
  template: `
    <ng-template #children
      ><li data-proposal="true">Ada's change</li></ng-template
    >
    <adapt-approval-list [props]="props()" />
  `,
})
class ListHost {
  private readonly children = viewChild<TemplateRef<unknown>>("children");
  readonly props = computed((): AgentApprovalListProps => ({
    label: "Review Ada's change",
    part: "agent-approval-list",
    className: "proposal-list",
    children: this.children(),
  }));
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
});

describe("native approval controls", () => {
  it.each([
    [AdaptApprovalButton, null],
    [AdaptApprovalAction, "quiet"],
  ] satisfies readonly (readonly [Type<unknown>, string | null])[])(
    "draws %s as a non-submitting button with the exact label, part, class and callback",
    (component, variant) => {
      const click = vi.fn();
      const submitted = vi.fn();
      const props: AgentApprovalButtonProps = {
        label: "Refuser",
        part: "agent-approval-reject",
        className: "native-control",
        onClick: click,
      };
      const fixture = TestBed.createComponent(component);
      fixture.componentRef.setInput("props", props);
      const form = document.createElement("form");
      form.addEventListener("submit", submitted);
      document.body.append(form);
      form.append(fixture.nativeElement);
      fixture.detectChanges();
      const button = form.querySelector("button")!;
      expect(button.type).toBe("button");
      expect(button.textContent?.trim()).toBe("Refuser");
      expect(button.getAttribute("data-adapttable-part")).toBe(
        "agent-approval-reject"
      );
      expect(button.getAttribute("data-variant")).toBe(variant);
      expect([...button.classList].sort()).toEqual(
        ["btn", "btn-outline-secondary", "btn-sm", "native-control"].sort()
      );
      button.focus();
      expect(document.activeElement).toBe(button);
      button.click();
      expect(click).toHaveBeenCalledExactlyOnceWith();
      expect(submitted).not.toHaveBeenCalled();
    }
  );

  it("outlets the Chrome's rows directly into a named native list", async () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const list = root.querySelector("ul")!;
    expect(list.getAttribute("data-adapttable-part")).toBe(
      "agent-approval-list"
    );
    expect(list.getAttribute("aria-label")).toBe("Review Ada's change");
    expect(list.className).toBe("proposal-list");
    const row = root.querySelector("li")!;
    expect(row.parentElement).toBe(list);
    expect(row.textContent).toBe("Ada's change");
  });

  it("draws the list safely before the row template is available", () => {
    const fixture = TestBed.createComponent(AdaptApprovalList);
    fixture.componentRef.setInput("props", {
      part: "agent-approval-list",
      label: "Pending changes",
      children: undefined,
    });
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector("ul")?.children).toHaveLength(0);
  });

  it("fills every required slot with a native control", () => {
    expect(AGENT_APPROVAL_SLOTS).toEqual({
      Approve: AdaptApprovalButton,
      Reject: AdaptApprovalButton,
      Action: AdaptApprovalAction,
      List: AdaptApprovalList,
    });
  });
});
