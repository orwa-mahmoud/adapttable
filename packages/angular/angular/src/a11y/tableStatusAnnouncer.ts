/**
 * The one region that says what changed about the rows, and the tracker that
 * feeds it.
 *
 * Rendered beside every table so it is in the DOM before it has anything to
 * say — a live region that appears at the same moment as its text is
 * frequently missed entirely.
 *
 * It announces through `aria-live` without claiming `role="status"`. This is
 * the one region present on every table, and the empty state, the export
 * announcer and the reorder announcer each claim that role while they are on
 * screen — a permanent second status region would leave nothing able to
 * identify "the table's status".
 */
import {
  resolveTableStatus,
  type TableLabels,
  type TableSource,
  type TableStatusSignature,
} from "@adapttable/core";
import { sortedColumnName } from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type Injector,
  input,
  type Signal,
  signal,
  untracked,
} from "@angular/core";

import type { ColumnDef } from "../columnDef";
import { AdaptLiveRegion } from "./liveRegion";

/**
 * Announce a change to the table's rows politely.
 *
 * @public
 */
@Component({
  selector: "adapt-table-status-announcer",
  imports: [AdaptLiveRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      data-adapttable-part="table-status-announcer"
      [adaptLiveRegion]="announcement()"
      part="table-status-announcer"
    ></div>
  `,
})
export class AdaptTableStatusAnnouncer {
  /** What to announce, from {@link trackTableStatus}. Empty until something changes. */
  readonly announcement = input.required<string>();
}

/**
 * What the table announces after its rows settle. Only a move in the sort,
 * the count or the visible range can change the sentence, so a view-state
 * change that moves none of them leaves the region alone.
 *
 * Written every time, the empty result included: silence has to clear the
 * region, or a message repeated after a quiet settle never changes the text
 * and is never spoken.
 */
export function trackTableStatus<TRow>(
  source: Signal<TableSource<TRow>>,
  labels: Signal<Required<TableLabels>>,
  columns: Signal<readonly ColumnDef<TRow>[]>,
  injector: Injector
): Signal<string> {
  const inputs = computed(
    () => {
      const current = source();
      return {
        total: current.total,
        shown: current.rows.length,
        page: current.page,
        limit: current.limit,
        paged: current.paginationMode === "paged",
        sortBy: current.sortBy,
        sortDir: current.sortDir,
      };
    },
    {
      equal: (a, b) =>
        a.total === b.total &&
        a.shown === b.shown &&
        a.page === b.page &&
        a.limit === b.limit &&
        a.paged === b.paged &&
        a.sortBy === b.sortBy &&
        a.sortDir === b.sortDir,
    }
  );
  const announcement = signal("");
  let previous: TableStatusSignature | undefined;
  effect(
    () => {
      const current = inputs();
      untracked(() => {
        const next = resolveTableStatus(
          {
            ...current,
            labels: labels(),
            sortColumnName: sortedColumnName(columns(), current.sortBy),
          },
          previous
        );
        previous = next.signature;
        announcement.set(next.announcement);
      });
    },
    { injector }
  );
  return announcement.asReadonly();
}
