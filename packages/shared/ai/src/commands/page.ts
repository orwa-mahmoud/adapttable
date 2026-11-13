/** `view.setPage`, and the pages an observation describes. */
import { withEnum } from "../liveSchemas";
import {
  type AgentPagination,
  agentPagination,
  pageRefusal,
  pageSizeRefusal,
} from "../pagination";
import type { AgentObservation, CapabilityGuide } from "../types";
import { ApplyError, assertApply, type TableCommand } from "./command";
import { objectSchema, okWith } from "./schema";

/**
 * The pages an observation describes.
 *
 * A host that states its own {@link AgentPagination} is the authority. One
 * that still supplies only `pageMax` is read as naming a page count, which is
 * what the field has always meant even where a binding filled it with a row
 * count.
 */
export function observedPagination(
  observation: AgentObservation
): AgentPagination {
  return (
    observation.pagination ??
    agentPagination({
      page: observation.page,
      pageSize: observation.limit,
      totalRows: observation.pageMax * observation.limit,
      canJump: true,
    })
  );
}

/**
 * Why this table will not serve that page, or `undefined`.
 *
 * Checked mechanically on this side of the wire against the numbers the source
 * supplied: a page number is arithmetic, and arithmetic is the last thing a
 * model should be trusted with.
 */
function pageRefusalFor(
  observation: AgentObservation,
  body: Record<string, unknown>
): string | undefined {
  const current = observedPagination(observation);
  if (typeof body.limit === "number") {
    const size = pageSizeRefusal(current, body.limit);
    if (size) return size;
  }
  // A size change rewrites how many pages exist. Checking the page against
  // the size still on screen would refuse a page the new size has, or allow
  // one it no longer does.
  const pages =
    typeof body.limit === "number"
      ? agentPagination({
          page: current.page,
          pageSize: body.limit,
          canJump: current.canJump,
          ...(current.pageSizeOptions
            ? { pageSizeOptions: current.pageSizeOptions }
            : {}),
          ...(current.totalRows === undefined
            ? {}
            : { totalRows: current.totalRows }),
        })
      : current;
  return pageRefusal(pages, body.page);
}

/**
 * The page sizes this table's own control offers, as schema rather than
 * as a free integer. A caller that can write `5` when the table offers
 * `10, 25, 50` finds out by being refused; an `enum` stops the guess.
 */
function describePage(
  guide: CapabilityGuide,
  observation: AgentObservation
): CapabilityGuide {
  const sizes = observedPagination(observation).pageSizeOptions;
  if (!sizes?.length) return guide;
  const input = withEnum(guide.input, "limit", sizes);
  const listed = ` Page sizes this table offers: ${sizes.join(", ")}.`;
  return {
    ...guide,
    guide: guide.guide + listed,
    ...(input ? { input } : {}),
  };
}

export const setPageCommand: TableCommand<"view.setPage"> = {
  key: "view.setPage",
  summary: "Change the current page.",
  guide:
    "Move to a 1-based page. A `limit` is a page size the table's own " +
    "control offers — send one of those ids, never an arbitrary count. " +
    "Omit `limit` when only the page should move. Rejects a stale view " +
    "revision.",
  input: objectSchema(
    {
      page: { type: "integer", minimum: 1 },
      limit: { type: "integer", minimum: 1 },
    },
    ["page"]
  ),
  output: okWith({
    page: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1 },
  }),
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) => observation.hasPagination,
  describe: describePage,
  apply: ({ context: { apply, observation }, body }) => {
    const refusal = pageRefusalFor(observation, body);
    if (refusal) throw new ApplyError("apply-failed", refusal);
    const page = body.page as number;
    const currentSize = observedPagination(observation).pageSize;
    const nextLimit = typeof body.limit === "number" ? body.limit : currentSize;
    // The table's own `setLimit` resets the page — that is what a human rows-
    // per-page control does. A caller that names both (or restates the size
    // already on screen) would lose the page move if the size ran last. Skip a
    // size that has not changed, and apply a new size before the page.
    if (nextLimit !== currentSize) {
      assertApply(apply, "setLimit");
      apply.setLimit(nextLimit);
    }
    assertApply(apply, "setPage");
    apply.setPage(page);
    return {
      ok: true,
      revision: observation.viewRevision + 1,
      page,
      limit: nextLimit,
    };
  },
};
