/** Shared CDK disclosure primitive owned by this neutral adapter. */
import { BidiModule } from "@angular/cdk/bidi";
import { type ConnectedPosition, OverlayModule } from "@angular/cdk/overlay";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  model,
  type TemplateRef,
  viewChild,
} from "@angular/core";

/** Template context for the trigger of a CDK disclosure. */
export interface CdkPopoverTriggerContext {
  /** Toggle the controlled disclosure. */
  readonly $implicit: () => void;
  /** Whether the portal is attached. */
  readonly open: boolean;
}

/** Adapter-owned, backdrop-free CDK connected overlay. @public */
@Component({
  selector: "adapt-cdk-popover",
  imports: [BidiModule, OverlayModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <span
      #anchor
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      [dir]="dir()"
      style="display: inline-flex"
    >
      <ng-container
        [ngTemplateOutlet]="trigger()"
        [ngTemplateOutletContext]="{ $implicit: toggle, open: open() }"
      />
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="open()"
        [cdkConnectedOverlayHasBackdrop]="false"
        [cdkConnectedOverlayDisableClose]="true"
        [cdkConnectedOverlayPositions]="positions"
        [cdkConnectedOverlayViewportMargin]="8"
        [cdkConnectedOverlayPush]="true"
        cdkConnectedOverlayPanelClass="adapt-cdk-overlay"
        (overlayOutsideClick)="outside($event)"
        (overlayKeydown)="keydown($event)"
      >
        <div class="adapt-cdk-surface" [dir]="dir()">
          <ng-container [ngTemplateOutlet]="content()" />
        </div>
      </ng-template>
    </span>
  `,
})
export class AdaptCdkPopover {
  readonly trigger = input.required<TemplateRef<CdkPopoverTriggerContext>>();
  readonly content = input.required<TemplateRef<unknown>>();
  readonly dir = input<"ltr" | "rtl">("ltr");
  readonly open = model(false);
  readonly toggle = (): void => {
    this.open.update((value) => !value);
  };
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  protected readonly positions: ConnectedPosition[] = [
    {
      originX: "start",
      originY: "bottom",
      overlayX: "start",
      overlayY: "top",
      offsetY: 4,
    },
    {
      originX: "start",
      originY: "top",
      overlayX: "start",
      overlayY: "bottom",
      offsetY: -4,
    },
  ];
  /** Close while keeping the host's open model synchronized. */
  close(): void {
    this.open.set(false);
  }
  protected outside(event: MouseEvent): void {
    if (
      event.target instanceof Node &&
      this.anchor().nativeElement.contains(event.target)
    )
      return;
    this.close();
  }
  protected keydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
    this.anchor()
      .nativeElement.querySelector<HTMLElement>('button, [role="button"]')
      ?.focus();
  }
}
