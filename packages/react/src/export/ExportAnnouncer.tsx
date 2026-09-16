/**
 * The live region that says an export finished — or did not.
 *
 * A download is silent. The file lands in the browser's downloads with no
 * focus change and no visible confirmation inside the page, so a screen-reader
 * user who presses Export hears nothing at all and cannot tell success from
 * failure. That is the whole reason this exists, and why it is an announcement
 * rather than a toast: the toast would need dismissing, styling in eight kits,
 * and a decision about where it goes.
 */
import type { ReactElement } from "react";

import { LiveRegion } from "../a11y/LiveRegion";

/**
 * Props for {@link ExportAnnouncer}.
 *
 * @public
 */
export interface ExportAnnouncerProps {
  /** `exportAnnouncement` from `useExportHandler`. Empty until an export ends. */
  announcement: string;
}

/**
 * Renders the export's outcome announcement. Always mounted beside the button,
 * because a region that appears together with its message is missed.
 *
 * @param props - See {@link ExportAnnouncerProps}.
 *
 * @public
 */
export function ExportAnnouncer({
  announcement,
}: Readonly<ExportAnnouncerProps>): ReactElement {
  return <LiveRegion part="export-announcer">{announcement}</LiveRegion>;
}
