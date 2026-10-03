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
import {
  AdaptAutoFilterForm,
  ɵbootstrapPopperOptions as bootstrapPopperOptions,
} from "@adapttable/ng-bootstrap";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import {
  NgbDropdown,
  NgbDropdownMenu,
  NgbDropdownToggle,
} from "@ng-bootstrap/ng-bootstrap/dropdown";

/**
 * The binding controls the header-filter session; ng-bootstrap owns its overlay.
 * @internal
 */
@Component({
  selector: "adapt-header-filter-trigger",
  imports: [
    AdaptAutoFilterForm,
    AdaptIcon,
    NgbDropdown,
    NgbDropdownMenu,
    NgbDropdownToggle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <div
      ngbDropdown
      [popperOptions]="popperOptions"
      autoClose="outside"
      data-adapttable-part="filter-header-trigger"
      style="position: relative; display: inline-block"
      [attr.data-adapttable-header-filter]="overlay.sessionId"
      [open]="overlay.open()"
      (openChange)="overlay.setOpen($event)"
    >
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm"
        ngbDropdownToggle
        style="list-style: none; cursor: pointer; display: inline-flex; align-items: center; padding: 2px"
        [attr.aria-label]="caption()"
        [attr.data-active]="active() ? '' : null"
      >
        <svg [adaptIcon]="icon"></svg>
      </button>
      <div ngbDropdownMenu>
        @if (overlay.open()) {
          <div
            data-adapttable-part="filter-header-cell"
            style="inline-size: min(20rem, calc(100vw - 2rem)); padding: 0.5rem"
          >
            <adapt-auto-filter-form
              [defs]="[p.def]"
              [source]="formSource()"
              [labels]="p.labels"
              [registry]="p.registry ?? registry"
            />
          </div>
        }
      </div>
    </div>
  `,
})
export class AdaptHeaderFilterTrigger {
  protected readonly popperOptions = bootstrapPopperOptions;
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
