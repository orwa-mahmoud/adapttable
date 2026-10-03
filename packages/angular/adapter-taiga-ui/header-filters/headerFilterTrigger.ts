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
  ɵTAIGA_CONTROLS as TAIGA_CONTROLS,
} from "@adapttable/taiga-ui";
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
 */

/**
 * The funnel on a column's header: opens that column's filter field under
 * the header, and closes on an outside press or once a single-control write
 * finishes, when the table asks for that.
 *
 * @internal
 */
@Component({
  selector: "adapt-header-filter-trigger",
  imports: [...TAIGA_CONTROLS, AdaptAutoFilterForm, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      data-adapttable-part="filter-header-trigger"
      style="position: relative; display: inline-block"
      [attr.data-adapttable-header-filter]="overlay.sessionId"
      ><button
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        [tuiDropdown]="menuContent"
        [tuiDropdownOpen]="overlay.open()"
        (tuiDropdownOpenChange)="overlay.setOpen($event)"
        [attr.aria-expanded]="overlay.open()"
        style="list-style: none; cursor: pointer; display: inline-flex; align-items: center; padding: 2px"
        [attr.aria-label]="caption()"
        [attr.data-active]="active() ? '' : null"
      >
        <svg [adaptIcon]="icon"></svg></button
      ><ng-template #menuContent>
        @if (overlay.open()) {
          <div
            data-adapttable-part="filter-header-cell"
            style="   min-width: 20rem; padding: 0.5rem; background: Canvas; color: CanvasText; border: 1px solid currentColor"
          >
            <adapt-auto-filter-form
              [defs]="[p.def]"
              [source]="formSource()"
              [labels]="p.labels"
              [registry]="p.registry ?? registry"
            />
          </div>
        }</ng-template
    ></span>
  `,
})
export class AdaptHeaderFilterTrigger {
  /** The slot's props. */
  readonly props = input.required<FilterHeaderControlProps<never>>();

  protected readonly icon = { ...FILTERS_ICON, width: 14, height: 14 };
  protected readonly registry = undefined as never;
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
