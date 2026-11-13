/**
 * Bounds every HTTP turn is held to, the bridge's error type, and the byte and
 * value readers the parsers share.
 */
import {
  agentHttpSchema,
  type AgentWireLimits,
  type JsonSchemaDocument,
} from "./httpSchema";
import {
  type AgentHttpAudio,
  type AgentHttpRequest,
  type AgentHttpResponse,
} from "./httpWire";

/**
 * A voice turn's clip and what the backend heard, carried across its rounds.
 *
 * The clip goes on the first round only. Once a reply names the transcript,
 * every later round sends that as its message instead.
 */
export interface VoiceCarry {
  audio?: AgentHttpAudio;
  transcript?: string;
  readonly onTranscript?: (text: string) => void;
}

/** What a round sends as the reader's words, and the clip if it still owes one. */
export function roundWords(
  message: string,
  voice: VoiceCarry | undefined
): { readonly message: string; readonly audio?: AgentHttpAudio } {
  if (!voice) return { message };
  const words = voice.transcript ?? message;
  if (voice.audio) return { message: words, audio: voice.audio };
  if (!words) {
    throw new Error(
      "the backend answered a voice turn without a transcript, so the turn cannot continue"
    );
  }
  return { message: words };
}

/** Record what a reply says the backend heard, once. */
export function takeTranscript(
  voice: VoiceCarry | undefined,
  reply: AgentHttpResponse
): void {
  if (!voice?.audio) return;
  voice.audio = undefined;
  const heard = reply.transcript?.trim();
  if (!heard) return;
  voice.transcript = heard;
  voice.onTranscript?.(heard);
}

export const MAX_NEED_ROUNDS = 3;
/**
 * Dependent phases in one user send. Discovery is bounded per phase; this
 * bounds how many times work may depend on the work before it.
 */
export const MAX_CONTINUATIONS = 3;
/**
 * Repair rounds in one user send.
 *
 * A call refused over its arguments is handed back to the backend — even
 * when a sibling already landed — so the model can send the id the table
 * takes. Two rounds is enough to correct a guess; a third refusal is shown
 * to the reader. Counted apart from {@link MAX_CONTINUATIONS} so a backend
 * asking to continue can never spend it.
 */
export const MAX_REPAIRS = 2;
export const MAX_DESCRIBE_NEEDS = 16;
export const MAX_READ_NEEDS = 16;
export const MAX_ACTIONS = 32;
export const MAX_REQUEST_BYTES = 256_000;
/** A backend cannot make this client hold an unbounded body in memory. */
export const MAX_RESPONSE_BYTES = 512_000;
/**
 * Guides and row windows accumulated across discovery rounds. Deliberately
 * well under {@link MAX_REQUEST_BYTES}: the context is carried inside every
 * later request, so it needs its own budget to be a real limit and to name
 * discovery as the thing that overflowed.
 */
export const MAX_CONTEXT_BYTES = 128_000;
/**
 * A recording is large and travels once. Its own cap, separate from the body
 * limit, so a clip cannot quietly consume the room the context needs.
 */
export const MAX_AUDIO_BYTES = 4_000_000;
/** Longer than this is a recording nobody meant to send. */
export const MAX_AUDIO_MS = 120_000;
/** What a browser actually records. Anything else is refused at the door. */
export const AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);

/** Structured HTTP bridge failure with a stable machine code. @public */
export class AgentHttpError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AgentHttpError";
    this.code = code;
  }
}

export function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value) ?? "").byteLength;
}

export function requestBytes(body: AgentHttpRequest): number {
  return jsonBytes(body);
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * The ceilings this client enforces, published so a backend can enforce them.
 *
 * @public
 */
export const AGENT_HTTP_LIMITS: AgentWireLimits = {
  maxToolCalls: MAX_ACTIONS,
  maxDescribeCalls: MAX_DESCRIBE_NEEDS,
  maxReadCalls: MAX_READ_NEEDS,
  maxRequestBytes: MAX_REQUEST_BYTES,
  maxResponseBytes: MAX_RESPONSE_BYTES,
  maxAudioBytes: MAX_AUDIO_BYTES,
  maxAudioMs: MAX_AUDIO_MS,
  audioTypes: [...AUDIO_TYPES],
};

/**
 * This protocol as JSON Schema, for a backend in any language.
 *
 * Generated from the same constants the parsers use, so what is published and
 * what is accepted cannot drift apart.
 *
 * @returns The request and reply schemas.
 *
 * @public
 */
export function agentHttpJsonSchema(): JsonSchemaDocument {
  return agentHttpSchema(AGENT_HTTP_LIMITS);
}
