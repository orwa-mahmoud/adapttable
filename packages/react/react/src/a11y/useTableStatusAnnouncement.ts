/**
 * What the table says out loud when the rows underneath change — the React
 * binding.
 *
 * The wording and the first-settle silence live in core's pure
 * `resolveTableStatus`. This hook keeps the last signature, settles again when
 * the sort, the count, the page, the page size or the rendered row count
 * moves, and hands the result to the table's one status region.
 */
import {
  resolveTableStatus,
  type TableStatusAnnouncementOptions,
  type TableStatusSignature,
} from "@adapttable/core";
import { useEffect, useRef, useState } from "react";

export type { SortDirection } from "@adapttable/core";
export {
  resolveTableStatus,
  type TableStatusAnnouncementOptions,
} from "@adapttable/core";

/**
 * Track the table's row set and sort, and return what to announce.
 *
 * @param options - See {@link TableStatusAnnouncementOptions}.
 * @returns The current announcement — `""` until something changes.
 *
 * @public
 */
export function useTableStatusAnnouncement(
  options: TableStatusAnnouncementOptions
): string {
  const [announcement, setAnnouncement] = useState("");
  const previous = useRef<TableStatusSignature | undefined>(undefined);
  const latest = useRef(options);
  latest.current = options;
  // `shown` is in here because it decides the bounds whenever the source
  // reports no limit — leave it out and the message moves while the effect
  // never runs.
  const { sortBy, sortDir, total, page, limit, shown } = options;
  useEffect(() => {
    const { announcement: next, signature } = resolveTableStatus(
      latest.current,
      previous.current
    );
    previous.current = signature;
    // Written every time, including the empty result. Silence has to CLEAR the
    // region rather than leave the last message sitting in it: React skips the
    // re-render when the value is unchanged, so a message repeated after a
    // silent settle would never alter the DOM text, and `aria-live` fires on
    // nothing.
    setAnnouncement(next);
  }, [sortBy, sortDir, total, page, limit, shown]);
  return announcement;
}
