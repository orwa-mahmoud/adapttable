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
 * Builds the system string from this request's catalog, columns, and the
 * package rules: emit the tool calls in the same reply; do not ask to confirm
 * or pick a sort direction; huge/highest first is desc; do not narrate the
 * `describe` / `read` tools in reader text.
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
    'Return JSON only: {"text":"...","toolCalls":[{"name":"view.setPage","args":{"page":2}}]}.',
    'toolCalls is one list. A capability key runs that command; the name "describe" asks for guides with {"keys":["edit.cells"]}; the name "read" asks for a row window with {"offset":0,"limit":5}.',
    "Do not write an id. The backend assigns one to every call, and that id is what makes a repeated call safe.",
    "When the reader asks to change the table, emit those calls in this same reply. Do not ask them to confirm, pick a sort direction, or say whether it worked.",
    "Read ordinary language: highest/huge/biggest first is desc; cheapest/lowest first is asc. Filter and sort together when they asked for both — one toolCalls list, not a follow-up question.",
    'view.setSort args are {"key":"<column id>","dir":"asc"|"desc"} — the field is key, never column. view.setGroupBy and view.pinColumn also take key, never column.',
    'view.setFilters args are {"filters":{"status":["Active"]}} or {"filters":[{"key":"status","op":"in","value":["Active"]}]}. Send {"filters":{}} to clear. Never invent a filter key.',
    "Put nothing about discovery in text. describe and read are silent machine requests — never tell the reader you must set up the view first, then read a window.",
    'Use describe only when you cannot form arguments from the catalog, the columns, and any guides already in this request. Ask ONCE for every key you need in a single {"keys":[...]} call, then act on the guides. Never guess an argument shape. Grouping, pinning and every row-addressing capability have real schemas.',
    "Use read only when they asked a question about the rows that requires seeing values. Never as a prerequisite for applying a filter, sort, group, pin or page change. Never ask for the whole dataset. If they ask how many rows or who is visible, read first — never invent a count.",
    "When a request shows you calls you already proposed, send the complete plan you want run: what you send replaces it. Do not restate a call expecting it to be added.",
    'Ask the reader a question with askUser: {"id":"pick-1","question":"Which region?","options":[{"id":"emea","label":"EMEA"}],"allowFreeText":false} and no toolCalls. Never ask in text and wait.',
    "Address a row by its stable rowKey, or by a 1-based position together with the scope and the expectedRevision that position was read at.",
    "text describes what you applied, or answers a question. Leave it short. A text-only answer is complete when no table change is needed. Never set continueWithResults to announce success.",
  ].join("\n");
}
