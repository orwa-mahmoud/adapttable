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
  afterRenderEffect,
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
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzDividerModule } from "ng-zorro-antd/divider";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzPopoverModule } from "ng-zorro-antd/popover";

import { MENU_PANEL_STYLE, menuPopover } from "./menuPopover";
import { OVERLAY_Z } from "./overlayPlacement";

/**
 * The saved-views toolbar control.
 *
 * @internal
 */
@Component({
  selector: "adapt-saved-views-menu",
  imports: [
    NzButtonModule,
    NzCardModule,
    NzDividerModule,
    NzInputModule,
    NzPopoverModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let l = props().labels;
    <div #root style="position: relative">
      <button
        nz-button
        #trigger
        nz-popover
        [nzPopoverTrigger]="null"
        [nzPopoverVisible]="popover.open()"
        [nzPopoverBackdrop]="false"
        [nzPopoverContent]="content"
        [nzPopoverPlacement]="
          direction() === 'rtl'
            ? ['bottomLeft', 'bottomRight', 'topLeft', 'topRight']
            : ['bottomRight', 'bottomLeft', 'topRight', 'topLeft']
        "
        [nzPopoverOverlayStyle]="overlayStyle"
        type="button"
        aria-haspopup="true"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
        (click)="popover.toggle()"
      >
        <span>{{ l.savedViews }} </span>
      </button>
      <ng-template #content>
        @if (popover.open()) {
          <div #panel [dir]="direction()" [style]="panelStyle">
            @for (view of views()?.views() ?? []; track view.name) {
              <div [style]="rowStyle">
                <button nz-button type="button" (click)="apply(view.name)">
                  <span>{{ view.name }} </span>
                </button>
                <button
                  nz-button
                  type="button"
                  [attr.aria-label]="l.deleteView + ': ' + view.name"
                  (click)="views()?.remove(view.name)"
                >
                  <span>× </span>
                </button>
              </div>
            }
            <nz-divider />
            <div [style]="rowStyle">
              <input
                #nameInput
                nz-input
                [style]="inputStyle"
                [attr.aria-label]="l.viewName"
                [attr.placeholder]="l.viewName"
                [value]="name()"
                (input)="name.set($any($event.target).value)"
              />
              <button
                nz-button
                type="button"
                [disabled]="trimmed() === ''"
                (click)="save()"
              >
                <span>{{ l.saveView }} </span>
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

  protected readonly panelStyle = MENU_PANEL_STYLE;
  protected readonly overlayStyle = { zIndex: String(OVERLAY_Z) };
  protected readonly direction = signal<"ltr" | "rtl">("ltr");
  protected readonly rowStyle = {
    display: "flex",
    "align-items": "center",
    gap: "6px",
  };
  /** The input's intrinsic size would set the panel wider than a phone. */
  protected readonly inputStyle = {
    flex: "1 1 10rem",
    "inline-size": "10rem",
    "min-inline-size": "0",
  };
  protected readonly name = signal("");
  protected readonly trimmed = computed(() => this.name().trim());
  /** The views, once the props say where they are kept. */
  protected readonly views = signal<SavedViewsState | undefined>(undefined);

  private readonly injector = inject(Injector);
  private readonly nameInput =
    viewChild<ElementRef<HTMLInputElement>>("nameInput");
  private readonly root = viewChild<ElementRef<HTMLElement>>("root");
  private readonly trigger = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("trigger", {
    read: ElementRef,
  });
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");
  protected readonly popover = menuPopover(
    {
      root: () => this.root()?.nativeElement,
      trigger: () => this.trigger()?.nativeElement,
      panel: () => this.panel()?.nativeElement,
    },
    this.injector
  );

  constructor() {
    afterRenderEffect(() => {
      const root = this.root()?.nativeElement;
      this.direction.set(
        root?.closest<HTMLElement>("[dir]")?.dir === "rtl" ? "rtl" : "ltr"
      );
    });
  }

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
