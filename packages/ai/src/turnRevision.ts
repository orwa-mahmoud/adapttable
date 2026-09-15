/**
 * The revision one turn's actions are bound to.
 *
 * A turn is planned against a view. Between the planning and the running, the
 * table can move for reasons the turn knows nothing about — another writer, a
 * source update, the reader themselves — and an action that then executes
 * against "wherever the table is now" applies to a view nobody planned it for.
 *
 * So a turn carries two facts and asks for nothing else: the revision the
 * current phase or request was planned against, and the revision this turn's
 * OWN actions have proven the table reached. Every transport binds its actions
 * the same way, because which transport a developer chose is not a reason for
 * a weaker rule.
 */
import type { ExecuteResult } from "./types";

/** The revision bookkeeping for one turn. @internal */
export interface TurnRevision {
  /** What this turn's own actions have proven the table reached. */
  readonly revision: () => number;
  /**
   * The revision to execute an action against.
   *
   * @param planned - The revision of the view this phase or request was
   *   planned against.
   * @param named - A revision the backend named for this action, which is its
   *   own claim about what it saw and goes through untouched — including when
   *   it equals the planned one, which is a backend saying so deliberately
   *   rather than a value worth second-guessing.
   */
  readonly expected: (planned: number, named?: number) => number;
  /** Record what an action settled at. Only a successful action proves one. */
  readonly settled: (result: ExecuteResult) => void;
}

/**
 * Open the bookkeeping for a turn that starts at `opening`.
 *
 * @param opening - The revision the turn was admitted at.
 * @returns The three questions a transport asks while it runs the turn.
 *
 * @internal
 */
export function createTurnRevision(opening: number): TurnRevision {
  // What THIS turn's own actions have produced, and nothing else. A phase can
  // be planned ahead of it because something outside the turn moved the table;
  // adopting that as progress is how an unrelated change gets absorbed into a
  // turn that never made it.
  let ours = opening;
  return {
    revision: () => ours,
    // `ours` exceeds `planned` exactly when this turn caused the difference.
    expected: (planned, named) => named ?? Math.max(ours, planned),
    settled: (result) => {
      // The revision the session reported for THIS action. Reading the
      // manifest instead would pick up anything that landed during the await
      // and count it as this turn's progress.
      if (result.ok) ours = result.revision;
    },
  };
}
