import {
  type ExportProgressChromeProps as NeutralExportProgressChromeProps,
  type ExportProgressSlots as NeutralExportProgressSlots,
  exportProgressView,
} from "@adapttable/core/binding";
import type { ReactElement, ReactNode } from "react";

export type {
  ExportProgressAction,
  ExportProgressDownload,
  ExportProgressSurfaceSlotProps,
} from "@adapttable/core/binding";

/**
 * Required adapter components for {@link ExportProgressChrome} —
 * `@adapttable/core`'s `ExportProgressSlots` drawing React nodes.
 *
 * @public
 */
export type ExportProgressSlots = NeutralExportProgressSlots<ReactNode>;

/**
 * Props for {@link ExportProgressChrome} — `@adapttable/core`'s
 * `ExportProgressChromeProps` with React's slots.
 *
 * @public
 */
export type ExportProgressChromeProps =
  NeutralExportProgressChromeProps<ReactNode>;

/**
 * Convert shared export lifecycle state into one kit-owned visible surface.
 *
 * Core owns when the surface exists, which actions are legal, and every
 * localized string. The adapter owns all visible controls and styling.
 *
 * @public
 */
export function ExportProgressChrome({
  progress,
  labels,
  slots,
}: Readonly<ExportProgressChromeProps>): ReactElement | null {
  if (!progress) return null;
  const Surface = slots.Surface;
  return <Surface {...exportProgressView(progress, labels)} />;
}
