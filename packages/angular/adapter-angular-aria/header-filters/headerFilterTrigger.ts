/**
 * The funnel on a column's header: opens that column's filter field under
 * the header, and closes on an outside press or once a single-control write
 * finishes, when the table asks for that.
 */
import {
  AdaptIcon,
  defaultFilterRegistry,
  type FilterHeaderControlProps,
  filterLabel,
  FILTERS_ICON,
  hasActiveHeaderFilter,
  injectHeaderFilterOverlay,
  type TableSource,
} from "@adapttable/angular";
import { AdaptAutoFilterForm } from "@adapttable/angular-aria";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  host: { class: "adapt-aria" },
  selector: "adapt-header-filter-trigger",
  imports: [AdaptAutoFilterForm, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <details
      data-adapttable-part="filter-header-trigger"
      style="position: relative; display: inline-block"
      [attr.data-adapttable-header-filter]="overlay.sessionId"
      [open]="overlay.open()"
      (toggle)="overlay.setOpen($any($event.target).open)"
    >
      <summary
        style="list-style: none; cursor: pointer; display: inline-flex; align-items: center; padding: 2px"
        [attr.aria-label]="caption()"
        [attr.data-active]="active() ? '' : null"
      >
        <svg [adaptIcon]="icon"></svg>
      </summary>
      @if (overlay.open()) {
        <div
          data-adapttable-part="filter-header-cell"
          style="position: absolute; z-index: 3; inset-inline-start: 0; top: 100%; min-width: 20rem; padding: 0.5rem; background: Canvas; color: CanvasText; border: 1px solid currentColor"
        >
          <adapt-auto-filter-form
            [defs]="[p.def]"
            [source]="formSource()"
            [labels]="p.labels"
            [registry]="p.registry ?? registry"
          />
        </div>
      }
    </details>
  `,
})
export class AdaptHeaderFilterTrigger {
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
