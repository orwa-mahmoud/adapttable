/** `view.setSearch` and `view.setFilters`. */
import { extrasFromAgentFilters, formatFilterCatalog } from "../filterCatalog";
import { withFilterBag } from "../liveSchemas";
import { isString, renameArg } from "./argNames";
import { assertApply, hasFeature, type TableCommand } from "./command";
import { objectSchema, okWith } from "./schema";

/** Set the toolbar search, and say which string landed. */
export const setSearchCommand: TableCommand<"view.setSearch"> = {
  key: "view.setSearch",
  summary: "Change the search query.",
  guide:
    "Set the toolbar search string. Empty string clears it. The result " +
    "carries the string that was applied.",
  input: objectSchema({ query: { type: "string" } }, ["query"]),
  output: okWith({ query: { type: "string" } }),
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) => observation.hasSearch,
  // The guide says `query`; the capability is called `setSearch` and the
  // table calls the thing a search, so `search` is what a model reaches for.
  // The guide is still the authority — this only accepts the near-miss rather
  // than making a reader read "$.query is required" about a search that
  // worked.
  normalize: (record) => renameArg(record, "search", "query", isString),
  apply: ({ context: { apply, observation }, body }) => {
    assertApply(apply, "setSearch");
    const query = typeof body.query === "string" ? body.query : "";
    apply.setSearch(query);
    return { ok: true, revision: observation.viewRevision + 1, query };
  },
};

/**
 * Replace the extra filter bag, and say which bag landed.
 *
 * Three argument shapes reduce to one bag, and a bare `ok` leaves the caller
 * unable to tell which reading it got — so it sends the request again in
 * another shape, and the reader watches one filter land four times.
 */
export const setFiltersCommand: TableCommand<"view.setFilters"> = {
  key: "view.setFilters",
  summary: "Replace the active filters.",
  guide:
    "Replace the extra filter bag. Send `{}` to clear. Eligible filters, " +
    "operators and (when small enough) options are listed when this " +
    "capability is described against the live table. Use those extra-bag " +
    "keys — for a number filter that is `salaryMin` / `salaryMax` / " +
    "`salaryOp`, not `{ salary: { gt: 10000 } }`. You may also send an " +
    "array of `{ key, op, value }` conditions; they become the same bag. " +
    "Never invent a filter, operator or option that is not listed. The " +
    "result carries the bag that was applied, so there is no need to send " +
    "the same filter again in another shape.",
  input: objectSchema({ filters: {} }, ["filters"]),
  output: okWith({ filters: { type: "object" } }),
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) =>
    hasFeature(observation, "filters") && observation.hasFilters,
  describe: (guide, observation) => {
    const catalog = observation.availableFilters;
    const input = withFilterBag(guide.input, catalog);
    return {
      ...guide,
      guide: guide.guide + formatFilterCatalog(catalog),
      // The keys and values this table actually takes, as schema rather than
      // as a sentence about schema. A caller reading the input can no longer
      // spell an option it was never offered.
      ...(input ? { input } : {}),
    };
  },
  apply: ({ context: { apply, observation }, body }) => {
    assertApply(apply, "setFilters");
    const extras = extrasFromAgentFilters(
      body.filters,
      observation.availableFilters
    );
    apply.setFilters(extras);
    return {
      ok: true,
      revision: observation.viewRevision + 1,
      filters: extras,
    };
  },
};
