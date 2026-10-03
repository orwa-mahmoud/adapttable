/** Native controls for the shared approval review Chrome. */
import type {
  AgentApprovalButtonProps,
  AgentApprovalListProps,
  AgentApprovalSlots,
} from "@adapttable/angular";
import { A11yModule } from "@angular/cdk/a11y";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** Native approve and reject controls. @public */
@Component({
  imports: [A11yModule],
  selector: "adapt-approval-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button
      cdkMonitorElementFocus
      data-adapttable-cdk-control
      type="button"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      (click)="props().onClick()"
    >
      {{ props().label }}
    </button>
  `,
})
export class AdaptApprovalButton {
  /** The localized label, part and decision callback. */
  readonly props = input.required<AgentApprovalButtonProps>();
}

/** Native quiet control, visually separate from the two decisions. @public */
@Component({
  imports: [A11yModule],
  selector: "adapt-approval-action",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button
      cdkMonitorElementFocus
      data-adapttable-cdk-control
      type="button"
      data-variant="quiet"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      (click)="props().onClick()"
    >
      {{ props().label }}
    </button>
  `,
})
export class AdaptApprovalAction {
  /** The expansion, back or always-allow action. */
  readonly props = input.required<AgentApprovalButtonProps>();
}

/** A real list whose real list items are supplied by the binding. @public */
@Component({
  selector: "adapt-approval-list",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <ul
      [attr.data-adapttable-part]="props().part"
      [attr.aria-label]="props().label"
      [class]="props().className"
      style="list-style: none; margin: 0; padding: 0"
    >
      @if (props().children; as children) {
        <ng-container [ngTemplateOutlet]="children" />
      }
    </ul>
  `,
})
export class AdaptApprovalList {
  /** The list's name and the Chrome's row template. */
  readonly props = input.required<AgentApprovalListProps>();
}

/** The same native approval controls for the table, assistant and modal. @public */
export const AGENT_APPROVAL_SLOTS: AgentApprovalSlots = {
  Approve: AdaptApprovalButton,
  Reject: AdaptApprovalButton,
  List: AdaptApprovalList,
  Action: AdaptApprovalAction,
};
