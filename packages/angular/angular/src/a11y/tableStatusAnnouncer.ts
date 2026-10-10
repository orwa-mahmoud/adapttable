import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { AdaptLiveRegion } from "./liveRegion";

/**
 * Announce a change to the table's rows politely.
 *
 * @public
 */
@Component({
  selector: "adapt-table-status-announcer",
  imports: [AdaptLiveRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      data-adapttable-part="table-status-announcer"
      [adaptLiveRegion]="announcement()"
      part="table-status-announcer"
    ></div>
  `,
})
export class AdaptTableStatusAnnouncer {
  /** What to announce, from {@link trackTableStatus}. Empty until something changes. */
  readonly announcement = input.required<string>();
}
