import type { KeyboardEvent, MouseEvent } from "react";

/** Handlers + affordance for an activatable (clickable) row. */
export interface RowClickProps {
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /**
   * Roving tab stop: the first row is the list's single Tab entry point;
   * the rest are reached with ArrowUp/ArrowDown (which move the stop
   * along). Without a known index every row stays tabbable.
   */
  tabIndex: 0 | -1;
  /** Marks the element as an arrow-key navigation stop among its siblings. */
  "data-adapttable-row": "";
  style: { cursor: "pointer" };
}

/**
 * True when the event started on an interactive child (button, link, input,
 * checkbox, …) whose own behaviour must win over the row activation — a
 * click on the row-actions button or the selection checkbox is never a
 * navigation.
 */
function fromInteractiveChild(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      "button,a,input,select,textarea,label,[role='button'],[role='checkbox']"
    ) !== null
  );
}

/**
 * Move focus to the previous/next sibling row (any element carrying the
 * `data-adapttable-row` stop marker under the same parent — `<tr>`s in a
 * tbody and mobile cards in a list alike). No wrap-around: the edges are a
 * natural stop, matching native listbox behaviour.
 */
function moveRowFocus(current: HTMLElement, delta: -1 | 1): void {
  const parent = current.parentElement;
  if (!parent) return;
  const stops = [...parent.children].filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && "adapttableRow" in el.dataset
  );
  const next = stops[stops.indexOf(current) + delta];
  if (!next) return;
  // Rove the tab stop with the focus, so Tab leaves the list from the
  // current row and re-enters where the user left off.
  current.tabIndex = -1;
  next.tabIndex = 0;
  next.focus();
}

/**
 * Build the row-activation props for `onRowClick`: a guarded click handler
 * (interactive children keep their own behaviour), Enter/Space activation
 * when the row itself has focus, ArrowUp/ArrowDown roving focus (and tab
 * stop) across the sibling rows, and the pointer cursor. Returns
 * `undefined` when no handler is configured, so adapters can spread the
 * result unconditionally.
 *
 * @typeParam TRow - The row type.
 * @param row - The row this element renders.
 * @param onRowClick - The caller's activation handler, if any.
 * @param index - The row's index in the rendered list. When given, only
 *   row 0 is a Tab stop (roving tabindex); omit it and every row stays
 *   tabbable.
 */
export function rowClickProps<TRow>(
  row: TRow,
  onRowClick: ((row: TRow) => void) | undefined,
  index?: number
): RowClickProps | undefined {
  if (!onRowClick) return undefined;
  return {
    tabIndex: index === undefined || index === 0 ? 0 : -1,
    "data-adapttable-row": "",
    onClick: (event) => {
      if (!fromInteractiveChild(event.target)) onRowClick(row);
    },
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onRowClick(row);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveRowFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
      }
    },
    style: { cursor: "pointer" },
  };
}
