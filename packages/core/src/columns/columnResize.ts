import type { KeyboardEvent, PointerEvent } from "react";

/** Minimum column width (px) a resize drag/keyboard step will not go below. */
export const MIN_COLUMN_WIDTH = 60;

/**
 * Upper bound for a persisted/URL-restored column width — generous enough
 * for any real drag on an ultra-wide display, tight enough that a hostile
 * `colW=1e9` cannot blow the layout.
 */
export const MAX_COLUMN_WIDTH = 4000;
/** Keyboard resize step (px) per arrow press. */
export const COLUMN_RESIZE_STEP = 16;

/**
 * Props for a column-resize handle element. Modeled as a `button` (a focusable
 * `separator`/splitter would require `aria-valuenow/min/max`); ArrowLeft/Right
 * resize it for keyboard users.
 */
export interface ColumnResizeHandleProps {
  role: "button";
  tabIndex: 0;
  "aria-label": string;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/** Current rendered width of the resize handle's owning header cell. */
function cellWidth(handle: HTMLElement): number {
  const cell = handle.closest("th,td");
  return cell ? cell.getBoundingClientRect().width : MIN_COLUMN_WIDTH;
}

/**
 * Whether the handle sits in a right-to-left context. The handle renders at
 * the column's inline-end (the visual LEFT edge in RTL), so the physical drag
 * delta and the Arrow keys must flip to keep "drag/press outward = wider".
 * Prefers an explicit `[dir]` ancestor (what the adapters set on the root),
 * falling back to the resolved CSS `direction` for theme-only RTL.
 */
function isRtl(handle: HTMLElement): boolean {
  const scoped = handle.closest("[dir]");
  if (scoped) return scoped.getAttribute("dir") === "rtl";
  return globalThis.getComputedStyle(handle).direction === "rtl";
}

/**
 * Build the props for a column-resize handle. Pointer drag resizes live; arrow
 * keys nudge by {@link COLUMN_RESIZE_STEP} for keyboard a11y. Width is measured
 * from the live cell, so columns need no preset width to be resizable.
 *
 * @param key - Column key being resized.
 * @param setWidth - Layout mutator that persists the new width.
 * @param label - Accessible label for the handle.
 */
export function columnResizeHandleProps(
  key: string,
  setWidth: (key: string, width: number) => void,
  label: string
): ColumnResizeHandleProps {
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    onPointerDown: (event) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = cellWidth(event.currentTarget);
      const rtl = isRtl(event.currentTarget);
      // Coalesce pointer moves to one width commit per animation frame —
      // every commit re-renders the table (and may write the URL), and a
      // drag emits far more moves than frames.
      let frame = 0;
      let lastX = startX;
      const commit = () => {
        frame = 0;
        const delta = rtl ? startX - lastX : lastX - startX;
        setWidth(key, Math.max(MIN_COLUMN_WIDTH, startWidth + delta));
      };
      const onMove = (e: globalThis.PointerEvent) => {
        lastX = e.clientX;
        frame ||= globalThis.requestAnimationFrame(commit);
      };
      // `pointercancel` fires instead of `pointerup` when the browser takes
      // over the gesture (touch scroll, alt-tab mid-drag) — clean up on both
      // or the column keeps resizing with every later pointer move.
      const onUp = () => {
        // Flush a pending frame so the release position always lands; a
        // drag-less click leaves no pending frame and commits nothing.
        if (frame) {
          globalThis.cancelAnimationFrame(frame);
          frame = 0;
          commit();
        }
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    onKeyDown: (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const current = cellWidth(event.currentTarget);
      // The handle is at the inline-end edge: in LTR that's the right, so
      // ArrowRight widens; in RTL it's the left, so ArrowLeft widens.
      const widen =
        event.key === (isRtl(event.currentTarget) ? "ArrowLeft" : "ArrowRight");
      const delta = widen ? COLUMN_RESIZE_STEP : -COLUMN_RESIZE_STEP;
      setWidth(key, Math.max(MIN_COLUMN_WIDTH, current + delta));
    },
  };
}
