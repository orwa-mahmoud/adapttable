/**
 * The selection bar that acts on the selected rows, drawn with NG-ZORRO
 * controls.
 */
import {
  bulkActionErrorMessage,
  type BulkBarSlotProps,
  type ConfirmHandler,
  injectBulkActionRunner,
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
import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzFlexModule } from "ng-zorro-antd/flex";
import { NzTypographyModule } from "ng-zorro-antd/typography";

/**
 * The selection bar: how many rows are selected, "select all matching"
 * across pages, clear, and one button per bulk action.
 *
 * @internal
 */
@Component({
  selector: "adapt-bulk-bar",
  imports: [NzAlertModule, NzButtonModule, NzFlexModule, NzTypographyModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./bulkActionBar.html",
})
export class AdaptBulkBar {
  /** The slot's props. */
  readonly props = input.required<BulkBarSlotProps<SelectionState>>();

  // The runner reads its options when an action runs, after the props
  // have arrived.
  protected readonly runner = injectBulkActionRunner(
    ((bar: AdaptBulkBar) => ({
      confirm: (request: Parameters<ConfirmHandler>[0]) => {
        bar.props().confirm(request);
      },
      get cancelLabel(): string {
        return bar.props().labels.cancel;
      },
      onComplete: (outcome: { status: string }) => {
        if (outcome.status === "success") bar.props().selection.clear();
      },
    }))(this)
  );
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
