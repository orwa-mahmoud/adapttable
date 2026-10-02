/**
 * The live region that says where keyboard focus went.
 *
 * A focused cell is announced as its contents alone. This adds the column
 * and the place in the dataset. It renders nothing when cell navigation is
 * off, and an empty region from the first paint when it is on.
 */
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type Signal,
} from "@angular/core";

import { AdaptLiveRegion } from "../a11y/liveRegion";

/**
 * The grid-focus fields the announcer reads.
 *
 * @public
 */
export interface GridFocusAnnouncement {
  /** Whether cell navigation is on. */
  readonly enabled: Signal<boolean>;
  /** What to say as focus moves. Empty until it does. */
  readonly announcement: Signal<string>;
}

/**
 * Speaks the focused cell, or nothing when cell navigation is off.
 *
 * @public
 */
@Component({
  selector: "adapt-grid-focus-announcer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptLiveRegion],
  template: `
    @if (focus().enabled()) {
      <output
        [adaptLiveRegion]="focus().announcement()"
        part="grid-announcer"
      ></output>
    }
  `,
})
export class AdaptGridFocusAnnouncer {
  /** The grid focus, straight from the table. */
  readonly focus = input.required<GridFocusAnnouncement>();
}
