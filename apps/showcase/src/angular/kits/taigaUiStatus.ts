/** Status cells rendered with this showcase kit's native badge. */
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TuiBadge } from "@taiga-ui/kit";

import { ShowcaseStatusModel } from "../statusCell";

@Component({
  selector: "adapt-demo-taigaui-status",
  imports: [TuiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    tuiBadge
    size="m"
    [appearance]="
      tone() === 'neutral'
        ? 'neutral'
        : tone() === 'info'
          ? 'info'
          : tone() === 'error'
            ? 'negative'
            : 'positive'
    "
    >{{ label() }}</span
  >`,
  host: { style: "display: inline-flex" },
})
export class ShowcaseStatus extends ShowcaseStatusModel {}
