/** Conversation structure, focus, placement and announcements with required kit controls. */
import { resolveLabels } from "@adapttable/core";
import {
  assistantBadgeTone,
  assistantFloatingFits,
  assistantFloatingStyle,
  assistantIsBusy,
  assistantLauncherName,
  assistantLauncherStyle,
  assistantQuestion,
  assistantRejoinable,
  assistantWithGreeting,
  assistantWorkingText,
} from "@adapttable/core/binding";
import {
  defineComponent,
  h,
  nextTick,
  onScopeDispose,
  type ShallowRef,
  shallowRef,
  Teleport,
  type VNodeChild,
  watch,
} from "vue";

import { useScopeActivity } from "../store";
import { approvalIdentity } from "./approvalIdentity";
import { ApprovalReviewChrome } from "./approvalReviewChrome";
import { AssistantComposer } from "./assistantComposer";
import { AssistantMessage, speakerMark } from "./assistantMessages";
import type {
  ApprovalReviewSlots,
  TableAssistantButtonProps,
  TableAssistantProps,
  TableAssistantSlots,
} from "./contracts";
import {
  admitQuestionAnswer,
  captureQuestionOwner,
  type QuestionAdmission,
} from "./questionAdmission";

/** @public */
export interface TableAssistantChromeProps extends TableAssistantProps {
  readonly slots: TableAssistantSlots;
}
type Mode = "panel" | "sheet" | "floating";
interface ChromeState {
  readonly active: Readonly<ShallowRef<boolean>>;
  readonly generation: Readonly<ShallowRef<number>>;
  readonly fits: Readonly<ShallowRef<boolean>>;
  readonly surface: ShallowRef<HTMLElement | null>;
  readonly anchor: ShallowRef<HTMLElement | null>;
  readonly conversation: ShallowRef<HTMLElement | null>;
  readonly unseen: Readonly<ShallowRef<boolean>>;
  readonly reviewExpanded: ShallowRef<boolean>;
  readonly close: () => void;
  readonly jump: () => void;
  readonly onScroll: () => void;
}
const liveStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
} as const;
function button(
  props: TableAssistantChromeProps,
  label: string,
  part: string,
  onClick: () => void
) {
  return props.slots.Button({ label, part, onClick });
}
function reviewSlots(slots: TableAssistantSlots): ApprovalReviewSlots {
  const draw = (props: TableAssistantButtonProps) => slots.Button(props);
  return {
    Approve: (props) => draw({ ...props, variant: "primary" }),
    Reject: (props) => draw({ ...props, variant: "secondary" }),
    Action: (props) => draw({ ...props, variant: "subtle" }),
    List: (props) =>
      h(
        "ul",
        {
          "data-adapttable-part": props.part,
          "aria-label": props.label,
          class: props.className,
        },
        [props.children]
      ),
  };
}
function review(
  props: TableAssistantChromeProps,
  expanded?: boolean,
  onExpand?: () => void,
  onBack?: () => void
) {
  return props.approval
    ? h(ApprovalReviewChrome, {
        pending: props.approval,
        labels: props.labels,
        slots: reviewSlots(props.slots),
        expanded,
        onExpand,
        onBack,
      })
    : null;
}
function modal(
  props: TableAssistantChromeProps,
  state: ChromeState
): VNodeChild {
  const pending = props.approval;
  if (pending?.presentation !== "modal") return null;
  const copy = resolveLabels(props.labels);
  const owner = state.generation.value;
  const close = () => {
    void Promise.resolve().then(() =>
      nextTick(() => {
        if (
          state.active.value &&
          state.generation.value === owner &&
          props.approval === pending
        )
          pending.reject();
      })
    );
  };
  return props.slots.Sheet({
    label: copy.proposalSummary({
      changes: pending.operation ? 1 : pending.proposals.length,
      rows: new Set(pending.proposals.map((proposal) => proposal.rowKey)).size,
    }),
    part: "assistant-approval-modal",
    open: true,
    dir: props.dir,
    onClose: close,
    children: review(props, true),
  });
}
function launcher(
  props: TableAssistantChromeProps,
  state: ChromeState,
  mode: Mode,
  contained: boolean
) {
  const copy = resolveLabels(props.labels);
  const pending = props.approval;
  const control =
    !props.open && props.launcher !== false
      ? props.slots.Button({
          label: assistantLauncherName(copy, Boolean(pending)),
          part: "assistant-launcher",
          onClick: () => props.onOpenChange(true),
          children: [
            speakerMark(
              props.avatars?.assistant,
              "assistant",
              "assistant-launcher-mark"
            ),
            pending
              ? h(
                  "span",
                  {
                    "aria-hidden": "true",
                    "data-adapttable-part": "assistant-launcher-waiting",
                  },
                  "•"
                )
              : null,
          ],
        })
      : null;
  return h(
    "span",
    {
      ref: state.anchor,
      "data-adapttable-part": "assistant-launcher-anchor",
      dir: props.dir,
      style: mode === "panel" ? undefined : assistantLauncherStyle(contained),
    },
    [control]
  );
}
function header(props: TableAssistantChromeProps, state: ChromeState) {
  const copy = resolveLabels(props.labels);
  return h("header", { "data-adapttable-part": "assistant-header" }, [
    speakerMark(props.avatars?.assistant, "assistant", "assistant-mark"),
    h(
      "span",
      { "data-adapttable-part": "assistant-title" },
      copy.assistantTitle
    ),
    props.slots.Badge({
      label: copy.assistantConnection(props.assistant.status),
      part: "assistant-connection",
      tone: assistantBadgeTone(props.assistant.status),
    }),
    props.onSettings
      ? button(
          props,
          copy.assistantSettings,
          "assistant-settings",
          props.onSettings
        )
      : null,
    button(props, copy.assistantClose, "assistant-close", state.close),
  ]);
}
function questionAdmission(
  props: TableAssistantChromeProps,
  state: ChromeState
): QuestionAdmission {
  return {
    current: () => props.assistant,
    active: () => state.active.value,
    generation: () => state.generation.value,
  };
}
function answerDraft(
  props: TableAssistantChromeProps,
  state: ChromeState
): (() => void) | undefined {
  const owner = captureQuestionOwner(
    props.assistant,
    assistantQuestion(props.assistant.messages),
    state.generation.value
  );
  if (!owner) return undefined;
  const admission = questionAdmission(props, state);
  return () => {
    const draft = props.assistant.draft;
    if (!draft.trim()) return;
    void admitQuestionAnswer(admission, owner, { text: draft.trim() }, draft);
  };
}
function messages(props: TableAssistantChromeProps, state: ChromeState) {
  const copy = resolveLabels(props.labels);
  const assistant = props.assistant;
  const rows = assistantWithGreeting(
    assistant.messages,
    props.greeting,
    copy
  ).map((message) => {
    const owner = captureQuestionOwner(
      assistant,
      message.question,
      state.generation.value
    );
    const admission = questionAdmission(props, state);
    return h(AssistantMessage, {
      key: message.id,
      message,
      labels: copy,
      slots: props.slots,
      avatars: props.avatars,
      receipts: props.receipts,
      undo: assistant.undo,
      onUndo: assistant.undoTurn
        ? () => {
            void assistant.undoTurn?.();
          }
        : undefined,
      onUndoAction: assistant.undoAction
        ? (key) => {
            void assistant.undoAction?.(key);
          }
        : undefined,
      action: props.messageAction?.(message),
      onAnswer: owner
        ? (answer) => {
            void admitQuestionAnswer(admission, owner, answer);
          }
        : undefined,
    });
  });
  const working =
    (assistant.busy ?? assistantIsBusy(assistant.status)) &&
    !assistantQuestion(assistant.messages) &&
    !props.approval;
  return h("ul", { "data-adapttable-part": "assistant-messages" }, [
    ...rows,
    working
      ? h("li", { "data-adapttable-part": "assistant-working" }, [
          h("span", {
            "data-adapttable-part": "assistant-working-dot",
            "aria-hidden": "true",
            style: {
              display: "inline-block",
              inlineSize: "0.5em",
              blockSize: "0.5em",
              borderRadius: "50%",
              background: "currentColor",
              marginInlineEnd: "0.5em",
            },
          }),
          h(
            "span",
            { "data-adapttable-part": "assistant-working-text" },
            assistantWorkingText(assistant.progress, copy)
          ),
        ])
      : null,
  ]);
}
function allowances(props: TableAssistantChromeProps) {
  const assistant = props.assistant;
  if (!assistant.alwaysAllowed?.length || !assistant.revokeAlwaysAllow)
    return null;
  const copy = resolveLabels(props.labels);
  return h("div", { "data-adapttable-part": "assistant-always-allowed" }, [
    h(
      "span",
      { "data-adapttable-part": "assistant-always-allowed-title" },
      copy.assistantAlwaysAllowedTitle
    ),
    h(
      "ul",
      assistant.alwaysAllowed.map(({ capability, name }) =>
        h(
          "li",
          {
            key: capability,
            "data-adapttable-part": "assistant-always-allowed-item",
          },
          [
            props.slots.Button({
              label: copy.assistantAlwaysAllowedRevoke(capability),
              children:
                copy.assistantCapabilityName(capability) ?? name ?? capability,
              part: "assistant-always-allowed-revoke",
              onClick: () => props.assistant.revokeAlwaysAllow?.(capability),
            }),
          ]
        )
      )
    ),
  ]);
}
function status(props: TableAssistantChromeProps) {
  const assistant = props.assistant;
  const copy = resolveLabels(props.labels);
  if (assistant.error !== undefined) {
    const localized =
      assistant.errorCode === undefined
        ? undefined
        : copy.assistantUnresolved(assistant.errorCode);
    return h(
      "p",
      { "data-adapttable-part": "assistant-error", role: "alert" },
      localized ?? assistant.error
    );
  }
  if (assistantRejoinable(assistant))
    return h("p", { "data-adapttable-part": "assistant-detached" }, [
      copy.assistantDetached,
      button(props, copy.assistantRejoin, "assistant-rejoin", () => {
        void assistant.resume?.();
      }),
    ]);
  return assistant.status === "disconnected"
    ? h(
        "p",
        { "data-adapttable-part": "assistant-unavailable" },
        copy.assistantUnavailable
      )
    : null;
}
function approval(props: TableAssistantChromeProps, state: ChromeState) {
  if (!props.approval) return null;
  if (props.approval.presentation === "widget")
    return h("div", { "data-adapttable-part": "assistant-approval" }, [
      review(props, false, () => {
        state.reviewExpanded.value = true;
      }),
    ]);
  return h(
    "p",
    { "data-adapttable-part": "assistant-approval-elsewhere" },
    resolveLabels(props.labels).approvalWaitingElsewhere
  );
}
function contents(
  props: TableAssistantChromeProps,
  state: ChromeState,
  mode: Mode
) {
  const copy = resolveLabels(props.labels);
  const fullReview =
    props.approval?.presentation === "widget" && state.reviewExpanded.value;
  return h(
    "div",
    {
      ref: state.surface,
      "data-adapttable-part": "assistant-surface",
      dir: props.dir,
      style: {
        "--adapttable-assistant-accent": props.accent,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
      },
      onKeydown: (event: KeyboardEvent) => {
        if (!state.active.value) return;
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          if (fullReview) state.reviewExpanded.value = false;
          else state.close();
        }
      },
    },
    [
      header(props, state),
      h(
        "div",
        {
          "data-adapttable-part": "assistant-conversation-region",
          style: {
            position: "relative",
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          },
        },
        [
          fullReview
            ? h(
                "div",
                {
                  "data-adapttable-part": "assistant-approval-full",
                  style: { overflowY: "auto", height: "100%", minHeight: 0 },
                },
                [
                  review(props, true, undefined, () => {
                    state.reviewExpanded.value = false;
                  }),
                ]
              )
            : null,
          h(
            "span",
            {
              "data-adapttable-part": "assistant-status",
              role: "status",
              "aria-live": "polite",
              "aria-atomic": "true",
              style: liveStyle,
            },
            copy.assistantConnection(props.assistant.status)
          ),
          h(
            "div",
            {
              ref: state.conversation,
              "data-adapttable-part": "assistant-conversation",
              hidden: fullReview,
              style: { overflowY: "auto", flex: "1 1 auto", minHeight: 0 },
              onScroll: state.onScroll,
            },
            [
              messages(props, state),
              props.note && !props.assistant.messages.length
                ? h(
                    "p",
                    { "data-adapttable-part": "assistant-empty-note" },
                    props.note
                  )
                : null,
              allowances(props),
            ]
          ),
          !fullReview && state.unseen.value
            ? button(
                props,
                copy.assistantNewMessages,
                "assistant-jump-latest",
                state.jump
              )
            : null,
          !fullReview ? approval(props, state) : null,
        ]
      ),
      !fullReview ? status(props) : null,
      !fullReview
        ? h(AssistantComposer, {
            assistant: props.assistant,
            labels: copy,
            slots: props.slots,
            speech: props.speech,
            onSend: answerDraft(props, state),
          })
        : null,
      mode === "sheet"
        ? button(
            props,
            copy.assistantBackToTable,
            "assistant-back",
            state.close
          )
        : null,
    ]
  );
}
function surface(
  props: TableAssistantChromeProps,
  state: ChromeState,
  mode: Mode,
  contained: boolean
): VNodeChild {
  if (!props.open) return null;
  const common = {
    label: resolveLabels(props.labels).assistantTitle,
    className: props.className,
    children: contents(props, state, mode),
  };
  if (mode === "sheet")
    return props.slots.Sheet({
      ...common,
      part: "assistant-sheet",
      open: true,
      dir: props.dir,
      onClose: state.close,
    });
  if (mode === "floating")
    return props.slots.Window({
      ...common,
      part: "assistant-window",
      style: { ...assistantFloatingStyle(contained) },
    });
  return props.slots.Panel({ ...common, part: "assistant-panel" });
}
function draw(
  props: TableAssistantChromeProps,
  state: ChromeState
): VNodeChild {
  let mode = props.presentation ?? "panel";
  if (mode === "floating" && !state.fits.value) mode = "sheet";
  const contained =
    props.boundary !== undefined && props.boundary !== "viewport";
  // Mount the approval dialog last so it owns the top layer over a sheet.
  const children = [
    launcher(props, state, mode, contained),
    surface(props, state, mode, contained),
    modal(props, state),
  ];
  const target =
    props.boundary === undefined || props.boundary === "viewport"
      ? "body"
      : props.boundary.current;
  return mode === "floating" && state.active.value && target
    ? h(Teleport, { to: target }, [
        h("div", { dir: props.dir, style: { display: "contents" } }, children),
      ])
    : children;
}
/** @public */
export const TableAssistantChrome = defineComponent(
  (props: TableAssistantChromeProps) => {
    const active = useScopeActivity();
    const generation = shallowRef(0);
    watch(
      [
        () => props.assistant.answer,
        () => assistantQuestion(props.assistant.messages),
      ],
      () => {
        generation.value += 1;
      },
      { flush: "sync" }
    );
    watch(
      active,
      (enabled, previous) => {
        if (!enabled && previous) generation.value += 1;
      },
      { flush: "sync" }
    );
    onScopeDispose(() => {
      generation.value += 1;
      props.speech?.stop();
    });
    const fits = shallowRef(true);
    const element = shallowRef<HTMLElement | null>(null);
    const anchor = shallowRef<HTMLElement | null>(null);
    const conversation = shallowRef<HTMLElement | null>(null);
    const unseen = shallowRef(false);
    const reviewExpanded = shallowRef(false);
    watch(
      [
        () => approvalIdentity(props.approval),
        () => props.approval?.presentation,
        () => props.assistant.send,
        () => props.open,
        () => active.value,
      ],
      () => {
        reviewExpanded.value = false;
      },
      { flush: "sync" }
    );
    watch(
      reviewExpanded,
      (expanded) => {
        if (!active.value || !props.open) return;
        const selector = expanded
          ? '[data-adapttable-part="approval-review-back"]'
          : '[data-adapttable-part="approval-review-expand"], [data-adapttable-part="assistant-input"]';
        element.value?.querySelector<HTMLElement>(selector)?.focus();
      },
      { flush: "post" }
    );
    let atBottom = true;
    let previousFocus: HTMLElement | null = null;
    const jump = () => {
      if (conversation.value)
        conversation.value.scrollTop = conversation.value.scrollHeight;
      atBottom = true;
      unseen.value = false;
    };
    const close = () => {
      props.speech?.stop();
      props.onOpenChange(false);
    };
    const onScroll = () => {
      const current = conversation.value;
      if (!current) return;
      atBottom =
        current.scrollHeight - current.scrollTop - current.clientHeight < 24;
      if (atBottom) unseen.value = false;
    };
    watch(
      active,
      (enabled, previous, cleanup) => {
        if (!enabled) {
          if (previous) props.speech?.stop();
          return;
        }
        const resize = () => {
          fits.value = assistantFloatingFits(window.innerWidth);
        };
        resize();
        window.addEventListener("resize", resize);
        cleanup(() => window.removeEventListener("resize", resize));
      },
      { flush: "post", immediate: true }
    );
    watch(
      () => [props.open, active.value, element.value] as const,
      ([open, enabled], previous) => {
        if (!enabled) return;
        if (
          open &&
          element.value &&
          (previous?.[0] !== true || previous?.[2] !== element.value)
        ) {
          if (
            previous?.[0] !== true &&
            document.activeElement instanceof HTMLElement
          )
            previousFocus = document.activeElement;
          element.value
            .querySelector<HTMLElement>(
              '[data-adapttable-part="assistant-input"]'
            )
            ?.focus();
          jump();
        } else if (!open && previous?.[0] === true) {
          props.speech?.stop();
          const launch = anchor.value?.querySelector<HTMLElement>(
            '[data-adapttable-part="assistant-launcher"]'
          );
          (launch ?? previousFocus)?.focus();
        }
      },
      { flush: "post" }
    );
    watch(
      () => props.assistant.messages,
      () => {
        if (!props.open) return;
        if (atBottom) jump();
        else unseen.value = true;
      },
      { flush: "post" }
    );
    const state: ChromeState = {
      active,
      generation,
      fits,
      surface: element,
      anchor,
      conversation,
      unseen,
      reviewExpanded,
      close,
      jump,
      onScroll,
    };
    return () => draw(props, state);
  },
  {
    name: "TableAssistantChrome",
    props: [
      "assistant",
      "speech",
      "open",
      "onOpenChange",
      "presentation",
      "labels",
      "accent",
      "receipts",
      "className",
      "launcher",
      "onSettings",
      "boundary",
      "note",
      "greeting",
      "avatars",
      "messageAction",
      "approval",
      "dir",
      "slots",
    ],
  }
);
