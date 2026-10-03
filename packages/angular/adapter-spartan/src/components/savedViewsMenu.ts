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
  inject,
  Injector,
  input,
  type OnInit,
  signal,
} from "@angular/core";
import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
} from "@spartan-ng/brain/popover";

import { HlmButton, HlmInput } from "../helm/controls";
import { HlmPopoverLabel } from "../helm/popover";
import { MENU_PANEL_STYLE, menuPopover } from "./menuPopover";

/**
 * The saved-views toolbar control.
 *
 * @internal
 */
@Component({
  imports: [
    BrnPopover,
    HlmPopoverLabel,
    BrnPopoverContent,
    BrnPopoverTrigger,
    HlmButton,
    HlmInput,
  ],
  selector: "adapt-saved-views-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let l = props().labels;
    <div
      #root
      brnPopover
      [adaptHlmPopoverLabel]="l.savedViews"
      [state]="popover.open() ? 'open' : 'closed'"
      (stateChanged)="popover.setOpen($event === 'open')"
      data-spartan-part="views-menu"
      style="position: relative"
    >
      <button
        adaptHlmButton
        #trigger
        brnPopoverTrigger
        type="button"
        aria-haspopup="true"
        data-spartan-part="views-button"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
      >
        {{ l.savedViews }}
      </button>
      <ng-template brnPopoverContent>
        <div
          #panel
          class="at-spartan-surface at-spartan-popover"
          data-adapttable-kit="spartan"
          data-spartan-part="views-panel"
          [style]="panelStyle"
        >
          @for (view of views()?.views() ?? []; track view.name) {
            <div data-spartan-part="views-row" [style]="rowStyle">
              <button
                adaptHlmButton
                type="button"
                data-spartan-part="views-item"
                (click)="apply(view.name)"
              >
                {{ view.name }}
              </button>
              <button
                adaptHlmButton
                type="button"
                data-spartan-part="views-delete"
                [attr.aria-label]="l.deleteView + ': ' + view.name"
                (click)="views()?.remove(view.name)"
              >
                ×
              </button>
            </div>
          }
          <hr data-spartan-part="views-divider" />
          <div data-spartan-part="views-save-row" [style]="rowStyle">
            <input
              adaptHlmInput
              data-spartan-part="views-input"
              [attr.aria-label]="l.viewName"
              [attr.placeholder]="l.viewName"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
            />
            <button
              adaptHlmButton
              type="button"
              data-spartan-part="views-save"
              [disabled]="trimmed() === ''"
              (click)="save()"
            >
              {{ l.saveView }}
            </button>
          </div>
        </div>
      </ng-template>
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
  protected readonly popover = menuPopover();

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
