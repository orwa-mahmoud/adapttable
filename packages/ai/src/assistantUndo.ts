/**
 * Putting one assistant turn back.
 *
 * A turn that moves the table should be as easy to reverse as it was to ask
 * for. What makes that safe is being exact about *what* is put back and *when*
 * the offer is still honest:
 *
 * - **Only the view.** The sanitized view — page, size, search, sort,
 *   grouping and the permitted filter state — is captured before a turn's
 *   calls run and restored through the same capabilities the agent used. A
 *   write is not part of it: staging, save and the edit history own that, and
 *   a second undo path over the same edits would be a second answer.
 * - **Only while nothing it restores has moved.** The offer stands while the
 *   fields this plan puts back still hold what the turn left in them. The
 *   reader scrolling to another page, a second agent, a source refresh or a
 *   later turn all end it — and the reason is reported rather than the control
 *   quietly doing the wrong thing. A revision that moved for some OTHER
 *   reason does not: a write the reader approved after the turn settled bumps
 *   it without touching the sort an undo would restore, and killing the offer
 *   over that leaves a control that is drawn and can never be used.
 * - **Only what a permitted capability can restore.** A field that changed and
 *   has no enabled capability to put it back blocks the whole undo. A partial
 *   restore that silently leaves the table half-way is worse than none.
 *
 * The restore runs through `session.execute`, so it meets the same exclusion
 * predicate, revision check and policy as everything else.
 *
 * @packageDocumentation
 */
import type { AgentContextView } from "./contextSnapshot";
import type { AgentSession, ExecuteResult } from "./types";

/** One capability call that puts part of the view back. @public */
export interface UndoCall {
  readonly key: string;
  readonly args: Readonly<Record<string, unknown>>;
}

/** What a turn changed, and how to put it back. @public */
export interface AssistantUndo {
  /** The view as it was before the turn's calls ran. */
  readonly before: AgentContextView;
  /** The view the turn left behind, for reading whether it still stands. */
  readonly after: AgentContextView;
  /** The revision the turn's own calls settled at. */
  readonly settledAt: number;
  /** The view fields this plan puts back. */
  readonly moved: readonly string[];
  /** The calls that restore it, in the order they run. */
  readonly calls: readonly UndoCall[];
}

/** Why an undo is not on offer. @public */
export type UndoBlock =
  | { readonly code: "nothing-to-undo" }
  | {
      /** Something changed that no enabled capability can restore. */
      readonly code: "cannot-restore";
      readonly fields: readonly string[];
    }
  | {
      /** The table has moved since the turn settled. */
      readonly code: "table-moved";
      readonly settledAt: number;
      readonly now: number;
    };

/** Which capability restores which view field. */
const RESTORES: Readonly<Record<string, string>> = {
  page: "view.setPage",
  limit: "view.setPage",
  search: "view.setSearch",
  sortBy: "view.setSort",
  sortDir: "view.setSort",
  groupBy: "view.setGroupBy",
  filters: "view.setFilters",
  pinnedColumns: "view.pinColumn",
  pinnedRows: "view.pinRow",
};

/** Fields compared between the two views, in restore order. */
const FIELDS = [
  "page",
  "limit",
  "search",
  "sortBy",
  "sortDir",
  "groupBy",
  "filters",
  "pinnedColumns",
  "pinnedRows",
] as const;

type ViewField = (typeof FIELDS)[number];

function read(view: AgentContextView, field: ViewField): unknown {
  return (view as unknown as Record<string, unknown>)[field];
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The call that puts one field back, or nothing when this field is restored
 * by a call another field already produced.
 */
function restoreCall(
  field: ViewField,
  before: AgentContextView,
  moved: readonly ViewField[]
): UndoCall {
  switch (field) {
    case "page":
    case "limit":
      // One call carries both: `view.setPage` takes the page and may take the
      // size, and issuing two would move the table twice.
      //
      // The size travels only when the size actually moved. `view.setPage`
      // refuses a `limit` on a table that wires no `setLimit`, so naming one
      // that changed nothing would turn an ordinary page undo into a refusal.
      return {
        key: "view.setPage",
        args: {
          page: before.page,
          ...(moved.includes("limit") ? { limit: before.limit } : {}),
        },
      };
    case "search":
      return { key: "view.setSearch", args: { query: before.search } };
    case "sortBy":
    case "sortDir":
      // A null key is how the guide says "no sort", which is what a turn that
      // introduced one has to be put back to.
      return {
        key: "view.setSort",
        args: {
          key: before.sortBy ?? null,
          ...(before.sortDir ? { dir: before.sortDir } : {}),
        },
      };
    case "groupBy":
      return { key: "view.setGroupBy", args: { key: before.groupBy ?? null } };
    case "filters":
      return {
        key: "view.setFilters",
        args: { filters: before.filters ?? {} },
      };
    case "pinnedColumns":
    case "pinnedRows":
      // Unreachable: `planUndo` names these unrestorable before it gets here.
      // Pinning is addressed one column or row at a time, and the sanitized
      // view carries the host's own shape rather than a list this can walk.
      throw new Error(`${field} is not restorable from the view`);
  }
}

/**
 * Work out how to put a turn back.
 *
 * @param before - The view captured before the turn's calls ran.
 * @param after - The view now that they have.
 * @param session - The live session, for what is still permitted.
 * @param settledAt - The revision the turn's own calls settled at.
 * @returns The undo, or why there is not one.
 *
 * @public
 */
export function planUndo(
  before: AgentContextView,
  after: AgentContextView,
  session: AgentSession,
  settledAt: number
): AssistantUndo | UndoBlock {
  const enabled = new Set(session.catalog().map((entry) => entry.key));
  const moved = FIELDS.filter(
    (field) => !same(read(before, field), read(after, field))
  );
  if (moved.length === 0) return { code: "nothing-to-undo" };

  const unrestorable = moved.filter((field) => {
    if (field === "pinnedColumns" || field === "pinnedRows") return true;
    const key = RESTORES[field];
    return key === undefined || !enabled.has(key);
  });
  if (unrestorable.length > 0) {
    return { code: "cannot-restore", fields: unrestorable };
  }

  const calls: UndoCall[] = [];
  for (const field of moved) {
    const call = restoreCall(field, before, moved);
    // `page` and `limit` — and `sortBy` and `sortDir` — share one call.
    if (calls.some((existing) => existing.key === call.key)) continue;
    calls.push(call);
  }
  return { before, after, settledAt, moved, calls };
}

/** Whether a plan is a plan, or the reason there is none. @public */
export function isUndoBlock(
  value: AssistantUndo | UndoBlock
): value is UndoBlock {
  return "code" in value;
}

/**
 * Whether the offer still stands.
 *
 * @param session - The live session.
 * @param undo - The plan made when the turn settled.
 * @param view - The live view. Without it the revision alone decides, which
 * is the stricter reading: any movement at all retires the offer.
 * @returns Nothing when the undo is still safe, or why it is not.
 *
 * @public
 */
export function undoBlocked(
  session: AgentSession,
  undo: AssistantUndo,
  view?: AgentContextView
): UndoBlock | undefined {
  const now = session.manifest().viewRevision;
  if (now === undo.settledAt) return undefined;
  // The revision moved. What matters is whether it moved anything this plan
  // would put back: a write the reader approved after the turn settled bumps
  // the revision without touching the sort or the filter the undo restores,
  // and retiring the offer over it kills a control that would have worked.
  if (view) {
    const clobbered = undo.moved.filter(
      (field) =>
        !same(
          read(undo.after, field as ViewField),
          read(view, field as ViewField)
        )
    );
    if (clobbered.length === 0) return undefined;
  }
  // Whoever moved it — the reader, another agent, a refresh, a later turn —
  // the table is no longer the one this plan describes.
  return { code: "table-moved", settledAt: undo.settledAt, now };
}

/**
 * Put the turn back.
 *
 * @param session - The live session. Every call goes through its executor.
 * @param undo - The plan made when the turn settled.
 * @param idempotencyKey - Replay identity for this undo, issued by the caller.
 * @param signal - Cancellation.
 * @returns One result per call, in the order they ran. Stops at the first
 *   failure rather than carrying on into a half-restored view.
 * @throws When the table has moved since the plan was made.
 *
 * @public
 */
export async function runUndo(
  session: AgentSession,
  undo: AssistantUndo,
  idempotencyKey: string,
  signal?: AbortSignal
): Promise<readonly ExecuteResult[]> {
  const blocked = undoBlocked(session, undo);
  if (blocked) {
    throw new Error(
      blocked.code === "table-moved"
        ? `the table moved to revision ${String(blocked.now)} after this turn settled at ${String(blocked.settledAt)}`
        : "this turn cannot be put back"
    );
  }
  const results: ExecuteResult[] = [];
  for (const [index, call] of undo.calls.entries()) {
    const result = await session.execute(
      call.key,
      call.args,
      session.manifest().viewRevision,
      `${idempotencyKey}:${String(index)}`,
      signal
    );
    results.push(result);
    // A restore that half-worked leaves the table somewhere nobody asked for.
    // Stopping names the failure; continuing would bury it.
    if (!result.ok) break;
  }
  return results;
}
