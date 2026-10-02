/**
 * Load failure, with a retry when the source can ask again.
 */
import type { TableLabels } from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzTypographyModule } from "ng-zorro-antd/typography";

/**
 * The error a table shows in place of its rows.
 *
 * @public
 */
@Component({
  selector: "adapt-error-state",
  imports: [NzAlertModule, NzButtonModule, NzTypographyModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nz-alert
      role="alert"
      data-adapttable-part="error"
      nzType="error"
      [nzShowIcon]="true"
      [nzMessage]="labels().errorTitle"
      [nzDescription]="description"
      [nzAction]="action"
    />
    <ng-template #description>
      <p nz-typography>{{ labels().errorMessage }}</p>
      <span nz-typography>{{ error().message }}</span>
    </ng-template>
    <ng-template #action>
      @if (retry(); as retry) {
        <button
          nz-button
          nzSize="small"
          nzDanger
          type="button"
          (click)="retry()"
        >
          <span>{{ labels().retry }} </span>
        </button>
      }
    </ng-template>
  `,
})
export class AdaptErrorState {
  /** The failure to surface. */
  readonly error = input.required<Error>();
  /** Labels for the heading, the message and the retry. */
  readonly labels = input.required<Required<TableLabels>>();
  /**
   * Ask the source to try again, or absent when it cannot — a static row
   * list has nothing to re-fetch.
   */
  readonly retry = input<(() => void) | undefined>();
}
