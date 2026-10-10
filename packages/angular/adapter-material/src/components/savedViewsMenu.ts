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
  ElementRef,
  inject,
  Injector,
  input,
  type OnInit,
  signal,
  viewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

import { AdaptMaterialPopover } from "./materialPopover";
import { MENU_PANEL_STYLE, menuPopover } from "./menuPopover";

/**
 * The saved-views toolbar control.
 *
 * @internal
 */
@Component({
  imports: [
    AdaptMaterialPopover,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  selector: "adapt-saved-views-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let l = props().labels;
    <div #root class="adapt-material-views-menu" style="position: relative">
      <button
        mat-button
        #trigger
        type="button"
        aria-haspopup="true"
        class="adapt-material-views-button"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
        (click)="popover.toggle()"
      >
        {{ l.savedViews }}
      </button>
      @if (popover.open()) {
        <adapt-material-popover
          [origin]="triggerElement()!.nativeElement"
          (dismiss)="popover.close()"
        >
          <div #panel class="adapt-material-views-panel" [style]="panelStyle">
            @for (view of views()?.views() ?? []; track view.name) {
              <div class="adapt-material-views-row" [style]="rowStyle">
                <button
                  mat-button
                  type="button"
                  class="adapt-material-views-item"
                  (click)="apply(view.name)"
                >
                  {{ view.name }}
                </button>
                <button
                  mat-button
                  type="button"
                  class="adapt-material-views-delete"
                  [attr.aria-label]="l.deleteView + ': ' + view.name"
                  (click)="views()?.remove(view.name)"
                >
                  ×
                </button>
              </div>
            }
            <hr class="adapt-material-views-divider" />
            <div class="adapt-material-views-save-row" [style]="rowStyle">
              <mat-form-field appearance="outline" subscriptSizing="dynamic"
                ><input
                  matInput
                  class="adapt-material-views-input"
                  [attr.aria-label]="l.viewName"
                  [attr.placeholder]="l.viewName"
                  [value]="name()"
                  (input)="name.set($any($event.target).value)"
              /></mat-form-field>
              <button
                mat-button
                type="button"
                class="adapt-material-views-save"
                [disabled]="trimmed() === ''"
                (click)="save()"
              >
                {{ l.saveView }}
              </button>
            </div>
          </div>
        </adapt-material-popover>
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
  protected readonly triggerElement = viewChild<
    unknown,
    ElementRef<HTMLElement>
  >("trigger", { read: ElementRef });
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");
  protected readonly popover = menuPopover(
    {
      root: () => this.root()?.nativeElement,
      trigger: () => this.triggerElement()?.nativeElement,
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
