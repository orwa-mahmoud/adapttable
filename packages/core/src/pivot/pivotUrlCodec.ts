/**
 * The pivot state as a URL parameter — the encoding on its own, without the
 * hook that keeps it in sync.
 *
 * A pivot is the most expensive table state there is to rebuild by hand —
 * two axes, an order on each, and a measure list — which makes it the state
 * most worth putting in a link. It sits alongside sort, filters and column
 * layout for exactly the reason those do.
 *
 * The serialization is compact and readable rather than JSON-in-a-parameter:
 * `pivot=rows:region,team;cols:quarter;sum:amount`. A URL someone might read
 * or hand-edit should look like something, and the round trip is tested
 * rather than assumed.
 *
 * What travels is everything a reader can change: the two axes, the measures,
 * whether subtotals and grand totals are shown (`sub:0`, `grand:0`), and which
 * groups are folded (`hide:EU/Alpha`). A link that carried the axes and dropped
 * the rest would reopen showing numbers its sender had switched off, or lines
 * they had folded away, which is a different table from the one they sent.
 *
 * Only the departures are written. Subtotals and grand totals default to on, so
 * a parameter says so by staying silent about them — the same rule the density
 * and column-layout parameters follow. That is also what makes the encoding
 * backward compatible: a link or a saved view from before these fields existed
 * says nothing about them and reads back exactly as it always did.
 *
 * A function has no URL form, so a configuration carrying one keeps working
 * in memory and simply does not write that measure. A registered name is a
 * string, so it writes and reads like `sum` — the table that opens the link
 * still has to have registered the same name, or the cells stay empty.
 *
 * The codec lives apart from {@link usePivotUrlState} because the two ends of
 * that link do not run in the same place: the table writes the parameter in a
 * browser, and a route handler reads it in Node. Keeping the reading half free
 * of React is what lets `@adapttable/core/query` — and `@adapttable/server`
 * through it — decode the same string a backend never renders.
 */
import { EMPTY_PIVOT_CONFIG } from "./pivotConfigModel";
import { PATH_SEP } from "./pivotKeys";
import type { PivotConfig, PivotMeasure } from "./pivotModel";

/** The segment heads that are not an aggregation. */
const ROWS = "rows";
const COLUMNS = "cols";
const SUBTOTALS = "sub";
const GRAND_TOTALS = "grand";
const COLLAPSED = "hide";

/** What a flag that is off looks like. On is written by saying nothing. */
const OFF = "0";

/** Between the values of one folded path, once they are percent-encoded. */
const COLLAPSED_PATH_SEP = "/";
/** Between one folded path and the next. */
const COLLAPSED_SEP = ",";

/** Nothing folded, with a stable identity so a read cannot churn a memo. */
const NOTHING_COLLAPSED: readonly string[] = [];

/**
 * Everything the pivot parameter carries.
 *
 * @public
 */
export interface PivotUrlState {
  /** What to pivot, and how. */
  config: PivotConfig;
  /**
   * The keys of the folded subtotal lines — a `PivotRow.key`, which is what
   * `pivot`'s `collapsed` option matches against.
   */
  collapsed: readonly string[];
}

/** Segment heads the grammar already uses — not a measure name. */
const RESERVED = new Set<string>([
  ROWS,
  COLUMNS,
  SUBTOTALS,
  GRAND_TOTALS,
  COLLAPSED,
]);

/**
 * Decode one field, tolerating the malformed input a hand-edited URL brings.
 *
 * Local rather than shared with `url/serialize`: this module is one of the few a
 * backend reads a shared link with in a process where React is not installed,
 * and it stays that light by importing almost nothing.
 */
function decodeField(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * A folded path in URL form: `EU/Alpha`.
 *
 * A collapse key is dimension values joined by a control character, and those
 * values are user data — a team can be called "A/B" or "Q1,Q2". Each value is
 * percent-encoded, which escapes both the separators this grammar reserves and
 * the control character itself, so nothing in a label can split a path in the
 * wrong place.
 */
function encodeCollapsed(key: string): string {
  return key.split(PATH_SEP).map(encodeURIComponent).join(COLLAPSED_PATH_SEP);
}

/** The collapse key a URL path names. Inverse of {@link encodeCollapsed}. */
function decodeCollapsed(value: string): string {
  return value.split(COLLAPSED_PATH_SEP).map(decodeField).join(PATH_SEP);
}

/**
 * Write the whole pivot state as a URL parameter value.
 *
 * @param state - The configuration, and which groups are folded.
 * @returns The parameter value, or `""` when there is nothing to say.
 *
 * @public
 */
export function serializePivotState(state: PivotUrlState): string {
  const { config, collapsed } = state;
  const parts: string[] = [];
  if (config.rows.length > 0) parts.push(`${ROWS}:${config.rows.join(",")}`);
  if (config.columns.length > 0) {
    parts.push(`${COLUMNS}:${config.columns.join(",")}`);
  }
  for (const measure of config.measures) {
    // A function has no URL form. Omitting it beats writing `sum` and
    // quietly changing what the link computes.
    if (typeof measure.agg !== "string") continue;
    parts.push(`${measure.agg}:${measure.key}`);
  }
  // Nothing on either axis and nothing to compute is not a pivot, so it writes
  // no parameter at all — and it has no groups to fold, which is why the folded
  // set goes with it rather than lingering as the only thing in the link.
  if (parts.length === 0) return "";
  if (config.subtotals === false) parts.push(`${SUBTOTALS}:${OFF}`);
  if (config.grandTotals === false) parts.push(`${GRAND_TOTALS}:${OFF}`);
  const folded = collapsed
    .filter((key) => key !== "")
    .map((key) => encodeCollapsed(key));
  if (folded.length > 0) {
    parts.push(`${COLLAPSED}:${folded.join(COLLAPSED_SEP)}`);
  }
  return parts.join(";");
}

/**
 * Read the whole pivot state back from a URL parameter value.
 *
 * Unknown segments are ignored rather than throwing: a URL is user input,
 * and a hand-edited one should degrade to a simpler pivot instead of an
 * error page.
 *
 * @param raw - The parameter value.
 * @returns The configuration it describes, and which groups are folded.
 *
 * @public
 */
export function deserializePivotState(raw: string | null): PivotUrlState {
  if (!raw) return { config: EMPTY_PIVOT_CONFIG, collapsed: NOTHING_COLLAPSED };
  let rows: readonly string[] = [];
  let columns: readonly string[] = [];
  let collapsed: readonly string[] = NOTHING_COLLAPSED;
  let subtotals: boolean | undefined;
  let grandTotals: boolean | undefined;
  const measures: PivotMeasure[] = [];
  for (const part of raw.split(";")) {
    const at = part.indexOf(":");
    if (at < 0) continue;
    const head = part.slice(0, at);
    const body = part.slice(at + 1);
    if (body === "") continue;
    if (head === ROWS) rows = body.split(",");
    else if (head === COLUMNS) columns = body.split(",");
    else if (head === SUBTOTALS) subtotals = body !== OFF;
    else if (head === GRAND_TOTALS) grandTotals = body !== OFF;
    else if (head === COLLAPSED) {
      collapsed = body
        .split(COLLAPSED_SEP)
        // An empty entry — `hide:,EU` from a hand-edited URL — names no group.
        .filter((key) => key !== "")
        .map((key) => decodeCollapsed(key));
    } else if (!RESERVED.has(head)) {
      measures.push({ key: body, agg: head });
    }
  }
  return {
    config: {
      rows,
      columns,
      measures,
      // Absent rather than `true`: a parameter that said nothing about them is a
      // parameter that leaves the engine's own defaults in charge.
      ...(subtotals === undefined ? {} : { subtotals }),
      ...(grandTotals === undefined ? {} : { grandTotals }),
    },
    collapsed,
  };
}

/**
 * Write a configuration as a URL parameter value.
 *
 * @param config - The configuration to serialize.
 * @returns The parameter value, or `""` when there is nothing to say.
 *
 * @public
 */
export function serializePivot(config: PivotConfig): string {
  return serializePivotState({ config, collapsed: NOTHING_COLLAPSED });
}

/**
 * Read a configuration back from a URL parameter value.
 *
 * @param raw - The parameter value.
 * @returns The configuration it describes.
 *
 * @public
 */
export function deserializePivot(raw: string | null): PivotConfig {
  return deserializePivotState(raw).config;
}
