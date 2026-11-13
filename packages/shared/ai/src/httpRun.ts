/**
 * Running an HTTP turn phase by phase until the backend has nothing left to
 * ask.
 */
import type { AssistantReceiptSubject } from "./assistantReceipts";
import {
  connectionIdOf,
  guideCache,
  pinLost,
  schemaFingerprint,
} from "./httpConnection";
import {
  createTurnExecution,
  type HttpPhaseContext,
  phaseContext,
} from "./httpExecution";
import { assertContextSize } from "./httpFetch";
import {
  MAX_NEED_ROUNDS,
  MAX_REPAIRS,
  roundWords,
  takeTranscript,
  type VoiceCarry,
} from "./httpLimits";
import { assertTurnContext } from "./httpParse";
import {
  advanceTurn,
  type HiddenReceipts,
  mergeToolResults,
  planSignature,
  receiptsForPhase,
  runPhasePlan,
  samePlanAfter,
} from "./httpPhase";
import {
  answerQuestions,
  askReader,
  mergeGuides,
  newHttpTurnId,
} from "./httpQuestions";
import {
  forgetConnection,
  preparePinnedTurn,
  sendRound,
  unansweredQuestion,
} from "./httpRound";
import { createPhasePlan, type FinalizedCall } from "./httpTurn";
import type { AgentHttpToolResult } from "./httpTypes";
import {
  type AgentHttpAudio,
  type AgentHttpClientOptions,
  type AgentHttpMessage,
  type AgentHttpResponse,
  type AgentHttpTurnResult,
  type AgentHttpUnresolved,
} from "./httpWire";
import type {
  AgentSession,
  CapabilityGuide,
  ExecuteResult,
  RowWindow,
} from "./types";

/**
 * One phase: ask until the backend stops asking, then hand back its plan.
 *
 * The plan is the reducer's, not an accumulation of every round's proposals —
 * a reply while the phase is still discovering replaces what came before it,
 * so a model that repeats itself across rounds still writes once.
 */
async function runPhase(
  session: AgentSession,
  options: AgentHttpClientOptions,
  turn: HttpPhaseContext,
  input: {
    readonly message: string;
    readonly conversation?: readonly AgentHttpMessage[];
    readonly signal?: AbortSignal;
    readonly phaseId: number;
    /** Receipts of work an earlier phase completed, carried forward. */
    readonly toolResults?: readonly AgentHttpToolResult[];
    /** The clip and transcript of a voice turn. */
    readonly voice?: VoiceCarry;
  }
): Promise<{
  readonly last: AgentHttpResponse | undefined;
  /** The view this phase was answered against. */
  readonly context: HttpPhaseContext;
  /** The phase itself, so the caller can move it through executing. */
  readonly phase: ReturnType<typeof createPhasePlan>;
  readonly plan: readonly FinalizedCall[];
  readonly text: string;
  readonly fulfilled: { describe: number; read: number };
  /** Set when the phase stopped without a plan it could run. */
  readonly unresolved?: AgentHttpUnresolved;
}> {
  const connectionId = connectionIdOf(options);
  let questionOnly = await preparePinnedTurn(session, options, input.signal);
  // One recovery, before anything of this phase has run. A backend that lost
  // its pin can be sent the contract again safely; a call whose outcome is
  // unknown never can, which is why this only happens while the plan is empty.
  let mayRecoverPin = true;
  const phase = createPhasePlan({
    tableId: turn.tableId,
    turnId: turn.turnId,
    phaseId: input.phaseId,
  });
  let guides: readonly CapabilityGuide[] = [];
  let windows: readonly RowWindow[] = [];
  let toolResults = input.toolResults;
  let last: AgentHttpResponse | undefined;
  let context = turn;
  let text = "";
  const fulfilled = { describe: 0, read: 0 };

  for (let round = 0; round <= MAX_NEED_ROUNDS; round += 1) {
    assertTurnContext(session, turn);
    // The request below describes the table as it is right now, so this is
    // the view the backend is about to answer — captured before it goes out,
    // never inferred from where the table ends up afterwards. Round 0 needs
    // its own capture as much as the rest: pinning the catalog is a network
    // round trip, and the table is free to move while it happens.
    context = phaseContext(session, turn.turnId, input.phaseId);
    const version = schemaFingerprint(session);
    // Built once per round. With the contract pinned only the view travels;
    // with `pinCatalog: false` the whole thing does, which is what that option
    // means.
    last = await sendRound(session, options, {
      connectionId,
      version,
      questionOnly,
      turn,
      phaseId: input.phaseId,
      ...roundWords(input.message, input.voice),
      conversation: input.conversation,
      toolResults,
      pendingCalls: phase.pending(),
      signal: input.signal,
    });

    // A reply that lost the pin is re-sent whole, clip included; any other
    // reply to the clip is the one that says what the backend heard.
    if (!pinLost(last)) takeTranscript(input.voice, last);

    if (pinLost(last) && mayRecoverPin) {
      // The backend answered nothing but "I no longer have that contract".
      // Forget it, send the whole thing once, and let the same round run
      // again — no call of this phase has been dispatched.
      mayRecoverPin = false;
      questionOnly = false;
      forgetConnection(session, connectionId);
      round -= 1;
      continue;
    }

    // A backend that explained itself on one round and only acted on the next
    // still said something; reading only the final round loses it.
    if (last.text) text = last.text;

    const outcome = phase.absorb(last);
    if (outcome.kind === "ready") {
      return { last, context, phase, plan: outcome.plan, text, fulfilled };
    }

    if (outcome.kind === "ask-user") {
      const answered = await askReader(options, outcome.question, input.signal);
      if (answered.kind !== "answered") {
        phase.settle("failed");
        return {
          last,
          context,
          phase,
          plan: [],
          text,
          fulfilled,
          unresolved: unansweredQuestion(answered.kind, phase.pending()),
        };
      }
      toolResults = mergeToolResults(toolResults, [answered.result]);
      continue;
    }

    const answers = await answerQuestions(
      session,
      outcome.questions,
      turn,
      connectionId,
      version,
      guideCache
    );
    guides = mergeGuides(guides, answers.guides);
    windows = [...windows, ...answers.windows];
    assertContextSize(guides, windows);
    fulfilled.describe += answers.describe;
    fulfilled.read += answers.read;
    // Results accumulate across the rounds of a phase. A backend that keeps no
    // state per turn — which the shipped example deliberately does not — would
    // otherwise be told the guide it asked for on one round and not on the
    // next, and go on asking for what it has already been given.
    toolResults = mergeToolResults(toolResults, answers.results);
  }

  // Out of rounds. Whatever the backend last proposed was never finalized, so
  // nothing from this phase runs — but the turn still reports truthfully, and
  // any receipts an earlier phase earned are the caller's to keep.
  phase.settle("failed");
  return {
    last,
    context,
    phase,
    plan: [],
    text,
    fulfilled,
    unresolved: {
      code: "discovery-exhausted",
      message: `the backend asked for discovery more than ${String(MAX_NEED_ROUNDS)} times without settling on a plan`,
      pending: phase.pending().map((call) => call.name),
    },
  };
}

/**
 * Send one user message, answer describe/read needs, then execute actions
 * through the live session. Failed mutations are not retried.
 *
 * @public
 */
export async function runAgentHttpTurn(
  session: AgentSession,
  message: string,
  options: AgentHttpClientOptions,
  extras: {
    conversation?: readonly AgentHttpMessage[];
    returnResults?: boolean;
    signal?: AbortSignal;
    /** A recording sent in place of typed text, once, on the first round. */
    audio?: AgentHttpAudio;
    /** Told what the backend heard, as soon as a reply names it. */
    onTranscript?: (text: string) => void;
  } = {}
): Promise<AgentHttpTurnResult> {
  const trimmed = message.trim();
  if (!trimmed && !extras.audio) {
    throw new Error("agent HTTP turn requires a message or audio");
  }

  const turnId = newHttpTurnId();
  const turn = phaseContext(session, turnId, 0);
  const voice: VoiceCarry | undefined = extras.audio
    ? { audio: extras.audio, onTranscript: extras.onTranscript }
    : undefined;
  const result = await runTurnPhases(
    session,
    options,
    extras,
    trimmed,
    turn,
    voice
  );
  return voice?.transcript === undefined
    ? result
    : { ...result, transcript: voice.transcript };
}

async function runTurnPhases(
  session: AgentSession,
  options: AgentHttpClientOptions,
  extras: {
    conversation?: readonly AgentHttpMessage[];
    returnResults?: boolean;
    signal?: AbortSignal;
  },
  trimmed: string,
  turn: HttpPhaseContext,
  voice?: VoiceCarry
): Promise<AgentHttpTurnResult> {
  const execution = createTurnExecution(session, turn);
  const results: ExecuteResult[] = [];
  const keys: string[] = [];
  const subjects: (AssistantReceiptSubject | undefined)[] = [];
  const fulfilled = { describe: 0, read: 0 };
  let text = "";
  let unresolved: AgentHttpUnresolved | undefined;
  let toolResults: readonly AgentHttpToolResult[] | undefined;
  let phaseId = 0;
  let repairs = 0;
  let lastPlan: string | undefined;
  let hidden: HiddenReceipts | undefined;

  // Each pass is one dependent phase: ask until the backend settles, run what
  // it settled on, and only continue when it asked for the receipts.
  for (;;) {
    const pass = await runPhase(session, options, turn, {
      message: trimmed,
      conversation: extras.conversation,
      signal: extras.signal,
      phaseId,
      toolResults,
      voice,
    });
    if (!pass.last) throw new Error("agent HTTP returned no response");
    assertTurnContext(session, turn);
    text = pass.text || text;
    fulfilled.describe += pass.fulfilled.describe;
    fulfilled.read += pass.fulfilled.read;

    // A phase that asks for exactly what the phase before it already ran has
    // nothing to add, and running it would apply that work a second time. The
    // turn keeps what it has and says why it stopped, rather than repeating
    // the work or waiting for a backend to notice.
    const signature = planSignature(pass.plan);
    const same = samePlanAfter(signature, lastPlan, hidden, repairs);
    if (same === "retry") {
      repairs += 1;
      phaseId += 1;
      continue;
    }
    if (same === "show" && hidden) {
      results.push(...hidden.results);
      keys.push(...hidden.keys);
      subjects.push(...hidden.subjects);
      break;
    }
    if (same === "repeat") {
      unresolved = {
        code: "repeated-plan",
        message: "the backend asked for the same calls it had just run",
        pending: pass.plan.map((call) => call.key),
      };
      break;
    }
    lastPlan = signature;

    const ran = await runPhasePlan(execution, pass, extras.signal);
    const step = advanceTurn({
      allowed: extras.returnResults === true,
      asked: pass.last.continueWithResults === true,
      halted: pass.unresolved,
      ran,
      plan: pass.plan,
      phaseId,
      repairsLeft: MAX_REPAIRS - repairs,
    });
    const recorded = receiptsForPhase(
      ran,
      pass.plan,
      step.repaired,
      session.manifest().columns
    );
    results.push(...recorded.shown.results);
    keys.push(...recorded.shown.keys);
    subjects.push(...recorded.shown.subjects);
    hidden = recorded.hidden;
    unresolved = step.unresolved ?? unresolved;
    if (step.stop) break;
    repairs += step.repaired ? 1 : 0;
    phaseId = step.phaseId;
    toolResults = step.toolResults;
  }

  return {
    text,
    results,
    keys,
    subjects,
    needsFulfilled: fulfilled,
    ...(unresolved ? { unresolved } : {}),
  };
}
