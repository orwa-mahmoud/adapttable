/**
 * The revision one turn's actions are bound to.
 *
 * A plan is written against a view. Between the writing and the running, the
 * table can move for reasons the plan knows nothing about — another writer, a
 * source update, the reader themselves — and running it against "wherever the
 * table is now" applies it to a view nobody planned it for.
 *
 * Each action is therefore checked against either the view the plan named or
 * a later revision one of this turn's own actions proved. A successful read
 * or no-op proves no movement, and a live revision that merely appeared
 * between calls belongs to somebody else; neither may rebase the plan.
 *
 * Every transport binds its plans the same way, because which transport a
 * developer chose is not a reason for a different rule.
 */
import type { ExecuteResult } from "./types";

/** The revision bookkeeping for one turn. @internal */
export interface TurnRevision {
  /** What this turn's own actions have proven the table reached. */
  readonly revision: () => number;
  /**
   * Open a plan, to be checked against the view it was written for.
   *
   * @param planned - The revision of the view this plan was written against.
   */
  readonly opens: (planned: number) => void;
  /**
   * The revision to run the open plan's next action against.
   *
   * @param named - A revision the backend named for this action, which is its
   *   own claim about what it saw and goes through untouched — including when
   *   it equals the planned one, which is a backend saying so deliberately
   *   rather than a value worth second-guessing.
   */
  readonly expected: (named?: number) => number;
  /** Record what an action settled at. Only a successful action proves one. */
  readonly settled: (result: ExecuteResult) => void;
}

/**
 * Open the bookkeeping for a turn that starts at `opening`.
 *
 * @param opening - The revision the turn was admitted at.
 * @returns The four questions a transport asks while it runs the turn.
 *
 * @internal
 */
export function createTurnRevision(opening: number): TurnRevision {
  // What THIS turn's own actions have produced, and nothing else. A plan can
  // be written ahead of it because something outside the turn moved the table;
  // adopting that as progress is how an unrelated change gets absorbed into a
  // turn that never made it.
  let ours = opening;
  // The view the open plan was written against. A plan can name an earlier
  // revision than `ours` when it was prepared before this turn's prior action
  // settled; `Math.max` below carries that proven progress forward.
  let planned = opening;
  return {
    revision: () => ours,
    opens: (against) => {
      planned = against;
    },
    expected: (named) => {
      if (named !== undefined) return named;
      // `ours` exceeds `planned` exactly when this turn caused the difference.
      return Math.max(ours, planned);
    },
    settled: (result) => {
      if (!result.ok) return;
      // The revision the session reported for THIS action. Reading the
      // manifest instead would pick up anything that landed during the await
      // and count it as this turn's progress.
      ours = result.revision;
    },
  };
}
