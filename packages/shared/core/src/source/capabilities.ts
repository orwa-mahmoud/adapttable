/**
 * What a source can genuinely do, declared rather than guessed.
 *
 * For most of v2 the table worked this out by looking at which optional
 * fields a source happened to set: `allFilteredRows` present meant the whole
 * dataset was reachable, `groups` present meant the server had grouped. That
 * reads as a capability but is really a coincidence of shape — a source that
 * sets a field for one reason silently unlocks a feature for another, and a
 * source that cannot answer says nothing at all until the reader clicks and
 * gets one page where they asked for everything.
 *
 * A source now says what it supports. The inference is still here, in one
 * function, as the compatibility layer that fills the contract for a source
 * that predates it — so nothing changes for existing consumers, and there is
 * exactly one place that decides.
 */
import type { QuerySupport } from "../contracts/query";
import type {
  CapabilitySource,
  GroupingCapability,
  TableSourceCapabilities,
} from "../contracts/source";
export type {
  CapabilitySource,
  ExportScopeCapability,
  GroupingCapability,
  TableSourceCapabilities,
  TotalCountCapability,
} from "../contracts/source";

/** What a source that answers nothing beyond one page can do. */
const PAGE_ONLY: TableSourceCapabilities = {
  fullDataset: false,
  grouping: false,
  selectAcrossPages: false,
  exportScope: "page",
  totalCount: "loaded",
};

/** Where grouping can run once the server is out of the picture. */
function clientOrNothing(fullDataset: boolean): GroupingCapability {
  return fullDataset ? "client" : false;
}

/**
 * The capabilities of a source, declared or inferred.
 *
 * A source that states its own wins outright — that is the point of the
 * contract. Everything else is read from the shape it happens to have, which
 * is exactly what the table did before and is why behaviour is unchanged
 * until a source opts in.
 *
 * @public
 */
export function sourceCapabilities(
  source: CapabilitySource,
  support?: QuerySupport
): TableSourceCapabilities {
  if (source.capabilities) return source.capabilities;
  const fullDataset = source.allFilteredRows !== undefined;
  const serverGrouping =
    support?.grouping === true || source.groups !== undefined;
  const counted = (source.total ?? 0) > 0;
  const grouping = clientOrNothing(fullDataset);
  return {
    ...PAGE_ONLY,
    fullDataset,
    grouping: serverGrouping ? "server" : grouping,
    // "All N matching" is a claim about rows the reader cannot see, so it
    // needs either the rows themselves or a server that counted them.
    selectAcrossPages: fullDataset || counted,
    exportScope: fullDataset ? "all" : "page",
    totalCount: fullDataset || counted ? "exact" : "loaded",
    ...(support?.aggregateOperations
      ? { aggregateOperations: support.aggregateOperations }
      : {}),
  };
}

/**
 * Why a control is disabled, in the reader's language.
 *
 * A capability that is missing is not an error, and the table already draws
 * the consequence; this is the sentence that says which fact caused it, so a
 * kit can attach it to the disabled control rather than leaving the reader to
 * guess.
 *
 * @public
 */
export function capabilityReason(
  capability: keyof TableSourceCapabilities
): string {
  switch (capability) {
    case "fullDataset":
      return "This source provides one page at a time, not the full filtered set.";
    case "grouping":
      return "Grouping is off — this source cannot group.";
    case "selectAcrossPages":
      return "Selection covers the rows on screen — this source does not count the rest.";
    case "exportScope":
      return "Export all is off — this source provides one page at a time.";
    case "totalCount":
      return "The row count is what has loaded, not the whole set.";
    case "aggregateOperations":
      return "This source did not name the aggregate operations it can compute.";
  }
}
