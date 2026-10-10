import type { AdaptTableFeature } from "@adapttable/angular";
import {
  AdaptAgentApprovalChrome,
  type AgentApprovalProps,
  createAdapterAgentApprovalFeature,
} from "@adapttable/angular/adapter";
import { ɵTAIGA_CONTROLS as TAIGA_CONTROLS } from "@adapttable/taiga-ui";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { AGENT_APPROVAL_SLOTS } from "./approvalControls";

/** The table approval strip, composed entirely from native kit controls. */

/** Native approval strip; only the table-owned presentation renders. @public */
@Component({
  selector: "adapt-agent-approval",
  imports: [...TAIGA_CONTROLS, AdaptAgentApprovalChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
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
