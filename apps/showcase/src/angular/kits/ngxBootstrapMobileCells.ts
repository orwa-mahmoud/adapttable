/** ngxBootstrap mobile demo cells use this kit's native presentation. */
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ProgressbarModule } from "ngx-bootstrap/progressbar";

import { PERSON_CELL_STYLES, ShowcaseMobileCellModel } from "../mobileCells";

@Component({
  selector: "adapt-demo-ngxbootstrap-person",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="avatar" aria-hidden="true">{{ initials() }}</span
    ><span class="identity"
      ><strong>{{ name() }}</strong
      ><small>{{ role() }}</small></span
    >`,
  styles: PERSON_CELL_STYLES,
})
export class ShowcasePerson extends ShowcaseMobileCellModel {}

@Component({
  selector: "adapt-demo-ngxbootstrap-load",
  imports: [ProgressbarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="progress">
      <bar
        [value]="load()"
        [max]="100"
        [animate]="false"
        [attr.aria-label]="value()"
      />
    </div>
    <small>{{ caption() }}</small>`,
  styles: `
    :host {
      display: grid;
      gap: 0.375rem;
      min-width: 0;
    }
    progress {
      width: 100%;
    }
    small {
      font-size: 0.75rem;
    }
  `,
})
export class ShowcaseLoad extends ShowcaseMobileCellModel {}
