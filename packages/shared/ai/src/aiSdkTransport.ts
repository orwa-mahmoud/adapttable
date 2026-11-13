/** The AI SDK transport: one assistant turn as one UI message stream. */
import type { ApprovalPresentation } from "@adapttable/core";

import {
  aiSdkCapability,
  AiSdkProtocolError,
  approvalSubject,
  assertAiSdkVersion,
  assertPartShape,
  callKey,
  DEFAULT_MAX_REQUESTS,
  deniedCall,
  deniedTurn,
  requiredString,
  streamFailure,
  type StreamOutcome,
  type TurnState,
  unresolvedTurn,
} from "./aiSdkProtocol";
import {
  type AiSdkOptions,
  type AiSdkPart,
  type AiSdkRequest,
} from "./aiSdkTypes";
import type {
  AssistantTransport,
  AssistantTransportReply,
  AssistantUnresolved,
} from "./assistantContracts";
import { subjectFor } from "./assistantSubjects";
import { buildAgentContext } from "./context";
import type { AgentContextView } from "./contextSnapshot";
import { createTurnRevision } from "./turnRevision";
import type { AgentSession } from "./types";

/**
 * The AI SDK route as an {@link AssistantTransport}.
 *
 * This adapter is the only thing that couples a conversation to the AI SDK. A
 * host writing its own transport implements the neutral interface from
 * `@adapttable/ai` and never pulls this — or the `ai` package — into its
 * graph.
 *
 * @param options - The run seam and the approval sink.
 * @returns A transport the assistant controller can take as-is.
 *
 * @public
 */
export function aiSdkTransport(options: AiSdkOptions): AssistantTransport {
  const maxRequests = Math.max(1, options.maxRequests ?? DEFAULT_MAX_REQUESTS);
  const presentation: ApprovalPresentation = options.presentation ?? "widget";
  // Names one logical run, so two turns of the same conversation never share a
  // call identity even when a provider hands back a tool-call id it has used
  // before.
  let runs = 0;
  const transportId = globalThis.crypto.randomUUID();

  const viewOf = (session: AgentSession): AgentContextView =>
    buildAgentContext(session, options.context, options.contextInputs?.()).view;

  const execute = async (
    session: AgentSession,
    turn: TurnState,
    part: AiSdkPart,
    key: string,
    signal?: AbortSignal
  ): Promise<void> => {
    const toolCallId = part.toolCallId;
    if (typeof toolCallId !== "string") {
      throw new AiSdkProtocolError(
        "malformed-part",
        "tool-input-available needs a toolCallId"
      );
    }
    const manifest = session.manifest();
    // Bind to the view sent with this request, advanced only by revisions
    // earlier calls proved they produced. An unrelated change must still
    // cause a mismatch even after this request has executed a call.
    const result = await session.execute(
      key,
      part.input ?? {},
      turn.bound.expected(),
      callKey(manifest.tableId, turn.step, turn.streamStep, toolCallId),
      signal
    );
    turn.bound.settled(result);
    turn.results.push(result);
    turn.keys.push(key);
    turn.subjects.push(
      subjectFor(key, part.input ?? {}, result, manifest.columns)
    );
    // Exactly what `addToolOutput` sends, so a route reads it the way it
    // reads any other client tool's result.
    turn.outputs.push({
      toolCallId,
      output: result.ok
        ? { ok: true, revision: result.revision, result: result.result }
        : { ok: false, revision: result.revision, error: result.error },
    });
  };

  const settle = async (
    session: AgentSession,
    turn: TurnState,
    part: AiSdkPart,
    signal?: AbortSignal
  ): Promise<AssistantUnresolved | undefined> => {
    const approvalId = part.approvalId;
    if (typeof approvalId !== "string") {
      throw new AiSdkProtocolError(
        "malformed-part",
        "tool-approval-request needs an approvalId"
      );
    }
    if (!options.onApprove) {
      return unresolvedTurn(
        "approval-unavailable",
        "the route asked for confirmation and nothing here can ask the reader",
        typeof part.toolName === "string"
          ? [aiSdkCapability(session, part.toolName) ?? part.toolName]
          : []
      );
    }
    const decided = await options.onApprove(
      approvalSubject(part, session, presentation),
      signal
    );
    const approved =
      decided === true ||
      (typeof decided === "object" && decided.approved.length > 0);
    const reason = typeof decided === "object" ? decided.reason : undefined;
    turn.approvals.push({
      approvalId,
      approved,
      ...(reason === undefined ? {} : { reason }),
    });
    return undefined;
  };

  /** Read one stream, running our calls as their inputs complete. */
  const consume = async (
    session: AgentSession,
    turn: TurnState,
    parts: AsyncIterable<AiSdkPart> | Iterable<AiSdkPart>,
    onPartialText?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<StreamOutcome | AssistantUnresolved> => {
    let finished = false;
    let continues = false;
    turn.streamStep = 0;

    for await (const part of parts) {
      if (signal?.aborted) {
        throw new AiSdkProtocolError("cancelled", "the turn was cancelled");
      }
      options.onPart?.(part);
      switch (part.type) {
        case "start": {
          // Checked here because this is where a stream says what it is. A
          // parser that guesses at a shape it does not know is how a silent
          // misreading of somebody's data starts.
          assertAiSdkVersion(part.version);
          break;
        }
        case "start-step":
          turn.streamStep += 1;
          break;
        case "finish-step":
        case "text-start":
        case "text-end":
        case "tool-input-start":
        case "tool-input-delta":
          break;
        case "text-delta": {
          turn.text += requiredString(
            part.delta,
            "text-delta needs a string delta"
          );
          onPartialText?.(turn.text);
          break;
        }
        case "tool-input-available": {
          const key = aiSdkCapability(
            session,
            requiredString(
              part.toolName,
              "tool-input-available needs a toolName"
            )
          );
          // Somebody else's client tool. Answering it would claim a result
          // for work this table never did.
          if (key === undefined) break;
          await execute(session, turn, part, key, signal);
          continues = true;
          break;
        }
        case "tool-output-available":
        case "tool-output-error":
          // The route's own tool, run on the route. Recorded through
          // `onPart`; the table claims nothing about it.
          break;
        case "tool-approval-request": {
          const stopped = await settle(session, turn, part, signal);
          if (stopped) return stopped;
          continues = true;
          break;
        }
        case "output-denied":
          // The reader refused and the route is saying so. Nothing ran, which
          // is what `unresolved` is for — and the reason travels with it, so
          // the panel can say why rather than only that.
          turn.denied.push(deniedCall(session, part));
          break;
        case "error":
          throw streamFailure(part);
        case "finish": {
          finished = true;
          break;
        }
        default:
          // `data-*` and anything a newer SDK adds: forwarded through
          // `onPart` and otherwise left alone. An unknown part is not a
          // malformed one — but a part that is not even shaped like one is.
          assertPartShape(part);
          break;
      }
    }

    if (!finished) {
      throw new AiSdkProtocolError(
        "stream-incomplete",
        "the stream ended without a finish part"
      );
    }
    return { finished, continues };
  };

  return {
    disconnect: () => {
      options.connection.close?.();
    },
    send: async ({
      session,
      text,
      conversation,
      signal,
      onPartialText,
    }): Promise<AssistantTransportReply> => {
      runs += 1;
      const runId = `${transportId}:run-${String(runs)}`;
      const opening = session.manifest().viewRevision;
      const turn: TurnState = {
        results: [],
        keys: [],
        subjects: [],
        outputs: [],
        approvals: [],
        denied: [],
        bound: createTurnRevision(opening),
        step: `${runId}:0`,
        streamStep: 0,
        text: "",
      };
      let unresolved: AssistantUnresolved | undefined;

      for (let attempt = 0; attempt < maxRequests; attempt += 1) {
        // The view this request carries, and the step its tool calls belong
        // to. Both move on with the request, so a call is bound to the state
        // the model was actually shown.
        const view = viewOf(session);
        turn.bound.opens(view.revision);
        turn.step = `${runId}:${String(attempt)}`;
        const request: AiSdkRequest = {
          message: text,
          messages: conversation.map((entry) => ({
            role: entry.role,
            content: entry.text,
          })),
          ...(turn.outputs.length > 0
            ? { toolOutputs: [...turn.outputs] }
            : {}),
          ...(turn.approvals.length > 0
            ? { approvals: [...turn.approvals] }
            : {}),
          data: { "data-adapttable-view": view },
        };
        // Carried once: a second request repeats only what is new.
        turn.outputs.length = 0;
        turn.approvals.length = 0;

        const parts = await options.connection.run(request, signal);
        const outcome = await consume(
          session,
          turn,
          parts,
          onPartialText,
          signal
        );
        if ("code" in outcome) {
          unresolved = outcome;
          break;
        }
        if (!outcome.continues) {
          return {
            text: turn.text,
            results: turn.results,
            keys: turn.keys,
            subjects: turn.subjects,
            ...(turn.denied.length > 0
              ? { unresolved: deniedTurn(turn.denied) }
              : {}),
          };
        }
      }

      return {
        text: turn.text,
        results: turn.results,
        keys: turn.keys,
        subjects: turn.subjects,
        unresolved:
          unresolved ??
          unresolvedTurn(
            "continuation-limit",
            `the turn asked to continue more than ${String(maxRequests)} times`,
            []
          ),
      };
    },
  };
}
