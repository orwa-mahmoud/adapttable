/**
 * The HTTP bridge's wire shapes: what a client sends, what a backend answers,
 * and what a turn reports.
 */
import type { AssistantReceiptSubject } from "./assistantReceipts";
import {
  type AgentContextContract,
  type AgentContextInputs,
  type AgentContextOptions,
  type AgentContextSelection,
  type AgentContextView,
} from "./context";
import { type PinStatus } from "./httpPins";
import type {
  AgentHttpAnswer,
  AgentHttpQuestion,
  AgentHttpToolCall,
  AgentHttpToolResult,
} from "./httpTypes";
import { type AGENT_SCHEMA_VERSION } from "./keys";
import type {
  AgentManifest,
  AgentSession,
  CatalogEntry,
  ExecuteResult,
} from "./types";

/**
 * A recording the reader spoke instead of typing.
 *
 * @public
 */
export interface AgentHttpAudio {
  /** Media type. Only the formats a browser actually records are accepted. */
  readonly mimeType: string;
  /** The clip, base64-encoded. */
  readonly base64: string;
  /** How long it runs, in milliseconds. */
  readonly durationMs: number;
}

/** Hello / schema pin versus a user turn. @public */
export type AgentHttpKind = "hello" | "schema" | "turn";

/**
 * One conversation line the host may send back for context.
 *
 * @public
 */
export interface AgentHttpMessage {
  /** Speaker. */
  readonly role: "user" | "assistant";
  /** Visible text. */
  readonly text: string;
}

/**
 * Frontend → backend body.
 *
 * `hello` and `schema` pin the compact manifest and catalog on a backend
 * session. A later `turn` may omit them while that pin is valid. Full
 * guides and row windows appear only after the backend asked for them.
 * A senior backend may ignore the pin and keep sending the snapshot.
 *
 * @public
 */
export interface AgentHttpRequest {
  /** Schema family. Must be `adapttable.agent.v1`. */
  readonly schemaVersion: typeof AGENT_SCHEMA_VERSION;
  /** Hello / schema pin, or a user turn. */
  readonly kind: AgentHttpKind;
  /** Table identity from the live session. */
  readonly tableId: string;
  /** Backend pin from the last hello / schema. */
  readonly sessionId?: string;
  /**
   * The permitted contract and what was selected from it.
   *
   * Sent on hello and schema, and on every turn when pinning is off. This is
   * what the backend answers against; `manifest` and `catalog` below are the
   * compact form it replaces.
   */
  readonly context?: {
    readonly contract: AgentContextContract;
    readonly selection: AgentContextSelection;
  };
  /** Compact capability snapshot. Required on hello / schema. */
  readonly manifest?: AgentManifest;
  /** Enabled keys plus one-line summaries. Required on hello / schema. */
  readonly catalog?: readonly CatalogEntry[];
  /** Live view revision when the catalog is not re-attached. */
  readonly viewRevision?: number;
  /**
   * Where the table is right now, sent fresh on every turn.
   *
   * Separate from the contract because it moves on a different clock: pinning
   * the contract does not pin this, and a backend answering a turn is always
   * answering against the view in that request.
   */
  readonly view?: AgentContextView;
  /**
   * Version of the contract this request carries or relies on.
   *
   * A reply acknowledges this exact string. A backend that echoes a different
   * one, or none, is not pinned and keeps being sent the contract.
   */
  readonly contractVersion?: string;
  /**
   * Version of the selection this request carries or relies on.
   *
   * Acknowledged alongside {@link AgentHttpRequest.contractVersion}, so a
   * backend holding a compact selection cannot answer a request built from a
   * full one.
   */
  readonly selectionVersion?: string;
  /** User text. Required for `kind: "turn"` unless {@link audio} is sent. */
  readonly message?: string;
  /**
   * A recording, in place of typed text.
   *
   * Sent once, on the round that carries it. Its transcript comes back on the
   * reply and is what later rounds of the same turn send — a clip is large,
   * and re-sending it every round would be paying for it repeatedly.
   */
  readonly audio?: AgentHttpAudio;
  /** Optional prior lines the host chooses to send. */
  readonly conversation?: readonly AgentHttpMessage[];
  /** Host-generated identity of this user send, stable across its phases. */
  readonly turnId?: string;
  /** Monotonic position of this phase within the turn. */
  readonly phaseId?: number;
  /** What the frontend's tools produced, answering the previous reply. */
  readonly toolResults?: readonly AgentHttpToolResult[];
  /**
   * The commands this phase has proposed so far.
   *
   * Sent so the backend can revise its own plan rather than restate it from
   * memory — and so a revision is a replacement, not a second copy.
   */
  readonly pendingCalls?: readonly AgentHttpToolCall[];
}

/**
 * Backend → frontend body.
 *
 * Text plus actions is a complete turn. A second model call is not
 * required to say “done.”
 *
 * @public
 */
export interface AgentHttpResponse {
  /** Schema family. Must be `adapttable.agent.v1`. */
  readonly schemaVersion: typeof AGENT_SCHEMA_VERSION;
  /** Hello / health. Absent on a turn means the body was accepted. */
  readonly ok?: boolean;
  /** Pin id the client should send on later turns. */
  readonly sessionId?: string;
  /** Assistant text to show in the host UI. */
  readonly text?: string;
  /**
   * Tools for the frontend to run: capability keys to execute, or
   * `describe` / `read` to ask.
   */
  readonly toolCalls?: readonly AgentHttpToolCall[];
  /** A structured question for the reader, instead of asking in prose. */
  readonly askUser?: AgentHttpQuestion;
  /**
   * What the backend heard, when the turn carried audio.
   *
   * Shown to the reader in place of their own bubble, and sent as text on
   * every later round of the turn — the clip travels once.
   */
  readonly transcript?: string;
  /** What the backend did with the contract this request named. */
  readonly pin?: AgentHttpPinAck;
  /** When true, the host may POST execute receipts back. */
  readonly continueWithResults?: boolean;
}

/**
 * A backend's answer about the contract it was sent.
 *
 * `acknowledged` is the only status that pins anything. `expired` and
 * `unknown` say the backend has lost a pin it once had — recoverable by
 * resending the contract, and deliberately distinct from a write whose outcome
 * is unknown, which is never retried. `unsupported` says this backend does not
 * pin at all, so every request carries its own contract.
 *
 * @public
 */
export interface AgentHttpPinAck {
  /** What happened to the pin. */
  readonly status: PinStatus;
  /** The contract version this answers for. */
  readonly contractVersion?: string;
  /** How long the backend will hold it, in milliseconds. */
  readonly ttlMs?: number;
}

/**
 * Options for {@link createAgentHttpClient}.
 *
 * @public
 */
export interface AgentHttpClientOptions {
  /** Backend URL. */
  readonly endpoint: string;
  /** Static headers, or a function that returns them per request. */
  readonly headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  /** Override `fetch`. Defaults to the global. */
  readonly fetch?: typeof fetch;
  /** Abort the request after this many milliseconds. */
  readonly timeoutMs?: number;
  /** Custom POST. When set, `endpoint` / `headers` / `fetch` are unused. */
  readonly request?: (
    body: AgentHttpRequest,
    signal: AbortSignal
  ) => Promise<unknown>;
  /**
   * When true (default), hello / schema pin the catalog and later turns
   * omit it. Set false to attach the compact snapshot on every request.
   */
  readonly pinCatalog?: boolean;
  /**
   * Put a structured question to the reader and resolve with their answer.
   *
   * Without it a backend's `askUser` stops the turn with `unresolved` rather
   * than hanging, and whatever already ran is still reported.
   */
  readonly askUser?: (
    question: AgentHttpQuestion,
    signal?: AbortSignal
  ) => Promise<AgentHttpAnswer | undefined>;
  /**
   * Which backend connection this is.
   *
   * Pins belong to a connection, so two endpoints — or one endpoint whose
   * credentials changed — never reuse each other's. It is derived from the
   * endpoint and the transport when omitted, which cannot see an
   * authentication change: a host whose identity changes supplies its own id,
   * or calls the client's `reset`.
   */
  readonly connectionId?: string;
  /**
   * How much context to send, and how to select it.
   *
   * Defaults to the `full` profile. Passed straight to `buildAgentContext`, so a host
   * naming a budget, a tokenizer or a priority order here is turning the same
   * dials the neutral builder exposes.
   */
  readonly context?: AgentContextOptions;
  /**
   * Live view and filter data the session's manifest does not carry.
   *
   * Called per exchange. A binding supplies its current query state here; a
   * host that has none sends a contract with an explicitly unknown view rather
   * than an invented one.
   */
  readonly contextInputs?: (session: AgentSession) => AgentContextInputs;
  /**
   * Ask the backend to stream its reply.
   *
   * Negotiated with `Accept`, and a backend that answers JSON is used as-is —
   * no second request. Streaming changes when text appears and nothing else:
   * calls still execute only after the reply is complete.
   */
  readonly stream?: boolean;
  /**
   * Called with the text so far while a reply is streaming.
   *
   * The transport does not batch: a caller that renders this decides its own
   * cadence, because how often to repaint is a question about the surface
   * rather than about the wire.
   */
  readonly onStreamText?: (text: string) => void;
}

/**
 * Why a turn stopped without running everything it was asked for.
 *
 * It sits beside the receipts rather than replacing them: work an earlier
 * phase completed is reported as completed, and only what is actually still
 * pending is named, so a host can offer a retry instead of a total failure
 * that hides a write.
 *
 * @public
 */
export interface AgentHttpUnresolved {
  /** Stable machine code. */
  readonly code: string;
  /** What happened, in one sentence. */
  readonly message: string;
  /** Capability keys that were proposed but never ran. */
  readonly pending: readonly string[];
}

/**
 * Result of one user turn after discovery and execute.
 *
 * @public
 */
export interface AgentHttpTurnResult {
  /** Assistant text from the last action-bearing or final response. */
  readonly text: string;
  /** `session.execute` receipts, in action order. */
  readonly results: readonly ExecuteResult[];
  /**
   * The capability key each result came from, in the same order.
   *
   * A developer handle, for a host matching a result back to the call it
   * asked for. What the reader is shown comes from {@link subjects}.
   */
  readonly keys: readonly string[];
  /**
   * What each action changed, in the same order.
   *
   * Without it a receipt can only say "done" — the reader is told something
   * happened but not what, which is the difference between a report and a
   * shrug. A built-in capability describes itself here; a host capability
   * has no entry, because only its own runner knows what it did.
   */
  readonly subjects: readonly (AssistantReceiptSubject | undefined)[];
  /** How many describe / read needs this turn fulfilled. */
  readonly needsFulfilled: { readonly describe: number; readonly read: number };
  /** Present only when the turn stopped short of running everything. */
  readonly unresolved?: AgentHttpUnresolved;
  /** What the backend heard, when the turn was a voice clip. */
  readonly transcript?: string;
}
