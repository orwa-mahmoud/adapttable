/** A column's NG-ZORRO filter popover, preserving the binding's session. */
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
  OVERLAY_Z,
  overlayContains,
  overlayEscapeHandled,
  registerOverlayOrigin,
} from "@adapttable/ng-zorro";
import { DOCUMENT } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzPopoverModule } from "ng-zorro-antd/popover";

/** The funnel and filter popover for one column. @internal */
@Component({
  selector: "adapt-header-filter-trigger",
  imports: [
    AdaptAutoFilterForm,
    AdaptIcon,
    NzButtonModule,
    NzCardModule,
    NzPopoverModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      data-adapttable-part="filter-header-trigger"
      [class]="p.className"
      [attr.data-adapttable-header-filter]="overlay.sessionId"
      style="display: inline-flex"
    >
      <button
        #trigger
        nz-button
        nz-popover
        nzSize="small"
        nzType="text"
        type="button"
        [nzPopoverTrigger]="null"
        [nzPopoverBackdrop]="false"
        [nzPopoverVisible]="overlay.open()"
        [nzPopoverContent]="content"
        [nzPopoverPlacement]="
          direction() === 'rtl' ? 'bottomRight' : 'bottomLeft'
        "
        [nzPopoverOverlayStyle]="overlayStyle"
        [attr.aria-label]="caption()"
        [attr.aria-expanded]="overlay.open()"
        aria-haspopup="dialog"
        [attr.data-active]="active() ? '' : null"
        (click)="toggle($event)"
      >
        <svg [adaptIcon]="icon"></svg>
      </button>
    </span>
    <ng-template #content>
      @if (overlay.open()) {
        <div
          #panel
          role="dialog"
          [attr.aria-label]="caption()"
          [dir]="direction()"
          [attr.data-adapttable-header-filter]="overlay.sessionId"
          data-adapttable-part="filter-header-cell"
          style="min-width: 20rem; max-width: calc(100vw - 32px)"
        >
          <adapt-auto-filter-form
            [defs]="[p.def]"
            [source]="formSource()"
            [labels]="p.labels"
            [registry]="p.registry ?? registry"
          />
        </div>
      }
    </ng-template>
  `,
})
export class AdaptHeaderFilterTrigger {
  /** The slot's props. */
  readonly props = input.required<FilterHeaderControlProps<never>>();

  protected readonly icon = { ...FILTERS_ICON, width: 14, height: 14 };
  protected readonly registry = defaultFilterRegistry;
  protected readonly overlayStyle = { zIndex: OVERLAY_Z };
  protected readonly direction = signal<"ltr" | "rtl">("ltr");
  protected readonly caption = computed(() => filterLabel(this.props().def));
  protected readonly active = computed(() =>
    hasActiveHeaderFilter(this.props())
  );
  protected readonly overlay = injectHeaderFilterOverlay(
    {
      def: computed(() => this.props().def),
      source: computed(() => this.props().source),
      closeOnSelect: computed(() => this.props().closeOnSelect === true),
      registry: computed(() => this.props().registry ?? defaultFilterRegistry),
    },
    { pointerDismiss: false }
  );
  protected readonly formSource = computed(
    () => this.overlay.source() as TableSource<never>
  );
  private readonly document = inject(DOCUMENT);
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  private readonly trigger = viewChild.required<
    ElementRef<HTMLButtonElement>,
    ElementRef<HTMLButtonElement>
  >("trigger", { read: ElementRef });
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");

  constructor() {
    effect((onCleanup) => {
      if (!this.overlay.open()) return;
      const anchor = this.anchor().nativeElement;
      const unregister = registerOverlayOrigin(
        anchor,
        () => this.panel()?.nativeElement
      );
      const outside = (event: Event): void => {
        if (overlayContains(anchor, event.target)) return;
        this.overlay.setOpen(false);
      };
      const escape = (event: KeyboardEvent): void => {
        if (event.key !== "Escape" || overlayEscapeHandled(event)) return;
        event.preventDefault();
        this.overlay.setOpen(false);
        this.trigger().nativeElement.focus();
      };
      this.document.addEventListener("pointerdown", outside);
      this.document.addEventListener("keydown", escape);
      onCleanup(() => {
        unregister();
        this.document.removeEventListener("pointerdown", outside);
        this.document.removeEventListener("keydown", escape);
      });
    });
  }

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    const inherited =
      this.anchor().nativeElement.closest<HTMLElement>("[dir]")?.dir;
    this.direction.set(inherited === "rtl" ? "rtl" : "ltr");
    this.overlay.setOpen(!this.overlay.open());
  }
}
