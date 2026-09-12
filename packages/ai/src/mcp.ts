import { contractFingerprint } from "./binding";
import type {
  AgentManifest,
  AgentSession,
  CatalogEntry,
  ExecuteResult,
  JsonSchema,
} from "./types";

export {
  type ApprovalPolicy,
  CAPABILITY_KEYS,
  type CapabilityKey,
  type CommitPolicy,
  type RowAddressScope,
  type WritePolicy,
} from "./keys";
export type * from "./types";

/**
 * What a host is told about a call before it makes one.
 *
 * Every field is derived from what the capability already declares. A
 * hand-kept list beside the contract would be a second answer to the same
 * question, and only one of the two would get corrected.
 *
 * @public
 */
export interface McpToolAnnotations {
  /** The call changes nothing. */
  readonly readOnlyHint: boolean;
  /**
   * The call may remove data.
   *
   * True only for a `destructive` capability, and explicitly false for every
   * other one: a host reading an absent hint has to guess, and the guess a
   * cautious host makes is the expensive one.
   */
  readonly destructiveHint: boolean;
  /** Running it again lands where running it once did. */
  readonly idempotentHint: boolean;
  /**
   * Always false. A capability acts on this table and nothing else — there is
   * no open world behind it to reach into.
   */
  readonly openWorldHint: false;
}

/**
 * MCP `tools/list` item. No `@modelcontextprotocol/sdk` dependency.
 *
 * @public
 */
export interface McpTool {
  /** Capability key. */
  readonly name: string;
  /** English tool description from `describe`. */
  readonly description: string;
  /** JSON Schema for the tool arguments. */
  readonly inputSchema: JsonSchema;
  /** What this call does, as hints a host can act on. */
  readonly annotations: McpToolAnnotations;
  /** Host-specific extras, such as the view an MCP App tool renders into. */
  readonly _meta?: Readonly<Record<string, unknown>>;
}

/**
 * How long a list may be reused, and what invalidates it.
 *
 * @public
 */
export interface McpListMeta {
  /**
   * The contract this list describes.
   *
   * A cache entry is keyed by it, so a host that cannot subscribe to
   * `notifications/tools/list_changed` still notices a table whose
   * capabilities, columns or policy moved.
   */
  readonly cacheScope: string;
  /** How long the list may be reused before it is re-read. */
  readonly ttlMs: number;
}

/** A `tools/list` response, with what a host needs to cache it. @public */
export interface McpToolList {
  readonly tools: readonly McpTool[];
  readonly _meta: McpListMeta;
}

/** A `resources/list` response, with what a host needs to cache it. @public */
export interface McpResourceList {
  readonly resources: readonly McpResource[];
  readonly _meta: McpListMeta;
}

/** One MCP content block. @public */
export interface McpContent {
  readonly type: "text";
  readonly text: string;
}

/** A `tools/call` result. @public */
export interface McpToolResult {
  readonly content: readonly McpContent[];
  /** Set when the call failed, so a host can style it as an error. */
  readonly isError?: boolean;
}

/**
 * How long a list stays reusable without a `list_changed` notification.
 *
 * Five minutes: long enough to be worth caching, short enough that a host
 * with no subscription is never far behind. The contract version in
 * `cacheScope` is what actually makes a stale entry detectable.
 */
const LIST_TTL_MS = 300_000;

/**
 * MCP resource plus the readable body. `text` is `describe(key)` JSON so a
 * host can serve `resources/read` without a second lookup.
 *
 * @public
 */
export interface McpResource {
  /** `adapttable://table/{tableId}/capability/{key}`. */
  readonly uri: string;
  /** Capability key. */
  readonly name: string;
  /** English description from `describe`. */
  readonly description: string;
  /** Always JSON. */
  readonly mimeType: "application/json";
  /** Serialized `describe(key)` guide. */
  readonly text: string;
}

function capabilityUri(tableId: string, key: string): string {
  return `adapttable://table/${tableId}/capability/${key}`;
}

/**
 * A short comparable stamp for a contract.
 *
 * FNV-1a over the fingerprint the binding already computes. Not a security
 * hash and never used as one — its whole job is to let a host notice that the
 * list it cached describes a table that has since changed, without the wire
 * carrying the entire contract on every list.
 */
function digest(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** What a host caching a list is told about its lifetime. */
function listMeta(session: AgentSession): McpListMeta {
  return {
    cacheScope: `adapttable.contract.${digest(
      contractFingerprint(session.manifest(), session.catalog())
    )}`,
    ttlMs: LIST_TTL_MS,
  };
}

/**
 * Call hints from what the capability already declares.
 *
 * `kind` says whether it reads or writes and whether it can remove data;
 * `idempotent` says whether repeating it is safe. Both travel on the catalog
 * entry, so nothing here re-decides them.
 */
function annotationsFor(entry: CatalogEntry): McpToolAnnotations {
  const kind = entry.kind ?? "view";
  return {
    readOnlyHint: kind === "view" || kind === "read",
    destructiveHint: kind === "destructive",
    // A capability that has not said is treated as unsafe to repeat, which is
    // the direction that costs a retry rather than a duplicate write.
    idempotentHint: entry.idempotent === true,
    openWorldHint: false,
  };
}

/**
 * Enabled tools in `session.catalog()` order. Names are capability keys.
 *
 * Hosts that cannot refresh a dynamic tool list still have the portable
 * trio on the session (`catalog` / `describe` / `execute`) and on the
 * OpenAI deferred adapter.
 *
 * @public
 */
export function toMcpTools(session: AgentSession): readonly McpTool[] {
  return session.catalog().map((entry) => {
    const guide = session.describe(entry.key);
    return {
      name: entry.key,
      description: guide.guide,
      inputSchema: guide.input,
      annotations: annotationsFor(entry),
    };
  });
}

/**
 * The same tools as a `tools/list` response a host can cache.
 *
 * @param session - The live session.
 * @returns The tool list, with the contract stamp it is valid for.
 *
 * @public
 */
export function toMcpToolList(session: AgentSession): McpToolList {
  return { tools: toMcpTools(session), _meta: listMeta(session) };
}

/**
 * The same resources as a `resources/list` response a host can cache.
 *
 * @param session - The live session.
 * @returns The resource list, with the contract stamp it is valid for.
 *
 * @public
 */
export function toMcpResourceList(session: AgentSession): McpResourceList {
  return { resources: toMcpResources(session), _meta: listMeta(session) };
}

/**
 * One resource per enabled capability. Body is the `describe(key)` guide.
 *
 * @public
 */
export function toMcpResources(session: AgentSession): readonly McpResource[] {
  const tableId = session.manifest().tableId;
  return session.catalog().map((entry) => {
    const guide = session.describe(entry.key);
    return {
      uri: capabilityUri(tableId, entry.key),
      name: entry.key,
      description: guide.guide,
      mimeType: "application/json",
      text: JSON.stringify(guide),
    };
  });
}

/**
 * Whether an MCP host should emit `notifications/tools/list_changed`.
 *
 * True when the advertised capability list changes (membership or order).
 *
 * @public
 */
export function mcpListChanged(
  prev: AgentManifest,
  next: AgentManifest
): boolean {
  const left = prev.capabilities;
  const right = next.capabilities;
  if (left.length !== right.length) return true;
  return left.some((key, index) => key !== right[index]);
}

/**
 * Thin mapper — `session.execute` owns validation.
 *
 * @public
 */
export function executeMcpTool(
  session: AgentSession,
  name: string,
  args: unknown,
  expectedRevision: number,
  idempotencyKey: string
): Promise<ExecuteResult> {
  return session.execute(name, args, expectedRevision, idempotencyKey);
}

/**
 * One `execute` outcome as a `tools/call` result.
 *
 * A row window keeps the provenance envelope the session put on it — rows are
 * somebody's data and are input from outside the system, and an MCP host
 * putting them in front of a model should be told so on this path exactly as
 * it is on every other. Anything else becomes the receipt, so a model reports
 * what the table did rather than what it asked for.
 *
 * @param result - What `executeMcpTool` returned.
 * @returns The result, as content a host can render.
 *
 * @public
 */
export function mcpToolResult(result: ExecuteResult): McpToolResult {
  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: result.error,
            revision: result.revision,
          }),
        },
      ],
      isError: true,
    };
  }
  const body = isRowProvenance(result.result)
    ? result.result
    : { ok: true, revision: result.revision, result: result.result };
  return { content: [{ type: "text", text: JSON.stringify(body) }] };
}

/** Whether the session already labelled this result as row data. */
function isRowProvenance(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { source?: unknown }).source === "table-rows"
  );
}
