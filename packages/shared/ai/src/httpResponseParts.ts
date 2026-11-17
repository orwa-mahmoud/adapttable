/**
 * Reading the parts of a backend response: tool calls, results, questions,
 * audio, pins and read or describe needs.
 */
import { isRecord } from "@adapttable/core/binding";

import { type DiscoveryRequest } from "./discovery";
import {
  asFiniteNumber,
  asString,
  AUDIO_TYPES,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_MS,
  MAX_DESCRIBE_NEEDS,
  MAX_READ_NEEDS,
} from "./httpLimits";
import { DESCRIBE_TOOL, READ_TOOL } from "./httpTurn";
import type {
  AgentHttpQuestion,
  AgentHttpQuestionOption,
  AgentHttpToolCall,
  AgentHttpToolResult,
} from "./httpTypes";
import { type AgentHttpAudio, type AgentHttpPinAck } from "./httpWire";
import { type RowAddressScope } from "./keys";
import type { RowReadQuery } from "./types";

export function asToolCall(value: unknown): AgentHttpToolCall {
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
    // Normalized at the parser so a malformed key list is a protocol error
    // where the body is read, not a surprise three awaits later.
    return { id, name, args: asDescribeRequest(args), expectedRevision };
  }
  return { id, name, args, expectedRevision };
}

export function asToolResult(value: unknown): AgentHttpToolResult {
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

/**
 * Whether an optional field said nothing.
 *
 * JSON has no `undefined`, so a backend serializing an absent optional writes
 * `null` — and a model asked for a document routinely fills in every key it
 * was shown, question included. Both mean the field was not answered, and
 * reading `null` as a malformed question refuses a reply that is fine.
 */
export function unanswered(value: unknown): boolean {
  return value === undefined || value === null;
}

export function asQuestion(value: unknown): AgentHttpQuestion {
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
 * A recording, checked before anything else looks at it.
 *
 * Type, length and size are all refused at the parser rather than deeper in,
 * because every one of them is a way to make the rest of the system do work on
 * something nobody meant to send.
 */
export function asAudio(value: unknown): AgentHttpAudio {
  if (!isRecord(value)) {
    throw new TypeError("agent HTTP audio must be an object");
  }
  const mimeType = asString(value.mimeType);
  const base64 = asString(value.base64);
  const durationMs = asFiniteNumber(value.durationMs);
  if (!mimeType || !AUDIO_TYPES.has(mimeType.split(";")[0] ?? "")) {
    throw new TypeError(
      `agent HTTP audio.mimeType must be one of ${[...AUDIO_TYPES].join(", ")}`
    );
  }
  if (!base64) throw new TypeError("agent HTTP audio.base64 is required");
  if (durationMs === undefined || durationMs <= 0) {
    throw new TypeError(
      "agent HTTP audio.durationMs must be a positive number"
    );
  }
  if (durationMs > MAX_AUDIO_MS) {
    throw new TypeError(
      `agent HTTP audio.durationMs exceeds limit of ${String(MAX_AUDIO_MS)}`
    );
  }
  // Base64 carries three bytes in four characters; near enough to refuse an
  // oversized clip without decoding it first.
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_AUDIO_BYTES) {
    throw new TypeError(
      `agent HTTP audio exceeds limit of ${String(MAX_AUDIO_BYTES)} bytes`
    );
  }
  return { mimeType, base64, durationMs };
}

export function asPinAck(value: unknown): AgentHttpPinAck {
  if (!isRecord(value)) {
    throw new TypeError("agent HTTP pin must be an object");
  }
  const status = asString(value.status);
  if (
    status !== "acknowledged" &&
    status !== "expired" &&
    status !== "unknown" &&
    status !== "unsupported"
  ) {
    throw new TypeError(
      'agent HTTP pin.status must be "acknowledged", "expired", "unknown", or "unsupported"'
    );
  }
  const ttlMs = asFiniteNumber(value.ttlMs);
  if (value.ttlMs !== undefined && ttlMs === undefined) {
    throw new TypeError("agent HTTP pin.ttlMs must be a finite number");
  }
  return {
    status,
    ...(asString(value.contractVersion)
      ? { contractVersion: asString(value.contractVersion) }
      : {}),
    ...(ttlMs === undefined ? {} : { ttlMs }),
  };
}

/**
 * The two asking tools keep their own ceilings.
 *
 * They were separate limits when they were separate fields, and folding them
 * into one list is no reason for a backend to be able to ask for sixteen
 * guides and sixteen row windows in a single reply that only counts as one.
 */
export function assertQuestionBudget(
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
export function asReadQuery(args: unknown): RowReadQuery {
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

/** What one `describe` call is asking about: keys, a family, or both. */
export function asDescribeRequest(args: unknown): DiscoveryRequest {
  const entry = isRecord(args) ? args : {};
  if (entry.keys !== undefined) {
    if (!Array.isArray(entry.keys)) {
      throw new TypeError(
        "agent HTTP describe.keys must be an array of strings"
      );
    }
    for (const key of entry.keys) {
      if (typeof key !== "string" || key.length === 0) {
        throw new TypeError(
          "agent HTTP describe.keys must be an array of strings"
        );
      }
    }
  }
  const bundle = asString(entry.bundle);
  return {
    ...(entry.keys ? { keys: entry.keys as readonly string[] } : {}),
    ...(bundle ? { bundle } : {}),
  };
}
