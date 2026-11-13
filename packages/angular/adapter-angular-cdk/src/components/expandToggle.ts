/**
 * The row-expansion chevron, shared by desktop rows and phone cards.
 */
import {
  AdaptIcon,
  expandChevronIcon,
  type ExpandToggleSlotProps,
  type IconDescriptor,
} from "@adapttable/angular/adapter";
import { A11yModule } from "@angular/cdk/a11y";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Signal,
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
  imports: [A11yModule, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  styles: `
    :host-context([data-adapttable-part="card"]) button {
      min-width: 44px;
      min-height: 44px;
      flex-shrink: 0;
    }
  `,
  template: `
    @let p = props();
    <button
      cdkMonitorElementFocus
      data-adapttable-cdk-control
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
  protected readonly chevron: Signal<IconDescriptor> = computed(() => {
    const { expanded, dir } = this.props();
    return expandChevronIcon({ open: expanded, dir });
  });
}
