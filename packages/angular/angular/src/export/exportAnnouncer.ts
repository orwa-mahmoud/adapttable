/**
 * The live region that says an export finished — or did not.
 *
 * A download is silent. The file lands in the browser's downloads with no
 * focus change, so a screen-reader user who presses Export hears nothing
 * unless this region was already on the page.
 */
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { AdaptLiveRegion } from "../a11y/liveRegion";

/**
 * Says how the export ended. Always mounted beside the button, because a
 * region that appears together with its message is missed.
 *
 * @public
 */
@Component({
  selector: "adapt-export-announcer",
  imports: [AdaptLiveRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <output [adaptLiveRegion]="announcement()" part="export-announcer"></output>
  `,
})
export class AdaptExportAnnouncer {
  /** `exportAnnouncement` from {@link injectExportHandler}. Empty until an export ends. */
  readonly announcement = input("");
}
