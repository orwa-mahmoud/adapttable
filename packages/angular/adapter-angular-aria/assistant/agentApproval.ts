/** The table approval strip, composed entirely from native kit controls. */
import {
  AdaptAgentApprovalChrome,
  type AdaptTableFeature,
  type AgentApprovalProps,
  createAdapterAgentApprovalFeature,
} from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { AGENT_APPROVAL_SLOTS } from "./approvalControls";

/** Native approval strip; only the table-owned presentation renders. @public */
@Component({
  selector: "adapt-agent-approval",
  imports: [AdaptAgentApprovalChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    <adapt-agent-approval-chrome
      [pending]="props().pending"
      [labels]="props().labels"
      [className]="props().className"
      [buttonClassName]="props().buttonClassName"
      [slots]="slots"
    />
  `,
})
export class AdaptAgentApproval {
  /** The live approval and the table's labels and classes. */
  readonly props = input.required<AgentApprovalProps>();
  /** Native kit components, also used by the assistant's review. */
  protected readonly slots = AGENT_APPROVAL_SLOTS;
}

/**
 * Add the native approval strip to a table's agent-approval slot.
 *
 * @returns The opt-in approval feature.
 *
 * @public
 */
export function agentApproval(): AdaptTableFeature {
  return createAdapterAgentApprovalFeature(AdaptAgentApproval);
}
