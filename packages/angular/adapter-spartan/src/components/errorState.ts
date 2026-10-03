/**
 * Load failure, with a retry when the source can ask again.
 */
import type { TableLabels } from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { HlmButton } from "../helm/controls";

/**
 * The error a table shows in place of its rows.
 *
 * @public
 */
@Component({
  imports: [HlmButton],
  selector: "adapt-error-state",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="alert" data-adapttable-part="error">
      <strong>{{ labels().errorTitle }}</strong>
      <p>{{ labels().errorMessage }}</p>
      <small>{{ error().message }}</small>
      @if (retry(); as retry) {
        <button
          adaptHlmButton
          type="button"
          data-spartan-part="retry-button"
          (click)="retry()"
        >
          {{ labels().retry }}
        </button>
      }
    </div>
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
