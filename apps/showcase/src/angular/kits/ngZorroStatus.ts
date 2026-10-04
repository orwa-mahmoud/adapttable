/** Status cells rendered with this showcase kit's native badge. */
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { NzTagModule } from "ng-zorro-antd/tag";

import { ShowcaseStatusModel } from "../statusCell";

@Component({
  selector: "adapt-demo-ngzorro-status",
  imports: [NzTagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nz-tag
    [nzColor]="
      tone() === 'neutral' ? 'default' : tone() === 'info' ? 'blue' : tone()
    "
    >{{ label() }}</nz-tag
  >`,
  host: { style: "display: inline-flex" },
})
export class ShowcaseStatus extends ShowcaseStatusModel {}
