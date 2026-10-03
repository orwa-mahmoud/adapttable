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
import { A11yModule } from "@angular/cdk/a11y";
import { OverlayModule } from "@angular/cdk/overlay";
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

import { MENU_PANEL_STYLE, menuPopover } from "./menuPopover";

/**
 * The saved-views toolbar control.
 *
 * @internal
 */
@Component({
  imports: [OverlayModule, A11yModule],
  selector: "adapt-saved-views-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let l = props().labels;
    <div #root data-adapttable-part="views-menu" style="position: relative">
      <button
        cdkMonitorElementFocus
        data-adapttable-cdk-control
        #trigger
        cdkOverlayOrigin
        #origin="cdkOverlayOrigin"
        type="button"
        aria-haspopup="true"
        data-adapttable-part="views-button"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
        (click)="popover.toggle()"
      >
        {{ l.savedViews }}
      </button>
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="popover.open()"
        [cdkConnectedOverlayHasBackdrop]="false"
        [cdkConnectedOverlayDisableClose]="true"
        [cdkConnectedOverlayViewportMargin]="8"
        [cdkConnectedOverlayPush]="true"
        cdkConnectedOverlayPanelClass="adapt-cdk-overlay"
      >
        <div
          #panel
          class="adapt-cdk-surface"
          data-adapttable-part="views-panel"
          [style]="panelStyle"
        >
          @for (view of views()?.views() ?? []; track view.name) {
            <div data-adapttable-part="views-row" [style]="rowStyle">
              <button
                cdkMonitorElementFocus
                data-adapttable-cdk-control
                type="button"
                data-adapttable-part="views-item"
                (click)="apply(view.name)"
              >
                {{ view.name }}
              </button>
              <button
                cdkMonitorElementFocus
                data-adapttable-cdk-control
                type="button"
                data-adapttable-part="views-delete"
                [attr.aria-label]="l.deleteView + ': ' + view.name"
                (click)="views()?.remove(view.name)"
              >
                ×
              </button>
            </div>
          }
          <hr data-adapttable-part="views-divider" />
          <div data-adapttable-part="views-save-row" [style]="rowStyle">
            <input
              cdkMonitorElementFocus
              data-adapttable-cdk-control
              data-adapttable-part="views-input"
              [attr.aria-label]="l.viewName"
              [attr.placeholder]="l.viewName"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
            />
            <button
              cdkMonitorElementFocus
              data-adapttable-cdk-control
              type="button"
              data-adapttable-part="views-save"
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
