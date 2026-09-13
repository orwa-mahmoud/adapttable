/**
 * Opt-in HTTP bridge — `@adapttable/ai/http`.
 *
 * The root entry stays transport-free. This subpath posts a compact
 * capability manifest to a developer-owned endpoint and executes the
 * returned actions through the existing session. No model SDK.
 */
import type { AssistantTransport } from "./assistantContracts";
import {
  type AgentContext,
  type AgentContextContract,
  type AgentContextInputs,
  type AgentContextOptions,
  type AgentContextSelection,
  type AgentContextView,
  buildAgentContext,
} from "./context";
import {
  discover,
  type DiscoveryRequest,
  type DiscoverySource,
  familyOf,
} from "./discovery";
import { createDiscoveryCache, type DiscoveryCache } from "./discoveryCache";
import { errorMessage } from "./errorMessage";
import {
  createTurnExecution,
  type HttpPhaseContext,
  phaseContext,
  policyKey,
} from "./httpExecution";
import {
  contractFingerprint,
  createPinStore,
  DEFAULT_PIN_TTL_MS,
  pinExpiry,
  type PinStatus,
} from "./httpPins";
import {
  agentHttpSchema,
  type AgentWireLimits,
  type JsonSchemaDocument,
} from "./httpSchema";
import {
  createStreamReply,
  parseStreamRecord,
  splitRecords,
} from "./httpStream";
import {
  createPhasePlan,
  DESCRIBE_TOOL,
  type FinalizedCall,
  READ_TOOL,
} from "./httpTurn";
import type {
  AgentHttpAnswer,
  AgentHttpQuestion,
  AgentHttpQuestionOption,
  AgentHttpToolCall,
  AgentHttpToolResult,
} from "./httpTypes";
import { AGENT_SCHEMA_VERSION, type RowAddressScope } from "./keys";
import type {
  AgentManifest,
  AgentSession,
  CapabilityGuide,
  CatalogEntry,
  ExecuteResult,
  RowProvenanceEnvelope,
  RowReadQuery,
  RowWindow,
} from "./types";

// `assistantHttpTransport` hands back this interface, and its `send` names
// these two, so the entry that publishes the function publishes them too.
export { agentSystemPrompt, type AgentSystemPromptInput } from "./agentPrompt";
export type {
  AssistantExchange,
  AssistantTransport,
  AssistantTransportReply,
  AssistantUnresolved,
} from "./assistantContracts";
export type { AssistantReceiptSubject } from "./assistantReceipts";
// `AgentHttpRequest.view` is typed with these, so a consumer of this subpath
// can name them without reaching for another entry point.
export type { AgentContextSelection } from "./contextSelection";
export type { AgentContextContract, AgentContextView } from "./contextSnapshot";
export {
  contractFingerprint,
  DEFAULT_PIN_CONNECTIONS,
  DEFAULT_PIN_TTL_MS,
  type PinRecord,
  type PinStatus,
} from "./httpPins";
export type { AgentWireLimits, JsonSchemaDocument } from "./httpSchema";
export {
  AgentStreamError,
  type AgentStreamEvent,
  type AgentStreamEventKind,
  createStreamReply,
  MAX_STREAM_EVENTS,
  parseStreamRecord,
  splitRecords,
} from "./httpStream";
export { AgentTurnError, type PhaseState } from "./httpTurn";
export * from "./httpTypes";
export {
  AGENT_SCHEMA_VERSION as AGENT_HTTP_SCHEMA,
  AGENT_SCHEMA_VERSION,
  type ApprovalPolicy,
  CAPABILITY_KEYS,
  type CapabilityKey,
  type CommitPolicy,
  type RowAddressScope,
  type WritePolicy,
} from "./keys";
export type * from "./types";

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
   * Defaults to `compact`. Passed straight to `buildAgentContext`, so a host
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
   * Without it a receipt can only say "done" — the reader is told something
   * happened but not what, which is the difference between a report and a
   * shrug.
   */
  readonly keys: readonly string[];
  /** How many describe / read needs this turn fulfilled. */
  readonly needsFulfilled: { readonly describe: number; readonly read: number };
  /** Present only when the turn stopped short of running everything. */
  readonly unresolved?: AgentHttpUnresolved;
}

const MAX_NEED_ROUNDS = 3;
/**
 * Dependent phases in one user send. Discovery is bounded per phase; this
 * bounds how many times work may depend on the work before it.
 */
const MAX_CONTINUATIONS = 3;
const MAX_DESCRIBE_NEEDS = 16;
const MAX_READ_NEEDS = 16;
const MAX_ACTIONS = 32;
const MAX_REQUEST_BYTES = 256_000;
/** A backend cannot make this client hold an unbounded body in memory. */
const MAX_RESPONSE_BYTES = 512_000;
/**
 * Guides and row windows accumulated across discovery rounds. Deliberately
 * well under {@link MAX_REQUEST_BYTES}: the context is carried inside every
 * later request, so it needs its own budget to be a real limit and to name
 * discovery as the thing that overflowed.
 */
const MAX_CONTEXT_BYTES = 128_000;
/**
 * A recording is large and travels once. Its own cap, separate from the body
 * limit, so a clip cannot quietly consume the room the context needs.
 */
const MAX_AUDIO_BYTES = 4_000_000;
/** Longer than this is a recording nobody meant to send. */
const MAX_AUDIO_MS = 120_000;
/** What a browser actually records. Anything else is refused at the door. */
const AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);

/** Structured HTTP bridge failure with a stable machine code. @public */
export class AgentHttpError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AgentHttpError";
    this.code = code;
  }
}

function assertTurnContext(
  session: AgentSession,
  context: HttpPhaseContext
): void {
  const manifest = session.manifest();
  // A view revision tick during the model call is ordinary — React flushed a
  // filter, or an edit landed while the backend was thinking. That does not
  // end the turn: every phase is answered against the view it was shown, and
  // an action the table has moved past is rejected one action at a time, with
  // a reason the caller can act on. Identity and policy are what must not
  // move — a table that swapped underneath, or that dropped writes or
  // capabilities mid-turn, is no longer the one the backend answered.
  if (manifest.tableId !== context.tableId) {
    throw new AgentHttpError(
      "context-stale",
      `table changed during turn (${context.tableId} → ${manifest.tableId})`
    );
  }
  if (policyKey(manifest) !== context.contractVersion) {
    throw new AgentHttpError(
      "context-stale",
      `table policy changed during turn (revision ${context.viewRevision} → ${manifest.viewRevision})`
    );
  }
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value) ?? "").byteLength;
}

function requestBytes(body: AgentHttpRequest): number {
  return jsonBytes(body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asHttpKind(value: unknown): AgentHttpKind {
  if (value === "hello" || value === "schema" || value === "turn") return value;
  throw new TypeError('agent HTTP kind must be "hello", "schema", or "turn"');
}

function requireSessionId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const id = asString(value);
  if (!id)
    throw new TypeError("agent HTTP sessionId must be a non-empty string");
  return id;
}

function requireViewRevision(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const revision = asFiniteNumber(value);
  if (revision === undefined) {
    throw new TypeError("agent HTTP viewRevision must be a finite number");
  }
  return revision;
}

function readRequestSchema(
  input: Record<string, unknown>,
  kind: AgentHttpKind
): {
  readonly manifest?: AgentManifest;
  readonly catalog?: CatalogEntry[];
} {
  const required = kind === "hello" || kind === "schema";
  if (
    !required &&
    input.manifest === undefined &&
    input.catalog === undefined
  ) {
    return {};
  }
  if (!isRecord(input.manifest)) {
    throw new TypeError("agent HTTP manifest must be an object");
  }
  validateManifestShape(input.manifest);
  if (!Array.isArray(input.catalog)) {
    throw new TypeError("agent HTTP catalog must be an array");
  }
  return {
    manifest: input.manifest as unknown as AgentManifest,
    catalog: input.catalog as CatalogEntry[],
  };
}

/**
 * Parse an unknown JSON body into {@link AgentHttpRequest}.
 *
 * @public
 */
export function parseAgentHttpRequest(input: unknown): AgentHttpRequest {
  if (!isRecord(input)) {
    throw new TypeError("agent HTTP request must be an object");
  }
  if (input.schemaVersion !== AGENT_SCHEMA_VERSION) {
    throw new TypeError(
      `agent HTTP schemaVersion must be "${AGENT_SCHEMA_VERSION}"`
    );
  }
  const kind = asHttpKind(input.kind);
  const tableId = asString(input.tableId);
  if (!tableId) {
    throw new TypeError("agent HTTP tableId must be a non-empty string");
  }
  if (
    kind === "turn" &&
    typeof input.message !== "string" &&
    input.audio === undefined
  ) {
    throw new TypeError("agent HTTP turn requires a message string or audio");
  }
  const schema = readRequestSchema(input, kind);
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind,
    tableId,
    sessionId: requireSessionId(input.sessionId),
    ...schema,
    viewRevision: requireViewRevision(input.viewRevision),
    message: typeof input.message === "string" ? input.message : undefined,
    conversation: Array.isArray(input.conversation)
      ? (input.conversation as AgentHttpMessage[])
      : undefined,
    contractVersion: asString(input.contractVersion),
    selectionVersion: asString(input.selectionVersion),
    context: isRecord(input.context)
      ? (input.context as AgentHttpRequest["context"])
      : undefined,
    view: isRecord(input.view)
      ? (input.view as unknown as AgentContextView)
      : undefined,
    audio: input.audio === undefined ? undefined : asAudio(input.audio),
    turnId: asString(input.turnId),
    phaseId: asFiniteNumber(input.phaseId),
    toolResults: Array.isArray(input.toolResults)
      ? input.toolResults.map(asToolResult)
      : undefined,
    pendingCalls: Array.isArray(input.pendingCalls)
      ? input.pendingCalls.map(asToolCall)
      : undefined,
  };
}

/**
 * Parse an unknown JSON body into {@link AgentHttpResponse}.
 *
 * @public
 */
export function parseAgentHttpResponse(input: unknown): AgentHttpResponse {
  if (!isRecord(input)) {
    throw new TypeError("agent HTTP response must be an object");
  }
  if (input.schemaVersion !== AGENT_SCHEMA_VERSION) {
    throw new TypeError(
      `agent HTTP schemaVersion must be "${AGENT_SCHEMA_VERSION}"`
    );
  }
  const toolCalls = Array.isArray(input.toolCalls)
    ? input.toolCalls.map(asToolCall)
    : undefined;
  if (toolCalls && toolCalls.length > MAX_ACTIONS) {
    throw new TypeError(`agent HTTP toolCalls exceed limit of ${MAX_ACTIONS}`);
  }
  assertQuestionBudget(toolCalls);
  if (
    input.sessionId !== undefined &&
    (typeof input.sessionId !== "string" || input.sessionId.length === 0)
  ) {
    throw new TypeError("agent HTTP sessionId must be a non-empty string");
  }
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    ok: typeof input.ok === "boolean" ? input.ok : undefined,
    sessionId:
      typeof input.sessionId === "string" ? input.sessionId : undefined,
    text: typeof input.text === "string" ? input.text : undefined,
    toolCalls,
    askUser:
      input.askUser === undefined ? undefined : asQuestion(input.askUser),
    pin: input.pin === undefined ? undefined : asPinAck(input.pin),
    transcript: asString(input.transcript),
    continueWithResults:
      typeof input.continueWithResults === "boolean"
        ? input.continueWithResults
        : undefined,
  };
}

function validateManifestShape(value: Record<string, unknown>): void {
  if (value.schemaVersion !== AGENT_SCHEMA_VERSION) {
    throw new TypeError(
      `agent HTTP manifest.schemaVersion must be "${AGENT_SCHEMA_VERSION}"`
    );
  }
  if (typeof value.tableId !== "string" || value.tableId.length === 0) {
    throw new TypeError(
      "agent HTTP manifest.tableId must be a non-empty string"
    );
  }
  if (
    typeof value.viewRevision !== "number" ||
    !Number.isFinite(value.viewRevision)
  ) {
    throw new TypeError(
      "agent HTTP manifest.viewRevision must be a finite number"
    );
  }
  if (!Array.isArray(value.capabilities)) {
    throw new TypeError("agent HTTP manifest.capabilities must be an array");
  }
  if (!isRecord(value.policy)) {
    throw new TypeError("agent HTTP manifest.policy must be an object");
  }
}

function asToolCall(value: unknown): AgentHttpToolCall {
  if (!isRecord(value)) {
    throw new TypeError("agent HTTP tool call must be an object");
  }
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id) throw new TypeError("agent HTTP tool call.id is required");
  if (!name) throw new TypeError("agent HTTP tool call.name is required");
  let expectedRevision: number | undefined;
  if ("expectedRevision" in value && value.expectedRevision !== undefined) {
    expectedRevision = asFiniteNumber(value.expectedRevision);
    if (expectedRevision === undefined) {
      throw new TypeError(
        "agent HTTP tool call.expectedRevision must be a finite number"
      );
    }
  }
  const args = "args" in value ? value.args : {};
  // The two asking tools are ours, so their arguments are checked here rather
  // than at execution time: a malformed row window is a protocol error, and it
  // should be reported where the body is read, not three awaits later.
  if (name === READ_TOOL) {
    return { id, name, args: asReadQuery(args), expectedRevision };
  }
  if (name === DESCRIBE_TOOL) {
    // Normalized at the parser so a malformed key list is a protocol error
    // where the body is read, not a surprise three awaits later.
    return { id, name, args: asDescribeRequest(args), expectedRevision };
  }
  return { id, name, args, expectedRevision };
}

function asToolResult(value: unknown): AgentHttpToolResult {
  if (!isRecord(value)) {
    throw new TypeError("agent HTTP tool result must be an object");
  }
  const id = asString(value.id);
  if (!id) throw new TypeError("agent HTTP tool result.id is required");
  if (isRecord(value.error)) {
    const code = asString(value.error.code) ?? "error";
    const message = asString(value.error.message) ?? "tool call failed";
    return { id, error: { code, message } };
  }
  return { id, result: value.result };
}

function asQuestionOption(value: unknown): AgentHttpQuestionOption {
  if (!isRecord(value)) {
    throw new TypeError("agent HTTP askUser option must be an object");
  }
  const id = asString(value.id);
  const label = asString(value.label);
  if (!id || !label) {
    throw new TypeError("agent HTTP askUser option needs an id and a label");
  }
  return { id, label };
}

function asQuestion(value: unknown): AgentHttpQuestion {
  if (!isRecord(value)) {
    throw new TypeError("agent HTTP askUser must be an object");
  }
  const id = asString(value.id);
  const question = asString(value.question);
  if (!id) throw new TypeError("agent HTTP askUser.id is required");
  if (!question) throw new TypeError("agent HTTP askUser.question is required");
  const options = Array.isArray(value.options)
    ? value.options.map(asQuestionOption)
    : undefined;
  const allowFreeText = value.allowFreeText !== false;
  if (!allowFreeText && !options?.length) {
    throw new TypeError(
      "agent HTTP askUser must offer options or allow free text"
    );
  }
  return { id, question, ...(options ? { options } : {}), allowFreeText };
}

/**
 * A recording, checked before anything else looks at it.
 *
 * Type, length and size are all refused at the parser rather than deeper in,
 * because every one of them is a way to make the rest of the system do work on
 * something nobody meant to send.
 */
function asAudio(value: unknown): AgentHttpAudio {
  if (!isRecord(value)) {
    throw new TypeError("agent HTTP audio must be an object");
  }
  const mimeType = asString(value.mimeType);
  const base64 = asString(value.base64);
  const durationMs = asFiniteNumber(value.durationMs);
  if (!mimeType || !AUDIO_TYPES.has(mimeType.split(";")[0] ?? "")) {
    throw new TypeError(
      `agent HTTP audio.mimeType must be one of ${[...AUDIO_TYPES].join(", ")}`
    );
  }
  if (!base64) throw new TypeError("agent HTTP audio.base64 is required");
  if (durationMs === undefined || durationMs <= 0) {
    throw new TypeError(
      "agent HTTP audio.durationMs must be a positive number"
    );
  }
  if (durationMs > MAX_AUDIO_MS) {
    throw new TypeError(
      `agent HTTP audio.durationMs exceeds limit of ${String(MAX_AUDIO_MS)}`
    );
  }
  // Base64 carries three bytes in four characters; near enough to refuse an
  // oversized clip without decoding it first.
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_AUDIO_BYTES) {
    throw new TypeError(
      `agent HTTP audio exceeds limit of ${String(MAX_AUDIO_BYTES)} bytes`
    );
  }
  return { mimeType, base64, durationMs };
}

function asPinAck(value: unknown): AgentHttpPinAck {
  if (!isRecord(value)) {
    throw new TypeError("agent HTTP pin must be an object");
  }
  const status = asString(value.status);
  if (
    status !== "acknowledged" &&
    status !== "expired" &&
    status !== "unknown" &&
    status !== "unsupported"
  ) {
    throw new TypeError(
      'agent HTTP pin.status must be "acknowledged", "expired", "unknown", or "unsupported"'
    );
  }
  const ttlMs = asFiniteNumber(value.ttlMs);
  if (value.ttlMs !== undefined && ttlMs === undefined) {
    throw new TypeError("agent HTTP pin.ttlMs must be a finite number");
  }
  return {
    status,
    ...(asString(value.contractVersion)
      ? { contractVersion: asString(value.contractVersion) }
      : {}),
    ...(ttlMs === undefined ? {} : { ttlMs }),
  };
}

/**
 * The two asking tools keep their own ceilings.
 *
 * They were separate limits when they were separate fields, and folding them
 * into one list is no reason for a backend to be able to ask for sixteen
 * guides and sixteen row windows in a single reply that only counts as one.
 */
function assertQuestionBudget(
  calls: readonly AgentHttpToolCall[] | undefined
): void {
  if (!calls) return;
  const describes = calls.filter((call) => call.name === DESCRIBE_TOOL).length;
  const reads = calls.filter((call) => call.name === READ_TOOL).length;
  if (describes > MAX_DESCRIBE_NEEDS) {
    throw new TypeError(
      `agent HTTP describe calls exceed limit of ${MAX_DESCRIBE_NEEDS}`
    );
  }
  if (reads > MAX_READ_NEEDS) {
    throw new TypeError(
      `agent HTTP read calls exceed limit of ${MAX_READ_NEEDS}`
    );
  }
}

/** The row window one `read` call is asking for. */
function asReadQuery(args: unknown): RowReadQuery {
  const entry = isRecord(args) ? args : {};
  const columns = Array.isArray(entry.columns)
    ? entry.columns.filter(
        (column): column is string => typeof column === "string"
      )
    : undefined;
  let scope: RowAddressScope | undefined;
  if (
    entry.scope === "visible" ||
    entry.scope === "page" ||
    entry.scope === "full"
  ) {
    scope = entry.scope;
  } else if (entry.scope !== undefined) {
    throw new TypeError(
      'agent HTTP read.scope must be "visible", "page", or "full"'
    );
  }
  const offset = asFiniteNumber(entry.offset);
  const limit = asFiniteNumber(entry.limit);
  if (entry.offset !== undefined && offset === undefined) {
    throw new TypeError("agent HTTP read.offset must be a finite number");
  }
  if (entry.limit !== undefined && limit === undefined) {
    throw new TypeError("agent HTTP read.limit must be a finite number");
  }
  return {
    offset: offset ?? 0,
    limit: limit ?? 10,
    ...(columns ? { columns } : {}),
    ...(scope ? { scope } : {}),
  };
}

/** What one `describe` call is asking about: keys, a family, or both. */
function asDescribeRequest(args: unknown): DiscoveryRequest {
  const entry = isRecord(args) ? args : {};
  if (entry.keys !== undefined) {
    if (!Array.isArray(entry.keys)) {
      throw new TypeError(
        "agent HTTP describe.keys must be an array of strings"
      );
    }
    for (const key of entry.keys) {
      if (typeof key !== "string" || key.length === 0) {
        throw new TypeError(
          "agent HTTP describe.keys must be an array of strings"
        );
      }
    }
  }
  const bundle = asString(entry.bundle);
  return {
    ...(entry.keys ? { keys: entry.keys as readonly string[] } : {}),
    ...(bundle ? { bundle } : {}),
  };
}

/**
 * The session's own permitted view of itself, for expansion.
 *
 * `available` is the catalog, which the permission predicate has already
 * filtered, and `describe` refuses anything it would not list — so a family
 * cannot reach past either.
 */
function discoverySource(session: AgentSession): DiscoverySource {
  return {
    available: () => session.catalog().map((entry) => entry.key),
    describe: (key) => session.describe(key),
    family: (key) => familyOf(key),
  };
}

const pins = createPinStore();
/**
 * Guides already answered, per connection and contract version.
 *
 * Holding one is not the same as sending one: a cached guide still has to be
 * selected into a request. What this saves is the round that would have been
 * spent asking for it again.
 */
const guideCache = createDiscoveryCache();

/**
 * Which connection these options describe.
 *
 * The endpoint, and never a header — a header is where the credentials are.
 *
 * Deliberately not the identity of the transport function. A host that builds
 * its options inside a render hands over a new closure every call, and keying
 * on that would mean such a host never keeps a pin at all: every turn would
 * look like a first one and carry the whole contract forever. A host that
 * genuinely has two connections to one endpoint — two credentials, two
 * tenants — says so with `connectionId`, which is what that option is for.
 */
function connectionIdOf(options: AgentHttpClientOptions): string {
  return options.connectionId ?? `endpoint:${options.endpoint}`;
}

/** Everything the backend would be told, named unambiguously. */
function schemaFingerprint(session: AgentSession): string {
  return contractFingerprint(session.manifest(), session.catalog());
}

/**
 * Keep a pin only when the reply acknowledged the exact version it was sent.
 *
 * An ordinary successful turn proves nothing about pinning; a backend that
 * says nothing about the contract keeps being sent it.
 */
function rememberPin(
  session: AgentSession,
  connectionId: string,
  sent: { readonly version: string; readonly seq: number },
  response: AgentHttpResponse
): void {
  const ack = response.pin;
  if (ack?.status !== "acknowledged") return;
  if (
    ack.contractVersion !== undefined &&
    ack.contractVersion !== sent.version
  ) {
    // The backend answered for a different contract than this request carried.
    return;
  }
  pins.remember(session, {
    connectionId,
    tableId: session.manifest().tableId,
    sessionId: response.sessionId,
    // The version SENT, never the one live now: a contract that moved during
    // the exchange is a contract this backend has not seen.
    contractVersion: sent.version,
    seq: sent.seq,
    expiresAt: pinExpiry(Date.now(), ack.ttlMs, DEFAULT_PIN_TTL_MS),
  });
}

/** A backend that lost its pin, before anything of this turn has run. */
function pinLost(response: AgentHttpResponse): boolean {
  return (
    response.pin?.status === "expired" || response.pin?.status === "unknown"
  );
}

/**
 * The context this client would send, built once per exchange.
 *
 * Built from the live session through item 6's exporter, which has already
 * applied the permission predicate, so nothing excluded can reach the wire.
 * The caller decides whether it travels; this only decides what it says.
 */
function currentContext(
  session: AgentSession,
  options: AgentHttpClientOptions,
  connectionId?: string,
  contractVersion?: string
): AgentContext {
  const chosen = options.context ?? {};
  // A guide this backend already asked for, under this same contract, is
  // evidence of what the conversation is about. It goes to the front of the
  // selection so the next turn carries it instead of spending another round
  // asking — through the ordinary budget, not around it, and never by
  // appending every guide ever answered.
  const remembered =
    connectionId && contractVersion
      ? guideCache.known(
          connectionId,
          contractVersion,
          session.catalog().map((entry) => entry.key)
        )
      : [];
  return buildAgentContext(
    session,
    remembered.length > 0
      ? { ...chosen, asked: [...remembered, ...(chosen.asked ?? [])] }
      : chosen,
    options.contextInputs?.(session) ?? {}
  );
}

function compactRequest(
  session: AgentSession,
  kind: AgentHttpKind,
  extra: Partial<AgentHttpRequest> = {},
  mode: "full" | "question" = "full",
  pin?: {
    readonly connectionId: string;
    readonly version: string;
    readonly context: AgentContext;
  }
): AgentHttpRequest {
  const manifest = session.manifest();
  const record = pin ? pins.read(session, pin.connectionId) : undefined;
  const sessionId = extra.sessionId ?? record?.sessionId;
  const contractVersion = pin?.version;
  const context = pin?.context;
  const versions = {
    ...(contractVersion ? { contractVersion } : {}),
    ...(context ? { selectionVersion: context.selection.version } : {}),
  };
  if (mode === "question") {
    // The contract is pinned; the view is not, and never is. It moves on every
    // turn, so a backend answering one is always answering against the view in
    // that request.
    return {
      schemaVersion: AGENT_SCHEMA_VERSION,
      kind,
      tableId: manifest.tableId,
      viewRevision: manifest.viewRevision,
      ...(sessionId ? { sessionId } : {}),
      ...versions,
      ...(context ? { view: context.view } : {}),
      ...extra,
    };
  }
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind,
    tableId: manifest.tableId,
    // The contract is what a backend answers against. `manifest` and `catalog`
    // travel beside it as the compact form, for an endpoint written against
    // the earlier shape.
    ...(context
      ? {
          context: {
            contract: context.contract,
            selection: context.selection,
          },
          view: context.view,
        }
      : {}),
    manifest,
    catalog: session.catalog(),
    ...(sessionId ? { sessionId } : {}),
    ...versions,
    ...extra,
  };
}

/**
 * Whether this connection may leave the contract out of the next request.
 *
 * The stored version is compared against the live one, so a contract that
 * changed — during an exchange or since — is simply not current, and the next
 * request carries it again.
 */
function usesPinnedCatalog(
  session: AgentSession,
  options: AgentHttpClientOptions
): boolean {
  if (options.pinCatalog === false) return false;
  const record = pins.read(session, connectionIdOf(options));
  return record?.contractVersion === schemaFingerprint(session);
}

/**
 * Bring this connection's pin up to date, if it can be.
 *
 * A backend that refuses or cannot pin is not an error: the contract travels
 * in each request instead. Only a transport failure propagates, and nothing is
 * ever marked current by a refresh that did not succeed.
 */
async function refreshSchemaPin(
  session: AgentSession,
  options: AgentHttpClientOptions,
  signal?: AbortSignal
): Promise<void> {
  if (options.pinCatalog === false) return;
  const connectionId = connectionIdOf(options);
  const version = schemaFingerprint(session);
  const current = pins.read(session, connectionId);
  if (!current || current.contractVersion === version) return;
  await pins.join(session, connectionId, version, async () => {
    const seq = pins.claim(session, connectionId);
    const response = await exchange(
      options,
      compactRequest(session, "schema", {}, "full", {
        connectionId,
        version,
        context: currentContext(session, options),
      }),
      signal
    );
    if (response.ok === false) {
      // The backend declined this contract. Sending it per request is the
      // documented fallback, and marking anything current here would be a lie.
      pins.forget(session, connectionId);
      guideCache.forget(connectionId);
      return;
    }
    rememberPin(session, connectionId, { version, seq }, response);
  });
}

function mergeSignals(
  timeoutMs: number | undefined,
  external?: AbortSignal
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timers: ReturnType<typeof setTimeout>[] = [];
  const onAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener("abort", onAbort, { once: true });
  }
  if (timeoutMs !== undefined && timeoutMs > 0) {
    timers.push(
      setTimeout(() => {
        controller.abort(
          new Error(`agent HTTP request timed out after ${timeoutMs}ms`)
        );
      }, timeoutMs)
    );
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      external?.removeEventListener("abort", onAbort);
      for (const timer of timers) clearTimeout(timer);
    },
  };
}

async function resolveHeaders(
  headers: AgentHttpClientOptions["headers"]
): Promise<HeadersInit | undefined> {
  if (typeof headers === "function") return headers();
  return headers;
}

function abortReason(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  // An explicit reason — a timeout, a host's own error — is carried through.
  // A bare abort() yields a platform AbortError, which is reported in this
  // bridge's own vocabulary instead.
  if (reason instanceof Error && reason.name !== "AbortError") return reason;
  return new Error("agent HTTP cancelled");
}

function abortPromise(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const fail = () => reject(abortReason(signal));
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener("abort", fail, { once: true });
  });
}

function assertResponseSize(bytes: number): void {
  if (bytes > MAX_RESPONSE_BYTES) {
    throw new AgentHttpError(
      "payload-too-large",
      `agent HTTP response exceeds ${MAX_RESPONSE_BYTES} bytes`
    );
  }
}

/** Guides and rows carried between rounds are bounded like the request is. */
function assertContextSize(
  descriptions: readonly CapabilityGuide[] | undefined,
  rows: readonly RowWindow[] | undefined
): void {
  const bytes = jsonBytes({ descriptions, rows });
  if (bytes > MAX_CONTEXT_BYTES) {
    throw new AgentHttpError(
      "payload-too-large",
      `agent HTTP turn context exceeds ${MAX_CONTEXT_BYTES} bytes`
    );
  }
}

function httpError(status: number, body: string): Error {
  const snippet = body.trim().slice(0, 240);
  return new Error(
    snippet
      ? `agent HTTP ${status}: ${snippet}`
      : `agent HTTP request failed with status ${status}`
  );
}

async function postJson(
  options: AgentHttpClientOptions,
  body: AgentHttpRequest,
  signal: AbortSignal
): Promise<unknown> {
  // A signal that is already aborted starts no network work at all.
  if (signal.aborted) throw abortReason(signal);
  if (options.request) {
    // The callback is free to ignore the signal, so the timeout is enforced
    // out here rather than trusting it to return.
    const value = await Promise.race([
      Promise.resolve(options.request(body, signal)),
      abortPromise(signal),
    ]);
    assertResponseSize(jsonBytes(value));
    return value;
  }
  const endpoint = options.endpoint.trim();
  if (!endpoint) throw new Error("agent HTTP endpoint is required");
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("agent HTTP requires fetch");
  }
  const headers = new Headers(await resolveHeaders(options.headers));
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  // Streaming is negotiated, never assumed. A backend that answers JSON is
  // answered from its own content type rather than by trying again.
  headers.set(
    "accept",
    options.stream ? "text/event-stream, application/json" : "application/json"
  );
  let response: Response;
  try {
    response = await Promise.race([
      fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      }),
      abortPromise(signal),
    ]);
  } catch (error) {
    if (signal.aborted) {
      throw abortReason(signal);
    }
    throw new Error(`agent HTTP connection failed: ${errorMessage(error)}`);
  }
  if (
    options.stream &&
    response.ok &&
    response.body &&
    (response.headers.get("content-type") ?? "").includes("text/event-stream")
  ) {
    return readStream(response, options, signal);
  }
  const text = await Promise.race([response.text(), abortPromise(signal)]);
  if (!response.ok) throw httpError(response.status, text);
  assertResponseSize(new TextEncoder().encode(text).byteLength);
  if (text.trim() === "") {
    throw new TypeError("agent HTTP response was empty");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new TypeError("agent HTTP response was not JSON");
  }
}

async function exchange(
  options: AgentHttpClientOptions,
  body: AgentHttpRequest,
  signal?: AbortSignal
): Promise<AgentHttpResponse> {
  if (requestBytes(body) > MAX_REQUEST_BYTES) {
    throw new AgentHttpError(
      "payload-too-large",
      `agent HTTP request exceeds ${MAX_REQUEST_BYTES} bytes`
    );
  }
  const merged = mergeSignals(options.timeoutMs, signal);
  try {
    return parseAgentHttpResponse(await postJson(options, body, merged.signal));
  } finally {
    merged.cleanup();
  }
}

/**
 * Read an event stream into the reply the rest of this client expects.
 *
 * The same ceilings as a JSON body: total bytes, and the caller's own signal,
 * which already carries `timeoutMs`. A stream that stops without `done` is a
 * failure rather than a shorter reply — see `createStreamReply`.
 */
async function readStream(
  response: Response,
  options: AgentHttpClientOptions,
  signal: AbortSignal
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new TypeError("agent HTTP stream had no body");
  const decoder = new TextDecoder();
  const reply = createStreamReply(options.onStreamText);
  let buffer = "";
  let bytes = 0;

  try {
    for (;;) {
      const chunk = await Promise.race([reader.read(), abortPromise(signal)]);
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      assertResponseSize(bytes);
      buffer += decoder.decode(chunk.value, { stream: true });
      const split = splitRecords(buffer);
      buffer = split.rest;
      let finished = false;
      for (const record of split.records) {
        const event = parseStreamRecord(record);
        if (event && reply.absorb(event)) finished = true;
      }
      if (finished) break;
    }
  } finally {
    // Releasing rather than cancelling: an abort has already torn the request
    // down, and a cancel on a settled reader throws over the real reason.
    reader.releaseLock();
  }
  return reply.finish(AGENT_SCHEMA_VERSION);
}

function newHttpTurnId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * A read's replay identity.
 *
 * The revision is in it because a read is only current for the view it read;
 * the query is not, because a replay key travels and a query names columns and
 * bounds. Turn, phase and position already make it unique.
 */
function readIdempotencyKey(
  turnId: string,
  phaseId: number,
  revision: number,
  index: number
): string {
  return `http-read:${JSON.stringify({ turnId, phaseId, revision, index })}`;
}

function mergeGuides(
  current: readonly CapabilityGuide[] | undefined,
  incoming: readonly CapabilityGuide[]
): CapabilityGuide[] {
  const next = [...(current ?? [])];
  const indexByKey = new Map(next.map((guide, index) => [guide.key, index]));
  for (const guide of incoming) {
    const existing = indexByKey.get(guide.key);
    if (existing === undefined) {
      indexByKey.set(guide.key, next.length);
      next.push(guide);
    } else {
      next[existing] = guide;
    }
  }
  return next;
}

/**
 * Run the asking tools and answer each one under its own call id.
 *
 * A failure answers that one call rather than ending the turn: a backend
 * guessing a capability key this table does not offer, or asking for a window
 * a policy now refuses, has made an ordinary mistake. Telling it so and
 * carrying on is what a conversation does; throwing ended the whole turn over
 * one bad name, with nothing run and nothing explained.
 */
async function answerQuestions(
  session: AgentSession,
  questions: readonly AgentHttpToolCall[],
  turn: HttpPhaseContext,
  connectionId: string,
  contractVersion: string,
  cache: DiscoveryCache | undefined
): Promise<{
  readonly results: readonly AgentHttpToolResult[];
  readonly guides: readonly CapabilityGuide[];
  readonly windows: readonly RowWindow[];
  readonly describe: number;
  readonly read: number;
}> {
  assertTurnContext(session, turn);
  const results: AgentHttpToolResult[] = [];
  const guides: CapabilityGuide[] = [];
  const windows: RowWindow[] = [];
  let describe = 0;
  let read = 0;

  for (const [index, call] of questions.entries()) {
    // Re-checked after every awaited answer: a policy change between two row
    // windows ends the turn rather than answering the rest of it under terms
    // the backend never saw.
    assertTurnContext(session, turn);

    if (call.name === DESCRIBE_TOOL) {
      // Counted by what was ASKED, not by what came back: a round that
      // produced only unknown names still used a round.
      const request = asDescribeRequest(call.args);
      describe += request.keys?.length ?? 0;
      const answered = discover(request, discoverySource(session));
      guides.push(...answered.guides);
      // Remembered against the contract these answers describe, so a later
      // turn under the same contract need not spend a round on them again.
      cache?.remember(connectionId, contractVersion, answered.guides);
      results.push({
        id: call.id,
        result: {
          guides: answered.guides,
          unavailable: answered.unavailable,
          ...(answered.deferred.length > 0
            ? { deferred: answered.deferred }
            : {}),
        },
      });
      continue;
    }

    // A read is bound to the view it reads, not to the phase that asked for
    // it, so the revision travels in its replay key while the arguments do
    // not.
    const query = asReadQuery(call.args);
    const revision = session.manifest().viewRevision;
    const result = await session.execute(
      "rows.read",
      query,
      revision,
      readIdempotencyKey(turn.turnId, turn.phaseId, revision, index)
    );
    read += 1;
    if (!result.ok) {
      results.push({
        id: call.id,
        error: {
          code: result.error?.code ?? "read-failed",
          message: result.error?.message ?? "rows.read failed",
        },
      });
      continue;
    }
    // Already labelled by the session: `{ source, untrusted, revision, rows }`.
    // It travels to the backend as it is, and the window inside it is what
    // counts against the accumulated context budget.
    const envelope = result.result as RowProvenanceEnvelope;
    windows.push(envelope.rows);
    results.push({ id: call.id, result: envelope });
  }

  return { results, guides, windows, describe, read };
}

/**
 * Probe the endpoint. A typed protocol body is required — a 200 with
 * unrelated JSON is a failure.
 *
 * @public
 */
export async function connectAgentHttp(
  session: AgentSession,
  options: AgentHttpClientOptions,
  signal?: AbortSignal
): Promise<AgentHttpResponse> {
  const connectionId = connectionIdOf(options);
  const version = schemaFingerprint(session);
  const seq = pins.claim(session, connectionId);
  const response = await exchange(
    options,
    compactRequest(session, "hello", {}, "full", {
      connectionId,
      version,
      context: currentContext(session, options),
    }),
    signal
  );
  if (response.ok === false) {
    throw new Error(response.text ?? "agent HTTP hello was rejected");
  }
  rememberPin(session, connectionId, { version, seq }, response);
  return response;
}

/**
 * Talk to the backend until it stops asking for discovery.
 *
 * Actions a backend sent are its decision, whatever else the same response
 * asked for. Collecting them per round is the difference between running what
 * it chose and throwing all of it away because it also wanted a row window —
 * which is exactly what a small model does, every round, until the discovery
 * budget runs out with nothing done.
 */
/**
 * One round of the conversation: build the request, send it, record the pin.
 *
 * The contract travels when this connection holds no pin for it and only the
 * view travels when it does — which is what `questionOnly` names. The pin is
 * remembered from the reply before anything else reads it, because a backend
 * that acknowledged one has it whatever the rest of the answer says.
 */
async function sendRound(
  session: AgentSession,
  options: AgentHttpClientOptions,
  round: {
    readonly connectionId: string;
    readonly version: string;
    readonly questionOnly: boolean;
    readonly turn: HttpPhaseContext;
    readonly phaseId: number;
    readonly message: string;
    readonly conversation?: readonly AgentHttpMessage[];
    readonly toolResults?: readonly AgentHttpToolResult[];
    readonly pendingCalls: readonly AgentHttpToolCall[];
    readonly signal?: AbortSignal;
  }
): Promise<AgentHttpResponse> {
  const seq = pins.claim(session, round.connectionId);
  // The permitted context as it stands for this round. Named apart from the
  // phase's own execution context on purpose: that one is identity, this one
  // is what goes on the wire.
  const wireContext = currentContext(
    session,
    options,
    round.connectionId,
    round.version
  );
  const reply = await exchange(
    options,
    compactRequest(
      session,
      "turn",
      {
        message: round.message,
        conversation: round.conversation,
        turnId: round.turn.turnId,
        phaseId: round.phaseId,
        ...(round.toolResults?.length
          ? { toolResults: round.toolResults }
          : {}),
        ...(round.pendingCalls.length
          ? { pendingCalls: round.pendingCalls }
          : {}),
      },
      round.questionOnly ? "question" : "full",
      {
        connectionId: round.connectionId,
        version: round.version,
        context: wireContext,
      }
    ),
    round.signal
  );
  rememberPin(
    session,
    round.connectionId,
    { version: round.version, seq },
    reply
  );
  return reply;
}

/**
 * Drop everything this client remembers about one connection.
 *
 * The pin and the guides answered under it are the same promise — "you have
 * already been told this" — so a backend that lost one has lost both.
 */
function forgetConnection(session: AgentSession, connectionId: string): void {
  pins.forget(session, connectionId);
  guideCache.forget(connectionId);
}

/**
 * Why a turn stopped at a question nobody answered.
 *
 * Two different facts, and the reader is owed the difference: nothing here
 * could put the question to them, or they were asked and declined.
 */
function unansweredQuestion(
  kind: "no-channel" | "declined",
  pending: readonly AgentHttpToolCall[]
): AgentHttpUnresolved {
  return {
    code: kind === "no-channel" ? "no-reader-channel" : "question-unanswered",
    message:
      kind === "no-channel"
        ? "the backend asked the reader a question and this client has no way to put it to them"
        : "the backend asked a question and nobody answered",
    pending: pending.map((call) => call.name),
  };
}

async function preparePinnedTurn(
  session: AgentSession,
  options: AgentHttpClientOptions,
  signal?: AbortSignal
): Promise<boolean> {
  if (options.pinCatalog !== false) {
    await refreshSchemaPin(session, options, signal);
  }
  return usesPinnedCatalog(session, options);
}

/**
 * One phase: ask until the backend stops asking, then hand back its plan.
 *
 * The plan is the reducer's, not an accumulation of every round's proposals —
 * a reply while the phase is still discovering replaces what came before it,
 * so a model that repeats itself across rounds still writes once.
 */
async function runPhase(
  session: AgentSession,
  options: AgentHttpClientOptions,
  turn: HttpPhaseContext,
  input: {
    readonly message: string;
    readonly conversation?: readonly AgentHttpMessage[];
    readonly signal?: AbortSignal;
    readonly phaseId: number;
    /** Receipts of work an earlier phase completed, carried forward. */
    readonly toolResults?: readonly AgentHttpToolResult[];
  }
): Promise<{
  readonly last: AgentHttpResponse | undefined;
  /** The view this phase was answered against. */
  readonly context: HttpPhaseContext;
  /** The phase itself, so the caller can move it through executing. */
  readonly phase: ReturnType<typeof createPhasePlan>;
  readonly plan: readonly FinalizedCall[];
  readonly text: string;
  readonly fulfilled: { describe: number; read: number };
  /** Set when the phase stopped without a plan it could run. */
  readonly unresolved?: AgentHttpUnresolved;
}> {
  const connectionId = connectionIdOf(options);
  let questionOnly = await preparePinnedTurn(session, options, input.signal);
  // One recovery, before anything of this phase has run. A backend that lost
  // its pin can be sent the contract again safely; a call whose outcome is
  // unknown never can, which is why this only happens while the plan is empty.
  let mayRecoverPin = true;
  const phase = createPhasePlan({
    tableId: turn.tableId,
    turnId: turn.turnId,
    phaseId: input.phaseId,
  });
  let guides: readonly CapabilityGuide[] = [];
  let windows: readonly RowWindow[] = [];
  let toolResults = input.toolResults;
  let last: AgentHttpResponse | undefined;
  let context = turn;
  let text = "";
  const fulfilled = { describe: 0, read: 0 };

  for (let round = 0; round <= MAX_NEED_ROUNDS; round += 1) {
    assertTurnContext(session, turn);
    // The request below describes the table as it is right now, so this is
    // the view the backend is about to answer — captured before it goes out,
    // never inferred from where the table ends up afterwards. Round 0 needs
    // its own capture as much as the rest: pinning the catalog is a network
    // round trip, and the table is free to move while it happens.
    context = phaseContext(session, turn.turnId, input.phaseId);
    const version = schemaFingerprint(session);
    // Built once per round. With the contract pinned only the view travels;
    // with `pinCatalog: false` the whole thing does, which is what that option
    // means.
    last = await sendRound(session, options, {
      connectionId,
      version,
      questionOnly,
      turn,
      phaseId: input.phaseId,
      message: input.message,
      conversation: input.conversation,
      toolResults,
      pendingCalls: phase.pending(),
      signal: input.signal,
    });

    if (pinLost(last) && mayRecoverPin) {
      // The backend answered nothing but "I no longer have that contract".
      // Forget it, send the whole thing once, and let the same round run
      // again — no call of this phase has been dispatched.
      mayRecoverPin = false;
      questionOnly = false;
      forgetConnection(session, connectionId);
      round -= 1;
      continue;
    }

    // A backend that explained itself on one round and only acted on the next
    // still said something; reading only the final round loses it.
    if (last.text) text = last.text;

    const outcome = phase.absorb(last);
    if (outcome.kind === "ready") {
      return { last, context, phase, plan: outcome.plan, text, fulfilled };
    }

    if (outcome.kind === "ask-user") {
      const answered = await askReader(options, outcome.question, input.signal);
      if (answered.kind !== "answered") {
        phase.settle("failed");
        return {
          last,
          context,
          phase,
          plan: [],
          text,
          fulfilled,
          unresolved: unansweredQuestion(answered.kind, phase.pending()),
        };
      }
      toolResults = mergeToolResults(toolResults, [answered.result]);
      continue;
    }

    const answers = await answerQuestions(
      session,
      outcome.questions,
      turn,
      connectionId,
      version,
      guideCache
    );
    guides = mergeGuides(guides, answers.guides);
    windows = [...windows, ...answers.windows];
    assertContextSize(guides, windows);
    fulfilled.describe += answers.describe;
    fulfilled.read += answers.read;
    // Results accumulate across the rounds of a phase. A backend that keeps no
    // state per turn — which the shipped example deliberately does not — would
    // otherwise be told the guide it asked for on one round and not on the
    // next, and go on asking for what it has already been given.
    toolResults = mergeToolResults(toolResults, answers.results);
  }

  // Out of rounds. Whatever the backend last proposed was never finalized, so
  // nothing from this phase runs — but the turn still reports truthfully, and
  // any receipts an earlier phase earned are the caller's to keep.
  phase.settle("failed");
  return {
    last,
    context,
    phase,
    plan: [],
    text,
    fulfilled,
    unresolved: {
      code: "discovery-exhausted",
      message: `the backend asked for discovery more than ${String(MAX_NEED_ROUNDS)} times without settling on a plan`,
      pending: phase.pending().map((call) => call.name),
    },
  };
}

/**
 * Send one user message, answer describe/read needs, then execute actions
 * through the live session. Failed mutations are not retried.
 *
 * @public
 */
export async function runAgentHttpTurn(
  session: AgentSession,
  message: string,
  options: AgentHttpClientOptions,
  extras: {
    conversation?: readonly AgentHttpMessage[];
    returnResults?: boolean;
    signal?: AbortSignal;
  } = {}
): Promise<AgentHttpTurnResult> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("agent HTTP turn requires a message");

  const turnId = newHttpTurnId();
  const turn = phaseContext(session, turnId, 0);
  const execution = createTurnExecution(session, turn);
  const results: ExecuteResult[] = [];
  const keys: string[] = [];
  const fulfilled = { describe: 0, read: 0 };
  let text = "";
  let unresolved: AgentHttpUnresolved | undefined;
  let toolResults: readonly AgentHttpToolResult[] | undefined;
  let phaseId = 0;

  // Each pass is one dependent phase: ask until the backend settles, run what
  // it settled on, and only continue when it asked for the receipts.
  for (;;) {
    const pass = await runPhase(session, options, turn, {
      message: trimmed,
      conversation: extras.conversation,
      signal: extras.signal,
      phaseId,
      toolResults,
    });
    if (!pass.last) throw new Error("agent HTTP returned no response");
    assertTurnContext(session, turn);
    if (pass.text) text = pass.text;
    fulfilled.describe += pass.fulfilled.describe;
    fulfilled.read += pass.fulfilled.read;

    pass.phase.begin();
    const ran = await execution.execute(
      { context: pass.context, actions: pass.plan },
      extras.signal
    );
    pass.phase.settle(
      ran.some((entry) => entry.error?.code === "cancelled")
        ? "cancelled"
        : "settled"
    );
    results.push(...ran);
    // The keys, not the calls: what a receipt needs is which capability ran.
    keys.push(...pass.plan.map((call) => call.key));

    if (pass.unresolved) {
      unresolved = pass.unresolved;
      break;
    }
    if (
      !extras.returnResults ||
      !pass.last.continueWithResults ||
      pass.plan.length === 0
    ) {
      break;
    }
    phaseId += 1;
    if (phaseId > MAX_CONTINUATIONS) {
      unresolved = {
        code: "continuation-exhausted",
        message: `the backend asked to continue more than ${String(MAX_CONTINUATIONS)} times`,
        pending: [],
      };
      break;
    }
    // The next phase depends on what this one produced, so it carries the
    // actual receipts rather than a claim that the work happened.
    toolResults = pass.plan.map((call, index) =>
      receiptResult(call, ran[index])
    );
  }

  return {
    text,
    results,
    keys,
    needsFulfilled: fulfilled,
    ...(unresolved ? { unresolved } : {}),
  };
}

/** Later answers win, and a result is only ever carried once per call id. */
function mergeToolResults(
  current: readonly AgentHttpToolResult[] | undefined,
  incoming: readonly AgentHttpToolResult[]
): readonly AgentHttpToolResult[] {
  const next = [...(current ?? [])];
  const indexById = new Map(next.map((entry, index) => [entry.id, index]));
  for (const entry of incoming) {
    const existing = indexById.get(entry.id);
    if (existing === undefined) {
      indexById.set(entry.id, next.length);
      next.push(entry);
    } else {
      next[existing] = entry;
    }
  }
  return next;
}

/** One executed call, shaped as the tool result its caller is waiting for. */
function receiptResult(
  call: FinalizedCall,
  result: ExecuteResult | undefined
): AgentHttpToolResult {
  if (!result) {
    return {
      id: call.id,
      error: { code: "not-run", message: "the call was never reached" },
    };
  }
  if (!result.ok) {
    return {
      id: call.id,
      error: {
        code: result.error?.code ?? "failed",
        message: result.error?.message ?? "the call failed",
      },
    };
  }
  return {
    id: call.id,
    result: { ok: true, revision: result.revision, result: result.result },
  };
}

/**
 * Put a structured question to the reader.
 *
 * Without a channel the turn stops and says so rather than hanging or
 * inventing an answer, and whatever an earlier phase completed is still
 * reported.
 */
async function askReader(
  options: AgentHttpClientOptions,
  question: AgentHttpQuestion,
  signal?: AbortSignal
): Promise<ReaderAnswer> {
  if (!options.askUser) return { kind: "no-channel" };
  const answer = await options.askUser(question, signal);
  // Undefined is the reader declining, or a turn that was abandoned while the
  // question was on screen. Both are "nobody answered", and neither is a
  // value to proceed on.
  if (!answer) return { kind: "declined" };
  return { kind: "answered", result: { id: question.id, result: answer } };
}

/** What came back when the backend asked the reader something. */
type ReaderAnswer =
  | { readonly kind: "answered"; readonly result: AgentHttpToolResult }
  | { readonly kind: "no-channel" }
  | { readonly kind: "declined" };

/**
 * The ceilings this client enforces, published so a backend can enforce them.
 *
 * @public
 */
export const AGENT_HTTP_LIMITS: AgentWireLimits = {
  maxToolCalls: MAX_ACTIONS,
  maxDescribeCalls: MAX_DESCRIBE_NEEDS,
  maxReadCalls: MAX_READ_NEEDS,
  maxRequestBytes: MAX_REQUEST_BYTES,
  maxResponseBytes: MAX_RESPONSE_BYTES,
  maxAudioBytes: MAX_AUDIO_BYTES,
  maxAudioMs: MAX_AUDIO_MS,
  audioTypes: [...AUDIO_TYPES],
};

/**
 * This protocol as JSON Schema, for a backend in any language.
 *
 * Generated from the same constants the parsers use, so what is published and
 * what is accepted cannot drift apart.
 *
 * @returns The request and reply schemas.
 *
 * @public
 */
export function agentHttpJsonSchema(): JsonSchemaDocument {
  return agentHttpSchema(AGENT_HTTP_LIMITS);
}

/**
 * Bind an endpoint to one session. Import this subpath only where the
 * host actually talks HTTP — unused bundles stay free of it.
 *
 * @public
 */
export function createAgentHttpClient(options: AgentHttpClientOptions): {
  readonly endpoint: string;
  connect: (
    session: AgentSession,
    signal?: AbortSignal
  ) => Promise<AgentHttpResponse>;
  send: (
    session: AgentSession,
    message: string,
    extras?: {
      conversation?: readonly AgentHttpMessage[];
      returnResults?: boolean;
      signal?: AbortSignal;
    }
  ) => Promise<AgentHttpTurnResult>;
  /**
   * Drop what this connection remembers about the backend.
   *
   * A host whose credentials change calls this — or gives a new
   * `connectionId` — so the next turn negotiates again instead of relying on
   * an acknowledgement made under the identity it has just left.
   */
  reset: (session: AgentSession) => void;
} {
  return {
    endpoint: options.endpoint,
    connect: (session, signal) => connectAgentHttp(session, options, signal),
    send: (session, message, extras) =>
      runAgentHttpTurn(session, message, options, extras),
    reset: (session) => {
      const connectionId = connectionIdOf(options);
      pins.forget(session, connectionId);
      // Guidance is acknowledged to a connection the same way a pin is. A
      // reader whose credentials changed is a different connection, and what
      // the last one was told is not what this one has been.
      guideCache.forget(connectionId);
    },
  };
}

/**
 * The HTTP backend as an {@link AssistantTransport}.
 *
 * This adapter is the only thing that couples a conversation to HTTP. It
 * lives on `@adapttable/ai/http` on purpose: a host writing its own transport
 * implements the neutral interface from `@adapttable/ai` and never pulls this
 * client — or any model client — into its graph.
 *
 * @param options - Endpoint and credentials for the backend.
 * @returns A transport the assistant controller can take as-is.
 *
 * @public
 */
export function assistantHttpTransport(
  options: AgentHttpClientOptions
): AssistantTransport {
  let connected: AgentSession | undefined;
  // The controller supplies a per-turn sink; the client option is fixed for
  // the life of the transport, so the option forwards to whichever turn is in
  // flight rather than each turn building its own client.
  let partialSink: ((text: string) => void) | undefined;
  // The same arrangement for questions: the surface that can draw one belongs
  // to the turn, the client option belongs to the transport.
  let askSink:
    | ((question: AgentHttpQuestion) => Promise<AgentHttpAnswer | undefined>)
    | undefined;
  const client = createAgentHttpClient({
    ...options,
    onStreamText: (text) => {
      options.onStreamText?.(text);
      partialSink?.(text);
    },
    askUser: async (question, signal) => {
      // A host that supplied its own channel keeps it; otherwise the turn's
      // surface is asked. Without either, the turn reports `no-reader-channel`
      // exactly as it did before.
      if (options.askUser) return options.askUser(question, signal);
      if (!askSink) return undefined;
      return askSink(question);
    },
  });
  return {
    connect: async ({ session, signal }) => {
      connected = session;
      await client.connect(session, signal);
    },
    disconnect: () => {
      // What the backend acknowledged was acknowledged to a connection that is
      // now closed; a later one negotiates for itself.
      if (connected) client.reset(connected);
      connected = undefined;
    },
    send: async ({
      session,
      text,
      conversation,
      signal,
      onPartialText,
      askUser,
    }) => {
      partialSink = onPartialText;
      askSink = askUser;
      const turn = await client
        .send(session, text, {
          conversation: conversation.map((entry) => ({
            role: entry.role,
            text: entry.text,
          })),
          returnResults: true,
          signal,
        })
        .finally(() => {
          // Cleared whatever happened, so a later stream cannot write into the
          // turn that has just ended, and a later question cannot be drawn
          // into a conversation that has moved on.
          partialSink = undefined;
          askSink = undefined;
        });
      return {
        text: turn.text,
        results: turn.results,
        keys: turn.keys,
        ...(turn.unresolved ? { unresolved: turn.unresolved } : {}),
      };
    },
  };
}

// The request builders take and return these, so the wire entry names them
// rather than sending a reader to the root entry for the type of an argument
// it already accepts.
export type {
  AgentContext,
  AgentContextInputs,
  AgentContextOptions,
  ContextCapability,
  ContextColumn,
} from "./context";
export type { AgentInstructionsInput } from "./contextPrompt";
export type { AgentContextProfile, DeferralReason } from "./contextSelection";
