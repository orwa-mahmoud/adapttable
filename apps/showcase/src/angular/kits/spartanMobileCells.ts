/** spartan mobile demo cells use this kit's native presentation. */
import { ChangeDetectionStrategy, Component } from "@angular/core";

import { PERSON_CELL_STYLES, ShowcaseMobileCellModel } from "../mobileCells";

@Component({
  selector: "adapt-demo-spartan-person",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
      class="avatar rounded-full bg-muted text-foreground"
      aria-hidden="true"
      >{{ initials() }}</span
    ><span class="identity"
      ><strong>{{ name() }}</strong
      ><small>{{ role() }}</small></span
    >`,
  styles: PERSON_CELL_STYLES,
})
export class ShowcasePerson extends ShowcaseMobileCellModel {}

@Component({
  selector: "adapt-demo-spartan-load",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<progress
      [value]="load()"
      max="100"
      [attr.aria-label]="value()"
    ></progress
    ><small>{{ caption() }}</small>`,
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
