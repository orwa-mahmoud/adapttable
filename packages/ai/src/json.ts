import type { AgentSession, ExecuteResult, JsonSchema } from "./types";

export type { AgentEnvelope, ApprovalPolicy, CommitPolicy } from "./envelope";
export { executeEnvelope, parseEnvelope } from "./envelope";
export {
  CAPABILITY_KEYS,
  type CapabilityKey,
  type RowAddressScope,
  type WritePolicy,
} from "./keys";
export type * from "./types";

/**
 * Provider-neutral function-tool definition. `name` is the capability key.
 *
 * @public
 */
export interface JsonFunctionTool {
  /** Capability key. */
  readonly name: string;
  /** English tool description from `describe`. */
  readonly description: string;
  /** JSON Schema for the tool arguments. */
  readonly parameters: JsonSchema;
}

/**
 * One provider-neutral tool invocation.
 *
 * @public
 */
export interface JsonToolCall {
  /** Capability key. */
  readonly name: string;
  /** Arguments for that capability. */
  readonly arguments: unknown;
  /** View revision the caller observed. */
  readonly expectedRevision: number;
  /** Caller-supplied replay key. */
  readonly idempotencyKey: string;
}

/**
 * Map `session.catalog()` onto JSON function tools, in catalog order.
 *
 * Parameters come from `describe(key).input`. Names are never translated.
 *
 * @public
 */
export function toJsonTools(
  session: AgentSession
): readonly JsonFunctionTool[] {
  return session.catalog().map((entry) => {
    const guide = session.describe(entry.key);
    return {
      name: entry.key,
      description: guide.guide,
      parameters: guide.input,
    };
  });
}

/**
 * Thin mapper — `session.execute` owns validation.
 *
 * @public
 */
export function executeJsonTool(
  session: AgentSession,
  call: JsonToolCall
): Promise<ExecuteResult> {
  return session.execute(
    call.name,
    call.arguments,
    call.expectedRevision,
    call.idempotencyKey
  );
}
