import type {
  AgentManifest,
  AgentSession,
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

/** MCP `tools/list` item. No `@modelcontextprotocol/sdk` dependency. */
export interface McpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
}

/**
 * MCP resource plus the readable body. `text` is `describe(key)` JSON so a
 * host can serve `resources/read` without a second lookup.
 */
export interface McpResource {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType: "application/json";
  readonly text: string;
}

function capabilityUri(tableId: string, key: string): string {
  return `adapttable://table/${tableId}/capability/${key}`;
}

/**
 * Enabled tools in `session.catalog()` order. Names are capability keys.
 *
 * Hosts that cannot refresh a dynamic tool list still have the portable
 * trio on the session (`catalog` / `describe` / `execute`) and on the
 * OpenAI deferred adapter.
 */
export function toMcpTools(session: AgentSession): readonly McpTool[] {
  return session.catalog().map((entry) => {
    const guide = session.describe(entry.key);
    return {
      name: entry.key,
      description: guide.guide,
      inputSchema: guide.input,
    };
  });
}

/**
 * One resource per enabled capability. Body is the `describe(key)` guide.
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

/** Thin mapper — `session.execute` owns validation. */
export function executeMcpTool(
  session: AgentSession,
  name: string,
  args: unknown,
  expectedRevision: number,
  idempotencyKey: string
): Promise<ExecuteResult> {
  return session.execute(name, args, expectedRevision, idempotencyKey);
}
