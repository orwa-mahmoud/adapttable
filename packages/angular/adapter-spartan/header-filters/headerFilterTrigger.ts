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
  ɵHlmButton as HlmButton,
  ɵHlmPopoverLabel as HlmPopoverLabel,
} from "@adapttable/spartan";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from "@angular/core";
import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
} from "@spartan-ng/brain/popover";

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
    AdaptAutoFilterForm,
    AdaptIcon,
    HlmButton,
    BrnPopover,
    HlmPopoverLabel,
    BrnPopoverContent,
    BrnPopoverTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <div
      brnPopover
      [align]="direction() === 'rtl' ? 'end' : 'start'"
      [sideOffset]="4"
      [adaptHlmPopoverLabel]="caption()"
      data-adapttable-part="filter-header-trigger"
      style="position: relative; display: inline-block"
      [attr.data-adapttable-header-filter]="overlay.sessionId"
      [state]="overlay.open() ? 'open' : 'closed'"
      (stateChanged)="overlay.setOpen($event === 'open')"
    >
      <button
        adaptHlmButton
        brnPopoverTrigger
        style="list-style: none; cursor: pointer; display: inline-flex; align-items: center; padding: 2px"
        [attr.aria-label]="caption()"
        [attr.data-active]="active() ? '' : null"
      >
        <svg [adaptIcon]="icon"></svg>
      </button>
      <ng-template brnPopoverContent>
        <div
          class="at-spartan-surface at-spartan-popover"
          data-adapttable-kit="spartan"
          data-adapttable-part="filter-header-cell"
        >
          <adapt-auto-filter-form
            [defs]="[p.def]"
            [source]="formSource()"
            [labels]="p.labels"
            [registry]="p.registry ?? registry"
          />
        </div>
      </ng-template>
    </div>
  `,
})
export class AdaptHeaderFilterTrigger {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly direction = computed(() =>
    this.element.nativeElement.closest<HTMLElement>("[dir]")?.dir === "rtl"
      ? "rtl"
      : "ltr"
  );
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
