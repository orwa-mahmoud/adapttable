/**
 * The body of an approval review — the same one wherever it is drawn.
 *
 * The assistant window, the strip above the table and the modal differ in
 * how they frame a review, never in what it says. This is that shared
 * middle: the headline, the running tally, the first few changes or all of
 * them, the per-row controls when the write can be split, and the two
 * summary controls whose labels follow what they will actually do.
 *
 * Structure and part names live here; every visible control is a kit slot.
 */
import {
  type ApprovalReview,
  type ApprovalReviewItem,
  resolveLabels,
  type TableLabels,
} from "@adapttable/core";
import {
  approvalArgumentPairs,
  approvalProposalText,
  type ApprovalReviewSlots as NeutralApprovalReviewSlots,
} from "@adapttable/core/binding";
import { Fragment, type ReactElement, type ReactNode, useId } from "react";

import type { AgentApprovalButtonProps } from "./AgentApprovalChrome";

/**
 * Controls a kit supplies to the shared review body — `@adapttable/core`'s
 * `ApprovalReviewSlots` drawing React nodes.
 *
 * @public
 */
export type ApprovalReviewSlots = NeutralApprovalReviewSlots<ReactNode>;

/** Props for {@link ApprovalReviewChrome}. @public */
export interface ApprovalReviewChromeProps {
  /** The review to draw. */
  readonly review: ApprovalReview;
  /** Labels; falls back to the built-in English. */
  readonly labels?: TableLabels;
  /** Kit controls. */
  readonly slots: ApprovalReviewSlots;
  /** Show every change rather than the first few. */
  readonly expanded?: boolean;
  /** Asked to show every change. Omit to draw no expansion control. */
  readonly onExpand?: () => void;
  /** Asked to leave the full list. Omit to draw no back control. */
  readonly onBack?: () => void;
  /** Approve what is still undecided. */
  readonly onApprove: () => void;
  /** Reject what is still undecided. */
  readonly onReject: () => void;
  /** Decide one change. Omit when the write cannot be split. */
  readonly onDecide?: (index: number, approved: boolean) => void;
  /**
   * Approve this, and stop asking about this capability for the session.
   *
   * Omit when the write is not one the reader may settle that way. The
   * control is drawn only when this is here, rather than drawn and refusing.
   */
  readonly onAlwaysAllow?: () => void;
  /** Class for the region. */
  readonly className?: string;
  /** Class for each button. */
  readonly buttonClassName?: string;
}

/**
 * The shared body of an approval review.
 *
 * @param props - See {@link ApprovalReviewChromeProps}.
 * @returns The review body.
 *
 * @public
 */
export function ApprovalReviewChrome({
  review,
  labels,
  slots,
  expanded = false,
  onExpand,
  onBack,
  onApprove,
  onReject,
  onDecide,
  onAlwaysAllow,
  className,
  buttonClassName,
}: Readonly<ApprovalReviewChromeProps>): ReactElement {
  const headingId = useId();
  const shown = expanded ? review.items : review.preview;
  const Approve = slots.Approve;
  const Reject = slots.Reject;
  const Action = slots.Action;
  // Computed once rather than spread conditionally inside the markup: an
  // optional prop decided in the middle of a conditional branch is a second
  // condition to read.
  const buttonClass: { className?: string } = buttonClassName
    ? { className: buttonClassName }
    : {};
  const copy = resolveLabels(labels);

  return (
    <div
      data-adapttable-part="approval-review"
      className={className}
      aria-labelledby={headingId}
      style={{ display: "flex", flexDirection: "column", gap: "0.5em" }}
    >
      <p
        data-adapttable-part="approval-review-summary"
        id={headingId}
        style={{ margin: 0 }}
      >
        {review.summary}
      </p>
      {review.tally ? (
        <p data-adapttable-part="approval-review-tally" style={{ margin: 0 }}>
          {review.tally}
        </p>
      ) : null}

      {review.operation ? (
        <div
          data-adapttable-part="approval-review-operation"
          style={{ display: "flex", flexDirection: "column", gap: "0.25em" }}
        >
          <span data-adapttable-part="approval-review-operation-name">
            {review.operation.title ?? review.operation.capability}
          </span>
          {/* What it was called with, read as pairs. A reader being asked to
              agree to something should not have to parse JSON to find out
              what they are agreeing to — and nothing is invented beside them,
              because an opaque operation has no row count to show. */}
          <dl
            data-adapttable-part="approval-review-operation-arguments"
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "0.15em 0.6em",
              margin: 0,
            }}
          >
            {approvalArgumentPairs(review.operation.arguments).map((pair) => (
              <Fragment key={pair.name}>
                <dt style={{ opacity: 0.7 }}>{pair.name}</dt>
                <dd style={{ margin: 0, fontWeight: 550 }}>{pair.value}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      ) : null}

      {shown.length > 0 ? (
        <div
          data-adapttable-part="approval-review-scroll"
          style={{ overflowY: "auto", maxHeight: "16em", minHeight: 0 }}
        >
          <slots.List
            part="agent-approval-list"
            label={review.summary}
            className={className}
          >
            {shown.map((item) => (
              <ReviewRow
                key={item.id}
                item={item}
                labels={labels}
                // One change needs one decision. Per-row controls exist to
                // let a reader take three raises and leave the fourth; beside
                // a single proposal they are a second pair of buttons that
                // do exactly what the pair below them does.
                perItem={review.perItem && shown.length > 1}
                Approve={Approve}
                Reject={Reject}
                buttonClassName={buttonClassName}
                {...(onDecide ? { onDecide } : {})}
              />
            ))}
          </slots.List>
        </div>
      ) : null}

      {!expanded && review.reviewAllLabel && onExpand ? (
        <Action
          label={review.reviewAllLabel}
          part="approval-review-expand"
          {...buttonClass}
          onClick={onExpand}
        />
      ) : null}
      {expanded && onBack ? (
        <Action
          label={copy.backToConversation}
          part="approval-review-back"
          {...buttonClass}
          onClick={onBack}
        />
      ) : null}

      <div
        data-adapttable-part="approval-review-actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5em",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBlockStart: "0.2em",
        }}
      >
        {/* A standing decision sits apart from the two that answer only this
            write, and it reads as the quieter choice — it is the one a reader
            should take deliberately, not the one the thumb lands on. */}
        {onAlwaysAllow ? (
          <Action
            label={copy.alwaysAllowProposal}
            part="agent-approval-always-allow"
            {...buttonClass}
            onClick={onAlwaysAllow}
          />
        ) : null}
        <Reject
          label={review.rejectLabel}
          part="agent-approval-reject"
          {...buttonClass}
          onClick={onReject}
        />
        <Approve
          label={review.approveLabel}
          part="agent-approval-approve"
          {...buttonClass}
          onClick={onApprove}
        />
      </div>
    </div>
  );
}

/** One change, with its own decision controls when the write can be split. */
function ReviewRow({
  item,
  labels,
  perItem,
  Approve,
  Reject,
  onDecide,
  buttonClassName,
}: {
  readonly item: ApprovalReviewItem;
  readonly labels: TableLabels | undefined;
  readonly perItem: boolean;
  readonly Approve: (props: AgentApprovalButtonProps) => ReactNode;
  readonly Reject: (props: AgentApprovalButtonProps) => ReactNode;
  readonly onDecide?: (index: number, approved: boolean) => void;
  readonly buttonClassName?: string;
}): ReactElement {
  const text = approvalProposalText(item.proposal, labels);
  const copy = resolveLabels(labels);
  const buttonClass: { className?: string } = buttonClassName
    ? { className: buttonClassName }
    : {};
  return (
    // A list item named for the change, so "Approve" is announced with the
    // row it belongs to. Putting the whole sentence on the button instead
    // names it correctly and then prints that sentence on the control — and
    // a real element carries the semantics where role= support is patchy.
    <li
      data-adapttable-part="agent-approval-row"
      data-decision={item.decision}
      aria-label={text}
      style={{
        display: "flex",
        // Wrapping rather than squeezing: at a phone's width the change and
        // two controls cannot share a line, and a change clipped to make room
        // for the buttons is the one thing the reader must be able to read
        // before they press either.
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.4em 0.5em",
        paddingBlock: "0.35em",
        listStyle: "none",
        // A decision has to be visible on the row it was taken on, or the
        // reader has only a tally to go by.
        opacity: item.decision === "pending" ? 1 : 0.55,
        textDecoration: item.decision === "rejected" ? "line-through" : "none",
      }}
    >
      <span
        data-adapttable-part="approval-review-change"
        style={{ flex: "1 1 12em", minWidth: 0, overflowWrap: "anywhere" }}
      >
        {text}
      </span>
      {perItem && onDecide ? (
        <span
          data-adapttable-part="approval-review-row-actions"
          style={{
            display: "flex",
            gap: "0.35em",
            flex: "0 0 auto",
            marginInlineStart: "auto",
          }}
        >
          <Reject
            label={copy.rejectProposal}
            part="approval-review-row-reject"
            {...buttonClass}
            onClick={() => onDecide(item.index, false)}
          />
          <Approve
            label={copy.approveProposal}
            part="approval-review-row-approve"
            {...buttonClass}
            onClick={() => onDecide(item.index, true)}
          />
        </span>
      ) : null}
    </li>
  );
}
