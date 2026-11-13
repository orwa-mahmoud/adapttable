/**
 * Answering what a turn asks: the backend's describe and read needs, and the
 * reader's questions, whose answers carry their own question and option label.
 */
import { discover } from "./discovery";
import { type DiscoveryCache } from "./discoveryCache";
import { discoverySource } from "./httpConnection";
import { type HttpPhaseContext } from "./httpExecution";
import { assertTurnContext } from "./httpParse";
import { asDescribeRequest, asReadQuery } from "./httpResponseParts";
import { DESCRIBE_TOOL } from "./httpTurn";
import type {
  AgentHttpAnswer,
  AgentHttpQuestion,
  AgentHttpToolCall,
  AgentHttpToolResult,
} from "./httpTypes";
import { type AgentHttpClientOptions } from "./httpWire";
import type {
  AgentSession,
  CapabilityGuide,
  RowProvenanceEnvelope,
  RowWindow,
} from "./types";

export function newHttpTurnId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * A read's replay identity.
 *
 * The revision is in it because a read is only current for the view it read;
 * the query is not, because a replay key travels and a query names columns and
 * bounds. Turn, phase and position already make it unique.
 */
function readIdempotencyKey(
  turnId: string,
  phaseId: number,
  revision: number,
  index: number
): string {
  return `http-read:${JSON.stringify({ turnId, phaseId, revision, index })}`;
}

export function mergeGuides(
  current: readonly CapabilityGuide[] | undefined,
  incoming: readonly CapabilityGuide[]
): CapabilityGuide[] {
  const next = [...(current ?? [])];
  const indexByKey = new Map(next.map((guide, index) => [guide.key, index]));
  for (const guide of incoming) {
    const existing = indexByKey.get(guide.key);
    if (existing === undefined) {
      indexByKey.set(guide.key, next.length);
      next.push(guide);
    } else {
      next[existing] = guide;
    }
  }
  return next;
}

/**
 * Run the asking tools and answer each one under its own call id.
 *
 * A failure answers that one call rather than ending the turn: a backend
 * guessing a capability key this table does not offer, or asking for a window
 * a policy now refuses, has made an ordinary mistake. Telling it so and
 * carrying on is what a conversation does; throwing ended the whole turn over
 * one bad name, with nothing run and nothing explained.
 */
export async function answerQuestions(
  session: AgentSession,
  questions: readonly AgentHttpToolCall[],
  turn: HttpPhaseContext,
  connectionId: string,
  contractVersion: string,
  cache: DiscoveryCache | undefined
): Promise<{
  readonly results: readonly AgentHttpToolResult[];
  readonly guides: readonly CapabilityGuide[];
  readonly windows: readonly RowWindow[];
  readonly describe: number;
  readonly read: number;
}> {
  assertTurnContext(session, turn);
  const results: AgentHttpToolResult[] = [];
  const guides: CapabilityGuide[] = [];
  const windows: RowWindow[] = [];
  let describe = 0;
  let read = 0;

  for (const [index, call] of questions.entries()) {
    // Re-checked after every awaited answer: a policy change between two row
    // windows ends the turn rather than answering the rest of it under terms
    // the backend never saw.
    assertTurnContext(session, turn);

    if (call.name === DESCRIBE_TOOL) {
      // Counted by what was ASKED, not by what came back: a round that
      // produced only unknown names still used a round.
      const request = asDescribeRequest(call.args);
      describe += request.keys?.length ?? 0;
      const answered = discover(request, discoverySource(session));
      guides.push(...answered.guides);
      // Remembered against the contract these answers describe, so a later
      // turn under the same contract need not spend a round on them again.
      cache?.remember(connectionId, contractVersion, answered.guides);
      results.push({
        id: call.id,
        result: {
          guides: answered.guides,
          unavailable: answered.unavailable,
          ...(answered.deferred.length > 0
            ? { deferred: answered.deferred }
            : {}),
        },
      });
      continue;
    }

    // A read is bound to the view it reads, not to the phase that asked for
    // it, so the revision travels in its replay key while the arguments do
    // not.
    const query = asReadQuery(call.args);
    const revision = session.manifest().viewRevision;
    const result = await session.execute(
      "rows.read",
      query,
      revision,
      readIdempotencyKey(turn.turnId, turn.phaseId, revision, index)
    );
    read += 1;
    if (!result.ok) {
      results.push({
        id: call.id,
        error: {
          code: result.error?.code ?? "read-failed",
          message: result.error?.message ?? "rows.read failed",
        },
      });
      continue;
    }
    // Already labelled by the session: `{ source, untrusted, revision, rows }`.
    // It travels to the backend as it is, and the window inside it is what
    // counts against the accumulated context budget.
    const envelope = result.result as RowProvenanceEnvelope;
    windows.push(envelope.rows);
    results.push({ id: call.id, result: envelope });
  }

  return { results, guides, windows, describe, read };
}

/**
 * Put a structured question to the reader.
 *
 * Without a channel the turn stops and says so rather than hanging or
 * inventing an answer, and whatever an earlier phase completed is still
 * reported.
 */
export async function askReader(
  options: AgentHttpClientOptions,
  question: AgentHttpQuestion,
  signal?: AbortSignal
): Promise<ReaderAnswer> {
  if (!options.askUser) return { kind: "no-channel" };
  const answer = await options.askUser(question, signal);
  // Undefined is the reader declining, or a turn that was abandoned while the
  // question was on screen. Both are "nobody answered", and neither is a
  // value to proceed on.
  if (!answer) return { kind: "declined" };
  return {
    kind: "answered",
    result: { id: question.id, result: answeredQuestion(question, answer) },
  };
}

/**
 * What the reader answered, said in full.
 *
 * A correlation id and an option id are enough for a backend that kept the
 * question it asked, and nothing at all for one that did not: `{"optionId":
 * "d"}` against `q1` is a letter answering a question the next request never
 * carries. The wire is stateless by design — every request describes the whole
 * situation — so the answer describes itself too: the question as it was put,
 * and the choice in the words the reader actually saw.
 */
function answeredQuestion(
  question: AgentHttpQuestion,
  answer: AgentHttpAnswer
): Record<string, unknown> {
  const chosen = question.options?.find(
    (option) => option.id === answer.optionId
  );
  return {
    question: question.question,
    // What was on offer, sent back with the answer. The reader may ignore a
    // list and say something else — they always can — and a backend that
    // kept nothing needs the choices in front of it to tell whether "the
    // last one" is one of them or a new request.
    ...(question.options?.length
      ? {
          offered: question.options.map((option) => ({
            id: option.id,
            label: option.label,
          })),
        }
      : {}),
    // The label is what was on screen; the id is what a backend correlating
    // against its own options matches on. Neither stands in for the other.
    ...(answer.optionId === undefined
      ? {}
      : {
          optionId: answer.optionId,
          ...(chosen ? { chose: chosen.label } : {}),
        }),
    ...(answer.text === undefined ? {} : { text: answer.text }),
  };
}

/** What came back when the backend asked the reader something. */
type ReaderAnswer =
  | { readonly kind: "answered"; readonly result: AgentHttpToolResult }
  | { readonly kind: "no-channel" }
  | { readonly kind: "declined" };
