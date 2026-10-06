/**
 * The row-expansion chevron, shared by desktop rows and phone cards.
 */
import {
  AdaptIcon,
  expandChevronIcon,
  type ExpandToggleSlotProps,
} from "@adapttable/angular/adapter";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

/**
 * A native button that opens or closes a row's detail — the
 * `EXPAND_TOGGLE` slot's component. `data-expanded` is the styling hook, and
 * the chevron turns with the writing direction.
 *
 * @public
 */
@Component({
  selector: "adapt-expand-toggle",
  imports: [AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    @let p = props();
    <button
      type="button"
      data-adapttable-part="expand-button"
      [attr.data-expanded]="p.expanded ? '' : null"
      [attr.aria-expanded]="p.expanded"
      [attr.aria-label]="p.expanded ? p.collapseLabel : p.expandLabel"
      (click)="p.onToggle(p.id)"
    >
      <svg [adaptIcon]="chevron()"></svg>
    </button>
  `,
})
export class AdaptExpandToggle {
  /** The row it opens, and its state and labels. */
  readonly props = input.required<ExpandToggleSlotProps>();

  /** The chevron, turned for the state and the writing direction. @internal */
  protected readonly chevron = computed(() => {
    const { expanded, dir } = this.props();
    return expandChevronIcon({ open: expanded, dir });
  });
}
