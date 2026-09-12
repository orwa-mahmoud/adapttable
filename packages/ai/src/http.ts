/**
 * Opt-in HTTP bridge — `@adapttable/ai/http`.
 *
 * The root entry stays transport-free. This subpath posts a compact
 * capability manifest to a developer-owned endpoint and executes the
 * returned actions through the existing session. No model SDK.
 */
import type { AssistantTransport } from "./assistantContracts";
import { errorMessage } from "./errorMessage";
import {
  createTurnExecution,
  type HttpPhaseContext,
  phaseContext,
  policyKey,
} from "./httpExecution";
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
  /** Compact capability snapshot. Required on hello / schema. */
  readonly manifest?: AgentManifest;
  /** Enabled keys plus one-line summaries. Required on hello / schema. */
  readonly catalog?: readonly CatalogEntry[];
  /** Live view revision when the catalog is not re-attached. */
  readonly viewRevision?: number;
  /** User text. Required for `kind: "turn"`. */
  readonly message?: string;
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
  /** When true, the host may POST execute receipts back. */
  readonly continueWithResults?: boolean;
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
  ) => Promise<AgentHttpAnswer>;
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
  if (kind === "turn" && typeof input.message !== "string") {
    throw new TypeError("agent HTTP turn requires a message string");
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
    return { id, name, args: { keys: asDescribeKeys(args) }, expectedRevision };
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

/** The capability keys one `describe` call is asking about. */
function asDescribeKeys(args: unknown): readonly string[] {
  const entry = isRecord(args) ? args : {};
  if (entry.keys === undefined) return [];
  if (!Array.isArray(entry.keys)) {
    throw new TypeError("agent HTTP describe.keys must be an array of strings");
  }
  for (const key of entry.keys) {
    if (typeof key !== "string" || key.length === 0) {
      throw new TypeError(
        "agent HTTP describe.keys must be an array of strings"
      );
    }
  }
  return entry.keys as readonly string[];
}

interface HttpPin {
  readonly fingerprint: string;
  readonly sessionId?: string;
}

const httpPins = new WeakMap<AgentSession, HttpPin>();

function schemaFingerprint(session: AgentSession): string {
  const manifest = session.manifest();
  const columns = manifest.columns
    .map(
      (column) =>
        `${column.id}:${column.readable ? "1" : "0"}:${column.writable ? "1" : "0"}`
    )
    .join(",");
  return [
    manifest.tableId,
    manifest.capabilities.join(","),
    columns,
    manifest.policy.write,
    manifest.policy.approval,
    manifest.policy.commit,
  ].join("|");
}

function rememberPin(session: AgentSession, response: AgentHttpResponse): void {
  const current = httpPins.get(session);
  httpPins.set(session, {
    fingerprint: schemaFingerprint(session),
    sessionId: response.sessionId ?? current?.sessionId,
  });
}

function compactRequest(
  session: AgentSession,
  kind: AgentHttpKind,
  extra: Partial<AgentHttpRequest> = {},
  mode: "full" | "question" = "full"
): AgentHttpRequest {
  const manifest = session.manifest();
  const sessionId = extra.sessionId ?? httpPins.get(session)?.sessionId;
  if (mode === "question") {
    return {
      schemaVersion: AGENT_SCHEMA_VERSION,
      kind,
      tableId: manifest.tableId,
      viewRevision: manifest.viewRevision,
      ...(sessionId ? { sessionId } : {}),
      ...extra,
    };
  }
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind,
    tableId: manifest.tableId,
    manifest,
    catalog: session.catalog(),
    ...(sessionId ? { sessionId } : {}),
    ...extra,
  };
}

function usesPinnedCatalog(
  session: AgentSession,
  options: AgentHttpClientOptions
): boolean {
  if (options.pinCatalog === false) return false;
  return httpPins.get(session)?.fingerprint === schemaFingerprint(session);
}

async function refreshSchemaPin(
  session: AgentSession,
  options: AgentHttpClientOptions,
  signal?: AbortSignal
): Promise<void> {
  if (options.pinCatalog === false) return;
  const fingerprint = schemaFingerprint(session);
  const current = httpPins.get(session);
  if (!current || current.fingerprint === fingerprint) return;
  const kind: AgentHttpKind = "schema";
  const response = await exchange(
    options,
    compactRequest(session, kind),
    signal
  );
  if (response.ok === false) {
    throw new Error(response.text ?? "agent HTTP schema pin was rejected");
  }
  rememberPin(session, response);
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
  headers.set("accept", "application/json");
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
  turn: HttpPhaseContext
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
      const keys = asDescribeKeys(call.args);
      describe += keys.length;
      const catalog = session.catalog();
      const known = keys.filter((key) =>
        catalog.some((entry) => entry.key === key)
      );
      const missing = keys.filter((key) => !known.includes(key));
      const answered = known.map((key) => session.describe(key));
      guides.push(...answered);
      results.push({
        id: call.id,
        result: { guides: answered, unavailable: missing },
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
    windows.push(result.result as RowWindow);
    results.push({ id: call.id, result: result.result });
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
  const response = await exchange(
    options,
    compactRequest(session, "hello"),
    signal
  );
  if (response.ok === false) {
    throw new Error(response.text ?? "agent HTTP hello was rejected");
  }
  rememberPin(session, response);
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
  const questionOnly = await preparePinnedTurn(session, options, input.signal);
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
    last = await exchange(
      options,
      compactRequest(
        session,
        "turn",
        {
          message: input.message,
          conversation: input.conversation,
          turnId: turn.turnId,
          phaseId: input.phaseId,
          ...(toolResults?.length ? { toolResults } : {}),
          ...(phase.pending().length ? { pendingCalls: phase.pending() } : {}),
        },
        questionOnly ? "question" : "full"
      ),
      input.signal
    );
    if (!questionOnly) rememberPin(session, last);
    // A backend that explained itself on one round and only acted on the next
    // still said something; reading only the final round loses it.
    if (last.text) text = last.text;

    const outcome = phase.absorb(last);
    if (outcome.kind === "ready") {
      return { last, context, phase, plan: outcome.plan, text, fulfilled };
    }

    if (outcome.kind === "ask-user") {
      const answered = await askReader(options, outcome.question, input.signal);
      if (!answered) {
        phase.settle("failed");
        return {
          last,
          context,
          phase,
          plan: [],
          text,
          fulfilled,
          unresolved: {
            code: "no-reader-channel",
            message:
              "the backend asked the reader a question and this client has no way to put it to them",
            pending: phase.pending().map((call) => call.name),
          },
        };
      }
      toolResults = mergeToolResults(toolResults, [answered]);
      continue;
    }

    const answers = await answerQuestions(session, outcome.questions, turn);
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
): Promise<AgentHttpToolResult | undefined> {
  if (!options.askUser) return undefined;
  const answer = await options.askUser(question, signal);
  return { id: question.id, result: answer };
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
} {
  return {
    endpoint: options.endpoint,
    connect: (session, signal) => connectAgentHttp(session, options, signal),
    send: (session, message, extras) =>
      runAgentHttpTurn(session, message, options, extras),
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
  const client = createAgentHttpClient(options);
  return {
    connect: async ({ session, signal }) => {
      await client.connect(session, signal);
    },
    send: async ({ session, text, conversation, signal }) => {
      const turn = await client.send(session, text, {
        conversation: conversation.map((entry) => ({
          role: entry.role,
          text: entry.text,
        })),
        returnResults: true,
        signal,
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
