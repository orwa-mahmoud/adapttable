/** Real CDK portals owned by one test fixture, with jsdom visibility support. */
import { FocusTrapFactory, InteractivityChecker } from "@angular/cdk/a11y";
import { Overlay, OverlayContainer } from "@angular/cdk/overlay";
import { ElementRef, inject, Injectable } from "@angular/core";

@Injectable()
class FixtureOverlayContainer extends OverlayContainer {
  private readonly owner = inject<ElementRef<HTMLElement>>(ElementRef);

  protected override _createContainer(): void {
    const container = this._document.createElement("div");
    container.classList.add("cdk-overlay-container");
    this.owner.nativeElement.append(container);
    this._containerElement = container;
  }
}

class FixtureInteractivityChecker extends InteractivityChecker {
  private readonly owner = inject<ElementRef<HTMLElement>>(ElementRef);

  override isVisible(element: HTMLElement): boolean {
    if (!element.isConnected || !this.owner.nativeElement.contains(element))
      return false;
    for (
      let current: HTMLElement | null = element;
      current;
      current = current.parentElement
    ) {
      const style = getComputedStyle(current);
      if (
        current.hidden ||
        current.inert ||
        style.display === "none" ||
        style.visibility === "hidden"
      )
        return false;
    }
    return true;
  }
}

export const fixtureOverlayProviders = [
  Overlay,
  FocusTrapFactory,
  {
    provide: InteractivityChecker,
    useFactory: () => new FixtureInteractivityChecker(),
  },
  {
    provide: OverlayContainer,
    // A class provider registers the inherited destroy hook with this view.
    useClass: FixtureOverlayContainer,
  },
];

/** jsdom does not perform the browser's default Tab traversal. */
export function focusTrapAnchor(
  panel: HTMLElement,
  side: "start" | "end"
): void {
  const anchor =
    side === "start" ? panel.previousElementSibling : panel.nextElementSibling;
  if (
    !(anchor instanceof HTMLElement) ||
    !anchor.classList.contains("cdk-focus-trap-anchor")
  )
    throw new Error(`Missing CDK focus trap ${side} anchor`);
  anchor.focus();
}
