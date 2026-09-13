/**
 * Review strip for a pending agent write.
 *
 * Structure, keyboard, and part names live here. Every visible control is a
 * required kit slot — core never draws a button. Invisible live-region
 * announcements are the one thing this chrome owns itself.
 */
import type { AgentApprovalPending, TableLabels } from "@adapttable/core";
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

// The contracts a surface is handed now live in core, where an adapter can
// name them without an AI runtime in its graph. Re-exported here because this
// is where every kit already imports them from.
export type {
  AgentApprovalDecision,
  AgentApprovalOperation,
  AgentApprovalPending,
  AgentApprovalProposal,
} from "@adapttable/core";

/** Feature-state key for a pending agent approval. @public */
export const AGENT_APPROVAL_STATE =
  featureStateKey<AgentApprovalPending | null>("agent-approval-pending");

/**
 * What the reader has waved through, and how to take it back.
 *
 * Separate from the pending approval because it outlives one: the list has to
 * be visible — and revocable — when nothing is waiting, which is exactly when
 * a reader goes looking for what they agreed to.
 *
 * @public
 */
export interface AgentAlwaysAllowState {
  /** Capability keys the reader said not to ask about again. */
  readonly capabilities: readonly string[];
  /** Ask about this capability again from now on. */
  readonly revoke: (capability: string) => void;
}

/** Feature-state key for the remembered "don't ask again" set. @public */
export const AGENT_ALWAYS_ALLOW_STATE =
  featureStateKey<AgentAlwaysAllowState | null>("agent-always-allow");

/**
 * The live view and filter data the manifest does not carry.
 *
 * A reader rather than a value: it is read when a turn starts and again when
 * it settles, and a value captured a render earlier would report that nothing
 * moved — which is precisely what per-turn undo has to be able to tell.
 *
 * @public
 */
export interface AgentViewState {
  /** Read the table's live view and filter catalog, right now. */
  readonly read: () => unknown;
}

/** Feature-state key for that reader. @public */
export const AGENT_VIEW_STATE = featureStateKey<AgentViewState | null>(
  "agent-view-state"
);

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
        {...(mine.alwaysAllow ? { onAlwaysAllow: mine.alwaysAllow } : {})}
        {...(className ? { className } : {})}
        {...(buttonClassName ? { buttonClassName } : {})}
      />
    </section>
  );
}
