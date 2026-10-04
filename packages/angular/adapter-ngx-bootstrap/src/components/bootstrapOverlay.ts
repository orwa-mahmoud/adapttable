import {
  afterNextRender,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from "@angular/core";

let nextOverlayId = 0;

/** Portal native dropdowns past scrolling cells, retaining the kit's theme boundary. */
export function injectBootstrapOverlayContainer() {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const container = signal<string | undefined>(undefined);
  let element: HTMLElement | undefined;
  afterNextRender(() => {
    const boundary = host.nativeElement.closest(
      ".modal, .adapttable-ngx-bootstrap"
    );
    if (!boundary) return;
    element = host.nativeElement.ownerDocument.createElement("div");
    const id = `adapt-ngx-bootstrap-overlay-${nextOverlayId++}`;
    element.dataset.ngxBootstrapOverlay = id;
    boundary.append(element);
    container.set(`[data-ngx-bootstrap-overlay="${id}"]`);
  });
  inject(DestroyRef).onDestroy(() => element?.remove());
  return container.asReadonly();
}
