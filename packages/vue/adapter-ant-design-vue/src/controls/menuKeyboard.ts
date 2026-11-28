const ENABLED_ITEM = '[role="menuitem"]:not([aria-disabled="true"])';

/** The enabled items that belong to this menu itself, not to a submenu. */
function itemsOf(menu: Element): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>(ENABLED_ITEM)].filter(
    (item) => item.closest('[role="menu"]') === menu
  );
}

/** The element a Menu component renders, from its template ref. */
export function menuHost(instance: unknown): HTMLElement | null {
  const host =
    instance && typeof instance === "object" && "$el" in instance
      ? instance.$el
      : null;
  return host instanceof HTMLElement ? host : null;
}

/**
 * Moves focus to the first enabled item when focus is still on the page or on
 * the control that opened the menu, and leaves it alone once the user has
 * moved it somewhere of their own.
 */
export function focusFirstItem(menu: HTMLElement): void {
  const focused = menu.ownerDocument.activeElement;
  if (
    focused &&
    focused !== menu.ownerDocument.body &&
    !focused.hasAttribute("data-adapttable-part")
  )
    return;
  itemsOf(menu)[0]?.focus({ preventScroll: true });
}

/**
 * Ant Design Vue's menu has no arrow-key navigation, so the standard menu
 * keys are added here: Arrow Up and Down wrap, Home and End jump, and Space
 * activates the focused item the way Enter already does. Returns whether the
 * key was handled.
 */
export function handleMenuKey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.isComposing) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const menu = target.closest('[role="menu"]');
  if (!menu) return false;
  const items = itemsOf(menu);
  if (items.length === 0) return false;
  const index = items.findIndex((item) => item === target);
  let next: HTMLElement | undefined;
  if (event.key === "ArrowDown")
    next = items[index < 0 ? 0 : (index + 1) % items.length];
  else if (event.key === "ArrowUp")
    next =
      items[
        index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length
      ];
  else if (event.key === "Home") next = items[0];
  else if (event.key === "End") next = items[items.length - 1];
  else if (event.key === " " && index >= 0) {
    event.preventDefault();
    items[index]!.click();
    return true;
  } else return false;
  event.preventDefault();
  next?.focus({ preventScroll: true });
  return true;
}

/**
 * A template ref that moves focus into a menu once, when its list first
 * appears. A ref given inline is called again on every render, so the host
 * seen last is remembered and only a new list takes focus.
 */
export function focusOnOpen(
  schedule: (run: () => void) => void,
  isCurrent: () => boolean = () => true
): (instance: unknown) => void {
  let seen: HTMLElement | null = null;
  return (instance) => {
    const host = menuHost(instance);
    if (host === seen) return;
    seen = host;
    if (host)
      schedule(() => {
        if (host.isConnected && isCurrent()) focusFirstItem(host);
      });
  };
}
