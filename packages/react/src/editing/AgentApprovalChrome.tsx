/**
 * Review strip for a pending agent write.
 *
 * Structure, keyboard, and part names live here. Every visible control is a
 * required kit slot — core never draws a button. Invisible live-region
 * announcements are the one thing this chrome owns itself.
 */
import type { ApprovalPresentation, TableLabels } from "@adapttable/core";
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import { featureStateKey } from "../features/providers";
import { approvalReview } from "./approvalReview";
import { ApprovalReviewChrome } from "./ApprovalReviewChrome";

/**
 * Live pending-approval state published by the optional agent feature.
 *
 * Adapters read this and fill {@link AGENT_APPROVAL}. The optional AI
 * package stays out of the adapter graph.
 *
 * @public
 */
export interface AgentApprovalPending {
  /**
   * Proposed writes waiting for a human decision.
   *
   * Empty when the write names no rows — see {@link operation}.
   */
  readonly proposals: readonly AgentApprovalProposal[];
  /**
   * The write, when it is one operation rather than a set of rows.
   *
   * A backend that updates every matching row server-side proposes nothing
   * per row: there is one thing to agree to, and per-row controls would be
   * asking about rows nobody enumerated.
   */
  readonly operation?: AgentApprovalOperation;
  /** What the reader has decided so far, one entry per proposal. */
  readonly decisions: readonly AgentApprovalDecision[];
  /**
   * Where this approval is meant to be reviewed, resolved from the table's
   * shared configuration and the action's own override.
   *
   * Exactly one surface draws the decision controls. The others may say an
   * approval is waiting and where, but must not offer a second set of
   * buttons for one decision.
   */
  readonly presentation: ApprovalPresentation;
  /** Confirm everything still undecided and continue the host write path. */
  readonly approve: () => void;
  /** Refuse everything still undecided. */
  readonly reject: () => void;
  /**
   * Decide one proposal by its position.
   *
   * Absent when the write cannot be split — a row move is two lines
   * describing one indivisible change. Surfaces that offer per-row controls
   * must hide them when this is missing rather than draw dead buttons.
   */
  readonly decideAt?: (index: number, approved: boolean) => void;
}

/** What a reader has decided about one proposal. @public */
export type AgentApprovalDecision = "pending" | "approved" | "rejected";

/**
 * A write that acts on the table as a whole rather than on named rows.
 *
 * @public
 */
export interface AgentApprovalOperation {
  /** Capability key the write runs. */
  readonly capability: string;
  /** Reader-facing name, when the capability declared one. */
  readonly title?: string;
  /** Arguments the capability was called with. */
  readonly arguments: unknown;
}

/** Feature-state key for a pending agent approval. @public */
export const AGENT_APPROVAL_STATE =
  featureStateKey<AgentApprovalPending | null>("agent-approval-pending");

/**
 * One proposed change the reader is asked to confirm.
 *
 * @public
 */
export interface AgentApprovalProposal {
  /** Stable row identity. */
  readonly rowKey: string;
  /** Column being written, when the proposal is a cell edit. */
  readonly column?: string;
  /**
   * Value before the write, as the reader's own view can show it.
   *
   * Resolved from the table on screen rather than from anything the model
   * was given, so a row the current filter hides still reads correctly for
   * the person approving it. Absent when the table cannot show one — see
   * {@link beforeUnavailable}, which is how a value nobody could look up is
   * told apart from a cell that is genuinely empty.
   */
  readonly before?: unknown;
  /**
   * True when no before-value could be resolved at all.
   *
   * A blank cell and a cell nobody can read are different facts, and a
   * reader deciding whether to approve a write deserves to know which one
   * they are looking at. Never guess a value to fill this in.
   */
  readonly beforeUnavailable?: boolean;
  /** Value after the write. */
  readonly after?: unknown;
  /** Reader-facing name for the row, when the table can supply one. */
  readonly rowLabel?: string;
}

/**
 * Kit button the approval chrome calls.
 *
 * @public
 */
export interface AgentApprovalButtonProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Part name, so styling can target this element. */
  readonly part: string;
  /** Class for the element. */
  readonly className?: string;
  /** Called when pressed. */
  readonly onClick: () => void;
}

/**
 * Kit region that wraps the proposal list.
 *
 * @public
 */
export interface AgentApprovalListProps {
  /** Part name for the list. */
  readonly part: string;
  /** Accessible name for the list. */
  readonly label: string;
  /** Class for the list. */
  readonly className?: string;
  /** The proposal rows. */
  readonly children: ReactNode;
}

/**
 * Adapter-supplied controls for {@link AgentApprovalChrome}.
 *
 * @public
 */
export interface AgentApprovalSlots {
  /** Renders the approve control. */
  readonly Approve: (props: AgentApprovalButtonProps) => ReactNode;
  /** Renders the reject control. */
  readonly Reject: (props: AgentApprovalButtonProps) => ReactNode;
  /** Renders the proposal list region. */
  readonly List: (props: AgentApprovalListProps) => ReactNode;
  /**
   * Renders a quiet control that decides nothing — opening the full list of
   * changes, or leaving it. A link or tertiary button, never a third
   * decision beside Approve and Reject.
   */
  readonly Action: (props: AgentApprovalButtonProps) => ReactNode;
}

/**
 * Props for an adapter `AgentApproval` — no slots on the public API.
 *
 * @public
 */
export interface AgentApprovalProps {
  /**
   * The live approval, or nothing.
   *
   * The strip draws only when this is set AND the approval's presentation
   * names the table. Exactly one surface owns a decision: the others may say
   * a write is waiting, but must not offer a second set of buttons for it.
   */
  readonly pending?: AgentApprovalPending | null;
  /** Labels; falls back to the built-in English. */
  readonly labels?: TableLabels;
  /** Class for the strip. */
  readonly className?: string;
  /** Class for each button. */
  readonly buttonClassName?: string;
}

/**
 * Props for {@link AgentApprovalChrome}.
 *
 * @public
 */
export interface AgentApprovalChromeProps extends AgentApprovalProps {
  /** The kit's components for each part. */
  readonly slots: AgentApprovalSlots;
}

/**
 * The strip that asks a reader to approve or reject an agent write.
 *
 * Rendered only while a proposal is pending — a bar that is always there
 * says the table is waiting when it is not. Focus moves into the region
 * when a proposal arrives. Escape rejects. Enter is not a silent confirm.
 *
 * @param props - See {@link AgentApprovalChromeProps}.
 * @returns The strip, or nothing.
 *
 * @public
 */
export function AgentApprovalChrome({
  pending,
  labels,
  className,
  buttonClassName,
  slots,
}: Readonly<AgentApprovalChromeProps>): ReactElement | null {
  const regionRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  // Only this surface's approvals. A write reviewed in the assistant window
  // must not also grow a set of buttons above the table.
  const mine = pending?.presentation === "table" ? pending : null;
  const review = approvalReview(mine, labels);
  const count = review?.changes ?? 0;
  const hasOperation = review?.operation !== undefined;
  const open = review !== null;
  const reject = mine?.reject;

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      return;
    }
    const root = regionRef.current;
    if (!root) return;
    const first = root.querySelector<HTMLElement>(
      '[data-adapttable-part="agent-approval-reject"]'
    );
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        reject?.();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [open, count, hasOperation, reject]);

  if (!review || !mine) return null;

  return (
    <section
      ref={regionRef}
      data-adapttable-part="agent-approval"
      className={className}
      aria-label={review.summary}
      tabIndex={-1}
    >
      <LiveRegion part="agent-approval-status" statusRole={false}>
        {review.summary}
      </LiveRegion>
      <ApprovalReviewChrome
        review={review}
        {...(labels ? { labels } : {})}
        slots={slots}
        expanded={expanded}
        onExpand={() => setExpanded(true)}
        onBack={() => setExpanded(false)}
        onApprove={mine.approve}
        onReject={mine.reject}
        {...(mine.decideAt ? { onDecide: mine.decideAt } : {})}
        {...(className ? { className } : {})}
        {...(buttonClassName ? { buttonClassName } : {})}
      />
    </section>
  );
}
