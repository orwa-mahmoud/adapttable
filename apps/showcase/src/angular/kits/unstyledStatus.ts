/** Status cells rendered with this showcase kit's native badge. */
import { ChangeDetectionStrategy, Component } from "@angular/core";

import { ShowcaseStatusModel } from "../statusCell";

@Component({
  selector: "adapt-demo-unstyled-status",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="demo-status" [attr.data-tone]="tone()">{{
    label()
  }}</span>`,
  host: { style: "display: inline-flex" },
})
export class ShowcaseStatus extends ShowcaseStatusModel {}
