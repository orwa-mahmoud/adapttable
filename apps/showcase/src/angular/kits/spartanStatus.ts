/** Status cells rendered with this showcase kit's native badge. */
import { ChangeDetectionStrategy, Component } from "@angular/core";

import { ShowcaseStatusModel } from "../statusCell";

@Component({
  selector: "adapt-demo-spartan-status",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="demo-status rounded-md border px-2 py-0.5 text-xs font-medium"
    [attr.data-tone]="tone()"
    >{{ label() }}</span
  >`,
  host: { style: "display: inline-flex" },
})
export class ShowcaseStatus extends ShowcaseStatusModel {}
