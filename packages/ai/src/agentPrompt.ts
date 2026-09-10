/**
 * Default HTTP agent system prompt — junior backends call this; senior
 * backends skip it and keep their own prompt or tools.
 */

/**
 * Inputs the default HTTP agent system prompt needs.
 *
 * A full HTTP request satisfies this. A senior runtime may pass only
 * table identity, catalog and columns.
 *
 * @public
 */
export interface AgentSystemPromptInput {
  /** Table identity from the live session. */
  readonly tableId: string;
  /** Enabled keys plus one-line summaries. */
  readonly catalog: readonly {
    readonly key: string;
    readonly summary: string;
  }[];
  /** Compact column permissions and the live view revision. */
  readonly manifest: {
    readonly viewRevision: number;
    readonly columns: readonly {
      readonly id: string;
      readonly label: string;
      readonly readable: boolean;
      readonly writable: boolean;
    }[];
  };
}

/**
 * Default AdaptTable HTTP agent system prompt.
 *
 * Builds the system string from this request's catalog, columns, and
 * the package rules: emit actions in the same reply; do not ask to
 * confirm or pick a sort direction; huge/highest first is desc; do not
 * narrate `needs.describe` / `needs.read` in reader text.
 *
 * @public
 */
export function agentSystemPrompt(request: AgentSystemPromptInput): string {
  const lines = request.catalog.map(
    (entry) => `- ${entry.key}: ${entry.summary}`
  );
  const columns = request.manifest.columns.map((column) => {
    const flags = [
      column.readable ? "readable" : "hidden",
      column.writable ? "writable" : "read-only",
    ].join(", ");
    return `- ${column.id} (${column.label}, ${flags})`;
  });
  return [
    `Table ${request.tableId} revision ${String(request.manifest.viewRevision)}.`,
    "Enabled capabilities (do not invent others):",
    ...lines,
    "Columns:",
    ...columns,
    'Return JSON only: {"text":"...","actions":[{"key":"view.setPage","args":{"page":2},"idempotencyKey":"unique"}],"needs":{"describe":["edit.cells"],"read":[{"offset":0,"limit":5}]}}.',
    "When the reader asks to change the table, emit those actions in this same reply. Do not ask them to confirm, pick a sort direction, or say whether it worked.",
    "Read ordinary language: highest/huge/biggest first is desc; cheapest/lowest first is asc. Filter and sort together when they asked for both — one actions array, not a follow-up question.",
    "Put nothing about discovery in text. needs.describe and needs.read are silent machine requests — never tell the reader you must set up the view first, then read a window.",
    "Use needs.describe only when you cannot form arguments from the catalog, the columns, and any guides already in this request. Ask ONCE for every key you need, then act on the guides. Never guess an argument shape. Grouping, pinning and every row-addressing capability have real schemas.",
    "Use needs.read only when they asked a question about the rows that requires seeing values. Never as a prerequisite for applying a filter, sort, group, pin or page change. Never ask for the whole dataset.",
    "Address a row by its stable rowKey, or by a 1-based position together with the scope and the expectedRevision that position was read at.",
    "text describes what you applied, or answers a question. Leave it short. A text-only answer is complete when no table change is needed. Never set continueWithResults to announce success.",
  ].join("\n");
}
