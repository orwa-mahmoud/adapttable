/** Transcript and execution receipts. Backend text is always escaped Vue text. */
import { resolveLabels, type TableLabels } from "@adapttable/core";
import {
  assistantActionsName,
  assistantInitials,
  assistantReceiptDetail,
  assistantReceiptHeadline,
  assistantReceiptNeedsSave,
  assistantReceiptWhere,
  assistantShownReceipts,
  assistantUndoReason,
  assistantUndoTurnLabel,
  assistantVoicePlaceholder,
  type TableAssistantMessageView,
  type TableAssistantReceiptView,
  type TableAssistantUndoView,
} from "@adapttable/core/binding";
import { defineComponent, h, shallowRef, type VNodeChild } from "vue";

import type { TableAssistantAvatars, TableAssistantSlots } from "./contracts";

export function speakerMark(
  face: VNodeChild,
  role: "user" | "assistant",
  part?: string
): VNodeChild {
  let content = face;
  if (typeof face === "string") content = assistantInitials(face);
  else if (face == null) content = role === "user" ? "○" : "✧";
  return h(
    "span",
    {
      "data-adapttable-part":
        part ??
        (role === "user" ? "assistant-user-mark" : "assistant-message-mark"),
      "aria-hidden": "true",
    },
    [content]
  );
}
interface ReceiptProps {
  readonly receipt: TableAssistantReceiptView;
  readonly labels?: TableLabels;
  readonly slots: TableAssistantSlots;
  readonly onUndo?: () => void;
}
export const AssistantReceipt = defineComponent(
  (props: ReceiptProps) => {
    const expanded = shallowRef(false);
    return () => {
      const receipt = props.receipt;
      const copy = resolveLabels(props.labels);
      const before = receipt.subject?.before;
      const after = receipt.subject?.after;
      const detail = assistantReceiptDetail(receipt, copy);
      const where = assistantReceiptWhere(receipt);
      const describeChange =
        receipt.status === "executed"
          ? copy.assistantReceiptChange
          : copy.assistantReceiptProposed;
      const change =
        before !== undefined && after !== undefined
          ? describeChange({ before, after })
          : undefined;
      return h(
        "li",
        {
          "data-adapttable-part": "assistant-receipt",
          "data-status": receipt.status,
          "data-kind": receipt.subject?.kind,
        },
        [
          h(
            "strong",
            { "data-adapttable-part": "assistant-receipt-summary" },
            assistantReceiptHeadline(receipt, copy)
          ),
          detail
            ? h(
                "span",
                { "data-adapttable-part": "assistant-receipt-detail-text" },
                detail
              )
            : null,
          where
            ? h(
                "span",
                { "data-adapttable-part": "assistant-receipt-where" },
                where
              )
            : null,
          change
            ? h(
                "span",
                {
                  "data-adapttable-part": "assistant-receipt-change",
                  "aria-label": change,
                },
                [
                  h(
                    "s",
                    { "data-adapttable-part": "assistant-receipt-before" },
                    before
                  ),
                  " → ",
                  h(
                    "strong",
                    { "data-adapttable-part": "assistant-receipt-after" },
                    after
                  ),
                ]
              )
            : null,
          assistantReceiptNeedsSave(receipt)
            ? props.slots.Badge({
                label: copy.assistantSaveInTable,
                part: "assistant-receipt-save-badge",
                tone: "warning",
              })
            : null,
          props.onUndo
            ? props.slots.Button({
                label: copy.assistantUndo,
                part: "assistant-receipt-undo-button",
                onClick: props.onUndo,
              })
            : null,
          receipt.message
            ? props.slots.Button({
                label: copy.assistantDetail,
                part: "assistant-receipt-detail",
                expanded: expanded.value,
                onClick: () => {
                  expanded.value = !expanded.value;
                },
              })
            : null,
          receipt.message && expanded.value
            ? h(
                "span",
                { "data-adapttable-part": "assistant-receipt-message" },
                [
                  receipt.message,
                  receipt.capabilityKey
                    ? h(
                        "code",
                        {
                          "data-adapttable-part":
                            "assistant-receipt-capability",
                        },
                        receipt.capabilityKey
                      )
                    : null,
                ]
              )
            : null,
        ]
      );
    };
  },
  { name: "AssistantReceipt", props: ["receipt", "labels", "slots", "onUndo"] }
);
export interface AssistantMessageProps {
  readonly message: TableAssistantMessageView;
  readonly slots: TableAssistantSlots;
  readonly labels?: TableLabels;
  readonly avatars?: TableAssistantAvatars;
  readonly receipts?: boolean;
  readonly undo?: TableAssistantUndoView | null;
  readonly onUndo?: () => void;
  readonly onUndoAction?: (key: string) => void;
  readonly onAnswer?: (answer: { optionId?: string; text?: string }) => void;
  readonly action?: { readonly label: string; readonly onRun: () => void };
}
export const AssistantMessage = defineComponent(
  (props: AssistantMessageProps) => {
    const expanded = shallowRef(false);
    return () => {
      const copy = resolveLabels(props.labels);
      const message = assistantVoicePlaceholder(props.message, copy);
      const receipts = assistantShownReceipts(message.receipts);
      const undo =
        props.undo?.messageId === message.id ? props.undo : undefined;
      const answer = props.onAnswer;
      return h(
        "li",
        {
          "data-adapttable-part": "assistant-message",
          "data-role": message.role,
          "aria-busy": message.streaming ?? undefined,
        },
        [
          speakerMark(props.avatars?.[message.role], message.role),
          h(
            "span",
            { "data-adapttable-part": "assistant-speaker" },
            message.role === "user" ? copy.assistantYou : copy.assistantSpeaker
          ),
          h(
            "p",
            {
              "data-adapttable-part": "assistant-message-text",
              style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
            },
            message.text
          ),
          message.question
            ? h("div", { "data-adapttable-part": "assistant-question" }, [
                h("p", message.question.question),
                answer
                  ? message.question.options?.map((option) =>
                      props.slots.Button({
                        label: option.label,
                        part: "assistant-question-option",
                        onClick: () => answer({ optionId: option.id }),
                      })
                    )
                  : null,
              ])
            : null,
          props.receipts !== false && receipts.length
            ? h("div", { "data-adapttable-part": "assistant-receipts" }, [
                props.slots.Button({
                  label: assistantActionsName(receipts.length, copy),
                  part: "assistant-receipts-toggle-button",
                  expanded: expanded.value,
                  onClick: () => {
                    expanded.value = !expanded.value;
                  },
                }),
                expanded.value
                  ? h(
                      "ul",
                      { "data-adapttable-part": "assistant-receipts-list" },
                      receipts.map((receipt) =>
                        h(AssistantReceipt, {
                          key: receipt.idempotencyKey,
                          receipt,
                          labels: copy,
                          slots: props.slots,
                          onUndo:
                            receipt.undoable && props.onUndoAction
                              ? () =>
                                  props.onUndoAction?.(receipt.idempotencyKey)
                              : undefined,
                        })
                      )
                    )
                  : null,
              ])
            : null,
          undo && props.onUndo
            ? props.slots.Button({
                label: assistantUndoTurnLabel(
                  receipts.filter((receipt) => receipt.undoable).length,
                  copy
                ),
                part: "assistant-undo-button",
                disabled: !undo.available,
                tooltip: undo.available
                  ? undefined
                  : assistantUndoReason(undo.blockedCode, copy),
                onClick: props.onUndo,
              })
            : null,
          props.action
            ? props.slots.Button({
                label: props.action.label,
                part: "assistant-message-action-button",
                onClick: props.action.onRun,
              })
            : null,
        ]
      );
    };
  },
  {
    name: "AssistantMessage",
    props: [
      "message",
      "slots",
      "labels",
      "avatars",
      "receipts",
      "undo",
      "onUndo",
      "onUndoAction",
      "onAnswer",
      "action",
    ],
  }
);
