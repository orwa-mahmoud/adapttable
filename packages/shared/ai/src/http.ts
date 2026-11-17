/**
 * Opt-in HTTP bridge — `@adapttable/ai/http`.
 *
 * The root entry stays transport-free. This subpath posts a compact
 * capability manifest to a developer-owned endpoint and executes the
 * returned actions through the existing session. No model SDK.
 */

import type { AssistantTransport } from "./assistantContracts";
import type { AgentHttpAnswer, AgentHttpQuestion } from "./httpTypes";
import type { AgentSession } from "./types";

// `assistantHttpTransport` hands back this interface, and its `send` names
// these two, so the entry that publishes the function publishes them too.
export { agentSystemPrompt, type AgentSystemPromptInput } from "./agentPrompt";
export type {
  AssistantAudio,
  AssistantExchange,
  AssistantResumeHandle,
  AssistantResumeInput,
  AssistantSendInput,
  AssistantTransport,
  AssistantTransportReply,
  AssistantTurnInput,
  AssistantUnresolved,
} from "./assistantContracts";
export type {
  AssistantReceiptSubject,
  AssistantReceiptTerm,
} from "./assistantReceipts";
// `AgentHttpRequest.view` is typed with these, so a consumer of this subpath
// can name them without reaching for another entry point.
export type { AgentContextSelection } from "./contextSelection";
export type { AgentContextContract, AgentContextView } from "./contextSnapshot";
export {
  contractFingerprint,
  DEFAULT_PIN_CONNECTIONS,
  DEFAULT_PIN_TTL_MS,
  type PinRecord,
  type PinStatus,
} from "./httpPins";
export type { AgentWireLimits, JsonSchemaDocument } from "./httpSchema";
export {
  AgentStreamError,
  type AgentStreamEvent,
  type AgentStreamEventKind,
  createStreamReply,
  MAX_STREAM_EVENTS,
  parseStreamRecord,
  splitRecords,
} from "./httpStream";
export { AgentTurnError, type PhaseState } from "./httpTurn";
export * from "./httpTypes";
export {
  AGENT_SCHEMA_VERSION as AGENT_HTTP_SCHEMA,
  AGENT_SCHEMA_VERSION,
  type ApprovalPolicy,
  CAPABILITY_KEYS,
  type CapabilityKey,
  type CommitPolicy,
  type RowAddressScope,
  type WritePolicy,
} from "./keys";
export type * from "./types";
import { connectionIdOf } from "./httpConnection";
import { connectAgentHttp, forgetConnection } from "./httpRound";
import { runAgentHttpTurn } from "./httpRun";
import {
  type AgentHttpAudio,
  type AgentHttpClientOptions,
  type AgentHttpMessage,
  type AgentHttpResponse,
  type AgentHttpTurnResult,
} from "./httpWire";
export {
  AGENT_HTTP_LIMITS,
  AgentHttpError,
  agentHttpJsonSchema,
} from "./httpLimits";
export { parseAgentHttpRequest, parseAgentHttpResponse } from "./httpParse";
export { connectAgentHttp } from "./httpRound";
export { runAgentHttpTurn } from "./httpRun";
export type {
  AgentHttpAudio,
  AgentHttpClientOptions,
  AgentHttpKind,
  AgentHttpMessage,
  AgentHttpPinAck,
  AgentHttpRequest,
  AgentHttpResponse,
  AgentHttpTurnResult,
  AgentHttpUnresolved,
} from "./httpWire";

/**
 * Bind an endpoint to one session. Import this subpath only where the
 * host actually talks HTTP — unused bundles stay free of it.
 *
 * @public
 */
export function createAgentHttpClient(options: AgentHttpClientOptions): {
  readonly endpoint: string;
  connect: (
    session: AgentSession,
    signal?: AbortSignal
  ) => Promise<AgentHttpResponse>;
  send: (
    session: AgentSession,
    message: string,
    extras?: {
      conversation?: readonly AgentHttpMessage[];
      returnResults?: boolean;
      signal?: AbortSignal;
      /** A recording in place of typed text; pass `""` as the message. */
      audio?: AgentHttpAudio;
      /** Told what the backend heard, as soon as a reply names it. */
      onTranscript?: (text: string) => void;
    }
  ) => Promise<AgentHttpTurnResult>;
  /**
   * Drop what this connection remembers about the backend.
   *
   * A host whose credentials change calls this — or gives a new
   * `connectionId` — so the next turn negotiates again instead of relying on
   * an acknowledgement made under the identity it has just left.
   */
  reset: (session: AgentSession) => void;
} {
  return {
    endpoint: options.endpoint,
    connect: (session, signal) => connectAgentHttp(session, options, signal),
    send: (session, message, extras) =>
      runAgentHttpTurn(session, message, options, extras),
    // Everything this connection remembers about the backend goes: the pin,
    // the guidance acknowledged under it — a reader whose credentials changed
    // is a different connection, and what the last one was told is not what
    // this one has been — and the handle naming the thread it was holding.
    reset: (session) => {
      forgetConnection(session, connectionIdOf(options));
    },
  };
}

/**
 * The HTTP backend as an {@link AssistantTransport}.
 *
 * This adapter is the only thing that couples a conversation to HTTP. It
 * lives on `@adapttable/ai/http` on purpose: a host writing its own transport
 * implements the neutral interface from `@adapttable/ai` and never pulls this
 * client — or any model client — into its graph.
 *
 * @param options - Endpoint and credentials for the backend.
 * @returns A transport the assistant controller can take as-is.
 *
 * @public
 */
export function assistantHttpTransport(
  options: AgentHttpClientOptions
): AssistantTransport {
  let connected: AgentSession | undefined;
  // The controller supplies a per-turn sink; the client option is fixed for
  // the life of the transport, so the option forwards to whichever turn is in
  // flight rather than each turn building its own client.
  let partialSink: ((text: string) => void) | undefined;
  // The same arrangement for questions: the surface that can draw one belongs
  // to the turn, the client option belongs to the transport.
  let askSink:
    | ((question: AgentHttpQuestion) => Promise<AgentHttpAnswer | undefined>)
    | undefined;
  const client = createAgentHttpClient({
    ...options,
    onStreamText: (text) => {
      options.onStreamText?.(text);
      partialSink?.(text);
    },
    askUser: async (question, signal) => {
      // A host that supplied its own channel keeps it; otherwise the turn's
      // surface is asked. Without either, the turn reports `no-reader-channel`
      // exactly as it did before.
      if (options.askUser) return options.askUser(question, signal);
      if (!askSink) return undefined;
      return askSink(question);
    },
  });
  return {
    connect: async ({ session, signal }) => {
      connected = session;
      await client.connect(session, signal);
    },
    disconnect: () => {
      // What the backend acknowledged was acknowledged to a connection that is
      // now closed; a later one negotiates for itself.
      if (connected) client.reset(connected);
      connected = undefined;
    },
    send: async ({
      session,
      text,
      audio,
      conversation,
      signal,
      onPartialText,
      onTranscript,
      askUser,
    }) => {
      partialSink = onPartialText;
      askSink = askUser;
      const turn = await client
        .send(session, text, {
          conversation: conversation.map((entry) => ({
            role: entry.role,
            text: entry.text,
          })),
          returnResults: true,
          signal,
          ...(audio ? { audio } : {}),
          ...(onTranscript ? { onTranscript } : {}),
        })
        .finally(() => {
          // Cleared whatever happened, so a later stream cannot write into the
          // turn that has just ended, and a later question cannot be drawn
          // into a conversation that has moved on.
          partialSink = undefined;
          askSink = undefined;
        });
      return {
        text: turn.text,
        results: turn.results,
        keys: turn.keys,
        subjects: turn.subjects,
        ...(turn.unresolved ? { unresolved: turn.unresolved } : {}),
        ...(turn.transcript === undefined
          ? {}
          : { transcript: turn.transcript }),
      };
    },
  };
}

// The request builders take and return these, so the wire entry names them
// rather than sending a reader to the root entry for the type of an argument
// it already accepts.
export type {
  AgentContext,
  AgentContextInputs,
  AgentContextOptions,
  ContextCapability,
  ContextColumn,
} from "./context";
export type { AgentInstructionsInput } from "./contextPrompt";
export type {
  AgentContextProfile,
  DeferralKind,
  DeferralReason,
} from "./contextSelection";
