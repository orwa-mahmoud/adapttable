import {
  resolveTableStatus,
  type TableLabels,
  type TableSource,
  type TableStatusSignature,
} from "@adapttable/core";
import { sortedColumnName } from "@adapttable/core/binding";
import {
  computed,
  effect,
  type Injector,
  type Signal,
  signal,
  untracked,
} from "@angular/core";

import type { ColumnDef } from "../columnDef";

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
