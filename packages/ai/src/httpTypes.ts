/**
 * The client-tool wire shapes, declared where both the turn reducer and the
 * HTTP entry can reach them without importing each other.
 *
 * `@adapttable/ai/http` re-exports every type here; this module exists so the
 * reducer and the transport share one declaration rather than one of them
 * owning the other.
 */

/**
 * One client-side tool the backend wants run.
 *
 * `name` is a capability key, or `describe` / `read` — the two tools that ask
 * the frontend something instead of commanding it. This is the same shape the
 * AI SDK, CopilotKit, Mastra and AG-UI use for client tools, so a backend
 * built on any of them forwards these unchanged.
 *
 * @public
 */
export interface AgentHttpToolCall {
  /** Correlation handle, unique within one reply. */
  readonly id: string;
  /** Capability key, or `describe` / `read`. */
  readonly name: string;
  /** Arguments for that tool. */
  readonly args?: unknown;
  /**
   * Revision the backend observed, when it names one.
   *
   * Omitted means the view the request described, which is the ordinary case.
   */
  readonly expectedRevision?: number;
}

/** One tool call that produced a value. @public */
export interface AgentHttpToolValue {
  readonly id: string;
  readonly result: unknown;
}

/** One tool call that failed. @public */
export interface AgentHttpToolFailure {
  readonly id: string;
  readonly error: { readonly code: string; readonly message: string };
}

/** What one tool call produced, sent back on the next request. @public */
export type AgentHttpToolResult = AgentHttpToolValue | AgentHttpToolFailure;

/** Whether this result carries a value rather than a failure. @public */
export function isToolValue(
  result: AgentHttpToolResult
): result is AgentHttpToolValue {
  return "result" in result;
}

// A structured question is not an HTTP idea — a scripted transport or an
// in-process planner asks one the same way — so the shapes live with the other
// assistant contracts and are named here under the wire's own spelling.
export type {
  AssistantAnswer as AgentHttpAnswer,
  AssistantQuestion as AgentHttpQuestion,
  AssistantQuestionOption as AgentHttpQuestionOption,
} from "./assistantContracts";
