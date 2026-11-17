/**
 * Reading HTTP requests and responses: every field re-established before the
 * bridge trusts it.
 */
import { isRecord } from "@adapttable/core/binding";

import { type AgentContextView } from "./context";
import { type HttpPhaseContext, policyKey } from "./httpExecution";
import {
  AgentHttpError,
  asFiniteNumber,
  asString,
  MAX_ACTIONS,
} from "./httpLimits";
import {
  asAudio,
  asPinAck,
  asQuestion,
  assertQuestionBudget,
  asToolCall,
  asToolResult,
  unanswered,
} from "./httpResponseParts";
import {
  type AgentHttpKind,
  type AgentHttpMessage,
  type AgentHttpRequest,
  type AgentHttpResponse,
} from "./httpWire";
import { AGENT_SCHEMA_VERSION } from "./keys";
import type { AgentManifest, AgentSession, CatalogEntry } from "./types";

export function assertTurnContext(
  session: AgentSession,
  context: HttpPhaseContext
): void {
  const manifest = session.manifest();
  // A view revision tick during the model call is ordinary — React flushed a
  // filter, or an edit landed while the backend was thinking. That does not
  // end the turn: every phase is answered against the view it was shown, and
  // an action the table has moved past is rejected one action at a time, with
  // a reason the caller can act on. The same is true of a capability that
  // comes or goes, including because of what this turn itself did. Identity
  // and the write / approval / commit rules are what must not move — a table
  // that swapped underneath, or that stopped asking a human, is no longer the
  // one the backend answered.
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
    askUser: unanswered(input.askUser) ? undefined : asQuestion(input.askUser),
    pin: unanswered(input.pin) ? undefined : asPinAck(input.pin),
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
