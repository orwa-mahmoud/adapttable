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
import {
  AdaptAutoFilterForm,
  ɵHlmButton as HlmButton,
  ɵHlmPopoverLabel as HlmPopoverLabel,
} from "@adapttable/spartan";
import {
  afterEveryRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
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
          [attr.dir]="direction()"
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
  private readonly directionValue = signal<"ltr" | "rtl">("ltr");
  protected readonly direction = this.directionValue.asReadonly();

  constructor() {
    // Native dir inheritance is DOM state, not a computed signal dependency.
    // Observe inherited DOM changes after an Angular render, not through a
    // global mutation observer. This read-phase render callback is
    // browser-only and is retired with the component's injection context.
    afterEveryRender({
      read: () => {
        const next =
          this.element.nativeElement.closest<HTMLElement>("[dir]")?.dir ===
          "rtl"
            ? "rtl"
            : "ltr";
        if (next !== this.directionValue()) this.directionValue.set(next);
      },
    });
  }
  /** The slot's props. */
  readonly props = input.required<FilterHeaderControlProps<never>>();

  protected readonly icon = { ...FILTERS_ICON, width: 14, height: 14 };
  protected readonly registry = defaultFilterRegistry;
  protected readonly caption = computed(() => filterLabel(this.props().def));
  protected readonly active = computed(() =>
    hasActiveHeaderFilter(this.props())
  );
  /** The overlay session for this column's funnel. */
  protected readonly overlay = injectHeaderFilterOverlay(
    {
      def: computed(() => this.props().def),
      source: computed(() => this.props().source),
      closeOnSelect: computed(() => this.props().closeOnSelect === true),
      registry: computed(() => this.props().registry ?? defaultFilterRegistry),
    },
    // Brain recognises its portaled checklist and owns outside dismissal.
    { pointerDismiss: false }
  );
  /** The source the form writes, still a table source at runtime. */
  protected readonly formSource = computed(
    () => this.overlay.source() as TableSource<never>
  );
}
