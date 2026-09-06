/**
 * The transcript: what was asked, what came back, and what it did.
 *
 * Roles are distinguished by a visible speaker name and alignment, never by
 * colour alone — the same reason the receipt list names its status in words
 * instead of showing a green dot.
 */
import type { TableLabels } from "@adapttable/core";
import { type ReactElement, type ReactNode, useState } from "react";

import type { TableAssistantSlots } from "./assistantSlots";
import type {
  TableAssistantMessageView,
  TableAssistantReceiptView,
} from "./assistantView";

/** A staged write is not finished, and the panel has to say so. */
const NEEDS_SAVE = "staged";

function receiptText(
  receipt: TableAssistantReceiptView,
  labels: TableLabels | undefined
): string {
  const describe =
    labels?.assistantReceipt ??
    (({ capability, status }: { capability?: string; status: string }) =>
      capability ? `${capability}: ${status}` : status);
  return describe({
    capability: receipt.capabilityKey,
    status: receipt.status,
  });
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
  return (
    <li
      data-adapttable-part="assistant-receipt"
      data-status={receipt.status}
      style={{ display: "flex", flexDirection: "column", gap: "0.15em" }}
    >
      <span data-adapttable-part="assistant-receipt-summary">
        {receiptText(receipt, labels)}
      </span>
      {receipt.status === NEEDS_SAVE ? (
        <span data-adapttable-part="assistant-receipt-save">
          {labels?.assistantSaveInTable ??
            "Save in the table to keep this change."}
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
            <span data-adapttable-part="assistant-receipt-message">
              {receipt.message}
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
}: {
  readonly message: TableAssistantMessageView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
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
        gap: "0.25em",
        alignItems: mine ? "flex-end" : "flex-start",
      }}
    >
      <span data-adapttable-part="assistant-message-speaker">{speaker}</span>
      {/* Backend text is untrusted: rendered as text, never as markup. */}
      <span data-adapttable-part="assistant-message-text">{message.text}</span>
      {message.receipts && message.receipts.length > 0 ? (
        <ul
          data-adapttable-part="assistant-receipts"
          style={{ listStyle: "none", margin: 0, padding: 0 }}
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

/** The empty state: a question, then what this table can actually do. @internal */
export function AssistantEmpty({
  labels,
  slots,
  suggestions,
  more,
  onRun,
}: {
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly suggestions: readonly { id: string; title: string }[];
  readonly more: readonly { id: string; title: string }[];
  readonly onRun: (id: string) => void;
}): ReactElement {
  const [showMore, setShowMore] = useState(false);
  const Button = slots.Button;
  const shown: ReactNode[] = [...suggestions, ...(showMore ? more : [])].map(
    (suggestion) => (
      <Button
        key={suggestion.id}
        label={suggestion.title}
        part="assistant-suggestion"
        variant="secondary"
        onClick={() => {
          onRun(suggestion.id);
        }}
      />
    )
  );
  return (
    <div
      data-adapttable-part="assistant-empty"
      style={{ display: "flex", flexDirection: "column", gap: "0.5em" }}
    >
      <p data-adapttable-part="assistant-empty-prompt">
        {labels?.assistantEmpty ?? "What would you like to do with this table?"}
      </p>
      <div
        data-adapttable-part="assistant-suggestions"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.35em" }}
      >
        {shown}
        {more.length > 0 && !showMore ? (
          <Button
            label={`+${String(more.length)}`}
            part="assistant-suggestions-more"
            variant="subtle"
            onClick={() => {
              setShowMore(true);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
