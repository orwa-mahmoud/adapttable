/**
 * AG-UI protocol pieces: state patches, tool names, argument parsing,
 * approvals and questions as interrupts.
 */
import type { ApprovalPresentation } from "@adapttable/core";
import { isRecord } from "@adapttable/core/binding";

import {
  type AgUiEvent,
  type AgUiInterrupt,
  type AgUiMessage,
  type AgUiResume,
  type AgUiTool,
  type JsonPatchOperation,
} from "./aguiTypes";
import type {
  AssistantQuestion,
  AssistantUnresolved,
} from "./assistantContracts";
import type { AssistantReceiptSubject } from "./assistantReceipts";
import { errorMessage } from "./errorMessage";
import { type TurnRevision } from "./turnRevision";
import type {
  AgentSession,
  ApprovalResult,
  ApprovalSubject,
  ExecuteResult,
  WriteProposal,
} from "./types";

/** A run that did not behave like AG-UI. @public */
export class AgUiProtocolError extends Error {
  /** Stable machine code. */
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AgUiProtocolError";
    this.code = code;
  }
}

/** Resumes one turn may take before the adapter calls it a loop. */
export const DEFAULT_MAX_RUNS = 8;

/** JSON Pointer escaping, per RFC 6901. */
function pointerSegment(key: string): string {
  return key.replaceAll("~", "~0").replaceAll("/", "~1");
}

/**
 * An RFC 6902 patch between two state documents.
 *
 * Objects recurse so a single changed filter is one `replace` rather than a
 * whole new filter map; arrays and scalars are replaced whole, because a
 * positional array diff is a guess about intent that nothing here can check.
 */
export function statePatch(
  previous: unknown,
  next: unknown,
  base = ""
): readonly JsonPatchOperation[] {
  if (!isRecord(previous) || !isRecord(next)) {
    if (sameValue(previous, next)) return [];
    return [{ op: "replace", path: base, value: next }];
  }
  const operations: JsonPatchOperation[] = [];
  for (const key of Object.keys(previous)) {
    const path = `${base}/${pointerSegment(key)}`;
    if (!(key in next) || next[key] === undefined) {
      operations.push({ op: "remove", path });
      continue;
    }
    operations.push(...statePatch(previous[key], next[key], path));
  }
  for (const key of Object.keys(next)) {
    if (key in previous && previous[key] !== undefined) continue;
    if (next[key] === undefined) continue;
    operations.push({
      op: "add",
      path: `${base}/${pointerSegment(key)}`,
      value: next[key],
    });
  }
  return operations;
}

/** Structural equality, good enough for a state document made of JSON. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The tool name this table publishes for a capability. @public */
export function aguiToolName(tableId: string, key: string): string {
  return `adapttable.${tableId}.${key}`;
}

/** The capability a tool name refers to, or nothing when it is not ours. */
export function capabilityOf(
  tableId: string,
  name: string
): string | undefined {
  const prefix = `adapttable.${tableId}.`;
  if (!name.startsWith(prefix)) return undefined;
  const key = name.slice(prefix.length);
  // The bare prefix names no capability. Executing "" would be a refusal
  // reported as though this table had tried to do something.
  return key === "" ? undefined : key;
}

/**
 * The enabled contract as this run's frontend tools.
 *
 * @param session - The live session. Only permitted keys reach the list.
 * @returns One tool per enabled capability, in catalog order.
 *
 * @public
 */
export function aguiTools(session: AgentSession): readonly AgUiTool[] {
  const tableId = session.manifest().tableId;
  return session.catalog().map((entry) => ({
    name: aguiToolName(tableId, entry.key),
    description: entry.summaryShort ?? entry.summary,
    parameters: session.describe(entry.key).input,
  }));
}

/** The replay identity for one AG-UI tool call. */
export function callKey(
  threadId: string,
  runId: string,
  toolCallId: string
): string {
  return `agui:${JSON.stringify({ threadId, runId, toolCallId })}`;
}

/**
 * One field an event must carry, or the event is not the event it claims.
 *
 * Written once because every case needs it and each was spelling out the same
 * three lines — which is how a check ends up missing from one of them.
 */
/**
 * The refusal a RUN_ERROR stands for.
 *
 * Both fields are optional on the wire, and a run that fails without saying
 * why is still a run that failed: the turn gets a code it can act on either
 * way rather than an empty message.
 */
export function runFailure(event: AgUiEvent): AgUiProtocolError {
  return new AgUiProtocolError(
    typeof event.code === "string" ? event.code : "run-error",
    typeof event.message === "string"
      ? event.message
      : "the run failed without saying why"
  );
}

/** The name a call was started with, or a refusal naming the call. */
export function assertStarted(
  names: ReadonlyMap<string, string>,
  id: string,
  event: string
): string {
  const name = names.get(id);
  if (name === undefined) {
    throw new AgUiProtocolError(
      "unknown-tool-call",
      `${event} arrived for "${id}" before its TOOL_CALL_START`
    );
  }
  return name;
}

export function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new AgUiProtocolError("malformed-event", message);
  }
  return value;
}

/** Arguments as the backend sent them, or a refusal the session can name. */
export function parseArgs(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === "") return {};
  try {
    return JSON.parse(trimmed);
  } catch (cause) {
    throw new AgUiProtocolError(
      "malformed-tool-args",
      `tool call arguments were not JSON: ${errorMessage(cause)}`
    );
  }
}

/**
 * The rows an interrupt enumerated, kept only where they are addressable.
 *
 * A proposal without a `rowKey` is not a row anyone can decide about, and
 * passing it on as one would put a control in front of the reader that
 * settles nothing.
 */
function proposalsOf(payload: unknown): readonly WriteProposal[] | undefined {
  if (!isRecord(payload)) return undefined;
  const proposals = payload.proposals;
  if (!Array.isArray(proposals)) return undefined;
  const rows = proposals.flatMap((entry): WriteProposal[] => {
    if (!isRecord(entry) || typeof entry.rowKey !== "string") return [];
    return [
      {
        rowKey: entry.rowKey,
        ...(typeof entry.column === "string" ? { column: entry.column } : {}),
        ...("before" in entry ? { before: entry.before } : {}),
        ...("after" in entry ? { after: entry.after } : {}),
      },
    ];
  });
  return rows.length > 0 ? rows : undefined;
}

/**
 * What the reader is being asked to confirm.
 *
 * The two shapes are the session's own: a write that enumerates rows is
 * `rows`, and one the backend performs whole is `operation`. Deciding which
 * from the payload rather than from the reason means an approver never has to
 * guess from a runtime type what it was handed.
 */
export function approvalSubject(
  interrupt: AgUiInterrupt,
  presentation: ApprovalPresentation
): ApprovalSubject {
  const payload = isRecord(interrupt.payload) ? interrupt.payload : {};
  const proposals = proposalsOf(payload);
  if (proposals) {
    return {
      kind: "rows",
      proposals,
      perItem: payload.perItem === true,
      presentation,
    };
  }
  const capability =
    typeof payload.capability === "string" ? payload.capability : "";
  if (capability === "") {
    throw new AgUiProtocolError(
      "malformed-interrupt",
      "a confirmation interrupt needs proposals or a capability to confirm"
    );
  }
  return {
    kind: "operation",
    capability,
    ...(typeof payload.title === "string" ? { title: payload.title } : {}),
    arguments: payload.arguments,
    presentation,
  };
}

/** The question an `input_required` interrupt is asking. */
export function questionOf(interrupt: AgUiInterrupt): AssistantQuestion {
  const payload = isRecord(interrupt.payload) ? interrupt.payload : {};
  const question =
    typeof payload.question === "string" ? payload.question : undefined;
  if (!question) {
    throw new AgUiProtocolError(
      "malformed-interrupt",
      "an input_required interrupt needs a question"
    );
  }
  const options = Array.isArray(payload.options)
    ? payload.options.filter(isRecord).flatMap((option) => {
        const id = option.id;
        const label = option.label;
        if (typeof id !== "string" || typeof label !== "string") return [];
        return [{ id, label }];
      })
    : undefined;
  return {
    id: interrupt.interruptId,
    question,
    ...(options && options.length > 0 ? { options } : {}),
    // Free text unless the backend offered a closed set and said otherwise.
    allowFreeText:
      payload.allowFreeText === undefined
        ? !options || options.length === 0
        : payload.allowFreeText === true,
  };
}

/** What the reader decided, in the shape `resume` carries. */
export function resumeFromApproval(
  interruptId: string,
  result: ApprovalResult,
  total: number
): AgUiResume {
  if (result === true) return { interruptId, status: "approved" };
  if (result === false) return { interruptId, status: "rejected" };
  const approved = result.approved;
  const reason = result.reason;
  const payload = {
    approved,
    ...(reason === undefined ? {} : { reason }),
  };
  if (approved.length === 0) {
    return { interruptId, status: "rejected", payload };
  }
  // Everything the reader was shown, approved: the backend is told the whole
  // write stands rather than being handed a position list it must re-derive.
  if (total > 0 && approved.length >= total) {
    return { interruptId, status: "approved", payload };
  }
  return { interruptId, status: "partial", payload };
}

export function unresolvedTurn(
  code: string,
  message: string,
  pending: readonly string[]
): AssistantUnresolved {
  return { code, message, pending: [...pending] };
}

/**
 * The capability an interrupt was about, when it named one.
 *
 * What `unresolved.pending` is for: a turn that stopped at a confirmation
 * should be able to say which write never ran, rather than reporting an empty
 * list beside a message about work nobody can identify.
 */
export function interruptCapability(
  interrupt: AgUiInterrupt
): readonly string[] {
  if (!isRecord(interrupt.payload)) return [];
  const capability = interrupt.payload.capability;
  return typeof capability === "string" && capability !== ""
    ? [capability]
    : [];
}

/** What one run of the loop produced. */
export interface RunOutcome {
  readonly text: string;
  readonly interrupt?: AgUiInterrupt;
}

/** Per-turn state the run loop accumulates across resumes. */
export interface TurnState {
  readonly messages: AgUiMessage[];
  readonly results: ExecuteResult[];
  readonly keys: string[];
  readonly subjects: (AssistantReceiptSubject | undefined)[];
  /** What this turn's own calls have proven the table reached. */
  readonly bound: TurnRevision;
  /** The revision of the state the current run was started with. */
  text: string;
  sequence: number;
}
