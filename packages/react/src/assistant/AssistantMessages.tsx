/**
 * The transcript: what was asked, what came back, and what it did.
 *
 * Roles are distinguished by alignment, a tinted ground and an identity mark
 * rather than by a speaker's name repeated above every paragraph — the name
 * is still there for assistive technology, where repetition costs nothing and
 * absence costs everything.
 *
 * A receipt is the one thing here that must never be taken from the model's
 * reply. Its status comes from what the session returned, and its subject
 * from the arguments that actually ran; anything the host did not supply is
 * left out rather than guessed.
 */
import type { TableLabels } from "@adapttable/core";
import { type ReactElement, useState } from "react";

import { AssistantIcon, SuggestionIcon, UndoIcon } from "./assistantIcons";
import type { TableAssistantSlots } from "./assistantSlots";
import type {
  TableAssistantMessageView,
  TableAssistantQuestionView,
  TableAssistantReceiptView,
  TableAssistantSuggestionView,
  TableAssistantUndoView,
} from "./assistantView";

/** A staged write is not finished, and the panel has to say so. */
const NEEDS_SAVE = "staged";

/** Which of the kit's tones a receipt's status deserves. */
function receiptTone(
  status: string
): "neutral" | "busy" | "warning" | "danger" {
  if (status === "awaiting-approval" || status === NEEDS_SAVE) return "warning";
  // Not everything the reader saw proposed actually ran, which is the whole
  // reason the card is worth looking at.
  if (status === "partial") return "warning";
  if (status === "rejected" || status === "failed" || status === "stale") {
    return "danger";
  }
  if (status === "cancelled") return "neutral";
  return "neutral";
}

/**
 * The card's headline.
 *
 * `assistantReceiptAction` turns the pair (what changed, what became of it)
 * into one sentence in the reader's language — "Filter applied", "Edit
 * awaiting approval". Without a kind there is still an honest fallback: the
 * status alone, never the capability key.
 */
function headline(
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
 */
function detailOf(
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

/** The before/after pair, only when the host supplied both. */
function ChangedValue({
  receipt,
  labels,
}: {
  readonly receipt: TableAssistantReceiptView;
  readonly labels: TableLabels | undefined;
}): ReactElement | null {
  const subject = receipt.subject;
  if (!subject?.before || !subject.after) return null;
  // Shown either way, because the reader wants to see what was asked for —
  // but only an applied edit is spoken as a change. Saying a refused or
  // still-pending one "changed" claims something the table never did, and a
  // reader who cannot see the strikethrough has only this sentence.
  const spoken =
    receipt.status === "executed"
      ? labels?.assistantReceiptChange
      : labels?.assistantReceiptProposed;
  return (
    <span
      data-adapttable-part="assistant-receipt-change"
      style={{ display: "flex", alignItems: "center", gap: "0.4em" }}
    >
      <s data-adapttable-part="assistant-receipt-before">{subject.before}</s>
      <span aria-hidden="true">→</span>
      <strong data-adapttable-part="assistant-receipt-after">
        {subject.after}
      </strong>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
        }}
      >
        {spoken?.({ before: subject.before, after: subject.after }) ?? ""}
      </span>
    </span>
  );
}

function Receipt({
  receipt,
  labels,
  slots,
  onUndo,
}: {
  readonly receipt: TableAssistantReceiptView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  /** Put this one action back. Absent when only the whole turn can be. */
  readonly onUndo?: () => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const Button = slots.Button;
  const Badge = slots.Badge;
  const subject = receipt.subject;
  const detail = detailOf(receipt, labels);
  const where = [subject?.row, subject?.column].filter(Boolean).join(" · ");
  return (
    <li
      data-adapttable-part="assistant-receipt"
      data-status={receipt.status}
      data-kind={subject?.kind}
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "0.5em",
        flexWrap: "wrap",
        fontSize: "0.9em",
      }}
    >
      <span
        style={{ display: "flex", alignItems: "center", gap: "0.45em" }}
        data-adapttable-part="assistant-receipt-summary"
      >
        <span aria-hidden="true" style={{ display: "flex", opacity: 0.75 }}>
          <SuggestionIcon kind={subject?.kind} />
        </span>
        <strong style={{ fontWeight: 550 }}>{headline(receipt, labels)}</strong>
        {detail ? (
          <span
            data-adapttable-part="assistant-receipt-detail-text"
            style={{ opacity: 0.75 }}
          >
            {detail}
          </span>
        ) : null}
      </span>
      {where ? (
        <span data-adapttable-part="assistant-receipt-where">{where}</span>
      ) : null}
      <ChangedValue receipt={receipt} labels={labels} />
      {onUndo ? (
        // At the end of the row it belongs to, small and quiet: putting one
        // action back is worth offering, not worth competing with the action
        // it would put back.
        <span
          data-adapttable-part="assistant-receipt-undo"
          style={{ marginInlineStart: "auto", fontSize: "0.9em" }}
        >
          <Button
            label={labels?.assistantUndo ?? "Undo"}
            tooltip={labels?.assistantUndo ?? "Undo"}
            part="assistant-receipt-undo-button"
            variant="subtle"
            icon={<UndoIcon />}
            iconOnly
            onClick={onUndo}
          />
        </span>
      ) : null}
      {receipt.status === NEEDS_SAVE ? (
        <span data-adapttable-part="assistant-receipt-save">
          <Badge
            label={
              labels?.assistantSaveInTable ??
              "Save in the table to keep this change."
            }
            part="assistant-receipt-save-badge"
            tone={receiptTone(receipt.status)}
          />
        </span>
      ) : null}
      {receipt.message ? (
        <>
          <Button
            label={labels?.assistantDetail ?? "Details"}
            part="assistant-receipt-detail"
            variant="subtle"
            expanded={open}
            onClick={() => {
              setOpen((current) => !current);
            }}
          />
          {open ? (
            <span
              data-adapttable-part="assistant-receipt-message"
              style={{
                // The key names which capability failed and the message says
                // what went wrong. Run inline they read as one broken
                // sentence — "page 2 exceeds pageMax 1view.setPage".
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.3em",
                overflowWrap: "anywhere",
              }}
            >
              {receipt.message}
              {receipt.capabilityKey ? (
                <code data-adapttable-part="assistant-receipt-capability">
                  {receipt.capabilityKey}
                </code>
              ) : null}
            </span>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

/** One exchange. @internal */
export function AssistantMessage({
  message,
  labels,
  slots,
  action,
  undo,
  onUndo,
  onUndoAction,
  receipts = true,
}: {
  readonly message: TableAssistantMessageView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  /** An offer the host attached to this reply. */
  readonly action?: { readonly label: string; readonly onRun: () => void };
  /** Whether this turn can be put back, when the offer belongs to it. */
  readonly undo?: TableAssistantUndoView;
  readonly onUndo?: () => void;
  /** Put one action back, by its replay identity. */
  readonly onUndoAction?: (idempotencyKey: string) => void;
  /** Whether each action draws a card. The record is kept either way. */
  readonly receipts?: boolean;
}): ReactElement {
  // A receipt says what CHANGED. Reading rows, resolving one, asking what a
  // column means — none of that changed anything the reader can see, and the
  // refusals they carry are written for the caller that has to recover from
  // them: "read the rows to get their keys" is advice to a model, and a reader
  // shown it beside a turn that then worked is being told it failed when it
  // did not. They stay in the conversation state for a host that reads them.
  const shown = (message.receipts ?? []).filter(
    (receipt) => receipt.subject?.kind !== "read"
  );
  const perAction = onUndoAction ? { onUndoAction } : {};
  // One control per change. A card that carries its own Undo makes the
  // whole-turn one a second answer to the same question — and a reader
  // counting three controls under two actions cannot tell which does what.
  const perCard =
    onUndoAction !== undefined && shown.some((receipt) => receipt.undoable);
  const mine = message.role === "user";
  const speaker = mine
    ? (labels?.assistantYou ?? "You")
    : (labels?.assistantSpeaker ?? "Assistant");
  return (
    <li
      data-adapttable-part="assistant-message"
      data-role={message.role}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.35em",
        alignItems: mine ? "flex-end" : "flex-start",
      }}
    >
      {/* Named for assistive technology only: on screen the side, the ground
          and the mark already say who is speaking, and a label above every
          paragraph is what makes a transcript unreadable. */}
      <span
        data-adapttable-part="assistant-message-speaker"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        {speaker}
      </span>
      <Spoken message={message} mine={mine} />
      {action ? (
        <span data-adapttable-part="assistant-message-action">
          <slots.Button
            label={action.label}
            part="assistant-message-action-button"
            variant="secondary"
            onClick={action.onRun}
          />
        </span>
      ) : null}
      {undo && !perCard ? (
        <span data-adapttable-part="assistant-undo">
          <slots.Button
            label={labels?.assistantUndo ?? "Undo"}
            part="assistant-undo-button"
            variant="secondary"
            disabled={!undo.available}
            tooltip={
              undo.available
                ? undefined
                : (labels?.assistantUndoBlocked?.(undo.blockedCode ?? "") ??
                  "The table has changed since this ran.")
            }
            onClick={() => onUndo?.()}
          />
          {undo.available ? null : (
            <span
              data-adapttable-part="assistant-undo-reason"
              style={{ opacity: 0.8 }}
            >
              {labels?.assistantUndoBlocked?.(undo.blockedCode ?? "") ??
                "The table has changed since this ran."}
            </span>
          )}
        </span>
      ) : null}
      {receipts && shown.length > 0 ? (
        <Receipts
          receipts={shown}
          labels={labels}
          slots={slots}
          {...perAction}
        />
      ) : null}
    </li>
  );
}

/** The suggested prompts, as compact cards. @internal */
export function AssistantSuggestions({
  slots,
  labels,
  suggestions,
  more,
  onRun,
  part,
}: {
  readonly slots: TableAssistantSlots;
  readonly labels: TableLabels | undefined;
  readonly suggestions: readonly TableAssistantSuggestionView[];
  readonly more: readonly TableAssistantSuggestionView[];
  readonly onRun: (id: string) => void;
  readonly part: string;
}): ReactElement {
  const [showMore, setShowMore] = useState(false);
  const Button = slots.Button;
  const Suggestion = slots.Suggestion;
  const shown = [...suggestions, ...(showMore ? more : [])];
  return (
    <div
      data-adapttable-part={part}
      style={{ display: "flex", flexDirection: "column", gap: "0.4em" }}
    >
      {shown.map((suggestion) => (
        <Suggestion
          key={suggestion.id}
          title={suggestion.title}
          description={suggestion.description}
          icon={<SuggestionIcon kind={suggestion.kind} />}
          part="assistant-suggestion"
          onClick={() => {
            onRun(suggestion.id);
          }}
        />
      ))}
      {more.length > 0 && !showMore ? (
        <Button
          label={labels?.assistantMoreExamples ?? "More examples"}
          part="assistant-suggestions-more"
          variant="subtle"
          expanded={false}
          onClick={() => {
            setShowMore(true);
          }}
        />
      ) : null}
    </div>
  );
}

/** The empty state: a question, then what this table can actually do. @internal */
export function AssistantEmpty({
  labels,
  slots,
  suggestions,
  more,
  onRun,
  note,
}: {
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly suggestions: readonly TableAssistantSuggestionView[];
  readonly more: readonly TableAssistantSuggestionView[];
  readonly onRun: (id: string) => void;
  /** What this conversation is talking to, when the host wants it said. */
  readonly note?: string;
}): ReactElement {
  return (
    <div
      data-adapttable-part="assistant-empty"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.6em",
        paddingBlock: "0.75em",
      }}
    >
      <span
        aria-hidden="true"
        data-adapttable-part="assistant-empty-mark"
        style={{ fontSize: "1.75em", opacity: 0.55, display: "flex" }}
      >
        <AssistantIcon />
      </span>
      <h2
        data-adapttable-part="assistant-empty-prompt"
        style={{ margin: 0, fontSize: "1.05em", textWrap: "balance" }}
      >
        {labels?.assistantEmpty ?? "What would you like to do?"}
      </h2>
      {note ? (
        <p
          data-adapttable-part="assistant-empty-note"
          style={{ margin: 0, opacity: 0.8 }}
        >
          {note}
        </p>
      ) : null}
      {/* A kit with a menu keeps the examples in the composer, from the first
          frame — one place to look for them rather than cards here and a menu
          a message later. Without that slot they are cards, because a reader
          who does not know what to type needs to be shown something. */}
      {slots.Menu ? null : (
        <AssistantSuggestions
          slots={slots}
          labels={labels}
          suggestions={suggestions}
          more={more}
          onRun={onRun}
          part="assistant-suggestions"
        />
      )}
    </div>
  );
}

/**
 * What was said, and who said it.
 *
 * The reader's own words sit in a bubble on their side; the assistant's are
 * the reply, and carry the weight of one — they are the answer to what was
 * asked, not a caption over the cards beneath them.
 */
function Spoken({
  message,
  mine,
}: {
  readonly message: TableAssistantMessageView;
  readonly mine: boolean;
}): ReactElement {
  return (
    <span
      style={{
        display: "flex",
        gap: "0.5em",
        alignItems: "flex-start",
        maxWidth: "88%",
        flexDirection: mine ? "row-reverse" : "row",
      }}
    >
      {mine ? null : (
        <span
          aria-hidden="true"
          data-adapttable-part="assistant-message-mark"
          style={{
            display: "flex",
            marginBlockStart: "0.15em",
            opacity: 0.7,
          }}
        >
          <AssistantIcon />
        </span>
      )}
      {/* Backend text is untrusted: rendered as text, never as markup.
        While a reply is still arriving, what has landed is shown in its
        place — marked as provisional, because words are not a receipt. */}
      <span
        data-adapttable-part="assistant-message-text"
        data-streaming={message.partialText === undefined ? undefined : "true"}
        style={{
          padding: mine ? "0.5em 0.75em" : 0,
          borderRadius: "0.85em",
          background: mine
            ? "color-mix(in srgb, currentColor 8%, transparent)"
            : "transparent",
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
          // The reply is the answer to what the reader asked. It led with
          // the same weight as the cards under it, which made a turn read
          // as a stack of machinery with a sentence lost in it.
          ...(mine
            ? {}
            : { fontSize: "1.05em", lineHeight: 1.5, fontWeight: 450 }),
        }}
      >
        {message.partialText ?? message.text}
      </span>
    </span>
  );
}

/** What one turn did, as a group under the reply it is evidence for. */
function Receipts({
  receipts,
  labels,
  slots,
  onUndoAction,
}: {
  readonly receipts: readonly TableAssistantReceiptView[];
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly onUndoAction?: (idempotencyKey: string) => void;
}): ReactElement {
  return (
    <ul
      data-adapttable-part="assistant-receipts"
      style={{
        listStyle: "none",
        margin: 0,
        // Its own ground and its own indent, so the eye can see where the
        // reply ends and what it did begins without reading either.
        padding: "0.4em 0.6em",
        marginInlineStart: "1.6em",
        marginBlockStart: "0.35em",
        borderRadius: "0.6em",
        background: "color-mix(in srgb, currentColor 5%, transparent)",
        display: "flex",
        flexDirection: "column",
        gap: "0.35em",
        alignSelf: "stretch",
      }}
    >
      {receipts.map((receipt) => (
        <Receipt
          key={receipt.idempotencyKey}
          receipt={receipt}
          labels={labels}
          slots={slots}
          {...(receipt.undoable && onUndoAction
            ? {
                onUndo: () => {
                  onUndoAction(receipt.idempotencyKey);
                },
              }
            : {})}
        />
      ))}
    </ul>
  );
}

/**
 * The turn, while it is still running.
 *
 * A reader who has just pressed send has no way to tell "thinking" from
 * "nothing happened" — the badge changes a word in the header, which is not
 * where they are looking. This sits at the end of the transcript, where the
 * reply itself will appear, so the answer lands in the space the waiting
 * occupied rather than shifting it.
 *
 * The dots animate only where motion is welcome; under `prefers-reduced-motion`
 * they hold still and the word alone carries it. The live region above the
 * composer already announces the status, so this is `aria-hidden` — a screen
 * reader hearing "working" twice learns nothing the second time.
 *
 * @internal
 */
export function AssistantWorking({
  labels,
}: {
  readonly labels: TableLabels | undefined;
}): ReactElement {
  const word = labels?.assistantConnection?.("sending") ?? "Working…";
  return (
    <li
      data-adapttable-part="assistant-working"
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5em",
        opacity: 0.75,
        // The reply replaces this in place, so the transcript does not jump
        // when the words arrive.
        minHeight: "1.5em",
      }}
    >
      <style>{WORKING_KEYFRAMES}</style>
      <span
        aria-hidden="true"
        style={{ display: "flex", marginBlockStart: "0.15em", opacity: 0.7 }}
      >
        <AssistantIcon />
      </span>
      <span style={{ display: "inline-flex", gap: "0.25em" }}>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            data-adapttable-part="assistant-working-dot"
            style={{
              width: "0.35em",
              height: "0.35em",
              borderRadius: "50%",
              background: "currentColor",
              animation: `adapttable-assistant-dot 1.2s ${String(index * 0.16)}s infinite ease-in-out`,
            }}
          />
        ))}
      </span>
      <span data-adapttable-part="assistant-working-text">{word}</span>
    </li>
  );
}

/**
 * Held still where motion is unwelcome, rather than turned off entirely: the
 * dots keep their place in the row so the layout does not move either way.
 */
const WORKING_KEYFRAMES = `
@keyframes adapttable-assistant-dot {
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-0.15em); }
}
@media (prefers-reduced-motion: reduce) {
  [data-adapttable-part="assistant-working-dot"] { animation: none; opacity: 0.55; }
}
`;

/**
 * A question the backend asked, drawn where the reader is already looking.
 *
 * Choices are chips rather than a column of submit buttons, and a free-text
 * answer is offered only when the backend said it would accept one — an input
 * beside a closed set is an invitation to type something that will be refused.
 */
export function AssistantQuestion({
  question,
  labels,
  slots,
  onAnswer,
}: {
  readonly question: TableAssistantQuestionView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly onAnswer: (answer: { optionId?: string; text?: string }) => void;
}): ReactElement {
  const [typed, setTyped] = useState("");
  const Suggestion = slots.Suggestion;
  const options = question.options ?? [];
  return (
    // A question and the controls that answer it is what a fieldset is for:
    // the legend is announced with each control inside it, which a labelled
    // `role="group"` only approximates. The browser's own border, padding and
    // margin are cleared so the panel looks exactly as it did.
    <fieldset
      data-adapttable-part="assistant-question"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.45em",
        border: 0,
        margin: 0,
        padding: 0,
        minInlineSize: 0,
      }}
    >
      <legend
        data-adapttable-part="assistant-question-text"
        style={{ padding: 0 }}
      >
        {question.question}
      </legend>
      {options.length > 0 ? (
        <div
          data-adapttable-part="assistant-question-options"
          style={{ display: "flex", flexWrap: "wrap", gap: "0.35em" }}
        >
          {options.map((option) => (
            <Suggestion
              key={option.id}
              title={option.label}
              part="assistant-question-option"
              onClick={() => {
                onAnswer({ optionId: option.id });
              }}
            />
          ))}
        </div>
      ) : null}
      {question.allowFreeText ? (
        <div style={{ display: "flex", gap: "0.35em", alignItems: "flex-end" }}>
          <slots.Composer
            label={labels?.assistantAnswerLabel ?? "Your answer"}
            placeholder={labels?.assistantAnswerPlaceholder ?? "Type an answer"}
            part="assistant-question-input"
            value={typed}
            onChange={setTyped}
            onKeyDown={(event) => {
              // The same rule as the composer: Enter answers, Shift+Enter is a
              // newline, and an IME composition is left alone.
              if (event.key !== "Enter" || event.shiftKey) return;
              if (
                (event.nativeEvent as { isComposing?: boolean }).isComposing
              ) {
                return;
              }
              event.preventDefault();
              if (!typed.trim()) return;
              onAnswer({ text: typed.trim() });
              setTyped("");
            }}
          />
          <slots.Button
            label={labels?.assistantAnswerSend ?? "Answer"}
            part="assistant-question-send"
            variant="primary"
            disabled={!typed.trim()}
            onClick={() => {
              onAnswer({ text: typed.trim() });
              setTyped("");
            }}
          />
        </div>
      ) : null}
    </fieldset>
  );
}

/**
 * What the reader has waved through, and the way back.
 *
 * Drawn wherever the panel keeps its settings rather than in the transcript:
 * it is a standing decision, not something that happened in this turn.
 */
export function AssistantAlwaysAllowed({
  capabilities,
  labels,
  slots,
  onRevoke,
}: {
  readonly capabilities: readonly string[];
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly onRevoke: (capability: string) => void;
}): ReactElement | null {
  if (capabilities.length === 0) return null;
  return (
    <div
      data-adapttable-part="assistant-always-allowed"
      style={{ display: "flex", flexDirection: "column", gap: "0.3em" }}
    >
      <span data-adapttable-part="assistant-always-allowed-title">
        {labels?.assistantAlwaysAllowedTitle ?? "Not asking about"}
      </span>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: "0.3em",
        }}
      >
        {capabilities.map((capability) => (
          <li
            key={capability}
            data-adapttable-part="assistant-always-allowed-item"
          >
            <slots.Button
              label={
                labels?.assistantAlwaysAllowedRevoke?.(capability) ??
                `Ask about ${capability} again`
              }
              part="assistant-always-allowed-revoke"
              variant="subtle"
              onClick={() => {
                onRevoke(capability);
              }}
            >
              {labels?.assistantCapabilityName?.(capability) ?? capability}
            </slots.Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
