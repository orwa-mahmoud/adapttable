/** The AG-UI transport: one assistant turn as one AG-UI run. */
import type { ApprovalPresentation } from "@adapttable/core";

import {
  AgUiProtocolError,
  aguiTools,
  approvalSubject,
  assertStarted,
  callKey,
  capabilityOf,
  DEFAULT_MAX_RUNS,
  interruptCapability,
  parseArgs,
  questionOf,
  requiredString,
  resumeFromApproval,
  runFailure,
  type RunOutcome,
  statePatch,
  type TurnState,
  unresolvedTurn,
} from "./aguiProtocol";
import {
  type AgUiEvent,
  type AgUiInterrupt,
  type AgUiMessage,
  type AgUiOptions,
  type AgUiResume,
  type AgUiRunInput,
} from "./aguiTypes";
import type {
  AssistantQuestion,
  AssistantTransport,
  AssistantTransportReply,
  AssistantUnresolved,
} from "./assistantContracts";
import { subjectFor } from "./assistantSubjects";
import { buildAgentContext } from "./context";
import type { AgentContextView } from "./contextSnapshot";
import { createTurnRevision } from "./turnRevision";
import type { AgentSession } from "./types";

let threadCounter = 0;

/**
 * The AG-UI backend as an {@link AssistantTransport}.
 *
 * This adapter is the only thing that couples a conversation to AG-UI. A host
 * writing its own transport implements the neutral interface from
 * `@adapttable/ai` and never pulls this — or any agent framework — into its
 * graph.
 *
 * @param options - The run seam, plus the approval and question sinks.
 * @returns A transport the assistant controller can take as-is.
 *
 * @public
 */
export function aguiTransport(options: AgUiOptions): AssistantTransport {
  threadCounter += 1;
  const threadId = options.threadId ?? `adapttable-${threadCounter}`;
  const maxRuns = Math.max(1, options.maxRuns ?? DEFAULT_MAX_RUNS);
  const presentation: ApprovalPresentation = options.presentation ?? "widget";
  // The state the backend has already been told about, and whether a run input
  // has actually carried it. Both matter: a bus sees the snapshot at connect,
  // and the first run input still carries it, because a run input has to be
  // readable on its own.
  let sent: AgentContextView | undefined;
  let carried = false;
  let runCounter = 0;

  const emit = (event: AgUiEvent): void => {
    options.onEvent?.(event);
  };

  const viewOf = (session: AgentSession): AgentContextView =>
    buildAgentContext(session, options.context, options.contextInputs?.()).view;

  /** The state fields of a run input, and what the backend now knows. */
  const stateFor = (
    view: AgentContextView
  ): Pick<AgUiRunInput, "state" | "stateDelta"> => {
    if (!carried || !sent) {
      // Announced only if connect did not already do it, so a host with a
      // live bus never sees the same snapshot twice.
      if (!sent) emit({ type: "STATE_SNAPSHOT", snapshot: view });
      sent = view;
      carried = true;
      return { state: view };
    }
    const delta = statePatch(sent, view);
    sent = view;
    if (delta.length === 0) return {};
    emit({ type: "STATE_DELTA", delta });
    return { stateDelta: delta };
  };

  const executeCall = async (
    session: AgentSession,
    turn: TurnState,
    runId: string,
    toolCallId: string,
    key: string,
    args: unknown,
    signal?: AbortSignal
  ): Promise<void> => {
    const manifest = session.manifest();
    // This call is checked against the state the run started with or progress
    // one of this run's own earlier calls proved. A merely newer live revision
    // is foreign and remains visible to the session as a mismatch.
    const result = await session.execute(
      key,
      args,
      turn.bound.expected(),
      callKey(threadId, runId, toolCallId),
      signal
    );
    turn.bound.settled(result);
    turn.results.push(result);
    turn.keys.push(key);
    turn.subjects.push(subjectFor(key, args, result, manifest.columns));
    const content = JSON.stringify(
      result.ok
        ? { ok: true, revision: result.revision, result: result.result }
        : { ok: false, revision: result.revision, error: result.error }
    );
    turn.sequence += 1;
    const message: AgUiMessage = {
      id: `${runId}-tool-${turn.sequence}`,
      role: "tool",
      content,
      toolCallId,
    };
    turn.messages.push(message);
    emit({
      type: "TOOL_CALL_RESULT",
      messageId: message.id,
      toolCallId,
      content,
    });
  };

  /** Consume one run's events, executing our calls as they complete. */
  const consume = async (
    session: AgentSession,
    turn: TurnState,
    runId: string,
    events: AsyncIterable<AgUiEvent> | Iterable<AgUiEvent>,
    onPartialText?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<RunOutcome> => {
    const tableId = session.manifest().tableId;
    const names = new Map<string, string>();
    const args = new Map<string, string>();
    let text = turn.text;
    let finished = false;
    let interrupt: AgUiInterrupt | undefined;

    for await (const event of events) {
      if (signal?.aborted) {
        throw new AgUiProtocolError("cancelled", "the run was cancelled");
      }
      emit(event);
      switch (event.type) {
        case "RUN_STARTED":
          break;
        case "TEXT_MESSAGE_START":
          break;
        case "TEXT_MESSAGE_CONTENT": {
          text += requiredString(
            event.delta,
            "TEXT_MESSAGE_CONTENT needs a string delta"
          );
          onPartialText?.(text);
          break;
        }
        case "TEXT_MESSAGE_END":
          break;
        case "TOOL_CALL_START": {
          const started = requiredString(
            event.toolCallId,
            "TOOL_CALL_START needs a toolCallId and a toolCallName"
          );
          names.set(
            started,
            requiredString(
              event.toolCallName,
              "TOOL_CALL_START needs a toolCallId and a toolCallName"
            )
          );
          args.set(started, "");
          break;
        }
        case "TOOL_CALL_ARGS": {
          const id = requiredString(
            event.toolCallId,
            "TOOL_CALL_ARGS needs a toolCallId and a string delta"
          );
          const delta = requiredString(
            event.delta,
            "TOOL_CALL_ARGS needs a toolCallId and a string delta"
          );
          assertStarted(names, id, "TOOL_CALL_ARGS");
          args.set(id, (args.get(id) ?? "") + delta);
          break;
        }
        case "TOOL_CALL_END": {
          const id = requiredString(
            event.toolCallId,
            "TOOL_CALL_END needs a toolCallId"
          );
          const name = assertStarted(names, id, "TOOL_CALL_END");
          const key = capabilityOf(tableId, name);
          // Somebody else's frontend tool. Answering it would be claiming a
          // result for work this table never did.
          if (key === undefined) break;
          await executeCall(
            session,
            turn,
            runId,
            id,
            key,
            parseArgs(args.get(id) ?? ""),
            signal
          );
          break;
        }
        case "TOOL_CALL_RESULT":
          // A result the backend produced for its own tool. Recorded by the
          // host through `onEvent`; the table claims nothing about it.
          break;
        case "RUN_ERROR":
          throw runFailure(event);
        case "RUN_FINISHED": {
          finished = true;
          interrupt = event.outcome?.interrupt;
          break;
        }
        default:
          // STEP_*, CUSTOM, RAW and anything a newer backend adds: forwarded
          // to the host through `onEvent` and otherwise left alone. An
          // unknown event is not a malformed one.
          break;
      }
    }

    if (!finished) {
      throw new AgUiProtocolError(
        "run-incomplete",
        "the run ended without RUN_FINISHED"
      );
    }
    turn.text = text;
    return { text, ...(interrupt ? { interrupt } : {}) };
  };

  /** Settle one interrupt, or say why the turn stops here. */
  const settle = async (
    interrupt: AgUiInterrupt,
    ask: AgUiOptions["askUser"],
    signal?: AbortSignal
  ): Promise<AgUiResume | AssistantUnresolved> => {
    if (interrupt.reason === "confirmation") {
      if (!options.onApprove) {
        return unresolvedTurn(
          "approval-unavailable",
          "the backend asked for confirmation and nothing here can ask the reader",
          interruptCapability(interrupt)
        );
      }
      const subject = approvalSubject(interrupt, presentation);
      const total = subject.kind === "rows" ? subject.proposals.length : 1;
      const decided = await options.onApprove(subject, signal);
      return resumeFromApproval(interrupt.interruptId, decided, total);
    }
    if (interrupt.reason === "input_required") {
      if (!ask) {
        return unresolvedTurn(
          "question-unanswered",
          "the backend asked a question and nothing here can put it to the reader",
          interruptCapability(interrupt)
        );
      }
      const answered = await ask(questionOf(interrupt), signal);
      if (!answered) {
        return unresolvedTurn(
          "question-unanswered",
          "the reader did not answer",
          interruptCapability(interrupt)
        );
      }
      return {
        interruptId: interrupt.interruptId,
        status: "answered",
        payload: answered,
      };
    }
    return unresolvedTurn(
      "interrupt-unsupported",
      `the backend stopped for "${interrupt.reason}", which this table cannot settle`,
      interruptCapability(interrupt)
    );
  };

  return {
    connect: ({ session }) => {
      // The state a run will be judged against, published before the first
      // one starts. A host with a live event bus renders from this.
      const view = viewOf(session);
      sent = view;
      carried = false;
      emit({ type: "STATE_SNAPSHOT", snapshot: view });
    },
    disconnect: () => {
      // The next connection is told the whole state: what this one published
      // was published to a session that has gone.
      sent = undefined;
      carried = false;
      options.connection.close?.();
    },
    send: async ({
      session,
      text,
      conversation,
      signal,
      onPartialText,
      askUser,
    }): Promise<AssistantTransportReply> => {
      // A host that supplied its own channel keeps it; otherwise the turn's
      // own surface is where an `input_required` interrupt is drawn.
      const ask =
        options.askUser ??
        (askUser
          ? (question: AssistantQuestion) => askUser(question)
          : undefined);
      const opening = session.manifest().viewRevision;
      const turn: TurnState = {
        messages: [
          ...conversation.map((entry, index) => ({
            id: `history-${index}`,
            role: entry.role,
            content: entry.text,
          })),
        ],
        results: [],
        keys: [],
        subjects: [],
        bound: createTurnRevision(opening),
        text: "",
        sequence: 0,
      };
      turn.messages.push({
        id: `${threadId}-user-${turn.messages.length}`,
        role: "user",
        content: text,
      });

      let resume: readonly AgUiResume[] | undefined;
      let unresolved: AssistantUnresolved | undefined;

      for (let attempt = 0; attempt < maxRuns; attempt += 1) {
        runCounter += 1;
        const runId = `${threadId}-run-${runCounter}`;
        // The state this run is actually started with. Its revision is what a
        // call arriving during the run was planned against.
        const view = viewOf(session);
        turn.bound.opens(view.revision);
        const input: AgUiRunInput = {
          threadId,
          runId,
          messages: [...turn.messages],
          tools: aguiTools(session),
          ...stateFor(view),
          ...(resume ? { resume } : {}),
        };
        emit({ type: "MESSAGES_SNAPSHOT", messages: input.messages });
        const events = await options.connection.run(input, signal);
        const outcome = await consume(
          session,
          turn,
          runId,
          events,
          onPartialText,
          signal
        );
        if (!outcome.interrupt) {
          return {
            text: outcome.text,
            results: turn.results,
            keys: turn.keys,
            subjects: turn.subjects,
          };
        }
        const settled = await settle(outcome.interrupt, ask, signal);
        if ("code" in settled) {
          unresolved = settled;
          break;
        }
        resume = [settled];
      }

      return {
        text: turn.text,
        results: turn.results,
        keys: turn.keys,
        subjects: turn.subjects,
        unresolved:
          unresolved ??
          unresolvedTurn(
            "resume-limit",
            `the run asked to be resumed more than ${maxRuns} times`,
            []
          ),
      };
    },
  };
}
