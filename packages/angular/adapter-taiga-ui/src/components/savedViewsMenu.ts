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

import { TAIGA_CONTROLS } from "../taigaControls";
import { MENU_PANEL_STYLE, menuPopover } from "./menuPopover";

/**
 * The saved-views menu: a button and a panel listing the saved views —
 * click one to apply it, or delete it — above a row that saves the table's
 * current state under a name.
 */

/**
 * The saved-views toolbar control.
 *
 * @internal
 */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-saved-views-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let l = props().labels;
    <div
      [tuiDropdown]="menuContent"
      [tuiDropdownOffset]="8"
      tuiDropdownRole="dialog"
      [adaptTaigaDropdownLabel]="l.savedViews"
      [tuiDropdownOpen]="popover.open()"
      (tuiDropdownOpenChange)="popover.setOpen($event)"
      #root
      data-taiga-part="views-menu"
      style="position: relative"
    >
      <button
        tuiButton
        size="s"
        appearance="secondary"
        #trigger
        #tuiDropdownHost
        type="button"
        aria-haspopup="true"
        data-taiga-part="views-button"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
      >
        {{ l.savedViews }}
      </button>
      <ng-template #menuContent>
        @if (popover.open()) {
          <div #panel data-taiga-part="views-panel" [style]="panelStyle">
            @for (view of views()?.views() ?? []; track view.name) {
              <div data-taiga-part="views-row" [style]="rowStyle">
                <button
                  tuiButton
                  size="s"
                  appearance="secondary"
                  type="button"
                  data-taiga-part="views-item"
                  (click)="apply(view.name)"
                >
                  {{ view.name }}
                </button>
                <button
                  tuiButton
                  size="s"
                  appearance="secondary"
                  type="button"
                  data-taiga-part="views-delete"
                  [attr.aria-label]="l.deleteView + ': ' + view.name"
                  (click)="views()?.remove(view.name)"
                >
                  ×
                </button>
              </div>
            }
            <hr data-taiga-part="views-divider" />
            <div data-taiga-part="views-save-row" [style]="rowStyle">
              <tui-textfield style="flex: 1 1 0; min-inline-size: 0"
                ><input
                  #nameInput
                  tuiInput
                  data-taiga-part="views-input"
                  [attr.aria-label]="l.viewName"
                  [attr.placeholder]="l.viewName"
                  [value]="name()"
                  (input)="name.set($any($event.target).value)"
              /></tui-textfield>
              <button
                tuiButton
                size="s"
                appearance="secondary"
                type="button"
                data-taiga-part="views-save"
                [disabled]="trimmed() === ''"
                (click)="save()"
              >
                {{ l.saveView }}
              </button>
            </div>
          </div>
        }
      </ng-template>
    </div>
  `,
})
export class AdaptSavedViewsMenu implements OnInit {
  /** The slot's props. */
  readonly props =
    input.required<SavedViewsSlotProps<SavedViewsControllerOptions>>();

  protected readonly panelStyle = {
    ...MENU_PANEL_STYLE,
    "inline-size": "min(380px, calc(100vw - 32px))",
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
    this.nameInput()?.nativeElement.focus();
  }
}
