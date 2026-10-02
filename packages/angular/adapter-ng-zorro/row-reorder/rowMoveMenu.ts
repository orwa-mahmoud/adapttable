/**
 * NG-ZORRO destination popover for row reorder and its pending move review.
 * The binding owns destination policy; dismissal cancels only its pending move.
 */
import {
  restoreFocusSoon,
  type RowMoveMenuSlotProps,
} from "@adapttable/angular";
import { DOCUMENT } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
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
import { NzTypographyModule } from "ng-zorro-antd/typography";

/** Nested-row destination menu and confirmation, drawn with NG-ZORRO. @public */
@Component({
  selector: "adapt-row-move-menu",
  imports: [NzButtonModule, NzCardModule, NzPopoverModule, NzTypographyModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <span #root data-adapttable-part="row-move-menu">
      <button
        #trigger
        nz-button
        nzType="text"
        nzSize="small"
        nz-popover
        type="button"
        [nzPopoverTrigger]="null"
        [nzPopoverVisible]="open()"
        [nzPopoverBackdrop]="false"
        [nzPopoverContent]="content"
        [nzPopoverPlacement]="
          direction() === 'rtl' ? 'bottomRight' : 'bottomLeft'
        "
        [nzPopoverOverlayStyle]="{ 'z-index': '10050' }"
        [attr.aria-label]="p.label"
        [attr.aria-expanded]="open()"
        aria-haspopup="menu"
        data-adapttable-part="row-move-menu-trigger"
        style="min-width: 2.75rem; min-height: 2.75rem"
        (click)="$event.stopPropagation(); toggle()"
        (nzPopoverVisibleChange)="visibleChanged($event)"
      >
        <span>⋮ </span>
      </button>
    </span>
    <ng-template #content>
      <div
        #panel
        [dir]="direction()"
        [attr.role]="p.confirmation ? null : 'menu'"
        [attr.aria-label]="p.confirmation ? null : p.label"
        data-adapttable-part="row-move-menu-content"
        style="display: flex; flex-direction: column; gap: 4px; min-width: 12rem"
        (click)="$event.stopPropagation()"
      >
        @if (p.confirmation; as confirmation) {
          <div
            role="alertdialog"
            [attr.aria-label]="confirmation.title"
            data-adapttable-part="row-move-confirmation"
            style="display: flex; flex-direction: column; gap: 8px"
          >
            <strong nz-typography>{{ confirmation.title }}</strong>
            <span nz-typography>{{ confirmation.description }}</span>
            <div style="display: flex; justify-content: flex-end; gap: 8px">
              <button
                nz-button
                nzSize="small"
                type="button"
                (click)="finish(confirmation.onCancel)"
              >
                <span>{{ confirmation.cancelLabel }} </span>
              </button>
              <button
                nz-button
                nzSize="small"
                nzType="primary"
                type="button"
                (click)="finish(confirmation.onConfirm)"
              >
                <span>{{ confirmation.confirmLabel }} </span>
              </button>
            </div>
          </div>
        } @else {
          @for (item of p.items; track item.id) {
            <button
              nz-button
              nzSize="small"
              nzType="text"
              type="button"
              role="menuitem"
              [disabled]="item.disabled"
              [attr.title]="item.disabledReason ?? null"
              data-adapttable-part="row-move-menu-item"
              style="display: block; width: 100%; height: auto; min-height: 2.75rem; text-align: start; white-space: normal"
              (click)="select(item.onSelect)"
            >
              <span nz-typography>{{ item.label }}</span>
              @if (item.disabledReason; as reason) {
                <span nz-typography nzType="secondary" style="display: block">{{
                  reason
                }}</span>
              }
            </button>
          }
        }
      </div>
    </ng-template>
  `,
})
export class AdaptRowMoveMenu {
  /** Menu label, targets and optional confirmation. */
  readonly props = input.required<RowMoveMenuSlotProps>();
  protected readonly open = signal(false);
  protected readonly direction = signal<"ltr" | "rtl">("ltr");
  private readonly document = inject(DOCUMENT);
  private readonly root = viewChild<ElementRef<HTMLElement>>("root");
  private readonly trigger = viewChild<
    ElementRef<HTMLButtonElement>,
    ElementRef<HTMLButtonElement>
  >("trigger", { read: ElementRef });
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");

  constructor() {
    effect(() => {
      if (!this.props().confirmation || !this.trigger()) return;
      this.show();
    });
    effect((onCleanup) => {
      if (!this.open()) return;
      const onDown = (event: MouseEvent): void => {
        const target = event.target as Node | null;
        if (
          this.root()?.nativeElement.contains(target) ||
          this.panel()?.nativeElement.contains(target)
        )
          return;
        this.dismiss();
      };
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        this.dismiss();
      };
      this.document.addEventListener("mousedown", onDown);
      this.document.addEventListener("keydown", onKeyDown);
      onCleanup(() => {
        this.document.removeEventListener("mousedown", onDown);
        this.document.removeEventListener("keydown", onKeyDown);
      });
    });
  }

  private show(): void {
    this.direction.set(
      this.trigger()?.nativeElement.closest<HTMLElement>("[dir]")?.dir === "rtl"
        ? "rtl"
        : "ltr"
    );
    this.open.set(true);
  }

  protected toggle(): void {
    if (this.open()) this.dismiss();
    else this.show();
  }

  protected visibleChanged(visible: boolean): void {
    if (!visible && this.open()) this.dismiss();
  }

  protected select(action: () => void): void {
    action();
    setTimeout(() => {
      if (!this.props().confirmation) this.close();
    }, 0);
  }

  protected finish(action: () => void): void {
    action();
    this.close();
  }

  private dismiss(): void {
    this.props().confirmation?.onCancel();
    this.close();
  }

  private close(): void {
    this.open.set(false);
    const trigger = this.trigger()?.nativeElement ?? null;
    queueMicrotask(() => {
      restoreFocusSoon(trigger);
    });
  }
}
