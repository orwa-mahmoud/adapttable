import { injectPopoverSpace } from "@adapttable/angular";
import { BidiModule } from "@angular/cdk/bidi";
/** Material card surface on the CDK overlay used by Material itself. */
import {
  CDK_CONNECTED_OVERLAY_DEFAULT_CONFIG,
  type ConnectedPosition,
  OverlayModule,
} from "@angular/cdk/overlay";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
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
      [cdkConnectedOverlayPositions]="
        belowOnly()
          ? belowPositions
          : filterSurface()
            ? filterPositions
            : positions()
      "
      [cdkConnectedOverlayPush]="!belowOnly()"
      [cdkConnectedOverlayFlexibleDimensions]="
        constrainedSurface() || (overlayDefaults?.flexibleDimensions ?? false)
      "
      [cdkConnectedOverlayWidth]="
        constrainedSurface() ? 374 : (overlayDefaults?.width ?? '')
      "
      [cdkConnectedOverlayViewportMargin]="8"
      [cdkConnectedOverlayPanelClass]="'adapt-material-overlay'"
      (overlayOutsideClick)="outside($event)"
      (overlayKeydown)="keydown($event)"
    >
      <mat-card
        appearance="outlined"
        [class.adapt-material-filter-card]="constrainedSurface()"
        [attr.dir]="direction()"
        [style.width]="constrainedSurface() ? '100%' : null"
        [style.max-height.px]="constrainedSurface() ? availableHeight() : null"
        [style.--adapt-material-popover-height]="
          constrainedSurface() ? availableHeight() + 'px' : null
        "
        [style.overflow-y]="constrainedSurface() ? 'hidden' : 'auto'"
        style="max-width: calc(100vw - 16px); max-height: min(560px, calc(100vh - 32px)); overflow: auto; padding: 16px"
      >
        <ng-content />
      </mat-card> </ng-template
  ></span>`,
})
export class AdaptMaterialPopover {
  protected readonly overlayDefaults = inject(
    CDK_CONNECTED_OVERLAY_DEFAULT_CONFIG,
    {
      optional: true,
    }
  );
  readonly origin = input.required<HTMLElement>();
  readonly open = input(true);
  readonly belowOnly = input(false);
  /** Constrain a filter card while allowing CDK to flip when space is short. */
  readonly filterSurface = input(false);
  readonly align = input<"start" | "end">("end");
  protected readonly constrainedSurface = computed(
    () => this.belowOnly() || this.filterSurface()
  );
  protected readonly availableHeight = injectPopoverSpace({
    origin: () => this.origin(),
    open: () => this.open() && this.constrainedSurface(),
    reserve: 16,
    allowAbove: () => {
      if (!this.filterSurface() || this.belowOnly()) return false;
      const origin = this.origin();
      const viewport = origin.ownerDocument.defaultView;
      // Preserve the preferred below placement when a header, footer and
      // useful portion of the filter body fit. CDK handles the short-space case.
      return (
        viewport !== null &&
        viewport.innerHeight - origin.getBoundingClientRect().bottom < 160
      );
    },
  });
  protected readonly belowPositions: ConnectedPosition[] = [
    {
      originX: "end",
      originY: "bottom",
      overlayX: "end",
      overlayY: "top",
      offsetY: 4,
    },
    // Search can be absent, placing the trigger at the other toolbar edge.
    // Keep both logical alignments below the trigger, including in RTL.
    {
      originX: "start",
      originY: "bottom",
      overlayX: "start",
      overlayY: "top",
      offsetY: 4,
    },
    {
      originX: "center",
      originY: "bottom",
      overlayX: "center",
      overlayY: "top",
      offsetY: 4,
    },
  ];
  protected readonly filterPositions: ConnectedPosition[] = [
    ...this.belowPositions,
    ...this.belowPositions.map<ConnectedPosition>((position) => ({
      ...position,
      originY: "top",
      overlayY: "bottom",
      offsetY: -4,
    })),
  ];
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
  protected readonly positions = computed<ConnectedPosition[]>(() => [
    {
      originX: this.align(),
      originY: "bottom",
      overlayX: this.align(),
      overlayY: "top",
      offsetY: 4,
    },
    {
      originX: this.align(),
      originY: "top",
      overlayX: this.align(),
      overlayY: "bottom",
      offsetY: -4,
    },
    {
      originX: this.align() === "start" ? "end" : "start",
      originY: "bottom",
      overlayX: this.align() === "start" ? "end" : "start",
      overlayY: "top",
      offsetY: 4,
    },
  ]);
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
