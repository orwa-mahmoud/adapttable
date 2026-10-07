/** Quasar's menu owns dismissal; its native item focus is a DOM presentation. */
export function focusMenuItem(root: HTMLElement | null): void {
  root
    ?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])'
    )
    ?.focus();
}
export function moveMenuFocus(event: KeyboardEvent): void {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    !(event.currentTarget instanceof HTMLElement)
  )
    return;
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const root = event.currentTarget;
  if (
    event.target instanceof Element &&
    event.target.closest('[role="menu"]') !== root
  )
    return;
  const items = [
    ...root.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])'
    ),
  ].filter((item) => item.closest('[role="menu"]') === root);
  if (!items.length) return;
  const at = items.indexOf(root.ownerDocument.activeElement as HTMLElement);
  let next = 0;
  if (event.key === "End") next = items.length - 1;
  else if (event.key === "ArrowDown") next = (at + 1) % items.length;
  else if (event.key === "ArrowUp")
    next = at < 0 ? items.length - 1 : (at + items.length - 1) % items.length;
  event.preventDefault();
  event.stopPropagation();
  items[next]?.focus();
}
