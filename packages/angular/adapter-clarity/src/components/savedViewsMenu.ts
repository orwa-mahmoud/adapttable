/**
 * The saved-views menu: a button and a panel listing the saved views —
 * click one to apply it, or delete it — above a row that saves the table's
 * current state under a name.
 */
import {
  injectSavedViews,
  type SavedViewsControllerOptions,
  type SavedViewsSlotProps,
  type SavedViewsState,
} from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  Injector,
  input,
  type OnInit,
  signal,
  viewChild,
} from "@angular/core";
import { ClrInputModule } from "@clr/angular";

import { MENU_PANEL_STYLE, menuPopover } from "./menuPopover";

/**
 * The saved-views toolbar control.
 *
 * @internal
 */
@Component({
  host: { class: "adapttable-clarity" },
  imports: [ClrInputModule],
  selector: "adapt-saved-views-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let l = props().labels;
    <div #root data-clarity-part="views-menu" style="position: relative">
      <button
        class="btn btn-sm btn-outline"
        #trigger
        type="button"
        aria-haspopup="true"
        data-clarity-part="views-button"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
        (click)="popover.toggle()"
      >
        {{ l.savedViews }}
      </button>
      @if (popover.open()) {
        <div
          #panel
          class="dropdown-menu"
          data-clarity-part="views-panel"
          [style]="panelStyle"
        >
          @for (view of views()?.views() ?? []; track view.name) {
            <div data-clarity-part="views-row" [style]="rowStyle">
              <button
                class="btn btn-sm btn-outline"
                type="button"
                data-clarity-part="views-item"
                (click)="apply(view.name)"
              >
                {{ view.name }}
              </button>
              <button
                class="btn btn-sm btn-outline"
                type="button"
                data-clarity-part="views-delete"
                [attr.aria-label]="l.deleteView + ': ' + view.name"
                (click)="views()?.remove(view.name)"
              >
                ×
              </button>
            </div>
          }
          <hr data-clarity-part="views-divider" />
          <div data-clarity-part="views-save-row" [style]="rowStyle">
            <input
              clrInput
              data-clarity-part="views-input"
              [attr.aria-label]="l.viewName"
              [attr.placeholder]="l.viewName"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
            />
            <button
              class="btn btn-sm btn-outline"
              type="button"
              data-clarity-part="views-save"
              [disabled]="trimmed() === ''"
              (click)="save()"
            >
              {{ l.saveView }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdaptSavedViewsMenu implements OnInit {
  /** The slot's props. */
  readonly props =
    input.required<SavedViewsSlotProps<SavedViewsControllerOptions>>();

  protected readonly panelStyle = MENU_PANEL_STYLE;
  protected readonly rowStyle = {
    display: "flex",
    "align-items": "center",
    gap: "6px",
  };
  protected readonly name = signal("");
  protected readonly trimmed = computed(() => this.name().trim());
  /** The views, once the props say where they are kept. */
  protected readonly views = signal<SavedViewsState | undefined>(undefined);

  private readonly injector = inject(Injector);
  private readonly root = viewChild<ElementRef<HTMLElement>>("root");
  private readonly trigger = viewChild<ElementRef<HTMLElement>>("trigger");
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");
  protected readonly popover = menuPopover(
    {
      root: () => this.root()?.nativeElement,
      trigger: () => this.trigger()?.nativeElement,
      panel: () => this.panel()?.nativeElement,
    },
    this.injector
  );

  /** Open the views where the props say they are kept. */
  ngOnInit(): void {
    this.views.set(
      injectSavedViews(
        computed(() => ({ ...this.props().options, injector: this.injector }))
      )
    );
  }

  protected apply(name: string): void {
    this.views()?.apply(name);
    this.popover.close();
  }

  protected save(): void {
    this.views()?.save(this.trimmed());
    this.name.set("");
  }
}
