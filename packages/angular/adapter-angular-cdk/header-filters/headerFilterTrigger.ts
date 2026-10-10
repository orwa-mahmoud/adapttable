/**
 * The funnel on a column's header: opens that column's filter field under
 * the header, and closes on an outside press or once a single-control write
 * finishes, when the table asks for that.
 */
import {
  injectHeaderFilterOverlay,
  type TableSource,
} from "@adapttable/angular";
import {
  AdaptIcon,
  defaultFilterRegistry,
  type FilterHeaderControlProps,
  filterLabel,
  FILTERS_ICON,
  hasActiveHeaderFilter,
} from "@adapttable/angular/adapter";
import { AdaptAutoFilterForm, AdaptCdkPopover } from "@adapttable/angular-cdk";
import { A11yModule } from "@angular/cdk/a11y";
import { Directionality } from "@angular/cdk/bidi";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from "@angular/core";

/**
 * The funnel on a column's header: opens that column's filter field under
 * the header, and closes on an outside press or once a single-control write
 * finishes, when the table asks for that.
 *
 * @internal
 */
@Component({
  selector: "adapt-header-filter-trigger",
  imports: [AdaptCdkPopover, A11yModule, AdaptAutoFilterForm, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      data-adapttable-part="filter-header-trigger"
      [attr.data-adapttable-header-filter]="overlay.sessionId"
    >
      <adapt-cdk-popover
        [dir]="inheritedDirection.valueSignal()"
        [trigger]="trigger"
        [content]="content"
        [open]="overlay.open()"
        (openChange)="overlay.setOpen($event)"
      />
      <ng-template #trigger let-toggle let-open="open">
        <button
          cdkMonitorElementFocus
          data-adapttable-cdk-control
          type="button"
          [attr.aria-expanded]="open"
          (click)="toggle()"
          style="list-style: none; cursor: pointer; display: inline-flex; align-items: center; padding: 2px"
          [attr.aria-label]="caption()"
          [attr.data-active]="active() ? '' : null"
        >
          <svg [adaptIcon]="icon"></svg>
        </button>
      </ng-template>
      <ng-template #content>
        <div
          data-adapttable-part="filter-header-cell"
          [attr.data-adapttable-header-filter]="overlay.sessionId"
          style="min-inline-size: min(20rem, calc(100vw - 48px))"
        >
          <adapt-auto-filter-form
            [defs]="[p.def]"
            [source]="formSource()"
            [labels]="p.labels"
            [registry]="p.registry ?? registry"
          />
        </div>
      </ng-template>
    </span>
  `,
})
export class AdaptHeaderFilterTrigger {
  protected readonly inheritedDirection = inject(Directionality);
  /** The slot's props. */
  readonly props = input.required<FilterHeaderControlProps<never>>();

  protected readonly icon = { ...FILTERS_ICON, width: 14, height: 14 };
  protected readonly registry = defaultFilterRegistry;
  protected readonly caption = computed(() => filterLabel(this.props().def));
  protected readonly active = computed(() =>
    hasActiveHeaderFilter(this.props())
  );
  /** The overlay session for this column's funnel. */
  protected readonly overlay = injectHeaderFilterOverlay({
    def: computed(() => this.props().def),
    source: computed(() => this.props().source),
    closeOnSelect: computed(() => this.props().closeOnSelect === true),
    registry: computed(() => this.props().registry ?? defaultFilterRegistry),
  });
  /** The source the form writes, still a table source at runtime. */
  protected readonly formSource = computed(
    () => this.overlay.source() as TableSource<never>
  );
}
