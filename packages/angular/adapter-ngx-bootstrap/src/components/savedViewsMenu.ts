/**
 * The saved-views menu: a button and a panel listing the saved views —
 * click one to apply it, or delete it — above a row that saves the table's
 * current state under a name.
 */
import {
  injectSavedViews,
  type SavedViewsControllerOptions,
  type SavedViewsState,
} from "@adapttable/angular";
import type { SavedViewsSlotProps } from "@adapttable/angular/adapter";
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
import {
  BsDropdownDirective,
  BsDropdownMenuDirective,
  BsDropdownToggleDirective,
} from "ngx-bootstrap/dropdown";

import { injectBootstrapOverlayContainer } from "./bootstrapOverlay";

/**
 * The saved-views toolbar control.
 *
 * @internal
 */
@Component({
  selector: "adapt-saved-views-menu",
  imports: [
    BsDropdownDirective,
    BsDropdownMenuDirective,
    BsDropdownToggleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let l = props().labels;
    <div
      #root
      #menu="bs-dropdown"
      dropdown
      [isAnimated]="false"
      [container]="overlayContainer()"
      [autoClose]="true"
      [insideClick]="true"
      (isOpenChange)="menuOpen.set($event)"
      data-ngx-bootstrap-part="views-menu"
      style="position: relative"
    >
      <button
        class="btn btn-outline-secondary btn-sm"
        #trigger
        dropdownToggle
        type="button"
        aria-haspopup="true"
        data-ngx-bootstrap-part="views-button"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
      >
        {{ l.savedViews }}
      </button>
      <div
        class="dropdown-menu"
        *dropdownMenu
        (keydown.escape)="
          $event.preventDefault();
          $event.stopPropagation();
          menu.hide();
          trigger.focus()
        "
      >
        @if (popover.open()) {
          <div
            #panel
            data-ngx-bootstrap-part="views-panel"
            [style]="panelStyle"
          >
            @for (view of views()?.views() ?? []; track view.name) {
              <div data-ngx-bootstrap-part="views-row" [style]="rowStyle">
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  data-ngx-bootstrap-part="views-item"
                  (click)="apply(view.name)"
                >
                  {{ view.name }}
                </button>
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  data-ngx-bootstrap-part="views-delete"
                  [attr.aria-label]="l.deleteView + ': ' + view.name"
                  (click)="views()?.remove(view.name)"
                >
                  ×
                </button>
              </div>
            }
            <hr data-ngx-bootstrap-part="views-divider" />
            <div data-ngx-bootstrap-part="views-save-row" [style]="rowStyle">
              <input
                #nameInput
                class="form-control form-control-sm"
                data-ngx-bootstrap-part="views-input"
                [attr.aria-label]="l.viewName"
                [attr.placeholder]="l.viewName"
                [value]="name()"
                (input)="name.set($any($event.target).value)"
              />
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                data-ngx-bootstrap-part="views-save"
                [disabled]="trimmed() === ''"
                (click)="save()"
              >
                {{ l.saveView }}
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AdaptSavedViewsMenu implements OnInit {
  protected readonly overlayContainer = injectBootstrapOverlayContainer();
  /** The slot's props. */
  readonly props =
    input.required<SavedViewsSlotProps<SavedViewsControllerOptions>>();

  protected readonly panelStyle = {
    "max-height": "min(70vh, 32rem)",
    "overflow-y": "auto",
    border: "0",
    padding: "0.75rem",
  };
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
  private readonly nameInput =
    viewChild<ElementRef<HTMLInputElement>>("nameInput");
  protected readonly menuOpen = signal(false);
  private readonly dropdown = viewChild(BsDropdownDirective);
  protected readonly popover = {
    open: this.menuOpen.asReadonly(),
    toggle: (): void => this.dropdown()?.toggle(),
    close: (): void => this.dropdown()?.hide(),
  };

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
    this.nameInput()?.nativeElement.focus();
  }
}
