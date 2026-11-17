/**
 * The strings the density and fullscreen controls draw.
 */
import type { TableLabels } from "../types";

/**
 * The strings the density and fullscreen controls draw.
 *
 * @public
 */
export const VIEW_CONTROL_LABELS: Pick<
  Required<TableLabels>,
  "densityComfortable" | "densityCompact" | "enterFullscreen" | "exitFullscreen"
> = {
  densityComfortable: "Comfortable",
  densityCompact: "Compact",
  enterFullscreen: "Enter fullscreen",
  exitFullscreen: "Exit fullscreen",
};
