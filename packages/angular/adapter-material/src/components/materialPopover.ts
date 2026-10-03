import { BidiModule } from "@angular/cdk/bidi";
/** Material card surface on the CDK overlay used by Material itself. */
import { type ConnectedPosition, OverlayModule } from "@angular/cdk/overlay";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
} from "@angular/core";
import { MatCardModule } from "@angular/material/card";

/** Anchored, backdrop-free surface with scoped dismissal and focus restoration. @internal */
@Component({
  selector: "adapt-material-popover",
  imports: [BidiModule, OverlayModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [dir]="direction()" style="display:contents"
    ><ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="anchor()"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayHasBackdrop]="false"
      [cdkConnectedOverlayDisableClose]="true"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayPush]="true"
      [cdkConnectedOverlayViewportMargin]="8"
      [cdkConnectedOverlayPanelClass]="'adapt-material-overlay'"
      (overlayOutsideClick)="outside($event)"
      (overlayKeydown)="keydown($event)"
    >
      <mat-card
        [attr.dir]="direction()"
        style="max-width: calc(100vw - 16px); max-height: min(560px, calc(100vh - 32px)); overflow: auto; padding: 16px"
      >
        <ng-content />
      </mat-card> </ng-template
  ></span>`,
})
export class AdaptMaterialPopover {
  readonly origin = input.required<HTMLElement>();
  readonly open = input(true);
  readonly dir = input<"ltr" | "rtl">();
  protected readonly direction = computed(
    () =>
      this.dir() ??
      (this.origin().closest<HTMLElement>("[dir]")?.dir === "rtl"
        ? "rtl"
        : "ltr")
  );
  readonly dismiss = output<void>();
  protected readonly anchor = computed(() => new ElementRef(this.origin()));
  protected readonly positions: ConnectedPosition[] = [
    {
      originX: "end",
      originY: "bottom",
      overlayX: "end",
      overlayY: "top",
      offsetY: 4,
    },
    {
      originX: "end",
      originY: "top",
      overlayX: "end",
      overlayY: "bottom",
      offsetY: -4,
    },
  ];
  protected outside(event: MouseEvent): void {
    if (!(event.target instanceof Node) || this.origin().contains(event.target))
      return;
    this.dismiss.emit();
  }
  protected keydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.dismiss.emit();
    const origin = this.origin();
    (origin.matches("button")
      ? origin
      : origin.querySelector<HTMLElement>("button")
    )?.focus();
  }
}
