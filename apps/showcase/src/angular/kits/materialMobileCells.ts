/** material mobile demo cells use this kit's native presentation. */
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MatProgressBarModule } from "@angular/material/progress-bar";

import { PERSON_CELL_STYLES, ShowcaseMobileCellModel } from "../mobileCells";

@Component({
  selector: "adapt-demo-material-person",
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
  selector: "adapt-demo-material-load",
  imports: [MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The percentage is written beside the bar, so the bar is decoration.
  // Inert keeps Material's focusable progressbar out of an editable cell's
  // activator, where it would nest a widget in a button.
  template: `<div inert><mat-progress-bar [value]="load()" /></div>
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
