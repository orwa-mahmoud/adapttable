/** Status cells rendered with this showcase kit's native badge. */
import { ChangeDetectionStrategy, Component } from "@angular/core";

import { ShowcaseStatusModel } from "../statusCell";

@Component({
  selector: "adapt-demo-ngxbootstrap-status",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="badge"
    [class]="
      'badge text-bg-' +
      (tone() === 'neutral'
        ? 'secondary'
        : tone() === 'error'
          ? 'danger'
          : tone() === 'info'
            ? 'primary'
            : tone())
    "
    >{{ label() }}</span
  >`,
  host: { style: "display: inline-flex" },
})
export class ShowcaseStatus extends ShowcaseStatusModel {}
