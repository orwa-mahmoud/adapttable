/**
 * Opt-in HTTP bridge — `@adapttable/ai/http`.
 *
 * The root entry stays transport-free. This subpath posts a compact
 * capability manifest to a developer-owned endpoint and executes the
 * returned actions through the existing session. No model SDK.
 */
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

export {
  AGENT_SCHEMA_VERSION,
  type ApprovalPolicy,
  CAPABILITY_KEYS,
  type CapabilityKey,
  type CommitPolicy,
  type RowAddressScope,
  type WritePolicy,
} from "./keys";
export type * from "./types";

/** Schema family shared with the session and envelope. @public */
export const AGENT_HTTP_SCHEMA = AGENT_SCHEMA_VERSION;

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
  /** Revision the backend observed. Defaults to the live manifest. */
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
  /** How many describe / read needs this turn fulfilled. */
  readonly needsFulfilled: { readonly describe: number; readonly read: number };
}

const MAX_NEED_ROUNDS = 3;

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
  return {
    key,
    args: "args" in value ? value.args : {},
    idempotencyKey,
    expectedRevision: asFiniteNumber(value.expectedRevision),
  };
}

function asNeeds(value: Record<string, unknown>): AgentHttpNeeds {
  const describe = Array.isArray(value.describe)
    ? value.describe.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : undefined;
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
        }
        return {
          offset: asFiniteNumber(entry.offset) ?? 0,
          limit: asFiniteNumber(entry.limit) ?? 10,
          ...(columns ? { columns } : {}),
          ...(scope ? { scope } : {}),
        };
      })
    : undefined;
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
  return reason instanceof Error ? reason : new Error("agent HTTP cancelled");
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
  if (options.request) return options.request(body, signal);
  const endpoint = options.endpoint.trim();
  if (!endpoint) throw new Error("agent HTTP endpoint is required");
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("agent HTTP requires fetch");
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
  const text = await response.text();
  if (!response.ok) throw httpError(response.status, text);
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
  const merged = mergeSignals(options.timeoutMs, signal);
  try {
    return parseAgentHttpResponse(await postJson(options, body, merged.signal));
  } finally {
    merged.cleanup();
  }
}

async function fulfillNeeds(
  session: AgentSession,
  needs: AgentHttpNeeds | undefined
): Promise<{
  descriptions: CapabilityGuide[];
  rows: RowWindow[];
  describe: number;
  read: number;
}> {
  const descriptions: CapabilityGuide[] = [];
  const rows: RowWindow[] = [];
  for (const key of needs?.describe ?? []) {
    descriptions.push(session.describe(key));
  }
  const revision = session.manifest().viewRevision;
  for (const [index, query] of (needs?.read ?? []).entries()) {
    const result = await session.execute(
      "rows.read",
      query,
      revision,
      `http-read-${String(index)}-${query.offset}-${query.limit}`
    );
    if (!result.ok) {
      throw new Error(result.error?.message ?? "rows.read failed");
    }
    rows.push(result.result as RowWindow);
  }
  return {
    descriptions,
    rows,
    describe: descriptions.length,
    read: rows.length,
  };
}

async function executeActions(
  session: AgentSession,
  actions: readonly AgentHttpAction[]
): Promise<ExecuteResult[]> {
  const results: ExecuteResult[] = [];
  for (const action of actions) {
    results.push(
      await session.execute(
        action.key,
        action.args ?? {},
        action.expectedRevision ?? session.manifest().viewRevision,
        action.idempotencyKey
      )
    );
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

  let descriptions: CapabilityGuide[] | undefined;
  let rows: RowWindow[] | undefined;
  let fulfilled = { describe: 0, read: 0 };
  let last: AgentHttpResponse | undefined;

  for (let round = 0; round <= MAX_NEED_ROUNDS; round += 1) {
    last = await exchange(
      options,
      compactRequest(session, "turn", {
        message: trimmed,
        conversation: extras.conversation,
        descriptions,
        rows,
      }),
      extras.signal
    );
    const needs = last.needs;
    const asked = (needs?.describe?.length ?? 0) + (needs?.read?.length ?? 0);
    if (asked === 0) break;
    if (round === MAX_NEED_ROUNDS) {
      throw new Error("agent HTTP asked for discovery too many times");
    }
    const next = await fulfillNeeds(session, needs);
    descriptions = next.descriptions;
    rows = next.rows;
    fulfilled = {
      describe: fulfilled.describe + next.describe,
      read: fulfilled.read + next.read,
    };
  }

  if (!last) throw new Error("agent HTTP returned no response");
  const results = await executeActions(session, last.actions ?? []);
  if (extras.returnResults && last.continueWithResults && results.length > 0) {
    await exchange(
      options,
      compactRequest(session, "turn", {
        message: trimmed,
        conversation: extras.conversation,
        results,
      }),
      extras.signal
    );
  }
  return {
    text: last.text ?? "",
    results,
    needsFulfilled: fulfilled,
  };
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
