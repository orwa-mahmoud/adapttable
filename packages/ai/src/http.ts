/**
 * Opt-in HTTP bridge — `@adapttable/ai/http`.
 *
 * The root entry stays transport-free. This subpath posts a compact
 * capability manifest to a developer-owned endpoint and executes the
 * returned actions through the existing session. No model SDK.
 */
import type { AssistantTransport } from "./assistantContracts";
import { errorMessage } from "./errorMessage";
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
} from "./assistantContracts";
export type { AssistantReceiptSubject } from "./assistantReceipts";
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

/** Hello probe versus a user turn. @public */
export type AgentHttpKind = "hello" | "turn";

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
 * Progressive discovery the backend may request instead of guessing.
 *
 * Descriptions come from `session.describe`. Row windows go through
 * `rows.read`, so column permissions and `readMax` still apply.
 *
 * @public
 */
export interface AgentHttpNeeds {
  /** Capability keys whose guides the backend wants next. */
  readonly describe?: readonly string[];
  /** Permitted `rows.read` queries. Never a full-dataset dump. */
  readonly read?: readonly RowReadQuery[];
}

/**
 * One action the backend wants the table to run.
 *
 * Execution always goes through `session.execute`.
 *
 * @public
 */
export interface AgentHttpAction {
  /** Catalog key. */
  readonly key: string;
  /** Arguments for that key. */
  readonly args?: unknown;
  /** Caller-supplied replay key. Required so a retry cannot mint a new write. */
  readonly idempotencyKey: string;
  /** Revision the backend observed. Defaults to the request snapshot. */
  readonly expectedRevision?: number;
}

/**
 * Frontend → backend body.
 *
 * The compact manifest and catalog are always included. Full guides and
 * row windows appear only after the backend asked for them.
 *
 * @public
 */
export interface AgentHttpRequest {
  /** Schema family. Must be `adapttable.agent.v1`. */
  readonly schemaVersion: typeof AGENT_SCHEMA_VERSION;
  /** Hello probe or a user turn. */
  readonly kind: AgentHttpKind;
  /** Table identity from the live session. */
  readonly tableId: string;
  /** Compact capability snapshot. Never includes row payloads. */
  readonly manifest: AgentManifest;
  /** Enabled keys plus one-line summaries. */
  readonly catalog: readonly CatalogEntry[];
  /** User text. Required for `kind: "turn"`. */
  readonly message?: string;
  /** Optional prior lines the host chooses to send. */
  readonly conversation?: readonly AgentHttpMessage[];
  /** Guides returned after `needs.describe`. */
  readonly descriptions?: readonly CapabilityGuide[];
  /** Permitted row windows returned after `needs.read`. */
  readonly rows?: readonly RowWindow[];
  /** Optional execute receipts when the host asked to continue. */
  readonly results?: readonly ExecuteResult[];
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
  /** Assistant text to show in the host UI. */
  readonly text?: string;
  /** Structured actions for `session.execute`. */
  readonly actions?: readonly AgentHttpAction[];
  /** Ask the frontend for guides or permitted reads, then continue. */
  readonly needs?: AgentHttpNeeds;
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
}

const MAX_NEED_ROUNDS = 3;
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

interface TurnSnapshot {
  readonly turnId: string;
  readonly revision: number;
  readonly policyKey: string;
}

function policyKey(manifest: AgentManifest): string {
  return JSON.stringify({
    write: manifest.policy.write,
    approval: manifest.policy.approval,
    commit: manifest.policy.commit,
    capabilities: manifest.capabilities,
  });
}

function turnSnapshot(session: AgentSession, turnId: string): TurnSnapshot {
  const manifest = session.manifest();
  return {
    turnId,
    revision: manifest.viewRevision,
    policyKey: policyKey(manifest),
  };
}

function assertTurnContext(
  session: AgentSession,
  snapshot: TurnSnapshot
): void {
  const manifest = session.manifest();
  // A view revision tick during the model call is ordinary — React flushed a
  // filter, or observe() advanced after a describe/read. Aborting the whole
  // turn over that left actions unrun and showed ERROR. Policy is the thing
  // that must not move: a table that dropped writes or capabilities mid-turn
  // is no longer the one the backend answered.
  if (policyKey(manifest) !== snapshot.policyKey) {
    throw new AgentHttpError(
      "context-stale",
      `table policy changed during turn (revision ${snapshot.revision} → ${manifest.viewRevision})`
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
  if (input.kind !== "hello" && input.kind !== "turn") {
    throw new TypeError('agent HTTP kind must be "hello" or "turn"');
  }
  if (typeof input.tableId !== "string" || input.tableId.length === 0) {
    throw new TypeError("agent HTTP tableId must be a non-empty string");
  }
  if (!isRecord(input.manifest)) {
    throw new TypeError("agent HTTP manifest must be an object");
  }
  validateManifestShape(input.manifest);
  if (!Array.isArray(input.catalog)) {
    throw new TypeError("agent HTTP catalog must be an array");
  }
  if (input.kind === "turn" && typeof input.message !== "string") {
    throw new TypeError("agent HTTP turn requires a message string");
  }
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind: input.kind,
    tableId: input.tableId,
    manifest: input.manifest as unknown as AgentManifest,
    catalog: input.catalog as CatalogEntry[],
    message: typeof input.message === "string" ? input.message : undefined,
    conversation: Array.isArray(input.conversation)
      ? (input.conversation as AgentHttpMessage[])
      : undefined,
    descriptions: Array.isArray(input.descriptions)
      ? (input.descriptions as CapabilityGuide[])
      : undefined,
    rows: Array.isArray(input.rows) ? (input.rows as RowWindow[]) : undefined,
    results: Array.isArray(input.results)
      ? (input.results as ExecuteResult[])
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
  const actions = Array.isArray(input.actions)
    ? input.actions.map(asAction)
    : undefined;
  if (actions && actions.length > MAX_ACTIONS) {
    throw new TypeError(`agent HTTP actions exceed limit of ${MAX_ACTIONS}`);
  }
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    ok: typeof input.ok === "boolean" ? input.ok : undefined,
    text: typeof input.text === "string" ? input.text : undefined,
    actions,
    needs: isRecord(input.needs) ? asNeeds(input.needs) : undefined,
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

function asAction(value: unknown): AgentHttpAction {
  if (!isRecord(value)) {
    throw new TypeError("agent HTTP action must be an object");
  }
  const key = asString(value.key);
  const idempotencyKey = asString(value.idempotencyKey);
  if (!key) throw new TypeError("agent HTTP action.key is required");
  if (!idempotencyKey) {
    throw new TypeError("agent HTTP action.idempotencyKey is required");
  }
  let expectedRevision: number | undefined;
  if ("expectedRevision" in value && value.expectedRevision !== undefined) {
    expectedRevision = asFiniteNumber(value.expectedRevision);
    if (expectedRevision === undefined) {
      throw new TypeError(
        "agent HTTP action.expectedRevision must be a finite number"
      );
    }
  }
  return {
    key,
    args: "args" in value ? value.args : {},
    idempotencyKey,
    expectedRevision,
  };
}

function asNeeds(value: Record<string, unknown>): AgentHttpNeeds {
  const describe = Array.isArray(value.describe)
    ? value.describe.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : undefined;
  if (describe && describe.length > MAX_DESCRIBE_NEEDS) {
    throw new TypeError(
      `agent HTTP needs.describe exceeds limit of ${MAX_DESCRIBE_NEEDS}`
    );
  }
  const read = Array.isArray(value.read)
    ? value.read.filter(isRecord).map((entry) => {
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
      })
    : undefined;
  if (read && read.length > MAX_READ_NEEDS) {
    throw new TypeError(
      `agent HTTP needs.read exceeds limit of ${MAX_READ_NEEDS}`
    );
  }
  return { describe, read };
}

function compactRequest(
  session: AgentSession,
  kind: AgentHttpKind,
  extra: Partial<AgentHttpRequest> = {}
): AgentHttpRequest {
  const manifest = session.manifest();
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind,
    tableId: manifest.tableId,
    manifest,
    catalog: session.catalog(),
    ...extra,
  };
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

function readIdempotencyKey(
  turnId: string,
  revision: number,
  index: number,
  query: RowReadQuery
): string {
  return `http-read:${JSON.stringify({ turnId, revision, index, query })}`;
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

function cancelledResult(
  session: AgentSession,
  idempotencyKey: string
): ExecuteResult {
  return {
    ok: false,
    revision: session.manifest().viewRevision,
    idempotencyKey,
    error: { code: "cancelled", message: "agent HTTP cancelled" },
  };
}

async function fulfillNeeds(
  session: AgentSession,
  needs: AgentHttpNeeds | undefined,
  snapshot: TurnSnapshot
): Promise<{
  descriptions: CapabilityGuide[];
  /** Keys the backend asked about that this table does not offer. */
  unknown: string[];
  rows: RowWindow[];
  describe: number;
  read: number;
}> {
  assertTurnContext(session, snapshot);
  const descriptions: CapabilityGuide[] = [];
  const unknown: string[] = [];
  const rows: RowWindow[] = [];
  for (const key of needs?.describe ?? []) {
    // A backend asking about a capability this table does not offer is an
    // ordinary mistake — a small model guessing a key, or a table that turned
    // a feature off since the catalog was sent. Answering "no such thing" and
    // carrying on is what a conversation does; throwing here ended the whole
    // turn over one bad name, with nothing run and nothing explained.
    if (!session.catalog().some((entry) => entry.key === key)) {
      unknown.push(key);
      continue;
    }
    descriptions.push(session.describe(key));
  }
  for (const [index, query] of (needs?.read ?? []).entries()) {
    assertTurnContext(session, snapshot);
    const revision = session.manifest().viewRevision;
    const result = await session.execute(
      "rows.read",
      query,
      revision,
      readIdempotencyKey(snapshot.turnId, revision, index, query)
    );
    if (!result.ok) {
      throw new Error(result.error?.message ?? "rows.read failed");
    }
    rows.push(result.result as RowWindow);
  }
  return {
    descriptions,
    unknown,
    rows,
    // Count what was ASKED, not what came back: a round that produced only
    // unknown names still used a round, and must not loop forever.
    describe: descriptions.length + unknown.length,
    read: rows.length,
  };
}

async function executeActions(
  session: AgentSession,
  actions: readonly AgentHttpAction[],
  originRevision: number,
  signal?: AbortSignal
): Promise<ExecuteResult[]> {
  const results: ExecuteResult[] = [];
  // One reply often sends filter then sort. The first apply advances the
  // live revision, so later actions that still name the turn-start revision
  // (or omit one) must follow the table, not the snapshot they were minted
  // against.
  let revision = session.manifest().viewRevision;
  for (const action of actions) {
    if (signal?.aborted) {
      results.push(cancelledResult(session, action.idempotencyKey));
      continue;
    }
    const expected =
      action.expectedRevision === undefined ||
      action.expectedRevision === originRevision
        ? revision
        : action.expectedRevision;
    const result = await session.execute(
      action.key,
      action.args ?? {},
      expected,
      action.idempotencyKey,
      signal
    );
    results.push(result);
    if (result.ok) revision = session.manifest().viewRevision;
  }
  return results;
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
async function exchangeRounds(
  session: AgentSession,
  options: AgentHttpClientOptions,
  snapshot: TurnSnapshot,
  input: {
    readonly message: string;
    readonly conversation?: readonly AgentHttpMessage[];
    readonly signal?: AbortSignal;
  }
): Promise<{
  readonly last: AgentHttpResponse | undefined;
  readonly actions: readonly AgentHttpAction[];
  /** The last thing the backend actually SAID, across every round. */
  readonly text: string;
  readonly fulfilled: { describe: number; read: number };
}> {
  let descriptions: CapabilityGuide[] | undefined;
  let rows: RowWindow[] | undefined;
  let last: AgentHttpResponse | undefined;
  let actions: AgentHttpAction[] = [];
  let text = "";
  const fulfilled = { describe: 0, read: 0 };

  for (let round = 0; round <= MAX_NEED_ROUNDS; round += 1) {
    assertTurnContext(session, snapshot);
    last = await exchange(
      options,
      compactRequest(session, "turn", {
        message: input.message,
        conversation: input.conversation,
        descriptions,
        rows,
      }),
      input.signal
    );
    if (last.actions?.length) actions = [...actions, ...last.actions];
    // A backend that explained itself on one round and only acted on the next
    // still said something; reading only the final round loses it.
    if (last.text) text = last.text;
    const needs = last.needs;
    const asked = (needs?.describe?.length ?? 0) + (needs?.read?.length ?? 0);
    if (asked === 0) break;
    if (round === MAX_NEED_ROUNDS) {
      // Only a backend that produced NOTHING has really failed. One that kept
      // asking while also choosing actions did its job badly, not not at all,
      // so its work still runs.
      if (actions.length === 0) {
        throw new Error("agent HTTP asked for discovery too many times");
      }
      break;
    }
    const next = await fulfillNeeds(session, needs, snapshot);
    descriptions = mergeGuides(descriptions, next.descriptions);
    rows = [...(rows ?? []), ...next.rows];
    assertContextSize(descriptions, rows);
    fulfilled.describe += next.describe;
    fulfilled.read += next.read;
  }

  return { last, actions, text, fulfilled };
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
  const snapshot = turnSnapshot(session, turnId);
  const exchanged = await exchangeRounds(session, options, snapshot, {
    message: trimmed,
    conversation: extras.conversation,
    signal: extras.signal,
  });
  const last = exchanged.last;
  let fulfilled = exchanged.fulfilled;

  if (!last) throw new Error("agent HTTP returned no response");
  assertTurnContext(session, snapshot);
  // The keys, not the actions: what a receipt needs is which capability ran.
  let ranKeys: readonly string[] = exchanged.actions.map(
    (action) => action.key
  );
  let results: readonly ExecuteResult[] = await executeActions(
    session,
    exchanged.actions,
    snapshot.revision,
    extras.signal
  );
  let text = exchanged.text;
  if (extras.returnResults && last.continueWithResults) {
    const continuation = await continueTurn(session, options, {
      message: trimmed,
      conversation: extras.conversation,
      signal: extras.signal,
      turnId,
      results,
    });
    results = continuation.results;
    ranKeys = [...ranKeys, ...continuation.keys];
    if (continuation.text) text = continuation.text;
    fulfilled = {
      describe: fulfilled.describe + continuation.fulfilled.describe,
      read: fulfilled.read + continuation.fulfilled.read,
    };
  }
  return {
    text,
    results,
    keys: ranKeys,
    needsFulfilled: fulfilled,
  };
}

/**
 * Post execute receipts back and keep going while the backend still has work.
 *
 * The loop is governed like the first one: a fresh snapshot for the new
 * logical round, the context re-checked before every exchange, discovery
 * rounds bounded, and any actions run through the same session.
 */
async function continueTurn(
  session: AgentSession,
  options: AgentHttpClientOptions,
  input: {
    readonly message: string;
    readonly conversation?: readonly AgentHttpMessage[];
    readonly signal?: AbortSignal;
    readonly turnId: string;
    readonly results: readonly ExecuteResult[];
  }
): Promise<{
  readonly results: readonly ExecuteResult[];
  /** Capability keys for the actions THIS continuation ran, in order. */
  readonly keys: readonly string[];
  readonly text: string;
  readonly fulfilled: { describe: number; read: number };
}> {
  const snapshot = turnSnapshot(session, input.turnId);
  let descriptions: CapabilityGuide[] | undefined;
  let rows: RowWindow[] | undefined;
  let results = input.results;
  let keys: readonly string[] = [];
  let text = "";
  const fulfilled = { describe: 0, read: 0 };

  for (let round = 0; round < MAX_NEED_ROUNDS; round += 1) {
    assertTurnContext(session, snapshot);
    const continued = await exchange(
      options,
      compactRequest(session, "turn", {
        message: input.message,
        conversation: input.conversation,
        descriptions,
        rows,
        results,
      }),
      input.signal
    );
    if (continued.actions?.length) {
      results = [
        ...results,
        ...(await executeActions(
          session,
          continued.actions,
          snapshot.revision,
          input.signal
        )),
      ];
      keys = [...keys, ...continued.actions.map((action) => action.key)];
    }
    const needs = continued.needs;
    const asked = (needs?.describe?.length ?? 0) + (needs?.read?.length ?? 0);
    if (asked > 0) {
      const next = await fulfillNeeds(session, needs, snapshot);
      descriptions = mergeGuides(descriptions, next.descriptions);
      rows = [...(rows ?? []), ...next.rows];
      assertContextSize(descriptions, rows);
      fulfilled.describe += next.describe;
      fulfilled.read += next.read;
      continue;
    }
    if (continued.text) text = continued.text;
    if (!continued.continueWithResults || !continued.actions?.length) break;
  }
  return { results, keys, text, fulfilled };
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
      return { text: turn.text, results: turn.results, keys: turn.keys };
    },
  };
}
