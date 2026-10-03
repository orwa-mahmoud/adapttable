/**
 * The flex row a side panel sits in, beside the table's body.
 *
 * The row itself is {@link AdaptSidePanelLayout}. This keeps the selector
 * the table already uses.
 */
import { AdaptSidePanelLayout } from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";

/**
 * Place a panel beside the table body.
 *
 * @public
 */
@Component({
  host: { class: "adapttable-clarity" },
  selector: "adapt-table-region",
  imports: [AdaptSidePanelLayout],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <adapt-side-panel-layout [panel]="panel()" [side]="side()">
      <ng-content />
    </adapt-side-panel-layout>
  `,
})
export class AdaptTableRegion {
  /** The panel beside the body. Absent, the body stands alone. */
  readonly panel = input<TemplateRef<unknown>>();
  /** Which edge the panel sits on. */
  readonly side = input<"start" | "end">("end");
}
