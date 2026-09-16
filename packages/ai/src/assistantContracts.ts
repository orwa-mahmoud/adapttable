/**
 * The contracts an assistant speaks, frozen before any controller or widget
 * is written against them.
 *
 * An assistant is a conversation wrapped around the SAME governed executor
 * every other integration uses. There is no chat-specific dispatcher here and
 * there must never be one: a turn resolves to {@link AssistantAction}s, and
 * each action is exactly the `(key, args, expectedRevision, idempotencyKey)`
 * tuple `AgentSession.execute` already takes. Anything a chat can do, a
 * script can do, and both are governed identically.
 *
 * Nothing in this module imports React, and nothing calls a model. Turning a
 * sentence into actions is the host's business — a provider SDK, a backend,
 * or a fixed script. This file only fixes the shapes they hand back, so a
 * controller and a widget can be written once against them.
 */
import type { AssistantReceiptSubject } from "./assistantReceipts";
import type { AgentSession, ExecuteResult } from "./types";

/**
 * A prompt a reader can run without typing it.
 *
 * Suggestions are authored, never derived. A capability key is not a
 * sentence, and turning `view.setGroupBy` into "view set group by" produces
 * a request no model asked for and no reader wrote — so a suggestion always
 * carries its own `prompt`, and names the capabilities it needs in `requires`
 * so it can be hidden on a table that cannot run it.
 *
 * @public
 */
export interface AssistantSuggestion {
  /** Stable id. Survives label and prompt edits, and translation. */
  readonly id: string;
  /** What the reader sees. Localize this; never localize {@link id}. */
  readonly title: string;
  /** The request text this sends, as if the reader had typed it. */
  readonly prompt: string;
  /** Longer explanation, when the title cannot carry it. */
  readonly description?: string;
  /**
   * Which glyph the card carries: `filter`, `sort`, `group`, `edit`.
   *
   * Presentation only — it never decides what the suggestion may run, which
   * stays with {@link AssistantSuggestion.requires}.
   */
  readonly kind?: string;
  /**
   * Capability keys this suggestion needs.
   *
   * All of them must be in the live catalog for the suggestion to be
   * eligible. Empty means it always applies.
   */
  readonly requires?: readonly string[];
}

/**
 * Optional presentation for a capability.
 *
 * The technical key stays what it is — protocol identity never moves for a
 * label — so this is additive: a host that ships none loses nothing.
 *
 * @public
 */
export interface CapabilityPresentation {
  /** Localized name for a reader. */
  readonly title: string;
  /** Localized one-liner. */
  readonly description?: string;
  /** Suggestions this capability contributes. */
  readonly suggestions?: readonly AssistantSuggestion[];
}

/**
 * One thing the reader asked for.
 *
 * @public
 */
export interface AssistantRequest {
  /** Stable id for this turn. */
  readonly id: string;
  /** What the reader typed, or the prompt of the suggestion they clicked. */
  readonly text: string;
  /** The suggestion this came from, when it came from one. */
  readonly suggestionId?: string;
}

/**
 * One executable step: exactly what `AgentSession.execute` takes.
 *
 * Carrying `expectedRevision` on the action rather than filling it in at
 * execution time is the point — an action planned against a view the table
 * has since left must fail, not quietly apply to a different one.
 *
 * @public
 */
export interface AssistantAction {
  /** Capability key from the live catalog. */
  readonly capabilityKey: string;
  /** Arguments, validated against that capability's input schema. */
  readonly args: unknown;
  /** View revision this action was planned against. */
  readonly expectedRevision: number;
  /** Replay identity. The same key never runs a mutation twice. */
  readonly idempotencyKey: string;
}

/**
 * What a turn resolved to, before anything runs.
 *
 * A proposal is inert. It exists so a reader can be shown what is about to
 * happen, and so a host can refuse it, on a table whose approval policy would
 * otherwise let a write through unseen.
 *
 * @public
 */
export interface AssistantProposal {
  /** Stable id, referenced by the outcome. */
  readonly id: string;
  /** The request that produced it. */
  readonly requestId: string;
  /** Steps in the order they must run. */
  readonly actions: readonly AssistantAction[];
  /** One line a reader can approve or reject on. */
  readonly summary?: string;
}

/** How a proposal ended. @public */
export type AssistantOutcomeStatus =
  "applied" | "rejected" | "failed" | "cancelled";

/**
 * What running a proposal actually did.
 *
 * `results` holds the session's own `ExecuteResult` per action, in the order
 * they ran, so a partial run is legible: three applied, the fourth refused.
 *
 * @public
 */
export interface AssistantOutcome {
  /** The proposal this reports on. */
  readonly proposalId: string;
  /** Overall status. */
  readonly status: AssistantOutcomeStatus;
  /** One result per action that ran. Shorter than `actions` on a partial run. */
  readonly results: readonly ExecuteResult[];
  /** Reader-facing explanation, when there is one. */
  readonly message?: string;
}

/**
 * One exchange: what was asked, what it resolved to, what happened.
 *
 * @public
 */
export interface AssistantTurn {
  readonly request: AssistantRequest;
  readonly proposal?: AssistantProposal;
  readonly outcome?: AssistantOutcome;
}

/**
 * The transcript.
 *
 * @public
 */
export interface AssistantConversation {
  /** Table this conversation belongs to. Two tables never share one. */
  readonly tableId: string;
  /** Turns oldest first. */
  readonly turns: readonly AssistantTurn[];
}

/**
 * Turn a request into actions.
 *
 * This is the seam a host fills — with a model, a backend, or a script. It
 * receives the keys the table currently offers so it can never plan an
 * operation the session would refuse.
 *
 * @public
 */
export type AssistantPlanner = (input: {
  readonly request: AssistantRequest;
  /** Capability keys the live session advertises right now. */
  readonly available: readonly string[];
  /** Revision to plan against. */
  readonly revision: number;
  readonly signal?: AbortSignal;
}) => Promise<AssistantProposal> | AssistantProposal;

/**
 * The suggestions a table can actually run right now.
 *
 * A suggestion naming a capability the table does not offer is not shown —
 * offering it would be a button that reports failure when pressed.
 *
 * @param suggestions - Everything authored, in the order it should appear.
 * @param available - Capability keys from the live catalog.
 * @returns The eligible subset, order preserved.
 *
 * @public
 */
export function eligibleSuggestions(
  suggestions: readonly AssistantSuggestion[],
  available: readonly string[]
): readonly AssistantSuggestion[] {
  const offered = new Set(available);
  return suggestions.filter((suggestion) =>
    (suggestion.requires ?? []).every((key) => offered.has(key))
  );
}

/**
 * Reject duplicate suggestion ids.
 *
 * Ids address suggestions across a reload and a translation, so two carrying
 * the same one is a bug that only shows up as the wrong prompt running.
 *
 * @param suggestions - Suggestions from every contributing source.
 * @returns The same list.
 * @throws When an id repeats.
 *
 * @public
 */
export function assertUniqueSuggestions(
  suggestions: readonly AssistantSuggestion[]
): readonly AssistantSuggestion[] {
  const seen = new Set<string>();
  for (const suggestion of suggestions) {
    if (seen.has(suggestion.id)) {
      throw new Error(`duplicate suggestion "${suggestion.id}"`);
    }
    seen.add(suggestion.id);
  }
  return suggestions;
}

/**
 * One prior exchange, as a transport needs it.
 *
 * Deliberately smaller than {@link AssistantTurn}: a transport carries
 * history to a backend, and a backend has no use for the proposals and
 * receipts a controller keeps. Handing it the full turn would also drag the
 * whole conversation type closure onto every transport entry point.
 *
 * @public
 */
export interface AssistantExchange {
  readonly role: "user" | "assistant";
  readonly text: string;
}

/**
 * What a transport hands back for one turn.
 *
 * `results` are the session's own receipts, in the order the actions ran, so
 * the controller reports what happened rather than what a flag claimed.
 *
 * @public
 */
export interface AssistantTransportReply {
  /** Assistant text to show. Treat as untrusted; never inject it as HTML. */
  readonly text: string;
  /** One `ExecuteResult` per action that ran. */
  readonly results?: readonly ExecuteResult[];
  /** Capability keys in the same order as `results`, when known. */
  readonly keys?: readonly string[];
  /**
   * What each action changed, in the same order as `results`.
   *
   * Optional: without it a receipt still reports its status truthfully, just
   * without the sentence naming what moved.
   */
  readonly subjects?: readonly (AssistantReceiptSubject | undefined)[];
  /**
   * Why the turn stopped short, when it did.
   *
   * It travels beside `results` rather than instead of them, so a host can
   * say that the remaining work was not applied and offer a retry without
   * hiding what already ran.
   */
  readonly unresolved?: AssistantUnresolved;
}

/**
 * A turn that ended with work still pending.
 *
 * @public
 */
export interface AssistantUnresolved {
  /** Stable machine code. */
  readonly code: string;
  /** What happened, in one sentence. */
  readonly message: string;
  /** Capability keys that were proposed but never ran. */
  readonly pending: readonly string[];
}

/**
 * Where a turn goes.
 *
 * This is the seam a host fills, and it names nothing about HTTP or any
 * model: an in-process planner, a websocket, or a fixed script are all valid
 * transports, and none of them pulls a client into the graph.
 *
 * @public
 */
/**
 * A handle on work that outlived the connection it started on.
 *
 * Losing a connection is not the same as stopping a turn: a backend asked to
 * do something may still be doing it. A transport that can be reattached to
 * says so while the turn runs, and this is what it takes to come back.
 *
 * @public
 */
export interface AssistantResumeHandle {
  /** What the reader asked, so the work is legible wherever it is stored. */
  readonly text: string;
  /**
   * The backend's own name for the work, carried back untouched.
   *
   * Opaque here on purpose — a stream id, a job id, a signed token. Only the
   * transport that minted it reads it.
   */
  readonly token: unknown;
}

/**
 * What every turn is given, however it started.
 *
 * @public
 */
export interface AssistantTurnInput {
  readonly session: AgentSession;
  readonly conversation: readonly AssistantExchange[];
  readonly signal?: AbortSignal;
  /**
   * Report the assistant's text as it arrives, when the transport streams.
   *
   * Optional on both sides: a transport that does not stream never calls it,
   * and a controller that does not render partial text never passes one.
   * Calling it is never a claim that anything ran — a turn's receipts come
   * from the reply, not from the words.
   */
  readonly onPartialText?: (text: string) => void;
  /**
   * Put a structured question to the reader and wait for their answer.
   *
   * Optional on both sides, exactly like `onPartialText`: a transport that
   * never asks does not call it, and a controller with nowhere to draw a
   * question does not pass one. It resolves to `undefined` when the reader
   * declined or the turn was abandoned — which a transport reports as
   * unresolved rather than proceeding on a value nobody gave.
   */
  readonly askUser?: (
    question: AssistantQuestion
  ) => Promise<AssistantAnswer | undefined>;
  /**
   * Name work a lost connection would not end.
   *
   * Called as soon as the backend has something to reattach to. A transport
   * that never calls it is one whose turns end with their connection, and a
   * controller then has nothing to offer a reader but sending again.
   */
  readonly onResumable?: (token: unknown) => void;
}

/** One turn, started by the reader. @public */
export interface AssistantSendInput extends AssistantTurnInput {
  /** What the reader asked. */
  readonly text: string;
}

/** One turn, rejoined where a connection left it. @public */
export interface AssistantResumeInput extends AssistantTurnInput {
  /** The work to rejoin, exactly as it was handed out. */
  readonly handle: AssistantResumeHandle;
}

export interface AssistantTransport {
  /** Optional handshake. Rejecting it leaves the controller disconnected. */
  connect?(input: {
    readonly session: AgentSession;
    readonly signal?: AbortSignal;
  }): Promise<void> | void;
  /** Run one turn. Must honour `signal` and must not retry a mutation. */
  send(input: AssistantSendInput): Promise<AssistantTransportReply>;
  /**
   * Rejoin work a released connection left running.
   *
   * Optional: without it a released connection ends the turn, which is the
   * honest outcome for a transport that cannot get back to it. An
   * implementation must reuse the replay identities its first attempt used, so
   * the session answers a completed action from its record rather than running
   * it a second time.
   */
  resume?(input: AssistantResumeInput): Promise<AssistantTransportReply>;
  /**
   * Release whatever `connect` acquired.
   *
   * Called on unmount and when the table changes. A transport holding an
   * endpoint credential drops it here, so a late completion cannot use it.
   */
  disconnect?(): void;
}

/** One choice offered with a structured question. @public */
export interface AssistantQuestionOption {
  /** Stable id returned as the answer. */
  readonly id: string;
  /** Text shown to the reader. */
  readonly label: string;
}

/**
 * A question for the person, asked as structure rather than prose.
 *
 * A backend that uses this never has its question rendered as ordinary
 * assistant text that the reader answers into the void.
 *
 * @public
 */
export interface AssistantQuestion {
  /** Correlation handle; the answer returns as the tool result for this id. */
  readonly id: string;
  /** What to ask. */
  readonly question: string;
  /** Offered choices, when the answer is a selection. */
  readonly options?: readonly AssistantQuestionOption[];
  /** Whether the reader may type an answer instead of choosing one. */
  readonly allowFreeText: boolean;
}

/** What the reader answered. @public */
export interface AssistantAnswer {
  /** The chosen option's id, when they chose one. */
  readonly optionId?: string;
  /** What they typed, when free text was allowed. */
  readonly text?: string;
}
