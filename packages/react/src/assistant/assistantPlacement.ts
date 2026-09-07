/**
 * Where the floating conversation window sits, and when it stops floating.
 *
 * The window is anchored to the viewport's bottom inline-end corner rather
 * than to the table, because a table can be taller than the screen and an
 * anchor that scrolls away takes the conversation with it. Below the width
 * where a 400px window plus its margins would crowd the table off the
 * screen, the kit's own modal sheet takes over — a deliberate switch, not a
 * panel squeezed until it stops working.
 */
import type { CSSProperties, RefObject } from "react";

/** Distance from the viewport edges, in px. */
const EDGE = 24;
/** Breathing room kept around the window at every size. */
const MARGIN = 16;
/** The window's intended size before the viewport constrains it. */
const WIDTH = 400;
const HEIGHT = 560;
/**
 * Below this, a floating window would leave the table unusable behind it, so
 * the modal sheet is the honest presentation. Above it there is room for
 * both, which is the whole point of floating.
 */
export const FLOATING_MIN_WIDTH = 640;

/**
 * Where the window may be placed.
 *
 * `"viewport"` fixes it to the screen. A ref scopes it to an application
 * container instead — a dashboard shell with its own chrome, say — so a host
 * does not have to reach into private CSS to move it.
 *
 * @public
 */
export type TableAssistantBoundary = "viewport" | RefObject<HTMLElement | null>;

/** Whether a floating request can be honoured at this width. @internal */
export function floatingFits(viewportWidth: number): boolean {
  return viewportWidth >= FLOATING_MIN_WIDTH;
}

/**
 * The window's placement styles.
 *
 * Sizes are clamped so the window never overflows: at 1440px it is the
 * intended 400×560, and on a short laptop screen it gives back height
 * rather than running off the bottom.
 *
 * @param boundary - Viewport, or a container to sit inside.
 * @returns Styles for the kit's surface.
 *
 * @internal
 */
export function floatingStyle(boundary: TableAssistantBoundary): CSSProperties {
  const contained = boundary !== "viewport";
  return {
    position: contained ? "absolute" : "fixed",
    insetBlockEnd: `calc(${String(EDGE)}px + env(safe-area-inset-bottom, 0px))`,
    insetInlineEnd: `calc(${String(EDGE)}px + env(safe-area-inset-right, 0px))`,
    inlineSize: `min(${String(WIDTH)}px, calc(100% - ${String(MARGIN * 2)}px))`,
    blockSize: `min(${String(HEIGHT)}px, calc(100% - ${String(EDGE + MARGIN)}px))`,
    // Above sticky headers and pinned cells, below a kit's own modal layer,
    // so a menu opened from the table still lands on top of the window.
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  };
}

/**
 * The launcher's resting place: the same corner the window opens into, so
 * opening reads as the button growing into the conversation rather than a
 * panel arriving from somewhere else.
 *
 * @param boundary - Viewport, or a container to sit inside.
 * @returns Styles for the launcher's anchor.
 *
 * @internal
 */
export function launcherStyle(boundary: TableAssistantBoundary): CSSProperties {
  const contained = boundary !== "viewport";
  return {
    position: contained ? "absolute" : "fixed",
    insetBlockEnd: `calc(${String(EDGE)}px + env(safe-area-inset-bottom, 0px))`,
    insetInlineEnd: `calc(${String(EDGE)}px + env(safe-area-inset-right, 0px))`,
    zIndex: 30,
    display: "flex",
  };
}
