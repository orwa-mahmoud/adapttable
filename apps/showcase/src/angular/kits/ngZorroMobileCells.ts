/** ngZorro mobile demo cells use this kit's native presentation. */
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { NzAvatarModule } from "ng-zorro-antd/avatar";
import { NzProgressModule } from "ng-zorro-antd/progress";

import { ShowcaseMobileCellModel } from "../mobileCells";

@Component({
  selector: "adapt-demo-ngzorro-person",
  imports: [NzAvatarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nz-avatar
      [nzText]="initials()"
      style="color: inherit; background: color-mix(in srgb, currentColor 8%, transparent)"
      [nzSize]="40"
      aria-hidden="true"
    /><span class="identity"
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
  selector: "adapt-demo-ngzorro-load",
  imports: [NzProgressModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nz-progress
      [nzPercent]="load()"
      [nzShowInfo]="false"
      [attr.aria-label]="value()"
    /><small>{{ caption() }}</small>`,
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
