/**
 * The strings the assistant and its proposals draw.
 */
import type { TableLabels } from "../types";
import type { FeatureStrings } from "./tableLabels";

/** Connection tokens the assistant badge shows, in English. */
const ASSISTANT_CONNECTION: Readonly<Record<string, string>> = {
  idle: "Idle",
  connecting: "Connecting…",
  ready: "Ready",
  sending: "Working…",
  "awaiting-approval": "Waiting for you",
  "awaiting-user": "Waiting for you",
  error: "Error",
  disconnected: "Not connected",
};

/** What became of one action, in English. */
/**
 * What a receipt's headline says, per (kind, status).
 *
 * Written out rather than composed from two halves because English is the
 * only language where "filter" + "applied" reliably reads as a sentence, and
 * a translator needs the whole phrase to work with.
 */
const ASSISTANT_RECEIPT_ACTION: Readonly<Record<string, string>> = {
  "filter/executed": "Filter applied",
  "filter/staged": "Filter staged",
  "filter-cleared/executed": "Filters cleared",
  "sort/executed": "Sorted",
  "sort-cleared/executed": "Sort cleared",
  "search/executed": "Searched",
  "search-cleared/executed": "Search cleared",
  "group/executed": "Grouped",
  "group-cleared/executed": "Grouping cleared",
  "pin/executed": "Column pinned",
  "pin-cleared/executed": "Column unpinned",
  "hide/executed": "Column hidden",
  "hide-cleared/executed": "Column shown",
  "order/executed": "Columns reordered",
  "pinRow/executed": "Row pinned",
  "pinRow-cleared/executed": "Row unpinned",
  "page/executed": "Page changed",
  "aggregate/executed": "Totals changed",
  "select/executed": "Selection changed",
  "read/executed": "Read the table",
  "operation/executed": "Ran",
  "operation/awaiting-approval": "Waiting for you",
  "operation/rejected": "Refused",
  "export/executed": "Exported",
  "edit/executed": "Saved",
  "edit/staged": "Edit staged — not saved",
  "edit/awaiting-approval": "Edit awaiting approval",
  "edit/partial": "Some edits saved, some refused",
  "edit/rejected": "Edit refused",
  "add/executed": "Row added",
  "add/awaiting-approval": "New row awaiting approval",
  "add/rejected": "New row refused",
  "delete/executed": "Rows deleted",
  "delete/awaiting-approval": "Deletion awaiting approval",
  "delete/partial": "Some rows deleted, some kept",
  "delete/rejected": "Deletion refused",
  "reorder/executed": "Rows moved",
};

/**
 * One column-and-value pair, in English.
 *
 * An edit put a value IN a column and a filter narrows BY one, so the two
 * read differently even though the pair is the same shape.
 */
function receiptTerm(
  kind: string | undefined,
  term: { column?: string; value?: string }
): string | undefined {
  if (!term.column) return term.value;
  if (!term.value) return term.column;
  return kind === "edit"
    ? `${term.column} set to ${term.value}`
    : `${term.column} is ${term.value}`;
}

/**
 * Why a turn stopped with work still pending, in English.
 *
 * The message the runtime carries beside these codes is written for whoever
 * is debugging the turn — "the backend asked to continue more than 3 times"
 * tells a reader nothing they can act on, and names machinery they never
 * asked about.
 */
const ASSISTANT_UNRESOLVED: Readonly<Record<string, string>> = {
  "continuation-exhausted":
    "That took more steps than one turn allows. Ask for part of it.",
  "continuation-limit":
    "That took more steps than one turn allows. Ask for part of it.",
  "resume-limit":
    "That took more steps than one turn allows. Ask for part of it.",
  "discovery-exhausted":
    "The assistant could not work out how to do that here.",
  "repeated-plan": "The assistant asked for the same thing twice and stopped.",
  "question-unanswered": "That needs an answer from you before it can finish.",
  "approval-unavailable": "That needs approval, and there is nowhere to ask.",
  "interrupt-unsupported":
    "The assistant asked for something this table cannot do.",
  "output-denied": "Part of that was not allowed to run.",
  "not-run": "That did not run.",
};

/**
 * Why an undo is not on offer, in English.
 *
 * Only the reasons a reader can act on. `nothing-to-undo` never reaches a
 * surface — a turn that changed nothing is offered no control at all.
 */
const ASSISTANT_UNDO_BLOCKED: Readonly<Record<string, string>> = {
  "table-moved": "The table has changed since this ran.",
  "cannot-restore": "Part of this cannot be put back.",
};

/**
 * A capability key as something a reader recognises, in English.
 *
 * Only the keys a reader is ever asked to confirm, which is the only place a
 * key is shown to one. Anything else falls back to the key itself, which is
 * a developer detail and honest about being one.
 */
const ASSISTANT_CAPABILITY: Readonly<Record<string, string>> = {
  "edit.cells": "editing cells",
  "rows.add": "adding rows",
  "rows.delete": "deleting rows",
  "rows.reorder": "reordering rows",
  "export.run": "exporting",
};

const ASSISTANT_RECEIPT: Readonly<Record<string, string>> = {
  executed: "done",
  staged: "staged",
  partial: "partly done",
  rejected: "rejected",
  "awaiting-approval": "waiting for you",
  cancelled: "cancelled",
  stale: "out of date",
  failed: "failed",
};

/**
 * The strings the assistant and its proposals draw.
 *
 * @public
 */
export const ASSISTANT_LABELS: Pick<
  Required<TableLabels>,
  | "proposalChange"
  | "proposalValueUnavailable"
  | "proposalSummary"
  | "reviewAllProposals"
  | "backToConversation"
  | "approveAllProposals"
  | "approveRemainingProposals"
  | "rejectAllProposals"
  | "rejectRemainingProposals"
  | "alwaysAllowProposal"
  | "proposalTally"
  | "approvalWaitingElsewhere"
  | "assistantTitle"
  | "assistantOpen"
  | "assistantClose"
  | "assistantSettings"
  | "assistantEmpty"
  | "assistantPlaceholder"
  | "assistantSend"
  | "assistantStop"
  | "assistantVoiceStart"
  | "assistantVoiceStop"
  | "assistantVoiceListening"
  | "assistantVoiceMessage"
  | "assistantVoiceLanguage"
  | "assistantYou"
  | "assistantSpeaker"
  | "assistantNewMessages"
  | "assistantUnavailable"
  | "assistantDetached"
  | "assistantRejoin"
  | "assistantProgress"
  | "assistantBackToTable"
  | "assistantDetail"
  | "assistantSaveInTable"
  | "assistantUndo"
  | "assistantUndoBlocked"
  | "assistantUnresolved"
  | "assistantAnswerLabel"
  | "assistantAnswerPlaceholder"
  | "assistantAnswerSend"
  | "assistantAlwaysAllowedTitle"
  | "assistantAlwaysAllowedRevoke"
  | "assistantCapabilityName"
  | "assistantConnection"
  | "assistantActions"
  | "assistantActionsTitle"
  | "assistantUndoAll"
  | "assistantExamples"
  | "assistantReceiptStatus"
  | "assistantReceiptAction"
  | "assistantReceiptTerms"
  | "assistantReceiptChange"
  | "assistantReceiptProposed"
> = {
  proposalChange: ({ row, column, before, after }) => {
    const field = column ? `${row} · ${column}` : row;
    if (before === undefined && after === undefined) return field;
    return `${field}: ${before ?? "—"} → ${after ?? "—"}`;
  },
  proposalValueUnavailable: "Unavailable",
  proposalSummary: ({ changes, rows }) => {
    const left =
      changes === 1
        ? "1 proposed change"
        : `${String(changes)} proposed changes`;
    if (rows <= 1) return left;
    return `${left} across ${String(rows)} rows`;
  },
  reviewAllProposals: (count) => `Review all ${String(count)} changes`,
  backToConversation: "Back to conversation",
  approveAllProposals: "Approve all",
  approveRemainingProposals: "Approve remaining",
  rejectAllProposals: "Reject all",
  rejectRemainingProposals: "Reject remaining",
  alwaysAllowProposal: "Always allow",
  proposalTally: ({ pending, approved, rejected }) =>
    `${String(approved)} approved · ${String(rejected)} rejected · ${String(pending)} left`,
  approvalWaitingElsewhere: "A change is waiting for your decision.",
  assistantTitle: "Table assistant",
  assistantOpen: "Ask AI",
  assistantClose: "Close",
  assistantSettings: "Assistant settings",
  assistantEmpty: "What would you like to do?",
  assistantPlaceholder: "Ask about this table…",
  assistantSend: "Send",
  assistantStop: "Stop",
  assistantVoiceStart: "Dictate",
  assistantVoiceStop: "Stop dictation",
  assistantVoiceListening: "Listening",
  assistantVoiceMessage: "Voice message",
  assistantVoiceLanguage: "Dictation language",
  assistantYou: "You",
  assistantSpeaker: "Assistant",
  assistantNewMessages: "New messages",
  assistantUnavailable: "The assistant is not connected.",
  assistantDetached: "The connection went. The work may still be running.",
  assistantRejoin: "Rejoin",
  assistantProgress: (done, total) =>
    total === undefined
      ? `${String(done)} done`
      : `${String(done)} of ${String(total)}`,
  assistantBackToTable: "Back to table",
  assistantDetail: "Details",
  assistantSaveInTable: "Save in the table to keep this change.",
  assistantUndo: "Undo",
  assistantUndoBlocked: (code) => ASSISTANT_UNDO_BLOCKED[code],
  assistantUnresolved: (code) => ASSISTANT_UNRESOLVED[code],
  assistantAnswerLabel: "Your answer",
  assistantAnswerPlaceholder: "Type an answer",
  assistantAnswerSend: "Answer",
  assistantAlwaysAllowedTitle: "Not asking about",
  assistantAlwaysAllowedRevoke: (capability) =>
    `Ask about ${ASSISTANT_CAPABILITY[capability] ?? capability} again`,
  assistantCapabilityName: (capability) => ASSISTANT_CAPABILITY[capability],
  assistantConnection: (status) => ASSISTANT_CONNECTION[status] ?? "Ready",
  assistantActions: (count) =>
    count === 1 ? "1 action" : `${String(count)} actions`,
  assistantActionsTitle: "What this turn changed",
  assistantUndoAll: "Undo all",
  assistantExamples: "Shortcuts",
  assistantReceiptStatus: (status) =>
    ASSISTANT_RECEIPT[status] ?? String(status),
  assistantReceiptAction: ({ kind, status, cleared }) => {
    if (!kind) return undefined;
    const scope = cleared ? `${kind}-cleared` : kind;
    return ASSISTANT_RECEIPT_ACTION[`${scope}/${status}`];
  },
  assistantReceiptTerms: ({ kind, terms, direction }) => {
    const parts = (terms ?? [])
      .map((term) => receiptTerm(kind, term))
      .filter((part): part is string => Boolean(part));
    if (parts.length === 0) return undefined;
    const joined = parts.join(", ");
    if (!direction) return joined;
    return `${joined}, ${direction === "desc" ? "descending" : "ascending"}`;
  },
  assistantReceiptChange: ({ before, after }) =>
    `Changed from ${before} to ${after}`,
  assistantReceiptProposed: ({ before, after }) =>
    `Proposed: ${before} to ${after}`,
};

/**
 * The strings an assistant chrome draws: the base strings and the assistant's own.
 *
 * @public
 */
export type AssistantStrings = FeatureStrings<
  readonly [typeof ASSISTANT_LABELS]
>;
