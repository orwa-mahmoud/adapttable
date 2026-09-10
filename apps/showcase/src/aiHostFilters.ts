/**
 * Host-owned extra bag after the session has already validated it.
 *
 * The live catalog lists this page's `team` and `status` multiSelects.
 * Scripted examples send `{ team: ["Core"] }`; a connected model may send
 * the same extras or `{ key, op, value }` conditions.
 */

export interface HostFilterRow {
  readonly team: string;
  readonly status: string;
}

export interface HostFilterState {
  readonly teams?: readonly string[];
  readonly statuses?: readonly string[];
}

export function stringList(value: unknown): readonly string[] | undefined {
  if (typeof value === "string" && value.length > 0) return [value];
  if (Array.isArray(value)) {
    const next = value.filter(
      (item): item is string => typeof item === "string"
    );
    return next.length > 0 ? next : undefined;
  }
  return undefined;
}

export function hostStateFromLists(
  teams: readonly string[] | undefined,
  statuses: readonly string[] | undefined
): HostFilterState {
  return {
    ...(teams ? { teams } : {}),
    ...(statuses ? { statuses } : {}),
  };
}

export function hostFiltersFromConditions(
  filters: readonly unknown[]
): HostFilterState {
  const teams: string[] = [];
  const statuses: string[] = [];
  for (const entry of filters) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const column = record.column ?? record.key ?? record.field;
    const values = stringList(record.value);
    if (!values) continue;
    if (column === "team") teams.push(...values);
    if (column === "status") statuses.push(...values);
  }
  return hostStateFromLists(
    teams.length > 0 ? teams : undefined,
    statuses.length > 0 ? statuses : undefined
  );
}

export function hostFiltersFromBag(filters: unknown): HostFilterState {
  if (Array.isArray(filters)) return hostFiltersFromConditions(filters);
  if (!filters || typeof filters !== "object") return {};
  const record = filters as Record<string, unknown>;
  if (record.filters !== undefined) return hostFiltersFromBag(record.filters);
  return hostStateFromLists(stringList(record.team), stringList(record.status));
}

export function rowMatchesHostFilters(
  row: HostFilterRow,
  filters: HostFilterState
): boolean {
  if (filters.teams && !filters.teams.includes(row.team)) return false;
  if (filters.statuses && !filters.statuses.includes(row.status)) return false;
  return true;
}

export function applyHostFilters<T extends HostFilterRow>(
  rows: readonly T[],
  filters: HostFilterState
): readonly T[] {
  if (!filters.teams && !filters.statuses) return rows;
  return rows.filter((row) => rowMatchesHostFilters(row, filters));
}
