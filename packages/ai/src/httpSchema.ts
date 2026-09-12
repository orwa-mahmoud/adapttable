/**
 * The wire, as JSON Schema.
 *
 * The protocol is the product here: a backend in Python, Go or .NET should be
 * able to implement it without reading TypeScript or importing anything. This
 * module is the one description of that wire, and `scripts/build-agent-schema.mjs`
 * writes it to `schemas/agent-http.v1.json` so those backends have a file.
 *
 * It is kept beside the parsers deliberately. Every constraint here — the
 * enumerated tool names, the audio caps, the action ceiling — is the same
 * number the parser enforces, imported rather than retyped, so a limit cannot
 * be changed in one place and left in the other. What the parser accepts and
 * what the schema publishes are the same claim.
 */
import { AGENT_SCHEMA_VERSION } from "./keys";

/** A JSON Schema document, loosely typed because it is data. */
export type JsonSchemaDocument = Record<string, unknown>;

/** Limits the parsers enforce, published so a backend can enforce them too. */
export interface AgentWireLimits {
  readonly maxToolCalls: number;
  readonly maxDescribeCalls: number;
  readonly maxReadCalls: number;
  readonly maxRequestBytes: number;
  readonly maxResponseBytes: number;
  readonly maxAudioBytes: number;
  readonly maxAudioMs: number;
  readonly audioTypes: readonly string[];
}

const ID_BASE = "https://adapttable.dev/schemas/agent-http.v1.json";

function toolCall(): JsonSchemaDocument {
  return {
    type: "object",
    required: ["id", "name"],
    additionalProperties: false,
    properties: {
      id: {
        type: "string",
        minLength: 1,
        description:
          "Correlation handle, unique within one reply. Issued by protocol code, never by the model.",
      },
      name: {
        type: "string",
        minLength: 1,
        description:
          'A capability key, or "describe" / "read" — the two tools that ask the frontend something rather than commanding it.',
      },
      args: {
        description:
          'Arguments for that tool. "describe" takes { keys?: string[], bundle?: string } — a bundle names a family and is expanded locally into the members this table actually offers. "read" takes { offset, limit, columns?, scope? }.',
      },
      expectedRevision: {
        type: "number",
        description:
          "The revision the backend observed, when it names one. Omitted means the view the request described.",
      },
    },
  };
}

function toolResult(): JsonSchemaDocument {
  return {
    type: "object",
    required: ["id"],
    additionalProperties: false,
    properties: {
      id: { type: "string", minLength: 1 },
      result: { description: "What the tool produced." },
      error: {
        type: "object",
        required: ["code", "message"],
        additionalProperties: false,
        properties: {
          code: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  };
}

function question(): JsonSchemaDocument {
  return {
    type: "object",
    required: ["id", "question", "allowFreeText"],
    additionalProperties: false,
    properties: {
      id: { type: "string", minLength: 1 },
      question: { type: "string", minLength: 1 },
      allowFreeText: { type: "boolean" },
      options: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "label"],
          additionalProperties: false,
          properties: {
            id: { type: "string", minLength: 1 },
            label: { type: "string", minLength: 1 },
          },
        },
      },
    },
    description:
      "A question for the reader, asked as structure rather than prose. Must offer options or allow free text.",
  };
}

function audio(limits: AgentWireLimits): JsonSchemaDocument {
  return {
    type: "object",
    required: ["mimeType", "base64", "durationMs"],
    additionalProperties: false,
    properties: {
      mimeType: { type: "string", enum: [...limits.audioTypes] },
      base64: { type: "string", minLength: 1 },
      durationMs: {
        type: "number",
        exclusiveMinimum: 0,
        maximum: limits.maxAudioMs,
      },
    },
    description: `A recording in place of typed text. At most ${String(limits.maxAudioBytes)} bytes once decoded; its transcript comes back on the reply and later rounds send that instead.`,
  };
}

/**
 * The request and reply schemas for this protocol version.
 *
 * @param limits - The ceilings the parsers enforce.
 * @returns One JSON Schema document with both shapes under `$defs`.
 *
 * @public
 */
export function agentHttpSchema(limits: AgentWireLimits): JsonSchemaDocument {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: ID_BASE,
    title: "AdaptTable agent HTTP protocol",
    description: [
      "The wire between an AdaptTable frontend and a developer-owned backend.",
      "The frontend executes; the backend decides. A reply that carries text and",
      "tool calls is a complete turn — no second call is needed to announce that",
      "something worked, because the frontend reports that itself.",
    ].join(" "),
    $defs: {
      toolCall: toolCall(),
      toolResult: toolResult(),
      askUser: question(),
      audio: audio(limits),
      request: {
        type: "object",
        required: ["schemaVersion", "kind", "tableId"],
        properties: {
          schemaVersion: { const: AGENT_SCHEMA_VERSION },
          kind: { enum: ["hello", "schema", "turn"] },
          tableId: { type: "string", minLength: 1 },
          sessionId: { type: "string", minLength: 1 },
          context: {
            type: "object",
            description:
              "The permitted contract and what was selected from it. Sent on hello and schema, and on every turn when the backend does not pin.",
            properties: {
              contract: { type: "object" },
              selection: { type: "object" },
            },
          },
          contractVersion: {
            type: "string",
            description:
              "The contract this request carries or relies on. A reply acknowledges this exact string.",
          },
          selectionVersion: { type: "string" },
          view: {
            type: "object",
            description:
              "Where the table is right now. Sent fresh on every turn, never pinned.",
          },
          viewRevision: { type: "number" },
          message: { type: "string" },
          audio: { $ref: "#/$defs/audio" },
          conversation: {
            type: "array",
            items: {
              type: "object",
              required: ["role", "text"],
              properties: {
                role: { enum: ["user", "assistant"] },
                text: { type: "string" },
              },
            },
          },
          turnId: { type: "string" },
          phaseId: { type: "number" },
          toolResults: {
            type: "array",
            items: { $ref: "#/$defs/toolResult" },
          },
          pendingCalls: {
            type: "array",
            items: { $ref: "#/$defs/toolCall" },
            description:
              "What this phase has proposed so far, so the backend can revise it. What it sends back replaces this; it is not added to.",
          },
          manifest: { type: "object" },
          catalog: { type: "array" },
        },
      },
      reply: {
        type: "object",
        required: ["schemaVersion"],
        properties: {
          schemaVersion: { const: AGENT_SCHEMA_VERSION },
          ok: { type: "boolean" },
          sessionId: { type: "string", minLength: 1 },
          text: { type: "string" },
          transcript: { type: "string" },
          toolCalls: {
            type: "array",
            maxItems: limits.maxToolCalls,
            items: { $ref: "#/$defs/toolCall" },
          },
          askUser: { $ref: "#/$defs/askUser" },
          pin: {
            type: "object",
            required: ["status"],
            properties: {
              status: {
                enum: ["acknowledged", "expired", "unknown", "unsupported"],
              },
              contractVersion: { type: "string" },
              ttlMs: { type: "number" },
            },
          },
          continueWithResults: {
            type: "boolean",
            description:
              "Ask for the receipts of the calls in this reply. Omit it for the ordinary case: the frontend already reports what happened.",
          },
        },
      },
    },
    limits: {
      maxToolCalls: limits.maxToolCalls,
      maxDescribeCalls: limits.maxDescribeCalls,
      maxReadCalls: limits.maxReadCalls,
      maxRequestBytes: limits.maxRequestBytes,
      maxResponseBytes: limits.maxResponseBytes,
      maxAudioBytes: limits.maxAudioBytes,
      maxAudioMs: limits.maxAudioMs,
    },
  };
}
