/** Opening an HTTP connection and sending one round of a turn. */
import {
  compactRequest,
  connectionIdOf,
  currentContext,
  forgetSessionHandle,
  guideCache,
  pins,
  refreshSchemaPin,
  rememberPin,
  schemaFingerprint,
  usesPinnedCatalog,
} from "./httpConnection";
import { type HttpPhaseContext } from "./httpExecution";
import { exchange } from "./httpFetch";
import type { AgentHttpToolCall, AgentHttpToolResult } from "./httpTypes";
import {
  type AgentHttpAudio,
  type AgentHttpClientOptions,
  type AgentHttpMessage,
  type AgentHttpResponse,
  type AgentHttpUnresolved,
} from "./httpWire";
import type { AgentSession } from "./types";

/**
 * Probe the endpoint. A typed protocol body is required — a 200 with
 * unrelated JSON is a failure.
 *
 * @public
 */
export async function connectAgentHttp(
  session: AgentSession,
  options: AgentHttpClientOptions,
  signal?: AbortSignal
): Promise<AgentHttpResponse> {
  const connectionId = connectionIdOf(options);
  const version = schemaFingerprint(session);
  const seq = pins.claim(session, connectionId);
  const response = await exchange(
    options,
    compactRequest(session, "hello", {}, "full", {
      connectionId,
      version,
      context: currentContext(session, options),
    }),
    signal
  );
  if (response.ok === false) {
    throw new Error(response.text ?? "agent HTTP hello was rejected");
  }
  rememberPin(session, connectionId, { version, seq }, response);
  return response;
}

/**
 * Talk to the backend until it stops asking for discovery.
 *
 * Actions a backend sent are its decision, whatever else the same response
 * asked for. Collecting them per round is the difference between running what
 * it chose and throwing all of it away because it also wanted a row window —
 * which is exactly what a small model does, every round, until the discovery
 * budget runs out with nothing done.
 */
/**
 * One round of the conversation: build the request, send it, record the pin.
 *
 * The contract travels when this connection holds no pin for it and only the
 * view travels when it does — which is what `questionOnly` names. The pin is
 * remembered from the reply before anything else reads it, because a backend
 * that acknowledged one has it whatever the rest of the answer says.
 */
export async function sendRound(
  session: AgentSession,
  options: AgentHttpClientOptions,
  round: {
    readonly connectionId: string;
    readonly version: string;
    readonly questionOnly: boolean;
    readonly turn: HttpPhaseContext;
    readonly phaseId: number;
    readonly message: string;
    readonly audio?: AgentHttpAudio;
    readonly conversation?: readonly AgentHttpMessage[];
    readonly toolResults?: readonly AgentHttpToolResult[];
    readonly pendingCalls: readonly AgentHttpToolCall[];
    readonly signal?: AbortSignal;
  }
): Promise<AgentHttpResponse> {
  const seq = pins.claim(session, round.connectionId);
  // The permitted context as it stands for this round. Named apart from the
  // phase's own execution context on purpose: that one is identity, this one
  // is what goes on the wire.
  const wireContext = currentContext(
    session,
    options,
    round.connectionId,
    round.version
  );
  const reply = await exchange(
    options,
    compactRequest(
      session,
      "turn",
      {
        ...(round.message ? { message: round.message } : {}),
        ...(round.audio ? { audio: round.audio } : {}),
        conversation: round.conversation,
        turnId: round.turn.turnId,
        phaseId: round.phaseId,
        ...(round.toolResults?.length
          ? { toolResults: round.toolResults }
          : {}),
        ...(round.pendingCalls.length
          ? { pendingCalls: round.pendingCalls }
          : {}),
      },
      round.questionOnly ? "question" : "full",
      {
        connectionId: round.connectionId,
        version: round.version,
        context: wireContext,
      }
    ),
    round.signal
  );
  rememberPin(
    session,
    round.connectionId,
    { version: round.version, seq },
    reply
  );
  return reply;
}

/**
 * Drop everything this client remembers about one connection.
 *
 * The pin and the guides answered under it are the same promise — "you have
 * already been told this" — so a backend that lost one has lost both.
 */
export function forgetConnection(
  session: AgentSession,
  connectionId: string
): void {
  pins.forget(session, connectionId);
  guideCache.forget(connectionId);
  // The handle goes with them. A host resetting the conversation, and a
  // backend answering that it holds no such pin, are both saying this thread
  // is not one to carry on — and claiming a handle after either is claiming
  // someone else's.
  forgetSessionHandle(connectionId, session.manifest().tableId);
}

/**
 * Why a turn stopped at a question nobody answered.
 *
 * Two different facts, and the reader is owed the difference: nothing here
 * could put the question to them, or they were asked and declined.
 */
export function unansweredQuestion(
  kind: "no-channel" | "declined",
  pending: readonly AgentHttpToolCall[]
): AgentHttpUnresolved {
  return {
    code: kind === "no-channel" ? "no-reader-channel" : "question-unanswered",
    message:
      kind === "no-channel"
        ? "the backend asked the reader a question and this client has no way to put it to them"
        : "the backend asked a question and nobody answered",
    pending: pending.map((call) => call.name),
  };
}

export async function preparePinnedTurn(
  session: AgentSession,
  options: AgentHttpClientOptions,
  signal?: AbortSignal
): Promise<boolean> {
  if (options.pinCatalog !== false) {
    await refreshSchemaPin(session, options, signal);
  }
  return usesPinnedCatalog(session, options);
}
