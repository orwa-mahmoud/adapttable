/** angularCdk mobile demo cells use this kit's native presentation. */
import { ChangeDetectionStrategy, Component } from "@angular/core";

import { ShowcaseMobileCellModel } from "../mobileCells";

@Component({
  selector: "adapt-demo-angularcdk-person",
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="avatar" aria-hidden="true">{{ initials() }}</span
    ><span class="identity"
      ><strong>{{ name() }}</strong
      ><small>{{ role() }}</small></span
    >`,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    :host > :first-child {
      flex-shrink: 0;
    }
    .identity {
      min-width: 0;
      flex: 1 1 8rem;
      overflow-wrap: anywhere;
    }
    small {
      display: block;
      font-size: 0.75rem;
      font-weight: 400;
      margin-top: 0.125rem;
    }
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 40px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: color-mix(in srgb, currentColor 8%, transparent);
      font-size: 0.875rem;
    }
  `,
})
export class ShowcasePerson extends ShowcaseMobileCellModel {}

@Component({
  selector: "adapt-demo-angularcdk-load",
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
