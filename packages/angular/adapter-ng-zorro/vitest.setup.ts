import "@angular/compiler";

import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";

// Zoneless, as Angular runs by default: change detection follows signals.
setupTestBed();

// jsdom has no element scrolling API. Model its observable offsets and scroll
// event so NG-ZORRO's real CDK option viewport can run without replacing it.
if (!HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = function (
    optionsOrX?: ScrollToOptions | number,
    y?: number
  ): void {
    const left = this.scrollLeft;
    const top = this.scrollTop;
    const nextLeft =
      typeof optionsOrX === "number" ? optionsOrX : (optionsOrX?.left ?? left);
    const nextTop =
      typeof optionsOrX === "number" ? (y ?? top) : (optionsOrX?.top ?? top);
    if (nextLeft !== left) this.scrollLeft = nextLeft;
    if (nextTop !== top) this.scrollTop = nextTop;
    if (this.scrollLeft !== left || this.scrollTop !== top) {
      this.dispatchEvent(new Event("scroll"));
    }
  };
}
