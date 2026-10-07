/** Shared approval structure. All decisions and list surfaces are kit slots. */
import {
  type AgentApprovalPending,
  type AgentApprovalProposal,
  approvalReview,
  resolveLabels,
  type TableLabels,
} from "@adapttable/core";
import { defineComponent, h, nextTick, shallowRef, useId, watch } from "vue";

import { useScopeActivity } from "../store";
import { approvalIdentity } from "./approvalIdentity";
import type { AgentApprovalProps, ApprovalReviewSlots } from "./contracts";

/** @public */
export interface ApprovalReviewChromeProps {
  readonly pending: AgentApprovalPending;
  readonly labels?: TableLabels;
  readonly slots: ApprovalReviewSlots;
  readonly expanded?: boolean;
  /** Delegate expansion to a containing surface; omitted keeps an inline review. */
  readonly onExpand?: () => void;
  /** Return from a controlled full review to its conversation. */
  readonly onBack?: () => void;
  readonly className?: string;
  readonly buttonClassName?: string;
}
function display(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return "—";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  )
    return String(value);
  return JSON.stringify(value);
}
function argumentPairs(args: unknown): readonly (readonly [string, unknown])[] {
  if (args === undefined) return [];
  if (args !== null && typeof args === "object" && !Array.isArray(args))
    return Object.entries(args).map(([name, value]) => [
      name
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/^./, (first) => first.toUpperCase()),
      value,
    ]);
  return [["", args]];
}
function describe(
  proposal: AgentApprovalProposal,
  labels: TableLabels | undefined
): string {
  const copy = resolveLabels(labels);
  return copy.proposalChange({
    row: proposal.rowLabel ?? proposal.rowKey,
    ...(proposal.column === undefined
      ? {}
      : { column: proposal.columnLabel ?? proposal.column }),
    before: proposal.beforeUnavailable
      ? copy.proposalValueUnavailable
      : (proposal.beforeText ?? display(proposal.before)),
    after: proposal.afterText ?? display(proposal.after),
  });
}
/** @public */
export const ApprovalReviewChrome = /*#__PURE__*/ defineComponent(
  (props: ApprovalReviewChromeProps) => {
    const active = useScopeActivity();
    const expanded = shallowRef(false);
    const heading = useId();
    const generation = shallowRef(0);
    watch(
      active,
      (enabled) => {
        if (!enabled) generation.value += 1;
      },
      { flush: "sync" }
    );
    watch(
      [() => approvalIdentity(props.pending), () => props.pending.presentation],
      () => {
        expanded.value = false;
      }
    );
    // Let Vue deliver a replacement approval before an old DOM event can decide it.
    const runDecision = async (
      pending: AgentApprovalPending,
      action: () => void,
      owner: number
    ) => {
      await Promise.resolve();
      await nextTick();
      if (
        active.value &&
        generation.value === owner &&
        props.pending === pending
      )
        action();
    };
    const decide = (pending: AgentApprovalPending, action: () => void) => {
      const owner = generation.value;
      return () => {
        void runDecision(pending, action, owner);
      };
    };
    const rowDecision = (
      pending: AgentApprovalPending,
      index: number,
      approved: boolean
    ) => decide(pending, () => pending.decideAt?.(index, approved));
    return () => {
      const pending = props.pending;
      const review = approvalReview(pending, props.labels);
      if (!review) return null;
      const copy = resolveLabels(props.labels);
      const full = props.expanded ?? expanded.value;
      const uncontrolled = props.expanded === undefined;
      const controls = props.slots;
      const onExpand = props.onExpand;
      const onBack = props.onBack;
      const button = (label: string, part: string, onClick: () => void) => ({
        label,
        part,
        className: props.buttonClassName,
        onClick,
      });
      const rows = (full ? review.items : review.preview).map(
        ({ id, index, proposal, decision }) => {
          const text = describe(proposal, props.labels);
          return h(
            "li",
            {
              key: id,
              "data-adapttable-part": "agent-approval-row",
              "data-decision": decision,
              "aria-label": text,
            },
            [
              h(
                "span",
                { "data-adapttable-part": "approval-review-change" },
                text
              ),
              review.perItem && review.items.length > 1
                ? h(
                    "span",
                    { "data-adapttable-part": "approval-review-row-actions" },
                    [
                      controls.Reject(
                        button(
                          copy.rejectProposal,
                          "approval-review-row-reject",
                          rowDecision(pending, index, false)
                        )
                      ),
                      controls.Approve(
                        button(
                          copy.approveProposal,
                          "approval-review-row-approve",
                          rowDecision(pending, index, true)
                        )
                      ),
                    ]
                  )
                : null,
            ]
          );
        }
      );
      const operation = review.operation;
      const pairs = argumentPairs(operation?.arguments);
      return h(
        "div",
        {
          "data-adapttable-part": "approval-review",
          "aria-labelledby": heading,
          class: props.className,
        },
        [
          h(
            "p",
            { id: heading, "data-adapttable-part": "approval-review-summary" },
            review.summary
          ),
          review.tally
            ? h(
                "p",
                { "data-adapttable-part": "approval-review-tally" },
                review.tally
              )
            : null,
          operation
            ? h(
                "div",
                { "data-adapttable-part": "approval-review-operation" },
                [
                  h(
                    "span",
                    {
                      "data-adapttable-part": "approval-review-operation-name",
                    },
                    operation.title ?? operation.capability
                  ),
                  h(
                    "dl",
                    {
                      "data-adapttable-part":
                        "approval-review-operation-arguments",
                    },
                    pairs.flatMap(([name, value]) => [
                      h("dt", name),
                      h("dd", display(value) ?? "—"),
                    ])
                  ),
                ]
              )
            : null,
          rows.length
            ? h(
                "div",
                {
                  "data-adapttable-part": "approval-review-scroll",
                  style: {
                    overflowY: "auto",
                    maxHeight: full ? undefined : "16em",
                    minHeight: 0,
                  },
                },
                [
                  controls.List({
                    part: "agent-approval-list",
                    label: review.summary,
                    className: props.className,
                    children: rows,
                  }),
                ]
              )
            : null,
          review.truncated && !full
            ? controls.Action(
                button(
                  review.reviewAllLabel ?? copy.assistantDetail,
                  "approval-review-expand",
                  decide(pending, () => {
                    if (props.onExpand !== onExpand) return;
                    if (onExpand) onExpand();
                    else if (uncontrolled && props.expanded === undefined)
                      expanded.value = true;
                  })
                )
              )
            : null,
          full && (props.onBack || props.expanded === undefined)
            ? controls.Action(
                button(
                  copy.backToConversation,
                  "approval-review-back",
                  decide(pending, () => {
                    if (props.onBack !== onBack) return;
                    if (onBack) onBack();
                    else expanded.value = false;
                  })
                )
              )
            : null,
          h("div", { "data-adapttable-part": "approval-review-actions" }, [
            pending.alwaysAllow
              ? controls.Action(
                  button(
                    copy.alwaysAllowProposal,
                    "agent-approval-always-allow",
                    decide(pending, () => pending.alwaysAllow?.())
                  )
                )
              : null,
            controls.Reject(
              button(
                review.rejectLabel,
                "agent-approval-reject",
                decide(pending, pending.reject)
              )
            ),
            controls.Approve(
              button(
                review.approveLabel,
                "agent-approval-approve",
                decide(pending, pending.approve)
              )
            ),
          ]),
        ]
      );
    };
  },
  {
    name: "ApprovalReviewChrome",
    props: [
      "pending",
      "labels",
      "slots",
      "expanded",
      "onExpand",
      "onBack",
      "className",
      "buttonClassName",
    ],
  }
);

/** @public */
export interface AgentApprovalChromeProps extends AgentApprovalProps {
  readonly slots: ApprovalReviewSlots;
}
/** @public */
export const AgentApprovalChrome = /*#__PURE__*/ defineComponent(
  (props: AgentApprovalChromeProps) => () => {
    const pending =
      props.pending?.presentation === "table" ? props.pending : null;
    const summary = approvalReview(pending, props.labels)?.summary ?? "";
    return [
      h(
        "div",
        {
          "data-adapttable-part": "agent-approval-status",
          "aria-live": "polite",
          "aria-atomic": "true",
          style: {
            position: "absolute",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            clipPath: "inset(50%)",
            whiteSpace: "nowrap",
          },
        },
        summary
      ),
      pending
        ? h(
            "section",
            {
              "data-adapttable-part": "agent-approval",
              class: props.className,
              "aria-label": summary,
            },
            [h(ApprovalReviewChrome, { ...props, pending })]
          )
        : null,
    ];
  },
  {
    name: "AgentApprovalChrome",
    props: ["pending", "labels", "slots", "className", "buttonClassName"],
  }
);
