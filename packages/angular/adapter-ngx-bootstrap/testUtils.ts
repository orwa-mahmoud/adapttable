import type { ComponentFixture } from "@angular/core/testing";

/** Test selectors distinguish the themed public contract from kit-owned internals. */
const INTERNAL_PARTS = new Set([
  "assistant-examples-list",
  "filters-anchor",
  "filters-backdrop",
  "filters-body",
  "filters-button",
  "filters-clear",
  "filters-close",
  "filters-count",
  "filters-done",
  "filters-footer",
  "filters-header",
  "filters-icon",
  "filters-panel",
  "filters-popover",
  "filters-title",
  "filter-checkbox-group",
  "filter-options-loading",
  "column-menu",
  "column-menu-auto-size",
  "column-menu-choice-label",
  "column-menu-choice-select",
  "column-menu-grip",
  "column-menu-header",
  "column-menu-label",
  "column-menu-panel",
  "column-menu-pin",
  "column-menu-reset",
  "column-menu-separator",
  "column-menu-title",
  "column-menu-visibility",
  "views-button",
  "views-delete",
  "views-divider",
  "views-input",
  "views-item",
  "views-menu",
  "views-panel",
  "views-row",
  "views-save",
  "views-save-row",
  "page-ellipsis",
  "page-next",
  "page-number",
  "page-prev",
  "pager",
  "rows-per-page",
  "load-more",
  "load-more-button",
  "loading",
  "loading-card",
  "loading-cards",
  "loading-cell",
  "loading-header-cell",
  "loading-header-row",
  "loading-line",
  "loading-row",
  "loading-table",
  "refresh-indicator",
  "checkbox",
  "empty-clear",
  "expand-button",
  "export-spinner",
  "retry-button",
  "sort-button",
  "sort-index",
  "sort-select",
  "virtual-spacer",
]);

/** Never accept a private marker as a substitute for a public contract part. */
export function ngxBootstrapPart(name: string): string {
  const attribute = INTERNAL_PARTS.has(name)
    ? "data-ngx-bootstrap-part"
    : "data-adapttable-part";
  return `[${attribute}="${name}"]`;
}

/** Keyup follows any focus transfer performed by the Escape keydown handler. */
export function pressEscapeFrom(control: HTMLElement): KeyboardEvent {
  control.focus();
  const keydown = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  control.dispatchEvent(keydown);
  (document.activeElement ?? control).dispatchEvent(
    new KeyboardEvent("keyup", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  return keydown;
}

/** Wait for native render, outside-press and deferred Escape ownership. */
export async function settleBootstrap<T>(
  fixture: ComponentFixture<T>
): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  fixture.detectChanges();
  await fixture.whenStable();
}
