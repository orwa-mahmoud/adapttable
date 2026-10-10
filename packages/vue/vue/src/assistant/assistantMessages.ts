/** Transcript and execution receipts. Backend text is always escaped Vue text. */
import { resolveLabels, type TableLabels } from "@adapttable/core";
import {
  ASSISTANT_AVATAR_ICON,
  assistantActionsName,
  assistantInitials,
  assistantReceiptDetail,
  assistantReceiptHeadline,
  assistantReceiptIcon,
  assistantReceiptNeedsSave,
  assistantReceiptWhere,
  assistantShownReceipts,
  assistantUndoReason,
  assistantUndoTurnLabel,
  assistantVoicePlaceholder,
  PERSON_AVATAR_ICON,
  type TableAssistantMessageView,
  type TableAssistantReceiptView,
  type TableAssistantUndoView,
} from "@adapttable/core/binding";
import {
  defineComponent,
  h,
  type PropType,
  type ShallowRef,
  shallowRef,
  useId,
  type VNodeChild,
  watch,
} from "vue";

import { useAssistantActionOwnership } from "./assistantActionOwnership";
import { assistantIcon } from "./assistantIcon";
import type { TableAssistantAvatars, TableAssistantSlots } from "./contracts";

export function speakerMark(
  face: VNodeChild,
  role: "user" | "assistant",
  part?: string
): VNodeChild {
  let content = face;
  if (typeof face === "string") {
    const initials = assistantInitials(face);
    content = initials
      ? h("span", { "data-adapttable-part": "assistant-initials" }, initials)
      : undefined;
  }
  content ??= assistantIcon(
    role === "user" ? PERSON_AVATAR_ICON : ASSISTANT_AVATAR_ICON
  );
  return h(
    "span",
    {
      "data-adapttable-part":
        part ??
        (role === "user" ? "assistant-user-mark" : "assistant-message-mark"),
      "aria-hidden": "true",
      // The descriptor fills its mark; a percentage SVG needs a definite
      // containing box instead of the browser's 300px intrinsic fallback.
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        inlineSize: "1.9em",
        blockSize: "1.9em",
        flexShrink: 0,
        overflow: "hidden",
      },
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
export const AssistantReceipt = /*#__PURE__*/ defineComponent(
  (props: ReceiptProps) => {
    const expanded = shallowRef(false);
    const actions = useAssistantActionOwnership();
    watch(
      [() => props.receipt, () => props.onUndo, () => props.slots],
      actions.retire,
      { flush: "sync" }
    );
    return () => {
      const receipt = props.receipt;
      const onUndo = props.onUndo;
      const copy = resolveLabels(props.labels);
      const before = receipt.subject?.before;
      const after = receipt.subject?.after;
      const detail = assistantReceiptDetail(receipt, copy);
      const where = assistantReceiptWhere(receipt);
      const glyph = assistantReceiptIcon(receipt.subject?.kind);
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
          h("span", { "data-adapttable-part": "assistant-receipt-summary" }, [
            h(
              "span",
              {
                "data-adapttable-part": "assistant-receipt-icon",
                "aria-hidden": "true",
                "data-kind": receipt.subject?.kind,
                style: { display: "inline-flex", color: glyph.ink },
              },
              [assistantIcon(glyph.icon)]
            ),
            h("strong", assistantReceiptHeadline(receipt, copy)),
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
          ]),
          props.onUndo
            ? h(
                "span",
                { "data-adapttable-part": "assistant-receipt-outcome" },
                [
                  h(
                    "span",
                    { "data-adapttable-part": "assistant-receipt-undo" },
                    [
                      props.slots.Button({
                        label: copy.assistantUndo,
                        part: "assistant-receipt-undo-button",
                        onClick: actions.bind(
                          () => onUndo?.(),
                          () =>
                            props.receipt === receipt && props.onUndo === onUndo
                        ),
                      }),
                    ]
                  ),
                ]
              )
            : null,
          assistantReceiptNeedsSave(receipt)
            ? h("span", { "data-adapttable-part": "assistant-receipt-save" }, [
                props.slots.Badge({
                  label: copy.assistantSaveInTable,
                  part: "assistant-receipt-save-badge",
                  tone: "warning",
                }),
              ])
            : null,
          receipt.message
            ? props.slots.Button({
                label: copy.assistantDetail,
                part: "assistant-receipt-detail",
                expanded: expanded.value,
                onClick: actions.bind(
                  () => {
                    expanded.value = !expanded.value;
                  },
                  () => props.receipt === receipt
                ),
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
  {
    name: "AssistantReceipt",
    props: {
      receipt: { type: Object as PropType<ReceiptProps["receipt"]> },
      labels: { type: Object as PropType<ReceiptProps["labels"]> },
      slots: { type: Object as PropType<ReceiptProps["slots"]> },
      onUndo: { type: Function as PropType<ReceiptProps["onUndo"]> },
    },
  }
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
function questionOptions(
  message: TableAssistantMessageView,
  slots: TableAssistantSlots,
  answer: AssistantMessageProps["onAnswer"]
): VNodeChild {
  const question = message.question;
  if (!question) return null;
  return h("div", [
    h("p", question.question),
    answer && question.options?.length
      ? h(
          "div",
          {
            "data-adapttable-part": "assistant-question-options",
            role: "group",
            "aria-label": question.question,
          },
          question.options.map((option) =>
            slots.Button({
              label: option.label,
              part: "assistant-question-option",
              onClick: () => answer({ optionId: option.id }),
            })
          )
        )
      : null,
  ]);
}
interface ReceiptGroupState {
  readonly card: ShallowRef<HTMLElement | null>;
  readonly headingId: ReturnType<typeof useId>;
  readonly tailInset: number | undefined;
  readonly undo: TableAssistantUndoView | undefined;
  readonly wholeUndo: (part: string, label: string) => VNodeChild;
  readonly blocked: () => VNodeChild;
  readonly undoReceipt: (receipt: TableAssistantReceiptView) => () => void;
}
function receiptGroup(
  props: AssistantMessageProps,
  receipts: readonly TableAssistantReceiptView[],
  state: ReceiptGroupState
): VNodeChild {
  const copy = resolveLabels(props.labels);
  const perRow = props.onUndoAction
    ? receipts.filter((receipt) => receipt.undoable).length
    : 0;
  return h(
    "section",
    {
      ref: state.card,
      "data-adapttable-part": "assistant-receipts-group",
      "aria-labelledby": state.headingId,
      style: {
        position: "relative",
        marginBlockStart: "0.6em",
        border: "1px solid currentColor",
        padding: "0.6em",
      },
    },
    [
      h("span", {
        "data-adapttable-part": "assistant-receipts-tail",
        "aria-hidden": "true",
        style: {
          position: "absolute",
          insetBlockStart: "-0.42em",
          insetInlineEnd: `calc(${String(state.tailInset ?? 0)}px - 0.4em)`,
          visibility: state.tailInset === undefined ? "hidden" : "visible",
          inlineSize: "0.8em",
          blockSize: "0.42em",
          background: "currentColor",
          clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
        },
      }),
      h("div", { "data-adapttable-part": "assistant-receipts-heading" }, [
        h("strong", { id: state.headingId }, copy.assistantActionsTitle),
        state.undo && perRow !== 1
          ? h(
              "span",
              { "data-adapttable-part": "assistant-receipts-undo-all" },
              [
                state.wholeUndo(
                  "assistant-receipts-undo-all-button",
                  assistantUndoTurnLabel(perRow, copy)
                ),
                state.blocked(),
              ]
            )
          : null,
      ]),
      h(
        "ul",
        { "data-adapttable-part": "assistant-receipts" },
        receipts.map((receipt) =>
          h(AssistantReceipt, {
            key: receipt.idempotencyKey,
            receipt,
            labels: copy,
            slots: props.slots,
            onUndo:
              receipt.undoable && props.onUndoAction
                ? state.undoReceipt(receipt)
                : undefined,
          })
        )
      ),
    ]
  );
}
export const AssistantMessage = /*#__PURE__*/ defineComponent(
  (props: AssistantMessageProps) => {
    const expanded = shallowRef(false);
    const actions = useAssistantActionOwnership();
    const active = actions.active;
    const headingId = useId();
    const toggle = shallowRef<HTMLElement | null>(null);
    const card = shallowRef<HTMLElement | null>(null);
    const tailInset = shallowRef<number>();
    watch(
      [
        () => props.message,
        () => props.undo,
        () => props.undo?.available,
        () => props.onUndo,
        () => props.onUndoAction,
        () => props.action,
        () => props.action?.onRun,
        () => props.receipts,
        () => props.slots,
        () => expanded.value,
      ],
      actions.retire,
      { flush: "sync" }
    );
    watch(
      () => props.message.id,
      () => {
        expanded.value = false;
      }
    );
    watch(
      () => [active.value, expanded.value, card.value, toggle.value] as const,
      ([enabled, open, current, trigger], _previous, cleanup) => {
        tailInset.value = undefined;
        if (!enabled || !open || !current || !trigger) return;
        const measure = () => {
          if (
            !active.value ||
            !expanded.value ||
            card.value !== current ||
            toggle.value !== trigger
          )
            return;
          const bounds = current.getBoundingClientRect();
          const mark = trigger.getBoundingClientRect();
          const center = (mark.left + mark.right) / 2;
          tailInset.value =
            getComputedStyle(current).direction === "rtl"
              ? center - bounds.left
              : bounds.right - center;
        };
        measure();
        current.scrollIntoView?.({ block: "nearest" });
        const observer =
          typeof ResizeObserver === "undefined"
            ? undefined
            : new ResizeObserver(measure);
        observer?.observe(current);
        observer?.observe(trigger);
        window.addEventListener("resize", measure);
        cleanup(() => {
          observer?.disconnect();
          window.removeEventListener("resize", measure);
        });
      },
      { flush: "post" }
    );
    return () => {
      const copy = resolveLabels(props.labels);
      const source = props.message;
      const onUndo = props.onUndo;
      const onUndoAction = props.onUndoAction;
      const action = props.action;
      const onRun = action?.onRun;
      const message = assistantVoicePlaceholder(props.message, copy);
      const receipts =
        props.receipts === false
          ? []
          : assistantShownReceipts(message.receipts);
      const undo =
        props.undo?.messageId === message.id && props.onUndo
          ? props.undo
          : undefined;
      const reason =
        undo && !undo.available
          ? assistantUndoReason(undo.blockedCode, copy)
          : undefined;
      const blocked = () =>
        reason
          ? h(
              "span",
              { "data-adapttable-part": "assistant-undo-reason" },
              reason
            )
          : null;
      const wholeUndo = (part: string, label: string) =>
        props.slots.Button({
          label,
          part,
          disabled: !undo?.available,
          tooltip: reason,
          onClick: actions.bind(
            () => onUndo?.(),
            () =>
              props.onUndo === onUndo &&
              props.undo === undo &&
              props.message === source &&
              Boolean(undo?.available)
          ),
        });
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
            {
              "data-adapttable-part": "assistant-message-speaker",
              style: {
                position: "absolute",
                width: "1px",
                height: "1px",
                overflow: "hidden",
                clipPath: "inset(50%)",
                whiteSpace: "nowrap",
              },
            },
            message.role === "user" ? copy.assistantYou : copy.assistantSpeaker
          ),
          h(
            "p",
            {
              "data-adapttable-part": "assistant-message-text",
              style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
            },
            [
              message.text,
              receipts.length
                ? h(
                    "span",
                    { "data-adapttable-part": "assistant-message-trailing" },
                    [
                      h(
                        "span",
                        {
                          ref: toggle,
                          "data-adapttable-part": "assistant-receipts-toggle",
                        },
                        [
                          props.slots.Button({
                            label: assistantActionsName(receipts.length, copy),
                            part: "assistant-receipts-toggle-button",
                            expanded: expanded.value,
                            onClick: actions.bind(
                              () => {
                                expanded.value = !expanded.value;
                              },
                              () => props.message === source
                            ),
                          }),
                        ]
                      ),
                    ]
                  )
                : null,
            ]
          ),
          questionOptions(message, props.slots, answer),
          receipts.length && expanded.value
            ? receiptGroup(props, receipts, {
                card,
                headingId,
                tailInset: tailInset.value,
                undo,
                wholeUndo,
                blocked,
                undoReceipt: (receipt) =>
                  actions.bind(
                    () => onUndoAction?.(receipt.idempotencyKey),
                    () =>
                      props.message === source &&
                      props.onUndoAction === onUndoAction &&
                      Boolean(props.message.receipts?.includes(receipt))
                  ),
              })
            : null,
          undo && !receipts.length
            ? h("span", { "data-adapttable-part": "assistant-undo" }, [
                wholeUndo("assistant-undo-button", copy.assistantUndo),
                blocked(),
              ])
            : null,
          action
            ? h(
                "span",
                { "data-adapttable-part": "assistant-message-action" },
                [
                  props.slots.Button({
                    label: action.label,
                    part: "assistant-message-action-button",
                    onClick: actions.bind(
                      () => onRun?.(),
                      () =>
                        props.message === source &&
                        props.action === action &&
                        props.action.onRun === onRun
                    ),
                  }),
                ]
              )
            : null,
        ]
      );
    };
  },
  {
    name: "AssistantMessage",
    props: {
      message: { type: Object as PropType<AssistantMessageProps["message"]> },
      slots: { type: Object as PropType<AssistantMessageProps["slots"]> },
      labels: { type: Object as PropType<AssistantMessageProps["labels"]> },
      avatars: { type: Object as PropType<AssistantMessageProps["avatars"]> },
      receipts: {
        type: Boolean as PropType<AssistantMessageProps["receipts"]>,
        default: undefined,
      },
      undo: { type: Object as PropType<AssistantMessageProps["undo"]> },
      onUndo: { type: Function as PropType<AssistantMessageProps["onUndo"]> },
      onUndoAction: {
        type: Function as PropType<AssistantMessageProps["onUndoAction"]>,
      },
      onAnswer: {
        type: Function as PropType<AssistantMessageProps["onAnswer"]>,
      },
      action: { type: Object as PropType<AssistantMessageProps["action"]> },
    },
  }
);
