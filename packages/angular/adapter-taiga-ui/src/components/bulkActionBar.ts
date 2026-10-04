import {
  bulkActionErrorMessage,
  type BulkBarSlotProps,
  injectBulkBarRunner,
  offersAllMatching,
  resolveDisabledReason,
  type SelectionState,
} from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";

/**
 * The selection bar that acts on the selected rows, drawn with native
 * elements.
 */

/**
 * The selection bar: how many rows are selected, "select all matching"
 * across pages, clear, and one button per bulk action.
 *
 * @internal
 */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-bulk-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    @let s = p.selection;
    @if (s.selectedCount > 0) {
      <div data-adapttable-part="bulk-bar">
        <output>{{ p.labels.selectedCount(s.selectedCount) }}</output>
        @if (banner()) {
          <div data-adapttable-part="select-all-banner">
            <span data-adapttable-part="select-all-text">{{
              s.allMatching
                ? p.labels.allMatchingSelected(p.total)
                : p.labels.pageSelected(s.visibleIds.length)
            }}</span>
            <button
              tuiButton
              size="s"
              appearance="secondary"
              type="button"
              data-adapttable-part="select-all-button"
              (click)="s.allMatching ? s.clear() : s.selectAllMatching()"
            >
              {{
                s.allMatching
                  ? p.labels.clearAll
                  : p.labels.selectAllMatching(p.total)
              }}
            </button>
          </div>
        }
        <button
          tuiButton
          size="s"
          appearance="secondary"
          type="button"
          [disabled]="runner.pending() !== null"
          (click)="s.clear()"
        >
          {{ p.labels.clearAll }}
        </button>
        @for (action of actions(); track action.action.key) {
          <button
            tuiButton
            size="s"
            appearance="secondary"
            type="button"
            data-adapttable-part="bulk-button"
            [attr.title]="action.reason ?? null"
            [attr.data-color]="action.action.color ?? null"
            [disabled]="
              action.reason !== undefined || runner.pending() !== null
            "
            (click)="run(action.action)"
          >
            {{ action.action.label }}
          </button>
        }
        @if (errorMessage(); as message) {
          <span data-adapttable-part="bulk-error" role="alert">{{
            p.labels.errorTitle + ": " + message
          }}</span>
        }
      </div>
    }
  `,
})
export class AdaptBulkBar {
  /** The slot's props. */
  readonly props = input.required<BulkBarSlotProps<SelectionState>>();

  // The runner reads its options when an action runs, after the props
  // have arrived.
  protected readonly runner = injectBulkBarRunner(this.props);
  protected readonly ids = computed(() => [
    ...this.props().selection.selectedIds,
  ]);
  protected readonly banner = computed(() =>
    offersAllMatching(this.props().selection, this.props().total)
  );
  protected readonly errorMessage = computed(() =>
    bulkActionErrorMessage(this.runner.error())
  );
  protected readonly actions = computed(() =>
    this.props().bulkActions.map((action) => ({
      action,
      reason: resolveDisabledReason(action.disabledReason?.(this.ids())),
    }))
  );

  protected run(
    action: BulkBarSlotProps<SelectionState>["bulkActions"][number]
  ): void {
    const { selection, total } = this.props();
    this.runner.run(
      action,
      this.ids(),
      selection.allMatching ? { allMatching: true, total } : undefined
    );
  }
}
