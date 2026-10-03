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
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  viewChild,
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
        #trigger
        style="list-style: none; cursor: pointer; display: inline-flex; align-items: center; padding: 2px"
        [attr.aria-label]="caption()"
        [attr.data-active]="active() ? '' : null"
      >
        <svg [adaptIcon]="icon"></svg>
      </summary>
      @if (overlay.open()) {
        <div
          #panel
          data-adapttable-part="filter-header-cell"
          style="position: fixed; z-index: 10050; width: 20rem; max-width: calc(100vw - 16px); box-sizing: border-box; overflow-y: auto; padding: 0.5rem; background: Canvas; color: CanvasText; border: 1px solid currentColor"
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
  private readonly trigger = viewChild<ElementRef<HTMLElement>>("trigger");
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");

  constructor() {
    afterRenderEffect((onCleanup) => {
      if (!this.overlay.open()) return;
      const trigger = this.trigger()?.nativeElement;
      const panel = this.panel()?.nativeElement;
      if (!trigger || !panel) return;
      const place = (): void => {
        const origin = trigger.getBoundingClientRect();
        const width = panel.offsetWidth;
        const rtl = getComputedStyle(trigger).direction === "rtl";
        const left = rtl ? origin.right - width : origin.left;
        panel.style.left = `${String(Math.max(8, Math.min(left, document.documentElement.clientWidth - width - 8)))}px`;
        panel.style.top = `${String(origin.bottom + 4)}px`;
        panel.style.maxHeight = `${String(Math.max(80, window.innerHeight - origin.bottom - 12))}px`;
      };
      place();
      window.addEventListener("resize", place);
      window.addEventListener("scroll", place, true);
      onCleanup(() => {
        window.removeEventListener("resize", place);
        window.removeEventListener("scroll", place, true);
      });
    });
  }
  /** The source the form writes, still a table source at runtime. */
  protected readonly formSource = computed(
    () => this.overlay.source() as TableSource<never>
  );
}
