/**
 * The assistant panel's presentation rules, without a framework.
 *
 * Every binding's panel draws the same conversation, and every one of them
 * has to decide the same things the same way: what the badge's tone is, what
 * the launcher is called while a write waits, which question the composer is
 * answering, what a receipt's headline says, how far the work has got. Those
 * are decisions rather than markup, so they live here once and each binding
 * draws what they return with its own components.
 */
import { ASSISTANT_LABELS } from "../labelGroups/assistantLabels";
import type { TableLabels } from "../types";
import {
  assistantIsBusy,
  type TableAssistantMessageView,
  type TableAssistantProgressView,
  type TableAssistantQuestionView,
  type TableAssistantReceiptView,
  type TableAssistantView,
} from "./assistantView";

/** The status badge's tone. @public */
export type TableAssistantBadgeTone = "neutral" | "busy" | "warning" | "danger";

/**
 * The tone the status badge takes for a connection or turn status.
 *
 * @public
 */
export function assistantBadgeTone(status: string): TableAssistantBadgeTone {
  if (status === "sending" || status === "connecting") return "busy";
  if (status === "awaiting-approval") return "warning";
  if (status === "error" || status === "disconnected") return "danger";
  return "neutral";
}

/**
 * What the launcher is called, and whether it says a write is parked.
 *
 * The dot beside it is decoration; this is the part a screen reader gets, so
 * the waiting write has to be in the name rather than only in the glyph.
 *
 * @public
 */
export function assistantLauncherName(
  labels: TableLabels | undefined,
  waiting: boolean
): string {
  const open = labels?.assistantOpen ?? ASSISTANT_LABELS.assistantOpen;
  if (!waiting) return open;
  const note =
    labels?.approvalWaitingElsewhere ??
    ASSISTANT_LABELS.approvalWaitingElsewhere;
  return `${open} — ${note}`;
}

/**
 * The question the conversation is waiting on, if any.
 *
 * Read off the conversation rather than from a field beside it: the question
 * belongs to the message that asked it, and a second copy is a second thing to
 * keep in step.
 *
 * @public
 */
export function assistantQuestion(
  messages: readonly TableAssistantMessageView[]
): TableAssistantQuestionView | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const question = messages[i]?.question;
    if (question) return question;
  }
  return undefined;
}

/**
 * Whether to offer a way back to work a released connection left running.
 *
 * Offered whenever there is some and no turn is in flight, which covers a
 * connection released a moment ago and a handle a host kept across a reload.
 * A turn the reader stopped leaves nothing to rejoin, so the control's absence
 * is itself the difference between the two.
 *
 * @public
 */
export function assistantRejoinable(assistant: TableAssistantView): boolean {
  if (assistant.resumable === undefined) return false;
  if (assistant.resume === undefined) return false;
  return !(assistant.busy ?? assistantIsBusy(assistant.status));
}

/** What the composer does right now. @public */
export interface TableAssistantComposerState {
  /** Send the draft, or answer the question with it. */
  readonly send: () => void;
  /** Undefined leaves the composer to read the status itself. */
  readonly busy: boolean | undefined;
  /** Whether the draft answers a question rather than starting a turn. */
  readonly answering: boolean;
}

/**
 * What the one box at the bottom does right now.
 *
 * A turn parked on a question is waiting on the reader, not working — so the
 * box answers it, and reports itself idle. Reported busy it drew Stop where
 * Send belongs and swallowed the Enter that would have answered. With no
 * question on screen, or nothing to answer it with, the composer goes back to
 * being the composer.
 *
 * @public
 */
export function assistantComposerState(
  assistant: TableAssistantView
): TableAssistantComposerState {
  const question = assistantQuestion(assistant.messages);
  const answer = assistant.answer;
  if (question && answer) {
    return {
      send: () => {
        const said = assistant.draft.trim();
        if (!said) return;
        assistant.setDraft("");
        answer({ text: said });
      },
      busy: false,
      answering: true,
    };
  }
  return {
    send: () => void assistant.send(),
    busy: assistant.busy,
    answering: false,
  };
}

/**
 * The conversation, opening line included.
 *
 * The greeting is a message like any other, so it goes through the same
 * renderer and stays where it was said. An empty string is a host asking for
 * silence; omitted leaves the built-in question.
 *
 * @public
 */
export function assistantWithGreeting(
  messages: readonly TableAssistantMessageView[],
  greeting: string | undefined,
  labels: TableLabels | undefined
): readonly TableAssistantMessageView[] {
  const said =
    greeting ?? labels?.assistantEmpty ?? ASSISTANT_LABELS.assistantEmpty;
  if (!said.trim()) return messages;
  return [
    { id: "assistant-greeting", role: "assistant", text: said },
    ...messages,
  ];
}

/**
 * The message as it reads while a voice clip is still being transcribed: the
 * clip's placeholder until its words arrive.
 *
 * @public
 */
export function assistantVoicePlaceholder(
  message: TableAssistantMessageView,
  labels: TableLabels | undefined
): TableAssistantMessageView {
  if (!message.transcribing || message.text) return message;
  return {
    ...message,
    text:
      labels?.assistantVoiceMessage ?? ASSISTANT_LABELS.assistantVoiceMessage,
  };
}

/**
 * A name, as the two letters every product falls back to.
 *
 * The first letter of each of the first two words. One word gives one letter;
 * a name of nothing gives none, and the built-in face stands instead.
 *
 * @public
 */
export function assistantInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * The receipts a turn shows.
 *
 * A receipt says what CHANGED. Reading rows, resolving one, asking what a
 * column means — none of that changed anything the reader can see, and the
 * refusals they carry are written for the caller that has to recover from
 * them. They stay in the conversation state for a host that reads them.
 *
 * @public
 */
export function assistantShownReceipts(
  receipts: readonly TableAssistantReceiptView[] | undefined
): readonly TableAssistantReceiptView[] {
  return (receipts ?? []).filter((receipt) => receipt.subject?.kind !== "read");
}

/**
 * The card's headline.
 *
 * `assistantReceiptAction` turns the pair (what changed, what became of it)
 * into one sentence in the reader's language — "Filter applied", "Edit
 * awaiting approval". Without a kind there is still an honest fallback: the
 * status alone, never the capability key.
 *
 * @public
 */
export function assistantReceiptHeadline(
  receipt: TableAssistantReceiptView,
  labels: TableLabels | undefined
): string {
  const subject = receipt.subject;
  const fromLabels = labels?.assistantReceiptAction?.({
    kind: subject?.kind,
    status: receipt.status,
    ...(subject?.cleared === undefined ? {} : { cleared: subject.cleared }),
  });
  if (fromLabels) return fromLabels;
  return labels?.assistantReceiptStatus?.(receipt.status) ?? receipt.status;
}

/**
 * What the action acted on, as one line.
 *
 * A host's own `detail` wins: it was written by whoever knows the wording of
 * the surface it is shown on. Otherwise the labels join the terms, which is
 * where the reader's language lives.
 *
 * @public
 */
export function assistantReceiptDetail(
  receipt: TableAssistantReceiptView,
  labels: TableLabels | undefined
): string | undefined {
  const subject = receipt.subject;
  if (!subject) return undefined;
  if (subject.detail) return subject.detail;
  return labels?.assistantReceiptTerms?.({
    kind: subject.kind,
    terms: subject.terms,
    ...(subject.direction ? { direction: subject.direction } : {}),
  });
}

/**
 * Where an edit landed — row and column, joined — or nothing.
 *
 * @public
 */
export function assistantReceiptWhere(
  receipt: TableAssistantReceiptView
): string {
  const subject = receipt.subject;
  return [subject?.row, subject?.column].filter(Boolean).join(" · ");
}

/**
 * Whether the receipt is a staged write the reader still has to save.
 *
 * A staged write is not finished, and the panel has to say so.
 *
 * @public
 */
export function assistantReceiptNeedsSave(
  receipt: TableAssistantReceiptView
): boolean {
  return receipt.status === "staged";
}

/**
 * Why a turn can no longer be put back, in the reader's words.
 *
 * @public
 */
export function assistantUndoReason(
  blockedCode: string | undefined,
  labels: TableLabels | undefined
): string {
  return (
    (labels?.assistantUndoBlocked ?? ASSISTANT_LABELS.assistantUndoBlocked)(
      blockedCode ?? "table-moved"
    ) ??
    ASSISTANT_LABELS.assistantUndoBlocked("table-moved") ??
    ""
  );
}

/**
 * What the control heading a turn's receipts is called.
 *
 * "Undo all" only when there is more than one row that can be put back on its
 * own to be all of; otherwise the heading's control is simply the undo.
 *
 * @param undoableRows - How many receipts can be put back on their own.
 *
 * @public
 */
export function assistantUndoTurnLabel(
  undoableRows: number,
  labels: TableLabels | undefined
): string {
  return undoableRows > 1
    ? (labels?.assistantUndoAll ?? ASSISTANT_LABELS.assistantUndoAll)
    : (labels?.assistantUndo ?? ASSISTANT_LABELS.assistantUndo);
}

/**
 * How many actions a turn took, as the disclosure's name.
 *
 * @public
 */
export function assistantActionsName(
  count: number,
  labels: TableLabels | undefined
): string {
  return (labels?.assistantActions ?? ASSISTANT_LABELS.assistantActions)(count);
}

/**
 * How far the work has got, as one phrase.
 *
 * The labels word it, because "185 of 400" is not the same sentence in every
 * language. Without a label pack there is still an honest English fallback:
 * counted against a known total, or counted alone when nobody knows how many
 * there are.
 *
 * @public
 */
export function assistantProgressText(
  progress: TableAssistantProgressView,
  labels: TableLabels | undefined
): string {
  const said = labels?.assistantProgress?.(progress.done, progress.total);
  if (said !== undefined) return said;
  if (progress.total === undefined) return `${String(progress.done)} done`;
  return `${String(progress.done)} of ${String(progress.total)}`;
}

/**
 * What the working indicator says.
 *
 * What is happening beats that something is: a count a reader can judge
 * against, rather than a spinner they cannot. The capability's own noun leads
 * it and is shown as given — there is no translation for a host's words.
 * Nothing reporting leaves the plain "working" it always said.
 *
 * @public
 */
export function assistantWorkingText(
  progress: TableAssistantProgressView | null | undefined,
  labels: TableLabels | undefined
): string {
  if (!progress) {
    return (
      labels?.assistantConnection ?? ASSISTANT_LABELS.assistantConnection
    )("sending");
  }
  const count = assistantProgressText(progress, labels);
  return progress.label ? `${progress.label} — ${count}` : count;
}
