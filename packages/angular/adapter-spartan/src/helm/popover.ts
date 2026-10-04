/** Accessible names for the actual native Brain popover pane. */
import { DOCUMENT } from "@angular/common";
import { afterRenderEffect, Directive, inject, input } from "@angular/core";
import { BrnPopover } from "@spartan-ng/brain/popover";

/** Brain exposes the pane id and state, but no accessible-name input. @internal */
@Directive({ selector: "[brnPopover][adaptHlmPopoverLabel]" })
export class HlmPopoverLabel {
  readonly adaptHlmPopoverLabel = input.required<string>();
  readonly label = this.adaptHlmPopoverLabel;
  private readonly popover = inject(BrnPopover, { self: true });
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterRenderEffect(() => {
      const label = this.label();
      if (this.popover.stateComputed() !== "open") return;
      this.document
        .getElementById(this.popover.id())
        ?.setAttribute("aria-label", label);
    });
  }
}
