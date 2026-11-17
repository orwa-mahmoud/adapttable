/**
 * AI SDK protocol pieces: version checks, tool names, approvals and part
 * validation.
 */
import type { ApprovalPresentation } from "@adapttable/core";
import { isRecord } from "@adapttable/core/binding";

import {
  AI_SDK_STREAM_VERSION,
  type AiSdkApprovalResponse,
  type AiSdkPart,
  type AiSdkTool,
  type AiSdkToolOutput,
} from "./aiSdkTypes";
import type { AssistantUnresolved } from "./assistantContracts";
import type { AssistantReceiptSubject } from "./assistantReceipts";
import { type TurnRevision } from "./turnRevision";
import type {
  AgentSession,
  ApprovalSubject,
  ExecuteResult,
  WriteProposal,
} from "./types";

/** A stream that did not behave like the AI SDK's. @public */
export class AiSdkProtocolError extends Error {
  /** Stable machine code. */
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AiSdkProtocolError";
    this.code = code;
  }
}

/**
 * Refuse a stream that names a version this adapter does not speak.
 *
 * Drift between an SDK and an adapter is expected. Guessing at it is not: a
 * stream that declares a version we do not know is refused with a code a host
 * can act on, rather than parsed as though it were the one we do.
 *
 * @param version - What the stream said, when it said anything.
 * @throws {@link AiSdkProtocolError} for any other version.
 *
 * @public
 */
export function assertAiSdkVersion(version: unknown): void {
  if (version === undefined || version === AI_SDK_STREAM_VERSION) return;
  // Whatever arrived, said back safely: a stream that names an object as its
  // version is exactly the case this refuses, and `[object Object]` in the
  // message would tell nobody which one.
  const named = JSON.stringify(version) ?? "unknown";
  throw new AiSdkProtocolError(
    "unknown-stream-version",
    `this adapter speaks AI SDK UI message stream v${String(AI_SDK_STREAM_VERSION)}, not v${named}`
  );
}

/** Continuations one turn may take before the adapter calls it a loop. */
export const DEFAULT_MAX_REQUESTS = 8;

/** Characters a provider will accept in a function name. */
const SAFE = /[^a-zA-Z0-9_-]/g;

/**
 * The tool name this table publishes for a capability.
 *
 * Underscores rather than dots: these are object keys in a route's `tools`
 * map and travel through provider schemas that constrain a function name.
 *
 * @param tableId - The table's identity.
 * @param key - The capability key.
 * @returns A name safe to declare and to receive.
 *
 * @public
 */
export function aiSdkToolName(tableId: string, key: string): string {
  return `adapttable_${tableId.replace(SAFE, "_")}_${key.replace(SAFE, "_")}`;
}

/**
 * The capability one of our tool names refers to, or nothing.
 *
 * Resolved against the live catalog rather than by reversing the encoding:
 * a dot and an underscore both encode to an underscore, so the round trip is
 * not a function and guessing it would call the wrong capability.
 *
 * @param session - The live session.
 * @param name - The name the stream used.
 * @returns The capability key, when this table owns that name.
 *
 * @public
 */
export function aiSdkCapability(
  session: AgentSession,
  name: string
): string | undefined {
  const tableId = session.manifest().tableId;
  return session
    .catalog()
    .find((entry) => aiSdkToolName(tableId, entry.key) === name)?.key;
}

/**
 * The enabled contract as client tools for a route's `tools` map.
 *
 * Spread the result in. Every entry omits `execute`, which is how the AI SDK
 * knows the client runs it.
 *
 * @param session - The live session. Only permitted keys reach the map.
 * @returns Tool definitions, keyed by the name the stream will use.
 *
 * @public
 */
export function aiSdkTools(
  session: AgentSession
): Readonly<Record<string, AiSdkTool>> {
  const tableId = session.manifest().tableId;
  const tools: Record<string, AiSdkTool> = {};
  for (const entry of session.catalog()) {
    tools[aiSdkToolName(tableId, entry.key)] = {
      description: entry.summaryShort ?? entry.summary,
      inputSchema: session.describe(entry.key).input,
    };
  }
  return tools;
}

/**
 * The replay identity for one AI SDK tool call.
 *
 * `toolCallId` is the provider's correlation id, and a provider is free to
 * reuse one across the steps of a run. The identity that decides whether a
 * mutation may run again is this adapter's own: the step the call arrived on,
 * so reaching the same call twice within a step is a replay and the same id on
 * a later step is the new call it is.
 */
export function callKey(
  tableId: string,
  step: string,
  streamStep: number,
  toolCallId: string
): string {
  return `ai-sdk:${JSON.stringify({ tableId, step, streamStep, toolCallId })}`;
}

/** The rows an approval request enumerated, kept only where addressable. */
function proposalsOf(input: unknown): readonly WriteProposal[] | undefined {
  if (!isRecord(input)) return undefined;
  const proposals = input.proposals;
  if (!Array.isArray(proposals)) return undefined;
  const rows = proposals.flatMap((entry): WriteProposal[] => {
    if (!isRecord(entry) || typeof entry.rowKey !== "string") return [];
    return [
      {
        rowKey: entry.rowKey,
        ...(typeof entry.column === "string" ? { column: entry.column } : {}),
        ...("before" in entry ? { before: entry.before } : {}),
        ...("after" in entry ? { after: entry.after } : {}),
      },
    ];
  });
  return rows.length > 0 ? rows : undefined;
}

/**
 * What the reader is being asked to confirm.
 *
 * The session's own two shapes, decided from the request rather than from a
 * flag, so an approver never guesses from a runtime type what it was handed.
 */
export function approvalSubject(
  part: AiSdkPart,
  session: AgentSession,
  presentation: ApprovalPresentation
): ApprovalSubject {
  const input = isRecord(part.input) ? part.input : {};
  const proposals = proposalsOf(input);
  if (proposals) {
    return {
      kind: "rows",
      proposals,
      perItem: input.perItem === true,
      presentation,
    };
  }
  const capability =
    typeof part.toolName === "string"
      ? aiSdkCapability(session, part.toolName)
      : undefined;
  if (capability === undefined) {
    throw new AiSdkProtocolError(
      "malformed-approval",
      "an approval request needs proposals or one of this table's tool names"
    );
  }
  return {
    kind: "operation",
    capability,
    arguments: input,
    presentation,
  };
}

export function unresolvedTurn(
  code: string,
  message: string,
  pending: readonly string[]
): AssistantUnresolved {
  return { code, message, pending: [...pending] };
}

/** One call the route reported as refused, and why. */
interface DeniedCall {
  capability: string;
  reason?: string;
}

/** What a refused call leaves the turn with. */
export function deniedTurn(denied: readonly DeniedCall[]): AssistantUnresolved {
  const reason = denied.find((entry) => entry.reason)?.reason;
  return {
    code: "output-denied",
    message: reason ?? "the change was refused and nothing was applied",
    pending: denied.map((entry) => entry.capability),
  };
}

/** Per-turn state the request loop accumulates. */
export interface TurnState {
  readonly results: ExecuteResult[];
  readonly keys: string[];
  readonly subjects: (AssistantReceiptSubject | undefined)[];
  readonly outputs: AiSdkToolOutput[];
  readonly approvals: AiSdkApprovalResponse[];
  /** Calls the route reported as refused, and why. */
  readonly denied: DeniedCall[];
  /** What this turn's own calls have proven the table reached. */
  readonly bound: TurnRevision;
  /** The revision of the view the current request carried. */
  /** The request this turn is on, which is what a tool-call id belongs to. */
  step: string;
  /** Step boundary within the current response stream. */
  streamStep: number;
  text: string;
}

/** What one stream produced. */
export interface StreamOutcome {
  readonly finished: boolean;
  /** Whether anything came back that the next request has to carry. */
  readonly continues: boolean;
}

/**
 * One field a part must carry, or it is not the part it claims to be.
 *
 * Written once because every case needs the same three lines, and a check
 * spelled out per case is a check that eventually goes missing from one.
 */
export function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new AiSdkProtocolError("malformed-part", message);
  }
  return value;
}

/**
 * What the reader refused, named as the table names capabilities.
 *
 * The tool name is optional on the wire and may belong to a tool this table
 * does not own, so the entry falls back to the name the route used and then to
 * `unknown`: the panel always has something to show the reader.
 */
export function deniedCall(session: AgentSession, part: AiSdkPart): DeniedCall {
  const name = typeof part.toolName === "string" ? part.toolName : undefined;
  const reason =
    typeof part.errorText === "string" ? part.errorText : undefined;
  return {
    capability:
      (name === undefined ? undefined : aiSdkCapability(session, name)) ??
      name ??
      "unknown",
    ...(reason === undefined ? {} : { reason }),
  };
}

/** The refusal an `error` part stands for. */
export function streamFailure(part: AiSdkPart): AiSdkProtocolError {
  return new AiSdkProtocolError(
    "stream-error",
    typeof part.errorText === "string"
      ? part.errorText
      : "the route failed without saying why"
  );
}

/** A part with no type is not a part from a newer SDK; it is not a part. */
export function assertPartShape(part: AiSdkPart): void {
  if (typeof part.type !== "string" || part.type === "") {
    throw new AiSdkProtocolError(
      "unknown-stream-version",
      "a stream part arrived with no type; this adapter speaks the AI SDK UI message stream"
    );
  }
}
