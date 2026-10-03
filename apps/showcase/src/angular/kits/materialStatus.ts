/** Status cells rendered with this showcase kit's native badge. */
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MatChipsModule } from "@angular/material/chips";

import { ShowcaseStatusModel } from "../statusCell";

@Component({
  selector: "adapt-demo-material-status",
  imports: [MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<mat-chip class="demo-status" [attr.data-tone]="tone()">{{
    label()
  }}</mat-chip>`,
  host: { style: "display: inline-flex" },
})
export class ShowcaseStatus extends ShowcaseStatusModel {}
