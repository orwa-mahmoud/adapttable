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
  AdaptMaterialPopover,
} from "@adapttable/angular-material";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";

/**
 * The funnel on a column's header: opens that column's filter field under
 * the header, and closes on an outside press or once a single-control write
 * finishes, when the table asks for that.
 *
 * @internal
 */
@Component({
  selector: "adapt-header-filter-trigger",
  imports: [
    MatButtonModule,
    AdaptMaterialPopover,
    AdaptAutoFilterForm,
    AdaptIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      data-adapttable-part="filter-header-trigger"
      style="position: relative; display: inline-block"
      [attr.data-adapttable-header-filter]="overlay.sessionId"
    >
      <button
        mat-icon-button
        type="button"
        #trigger
        [attr.aria-expanded]="overlay.open()"
        (click)="overlay.setOpen(!overlay.open())"
        style="list-style: none; cursor: pointer; display: inline-flex; align-items: center; padding: 2px"
        [attr.aria-label]="caption()"
        [attr.data-active]="active() ? '' : null"
      >
        <svg [adaptIcon]="icon"></svg>
      </button>
      @if (overlay.open()) {
        <adapt-material-popover
          [origin]="triggerElement()!.nativeElement"
          (dismiss)="overlay.setOpen(false)"
        >
          <div
            data-adapttable-part="filter-header-cell"
            [attr.data-adapttable-header-filter]="overlay.sessionId"
            style="min-width: min(20rem, calc(100vw - 48px))"
          >
            <adapt-auto-filter-form
              [defs]="[p.def]"
              [source]="formSource()"
              [labels]="p.labels"
              [registry]="p.registry ?? registry"
            />
          </div>
        </adapt-material-popover>
      }
    </span>
  `,
})
export class AdaptHeaderFilterTrigger {
  /** The slot's props. */
  readonly props = input.required<FilterHeaderControlProps<never>>();

  protected readonly triggerElement = viewChild<
    unknown,
    ElementRef<HTMLElement>
  >("trigger", { read: ElementRef });

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
