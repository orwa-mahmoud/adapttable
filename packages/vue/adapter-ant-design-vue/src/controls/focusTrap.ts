const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ant Design Vue's drawer is modal but does not hold Tab inside itself. This
 * keeps Tab and Shift+Tab cycling through the panel's own controls, so focus
 * never reaches the page the backdrop covers. Returns whether it moved focus.
 */
export function trapTab(event: KeyboardEvent, panel: HTMLElement): boolean {
  if (event.key !== "Tab" || event.defaultPrevented || event.isComposing)
    return false;
  const tabbable = [...panel.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) => !element.hidden && !element.closest("[hidden]")
  );
  const focused = panel.ownerDocument.activeElement;
  if (tabbable.length === 0) {
    event.preventDefault();
    panel.focus({ preventScroll: true });
    return true;
  }
  const first = tabbable[0]!;
  const last = tabbable[tabbable.length - 1]!;
  if (event.shiftKey && (focused === first || focused === panel)) {
    event.preventDefault();
    last.focus({ preventScroll: true });
    return true;
  }
  if (!event.shiftKey && focused === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }
  return false;
}
