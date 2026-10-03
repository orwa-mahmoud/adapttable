/**
 * Native batch-edit bar — the kit fill for {@link BATCH_EDIT_BAR}.
 */
import {
  AdaptBatchEditBarChrome,
  type BatchEditBarProps,
  type BatchEditBarSlots,
  type BatchEditButtonProps,
} from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** The batch bar's native button slot. @internal */
@Component({
  selector: "adapt-batch-edit-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      class="btn btn-outline-secondary btn-sm"
      type="button"
      [attr.data-adapttable-part]="p.part"
      [class]="p.className"
      (click)="p.onClick()"
    >
      {{ p.label }}
    </button>
  `,
})
class AdaptBatchEditButton {
  readonly props = input.required<BatchEditButtonProps>();
}

/**
 * The bar that saves or discards a batch of edits.
 *
 * @public
 */
@Component({
  selector: "adapt-batch-edit-bar",
  imports: [AdaptBatchEditBarChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-batch-edit-bar-chrome
      [batch]="p.batch"
      [contested]="p.contested ?? false"
      [labels]="p.labels"
      [className]="p.className"
      [buttonClassName]="p.buttonClassName"
      [slots]="slots"
    />
  `,
})
export class AdaptBatchEditBar<TRow> {
  /** Slot props from the table's batch-edit-bar fill. */
  readonly props = input.required<BatchEditBarProps<TRow>>();
  protected readonly slots: BatchEditBarSlots = {
    Button: AdaptBatchEditButton,
  };
}
