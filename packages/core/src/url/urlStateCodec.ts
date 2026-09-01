import {
  FILTER_PREFIX,
  PARAM_COL_GROUPS,
  PARAM_COL_HIDDEN,
  PARAM_COL_ORDER,
  PARAM_COL_PINNED,
  PARAM_COL_WIDTHS,
  PARAM_DENSITY,
  PARAM_FILTER_TREE,
  PARAM_FORMULA,
  PARAM_GROUP_BY,
  PARAM_GROUP_CLOSED,
  PARAM_LIMIT,
  PARAM_PAGE,
  PARAM_PIVOT,
  PARAM_ROW_PIN,
  PARAM_SEARCH,
  PARAM_SORT,
  PARAM_SORT_BY,
  PARAM_SORT_DIR,
} from "./serialize";

/** Current table URL-state schema marker. */
export const PARAM_URL_STATE_VERSION = "atv";

/** Largest canonical query-string slice accepted for one table. */
export const MAX_TABLE_URL_STATE_LENGTH = 8192;

const CURRENT_URL_STATE_VERSION = "1";

/** Fixed parameter names owned by one table namespace. */
const TABLE_PARAM_NAMES: readonly string[] = [
  PARAM_URL_STATE_VERSION,
  PARAM_PAGE,
  PARAM_LIMIT,
  PARAM_SEARCH,
  PARAM_SORT_BY,
  PARAM_SORT_DIR,
  PARAM_SORT,
  PARAM_GROUP_BY,
  PARAM_COL_HIDDEN,
  PARAM_COL_PINNED,
  PARAM_COL_ORDER,
  PARAM_COL_WIDTHS,
  PARAM_COL_GROUPS,
  PARAM_ROW_PIN,
  PARAM_FILTER_TREE,
  PARAM_GROUP_CLOSED,
  PARAM_DENSITY,
  PARAM_PIVOT,
  PARAM_FORMULA,
];

/** Whether a query parameter is recognized state for this table. */
export function ownsTableUrlParam(key: string, namespace: string): boolean {
  return (
    TABLE_PARAM_NAMES.some((name) => key === namespace + name) ||
    key.startsWith(namespace + FILTER_PREFIX)
  );
}

/**
 * Collect recognized state in source order, normalizing duplicate keys with
 * the first value winning.
 */
function inspectTableParams(
  params: URLSearchParams,
  namespace: string
): { canonical: URLSearchParams; serializedLength: number } {
  const canonical = new URLSearchParams();
  const serialized = new URLSearchParams();
  const seen = new Set<string>();
  params.forEach((value, key) => {
    if (!ownsTableUrlParam(key, namespace)) return;
    serialized.append(key, value);
    if (seen.has(key)) return;
    seen.add(key);
    canonical.append(key, value);
  });
  return { canonical, serializedLength: serialized.toString().length };
}

function isCurrentAndWithinLimit(
  table: ReturnType<typeof inspectTableParams>,
  namespace: string
): boolean {
  const marker = table.canonical.get(namespace + PARAM_URL_STATE_VERSION);
  if (marker !== null && marker !== CURRENT_URL_STATE_VERSION) return false;
  return table.serializedLength <= MAX_TABLE_URL_STATE_LENGTH;
}

/**
 * Parse one table's recognized query state. Unknown app/table parameters are
 * outside the returned slice. An absent marker is version 1; an unknown marker
 * or oversized slice yields an empty namespace.
 */
export function parseTableUrlState(
  search: string,
  namespace: string
): URLSearchParams {
  const table = inspectTableParams(new URLSearchParams(search), namespace);
  return isCurrentAndWithinLimit(table, namespace)
    ? table.canonical
    : new URLSearchParams();
}

function replaceOwnedParams(
  all: URLSearchParams,
  table: URLSearchParams,
  namespace: string
): void {
  const stale: string[] = [];
  all.forEach((_, key) => {
    if (ownsTableUrlParam(key, namespace)) stale.push(key);
  });
  for (const key of stale) all.delete(key);
  table.forEach((value, key) => {
    all.append(key, value);
  });
}

/**
 * Update one table's recognized state while preserving every unrelated,
 * unknown, and differently-namespaced parameter.
 *
 * Invalid incoming state starts from an empty namespace. Every successful
 * write stamps the current marker. If the proposal exceeds the per-table cap,
 * the previous valid state is retained and stamped instead.
 */
function writeTableUrlState(
  search: string,
  namespace: string,
  mutate: (table: URLSearchParams) => void,
  rejectProposal: boolean
): string {
  const all = new URLSearchParams(search);
  const incoming = inspectTableParams(all, namespace);
  const incomingValid = isCurrentAndWithinLimit(incoming, namespace);
  const previous = incomingValid ? incoming.canonical : new URLSearchParams();
  const proposed = new URLSearchParams(previous);

  mutate(proposed);
  proposed.set(namespace + PARAM_URL_STATE_VERSION, CURRENT_URL_STATE_VERSION);
  const proposal = inspectTableParams(proposed, namespace);
  const next =
    !rejectProposal && proposal.serializedLength <= MAX_TABLE_URL_STATE_LENGTH
      ? proposal.canonical
      : new URLSearchParams(previous);
  next.set(namespace + PARAM_URL_STATE_VERSION, CURRENT_URL_STATE_VERSION);
  // An unmarked incoming slice can sit exactly at the cap, leaving no room
  // for the marker. Missing already means v1, so retain that valid slice
  // unmarked instead of erasing it while rejecting an oversized proposal.
  if (next.toString().length > MAX_TABLE_URL_STATE_LENGTH) {
    next.delete(namespace + PARAM_URL_STATE_VERSION);
  }

  replaceOwnedParams(all, next, namespace);
  return all.toString();
}

export function updateTableUrlState(
  search: string,
  namespace: string,
  mutate: (table: URLSearchParams) => void
): string {
  return writeTableUrlState(search, namespace, mutate, false);
}

/** Capture a canonical, current-version table slice for Saved Views. */
export function captureTableUrlState(
  search: string,
  namespace: string
): string {
  const table = parseTableUrlState(search, namespace);
  table.set(namespace + PARAM_URL_STATE_VERSION, CURRENT_URL_STATE_VERSION);
  if (table.toString().length > MAX_TABLE_URL_STATE_LENGTH) {
    table.delete(namespace + PARAM_URL_STATE_VERSION);
  }
  return table.toString();
}

/**
 * Replace one table's state from an external table-scoped query string.
 * Unknown or malformed versions contribute no recognized state.
 */
export function applyTableUrlState(
  search: string,
  savedSearch: string,
  namespace: string
): string {
  const saved = inspectTableParams(new URLSearchParams(savedSearch), namespace);
  const marker = saved.canonical.get(namespace + PARAM_URL_STATE_VERSION);
  const markerValid = marker === null || marker === CURRENT_URL_STATE_VERSION;

  return writeTableUrlState(
    search,
    namespace,
    (table) => {
      for (const key of [...table.keys()]) table.delete(key);
      if (!markerValid) return;
      saved.canonical.forEach((value, key) => {
        if (key !== namespace + PARAM_URL_STATE_VERSION) {
          table.append(key, value);
        }
      });
    },
    saved.serializedLength > MAX_TABLE_URL_STATE_LENGTH
  );
}
