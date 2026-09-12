/**
 * A reply that arrives in pieces, and ends up being the same reply.
 *
 * Streaming exists so text appears as it is written. That is all it is for,
 * and the discipline here is that **nothing else changes**: the events
 * accumulate into exactly the `AgentHttpResponse` the JSON path produces, so
 * the phase reducer, the executor, the pin logic and the receipts downstream
 * never learn that a stream happened.
 *
 * The rule that matters most:
 *
 * - **Nothing executes from a partial event.** `tool-calls` arrives complete
 *   and is buffered until `done`. A stream that is aborted, times out, or
 *   fails before `done` has run nothing at all — which is what makes it safe
 *   to render text the moment it appears, because the text is never the
 *   authority for whether something happened.
 *
 * The feed is Server-Sent Events shaped: `event:` names the kind, `data:`
 * carries JSON, and a blank line ends the record. That is chosen because it is
 * what providers already emit and what a proxy already understands, not
 * because the protocol needs a format of its own.
 */
import type {
  AgentHttpQuestion,
  AgentHttpResponse,
  AgentHttpToolCall,
} from "./http";

/** Events a streaming backend may send. @public */
export type AgentStreamEventKind =
  "text-delta" | "ask-user" | "tool-calls" | "transcript" | "done" | "error";

/** One decoded event. @public */
export interface AgentStreamEvent {
  readonly kind: AgentStreamEventKind;
  readonly data: unknown;
}

/** Events one streamed reply may carry before it is refused. */
export const MAX_STREAM_EVENTS = 4_000;

/** A stream that never says `done`. @public */
export class AgentStreamError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AgentStreamError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asKind(value: string): AgentStreamEventKind | undefined {
  switch (value) {
    case "text-delta":
    case "ask-user":
    case "tool-calls":
    case "transcript":
    case "done":
    case "error":
      return value;
    default:
      return undefined;
  }
}

/**
 * Decode one SSE record.
 *
 * An unnamed or unknown event is not an error — a proxy may inject a comment
 * or a keep-alive, and a backend may add an event this version has not heard
 * of. Both are skipped. Malformed JSON on an event we *do* know is an error,
 * because that one was meant for us.
 */
export function parseStreamRecord(
  record: string
): AgentStreamEvent | undefined {
  let name: string | undefined;
  const data: string[] = [];
  for (const line of record.split("\n")) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trim());
  }
  if (!name) return undefined;
  const kind = asKind(name);
  if (!kind) return undefined;
  const payload = data.join("\n");
  if (payload === "") return { kind, data: {} };
  try {
    return { kind, data: JSON.parse(payload) as unknown };
  } catch {
    throw new AgentStreamError(
      "stream-malformed",
      `agent HTTP stream event "${kind}" carried invalid JSON`
    );
  }
}

/**
 * Accumulate events into the reply the rest of the client already understands.
 *
 * Deliberately a small state machine over a value, not a subscription: the
 * caller owns the reading loop, so cancellation stays where the abort signal
 * already is.
 */
export function createStreamReply(onText?: (text: string) => void): {
  /** Take one event. Returns true once the reply is complete. */
  readonly absorb: (event: AgentStreamEvent) => boolean;
  /** Text so far, for rendering a reply that has not finished. */
  readonly partial: () => string;
  /** The finished reply. Throws when the stream never said `done`. */
  readonly finish: (schemaVersion: string) => AgentHttpResponse;
  /** Whether `done` has been seen. */
  readonly complete: () => boolean;
} {
  let text = "";
  let transcript: string | undefined;
  let toolCalls: readonly AgentHttpToolCall[] | undefined;
  let askUser: AgentHttpQuestion | undefined;
  let failure: { code: string; message: string } | undefined;
  let done = false;
  let events = 0;

  return {
    partial: () => text,
    complete: () => done,

    absorb: (event) => {
      events += 1;
      if (events > MAX_STREAM_EVENTS) {
        throw new AgentStreamError(
          "stream-too-long",
          `agent HTTP stream exceeded ${String(MAX_STREAM_EVENTS)} events`
        );
      }
      const data = isRecord(event.data) ? event.data : {};
      switch (event.kind) {
        case "text-delta": {
          if (typeof data.text === "string") {
            text += data.text;
            onText?.(text);
          }
          return false;
        }
        case "transcript": {
          if (typeof data.text === "string") transcript = data.text;
          return false;
        }
        case "tool-calls": {
          // Complete, and sent once. Held until `done`: a reply that is
          // abandoned mid-stream must have run nothing.
          if (Array.isArray(data.toolCalls)) {
            toolCalls = data.toolCalls as readonly AgentHttpToolCall[];
          }
          return false;
        }
        case "ask-user": {
          askUser = data as unknown as AgentHttpQuestion;
          return false;
        }
        case "error": {
          failure = {
            code: typeof data.code === "string" ? data.code : "stream-error",
            message:
              typeof data.message === "string"
                ? data.message
                : "the backend reported a failure mid-stream",
          };
          done = true;
          return true;
        }
        case "done": {
          done = true;
          return true;
        }
      }
    },

    finish: (schemaVersion) => {
      if (failure) {
        throw new AgentStreamError(failure.code, failure.message);
      }
      if (!done) {
        // A stream that stopped without saying so is not a reply with less in
        // it — it is a reply whose end nobody saw, and running its calls would
        // be acting on a sentence that was cut off.
        throw new AgentStreamError(
          "stream-incomplete",
          "agent HTTP stream ended without done"
        );
      }
      return {
        schemaVersion,
        ...(text ? { text } : {}),
        ...(transcript ? { transcript } : {}),
        ...(toolCalls ? { toolCalls } : {}),
        ...(askUser ? { askUser } : {}),
      } as AgentHttpResponse;
    },
  };
}

/**
 * Split a growing buffer into complete SSE records.
 *
 * Returns the records it could complete and whatever is left over, so a chunk
 * that ends mid-record is carried into the next read rather than parsed as a
 * truncated one.
 */
export function splitRecords(buffer: string): {
  readonly records: readonly string[];
  readonly rest: string;
} {
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? "";
  return { records: parts.filter((part) => part.trim() !== ""), rest };
}
