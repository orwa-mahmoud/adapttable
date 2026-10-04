/**
 * Where the floating conversation window sits, and when it stops floating.
 *
 * The rules are core's (`assistantFloatingStyle` and its neighbours). What is
 * React's is the boundary a host names: the viewport, or a ref to a container
 * the window is scoped to.
 */
import {
  assistantFloatingStyle,
  assistantLauncherStyle,
  type TableAssistantPlacement,
} from "@adapttable/core/binding";
import type { RefObject } from "react";

/**
 * Below this, a floating window would leave the table unusable behind it, so
 * the modal sheet is the honest presentation.
 */
export { ASSISTANT_FLOATING_MIN_WIDTH as FLOATING_MIN_WIDTH } from "@adapttable/core/binding";

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
export { assistantFloatingFits as floatingFits } from "@adapttable/core/binding";

/** The window's placement styles. @internal */
export function floatingStyle(
  boundary: TableAssistantBoundary
): TableAssistantPlacement {
  return assistantFloatingStyle(boundary !== "viewport");
}

/** The launcher's resting place, in the corner the window opens into. @internal */
export function launcherStyle(
  boundary: TableAssistantBoundary
): TableAssistantPlacement {
  return assistantLauncherStyle(boundary !== "viewport");
}
