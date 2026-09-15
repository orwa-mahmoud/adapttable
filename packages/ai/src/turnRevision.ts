/**
 * The revision one turn's actions are bound to.
 *
 * A plan is written against a view. Between the writing and the running, the
 * table can move for reasons the plan knows nothing about — another writer, a
 * source update, the reader themselves — and running it against "wherever the
 * table is now" applies it to a view nobody planned it for.
 *
 * So the view is checked where the check means something: once, as a plan
 * opens. The actions inside a plan were written together, in order, each
 * expecting the one before it to have landed — the filter that narrows the
 * rows and the sort that orders what is left are one intention, not two
 * independent claims about the same view. Re-checking the second against the
 * view the first has just moved refuses a plan for its own progress.
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
   * @param live - The revision the table is at now.
   * @param named - A revision the backend named for this action, which is its
   *   own claim about what it saw and goes through untouched — including when
   *   it equals the planned one, which is a backend saying so deliberately
   *   rather than a value worth second-guessing.
   */
  readonly expected: (live: number, named?: number) => number;
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
  // The view the open plan was written against, and whether one of its own
  // actions has already moved the table.
  let planned = opening;
  let moved = false;
  return {
    revision: () => ours,
    opens: (against) => {
      planned = against;
      moved = false;
    },
    expected: (live, named) => {
      if (named !== undefined) return named;
      // Everything after the plan's first successful action is that action's
      // consequence. The table is where this plan put it, and the check that
      // mattered has already run.
      if (moved) return live;
      // `ours` exceeds `planned` exactly when this turn caused the difference.
      return Math.max(ours, planned);
    },
    settled: (result) => {
      if (!result.ok) return;
      // The revision the session reported for THIS action. Reading the
      // manifest instead would pick up anything that landed during the await
      // and count it as this turn's progress.
      ours = result.revision;
      moved = true;
    },
  };
}
