/**
 * The window behind a long checklist: the slice core computes, and a read of
 * the list's scroll position and width that ignores an unchanged viewport.
 */
import { type ChecklistWindow, checklistWindow } from "@adapttable/core";

/**
 * The slice a checklist renders. Below the threshold the whole list is the
 * window, so nothing is padded.
 *
 * @param count - How many options are visible.
 * @param virtualize - Whether the list is long enough to window.
 * @param scrollTop - The list's scroll position.
 * @param width - The list's width.
 * @returns The slice.
 *
 * @public
 */
export function checklistSlice(
  count: number,
  virtualize: boolean,
  scrollTop: number,
  width: number
): ChecklistWindow {
  if (!virtualize) {
    return { start: 0, end: count, padTop: 0, padBottom: 0 };
  }
  return checklistWindow(count, scrollTop, width);
}

/**
 * The next viewport, or the current one when the numbers have not moved.
 * A fresh object per scroll event would re-render every checkbox for nothing.
 *
 * @param current - The viewport already held.
 * @param node - The list element, or nothing when it is not mounted.
 * @returns The viewport to store.
 *
 * @public
 */
export function nextChecklistViewport(
  current: { readonly scrollTop: number; readonly width: number },
  node: HTMLElement | undefined
): { readonly scrollTop: number; readonly width: number } {
  if (!node) return current;
  const next = { scrollTop: node.scrollTop, width: node.clientWidth };
  return current.scrollTop === next.scrollTop && current.width === next.width
    ? current
    : next;
}
