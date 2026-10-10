/** NG-ZORRO controls for the shared approval review Chrome. */
import type {
  AgentApprovalButtonProps,
  AgentApprovalListProps,
  AgentApprovalSlots,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzListModule } from "ng-zorro-antd/list";

/** NG-ZORRO approve and reject controls. @public */
@Component({
  selector: "adapt-approval-button",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button
      nz-button
      nzSize="small"
      [nzType]="props().part.endsWith('-approve') ? 'primary' : 'default'"
      type="button"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      (click)="props().onClick()"
    >
      <span>{{ props().label }} </span>
    </button>
  `,
})
export class AdaptApprovalButton {
  /** The localized label, part and decision callback. */
  readonly props = input.required<AgentApprovalButtonProps>();
}

/** NG-ZORRO quiet control, visually separate from the two decisions. @public */
@Component({
  selector: "adapt-approval-action",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button
      nz-button
      nzSize="small"
      type="button"
      nzType="text"
      data-variant="quiet"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      (click)="props().onClick()"
    >
      <span>{{ props().label }} </span>
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
  imports: [NgTemplateOutlet, NzListModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <nz-list nzSize="small">
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
    </nz-list>
  `,
})
export class AdaptApprovalList {
  /** The list's name and the Chrome's row template. */
  readonly props = input.required<AgentApprovalListProps>();
}

/** The same NG-ZORRO approval controls for the table, assistant and modal. @public */
export const AGENT_APPROVAL_SLOTS: AgentApprovalSlots = {
  Approve: AdaptApprovalButton,
  Reject: AdaptApprovalButton,
  List: AdaptApprovalList,
  Action: AdaptApprovalAction,
};
