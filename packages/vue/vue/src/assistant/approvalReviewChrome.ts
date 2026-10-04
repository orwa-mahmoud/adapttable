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
import type { AgentApprovalProps, ApprovalReviewSlots } from "./contracts";

/** @public */
export interface ApprovalReviewChromeProps {
  readonly pending: AgentApprovalPending;
  readonly labels?: TableLabels;
  readonly slots: ApprovalReviewSlots;
  readonly expanded?: boolean;
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
export const ApprovalReviewChrome = defineComponent(
  (props: ApprovalReviewChromeProps) => {
    const active = useScopeActivity();
    const expanded = shallowRef(false);
    const heading = useId();
    watch(
      () =>
        [
          props.pending.proposals,
          props.pending.operation,
          props.pending.presentation,
        ] as const,
      () => {
        expanded.value = false;
      }
    );
    // Let Vue deliver a replacement approval before an old DOM event can decide it.
    const decide = (pending: AgentApprovalPending, action: () => void) => {
      void Promise.resolve().then(() =>
        nextTick(() => {
          if (active.value && props.pending === pending) action();
        })
      );
    };
    const rowDecision =
      (pending: AgentApprovalPending, index: number, approved: boolean) => () =>
        decide(pending, () => pending.decideAt?.(index, approved));
    return () => {
      const pending = props.pending;
      const review = approvalReview(pending, props.labels);
      if (!review) return null;
      const copy = resolveLabels(props.labels);
      const full = props.expanded === true || expanded.value;
      const controls = props.slots;
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
                  style: { overflowY: "auto", maxHeight: "16em", minHeight: 0 },
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
                  () => {
                    expanded.value = true;
                  }
                )
              )
            : null,
          full && !props.expanded
            ? controls.Action(
                button(copy.backToConversation, "approval-review-back", () => {
                  expanded.value = false;
                })
              )
            : null,
          h("div", { "data-adapttable-part": "approval-review-actions" }, [
            pending.alwaysAllow
              ? controls.Action(
                  button(
                    copy.alwaysAllowProposal,
                    "agent-approval-always-allow",
                    () => decide(pending, () => pending.alwaysAllow?.())
                  )
                )
              : null,
            controls.Reject(
              button(review.rejectLabel, "agent-approval-reject", () =>
                decide(pending, pending.reject)
              )
            ),
            controls.Approve(
              button(review.approveLabel, "agent-approval-approve", () =>
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
export const AgentApprovalChrome = defineComponent(
  (props: AgentApprovalChromeProps) => () =>
    props.pending?.presentation === "table"
      ? h(
          "section",
          {
            "data-adapttable-part": "agent-approval",
            class: props.className,
            "aria-live": "polite",
          },
          [h(ApprovalReviewChrome, { ...props, pending: props.pending })]
        )
      : null,
  {
    name: "AgentApprovalChrome",
    props: ["pending", "labels", "slots", "className", "buttonClassName"],
  }
);
