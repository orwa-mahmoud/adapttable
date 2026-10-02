/**
 * The chevron's footprint, on a row that has no chevron.
 *
 * A group footer and a "show more" row have nothing to collapse, so neither
 * renders a toggle — and without this they would start one control's width
 * to the left of the header they belong to, which on a nested group reads as
 * the wrong indent level.
 */
import { ChangeDetectionStrategy, Component } from "@angular/core";

/**
 * An inert element the size of a group's toggle button.
 *
 * @public
 */
@Component({
  selector: "adapt-group-toggle-spacer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<span
    aria-hidden="true"
    data-adapttable-part="group-toggle-spacer"
    style="display: inline-block; width: 1.5em; flex-shrink: 0"
  ></span>`,
})
export class AdaptGroupToggleSpacer {}
