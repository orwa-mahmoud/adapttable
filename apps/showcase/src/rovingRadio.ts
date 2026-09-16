import type { KeyboardEvent } from "react";

/**
 * Arrow-key navigation for a horizontal or vertical radiogroup built from buttons.
 */
export function moveRovingRadioIndex(
  event: KeyboardEvent,
  length: number,
  current: number
): number | undefined {
  if (length <= 1) return undefined;
  if (
    event.key === "ArrowRight" ||
    event.key === "ArrowDown" ||
    (event.key === "Home" && current !== 0)
  ) {
    if (event.key === "Home") return 0;
    return (current + 1) % length;
  }
  if (
    event.key === "ArrowLeft" ||
    event.key === "ArrowUp" ||
    (event.key === "End" && current !== length - 1)
  ) {
    if (event.key === "End") return length - 1;
    return (current - 1 + length) % length;
  }
  return undefined;
}

export function focusRovingRadio(
  container: HTMLElement | null,
  index: number,
  selector = '[role="radio"]'
): void {
  if (!container) return;
  const items = container.querySelectorAll<HTMLElement>(selector);
  items[index]?.focus();
}
