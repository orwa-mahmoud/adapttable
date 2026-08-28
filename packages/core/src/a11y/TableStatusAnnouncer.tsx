/**
 * The one region that says what changed about the rows.
 *
 * Rendered by every adapter beside its table so it is in the DOM before it has
 * anything to say — a live region that appears at the same moment as its text
 * is frequently missed entirely.
 *
 * It announces through `aria-live` without claiming `role="status"`. This is the
 * one region present on every table, and the empty state, the export announcer
 * and the reorder announcer each claim that role while they are on screen — a
 * permanent second status region would leave nothing able to identify "the
 * table's status".
 */
import type { ReactElement } from "react";

import { LiveRegion } from "./LiveRegion";

/**
 * Props for {@link TableStatusAnnouncer}.
 *
 * @public
 */
export interface TableStatusAnnouncerProps {
  /** What to announce, from `useDataTableShell().statusAnnouncement`. */
  announcement: string;
}

/**
 * Announce a change to the table's rows politely.
 *
 * @param props - See {@link TableStatusAnnouncerProps}.
 *
 * @public
 */
export function TableStatusAnnouncer({
  announcement,
}: Readonly<TableStatusAnnouncerProps>): ReactElement {
  return (
    <LiveRegion part="table-status-announcer" statusRole={false}>
      {announcement}
    </LiveRegion>
  );
}
