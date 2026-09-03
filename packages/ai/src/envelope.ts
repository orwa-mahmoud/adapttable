import { AGENT_SCHEMA_VERSION } from "./keys";
import type { AgentSession, ExecuteResult } from "./types";

/**
 * Transport-neutral operation. Adapters map provider tool calls onto this
 * shape, then {@link executeEnvelope} hands it to `session.execute`.
 *
 * Host write-safety chrome (item 11-B) may sit *around* an envelope:
 * `approval` is `"writes"` | `"destructive"` | `"never"` (default
 * `"writes"`); `commit` is `"stage"` | `"immediate"` (default `"stage"`).
 * Those fields are not on the envelope — the session already validates
 * arguments, revision and idempotency.
 *
 * @public
 */
export interface AgentEnvelope {
  /** Schema family. Must be `adapttable.agent.v1`. */
  readonly schemaVersion: "adapttable.agent.v1";
  /** Table identity the session was created for. */
  readonly tableId: string;
  /** Capability key to run. */
  readonly key: string;
  /** Arguments for that capability. */
  readonly args: unknown;
  /** View revision the caller observed. */
  readonly expectedRevision: number;
  /** Caller-supplied replay key. */
  readonly idempotencyKey: string;
}

/**
 * Host approval gate. Default `"writes"` when 11-B chrome is composed.
 *
 * @public
 */
export type ApprovalPolicy = "writes" | "destructive" | "never";

/**
 * Whether the host apply path persists or only records a proposal.
 *
 * @public
 */
export type CommitPolicy = "stage" | "immediate";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse an unknown JSON body into an {@link AgentEnvelope}.
 *
 * Throws on a malformed payload. Argument rules stay in `session.execute`.
 *
 * @public
 */
export function parseEnvelope(input: unknown): AgentEnvelope {
  if (!isRecord(input)) {
    throw new Error("envelope must be an object");
  }
  if (input.schemaVersion !== AGENT_SCHEMA_VERSION) {
    throw new Error(`envelope schemaVersion must be "${AGENT_SCHEMA_VERSION}"`);
  }
  if (typeof input.tableId !== "string" || input.tableId.length === 0) {
    throw new Error("envelope tableId must be a non-empty string");
  }
  if (typeof input.key !== "string" || input.key.length === 0) {
    throw new Error("envelope key must be a non-empty string");
  }
  if (
    typeof input.expectedRevision !== "number" ||
    !Number.isFinite(input.expectedRevision)
  ) {
    throw new Error("envelope expectedRevision must be a finite number");
  }
  if (
    typeof input.idempotencyKey !== "string" ||
    input.idempotencyKey.length === 0
  ) {
    throw new Error("envelope idempotencyKey must be a non-empty string");
  }
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    tableId: input.tableId,
    key: input.key,
    args: "args" in input ? input.args : {},
    expectedRevision: input.expectedRevision,
    idempotencyKey: input.idempotencyKey,
  };
}

/**
 * Identity check, then `session.execute`. No second argument validator.
 *
 * @public
 */
export function executeEnvelope(
  session: AgentSession,
  envelope: AgentEnvelope
): Promise<ExecuteResult> {
  const version: string = envelope.schemaVersion;
  if (version !== AGENT_SCHEMA_VERSION) {
    return Promise.resolve({
      ok: false,
      revision: session.manifest().viewRevision,
      idempotencyKey: envelope.idempotencyKey,
      error: {
        code: "schema-mismatch",
        message: `envelope schemaVersion must be "${AGENT_SCHEMA_VERSION}"`,
      },
    });
  }
  const tableId = session.manifest().tableId;
  if (envelope.tableId !== tableId) {
    return Promise.resolve({
      ok: false,
      revision: session.manifest().viewRevision,
      idempotencyKey: envelope.idempotencyKey,
      error: {
        code: "table-mismatch",
        message: `envelope tableId "${envelope.tableId}" does not match session "${tableId}"`,
      },
    });
  }
  return session.execute(
    envelope.key,
    envelope.args,
    envelope.expectedRevision,
    envelope.idempotencyKey
  );
}
