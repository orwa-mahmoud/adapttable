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

import { AssistantIcon, SuggestionIcon } from "./assistantIcons";
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
  const kind = receipt.subject?.kind;
  const fromLabels = labels?.assistantReceiptAction?.({
    kind,
    status: receipt.status,
  });
  if (fromLabels) return fromLabels;
  return labels?.assistantReceiptStatus?.(receipt.status) ?? receipt.status;
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
        {labels?.assistantReceiptChange?.({
          before: subject.before,
          after: subject.after,
        }) ?? ""}
      </span>
    </span>
  );
}

function Receipt({
  receipt,
  labels,
  slots,
}: {
  readonly receipt: TableAssistantReceiptView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const Button = slots.Button;
  const Badge = slots.Badge;
  const subject = receipt.subject;
  const where = [subject?.row, subject?.column].filter(Boolean).join(" · ");
  return (
    <li
      data-adapttable-part="assistant-receipt"
      data-status={receipt.status}
      data-kind={subject?.kind}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.3em",
        padding: "0.55em 0.7em",
        borderRadius: "0.6em",
        border: "1px solid currentColor",
        borderColor: "color-mix(in srgb, currentColor 18%, transparent)",
        background: "color-mix(in srgb, currentColor 4%, transparent)",
      }}
    >
      <span
        style={{ display: "flex", alignItems: "center", gap: "0.45em" }}
        data-adapttable-part="assistant-receipt-summary"
      >
        <span aria-hidden="true" style={{ display: "flex", opacity: 0.75 }}>
          <SuggestionIcon kind={subject?.kind} />
        </span>
        <strong>{headline(receipt, labels)}</strong>
        {subject?.detail ? (
          <span data-adapttable-part="assistant-receipt-detail-text">
            {subject.detail}
          </span>
        ) : null}
      </span>
      {where ? (
        <span data-adapttable-part="assistant-receipt-where">{where}</span>
      ) : null}
      <ChangedValue receipt={receipt} labels={labels} />
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
              style={{ overflowWrap: "anywhere" }}
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
}: {
  readonly message: TableAssistantMessageView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  /** An offer the host attached to this reply. */
  readonly action?: { readonly label: string; readonly onRun: () => void };
  /** Whether this turn can be put back, when the offer belongs to it. */
  readonly undo?: TableAssistantUndoView;
  readonly onUndo?: () => void;
}): ReactElement {
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
          data-streaming={
            message.partialText === undefined ? undefined : "true"
          }
          style={{
            padding: mine ? "0.5em 0.75em" : 0,
            borderRadius: "0.85em",
            background: mine
              ? "color-mix(in srgb, currentColor 8%, transparent)"
              : "transparent",
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
          }}
        >
          {message.partialText ?? message.text}
        </span>
      </span>
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
      {undo ? (
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
      {message.receipts && message.receipts.length > 0 ? (
        <ul
          data-adapttable-part="assistant-receipts"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.35em",
            alignSelf: "stretch",
          }}
        >
          {message.receipts.map((receipt) => (
            <Receipt
              key={receipt.idempotencyKey}
              receipt={receipt}
              labels={labels}
              slots={slots}
            />
          ))}
        </ul>
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
      <AssistantSuggestions
        slots={slots}
        labels={labels}
        suggestions={suggestions}
        more={more}
        onRun={onRun}
        part="assistant-suggestions"
      />
    </div>
  );
}

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
    <div
      data-adapttable-part="assistant-question"
      role="group"
      aria-label={question.question}
      style={{ display: "flex", flexDirection: "column", gap: "0.45em" }}
    >
      <p data-adapttable-part="assistant-question-text" style={{ margin: 0 }}>
        {question.question}
      </p>
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
    </div>
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
