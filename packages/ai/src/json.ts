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

/** Provider-neutral function-tool definition. `name` is the capability key. */
export interface JsonFunctionTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonSchema;
}

export interface JsonToolCall {
  readonly name: string;
  readonly arguments: unknown;
  readonly expectedRevision: number;
  readonly idempotencyKey: string;
}

/**
 * Map `session.catalog()` onto JSON function tools, in catalog order.
 *
 * Parameters come from `describe(key).input`. Names are never translated.
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

/** Thin mapper — `session.execute` owns validation. */
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
