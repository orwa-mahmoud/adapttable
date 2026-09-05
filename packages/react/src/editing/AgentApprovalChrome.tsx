/**
 * Review strip for a pending agent write.
 *
 * Structure, keyboard, and part names live here. Every visible control is a
 * required kit slot — core never draws a button. Invisible live-region
 * announcements are the one thing this chrome owns itself.
 */
import { type ReactElement, type ReactNode, useEffect, useRef } from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import { featureStateKey } from "../features/providers";
import type { TableLabels } from "@adapttable/core";

/**
 * Live pending-approval state published by the optional agent feature.
 *
 * Adapters read this and fill {@link AGENT_APPROVAL}. The optional AI
 * package stays out of the adapter graph.
 *
 * @public
 */
export interface AgentApprovalPending {
  /** Proposed writes waiting for a human decision. */
  readonly proposals: readonly AgentApprovalProposal[];
  /** Confirm the proposals and continue the host write path. */
  readonly approve: () => void;
  /** Dismiss the proposals without writing. */
  readonly reject: () => void;
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
  /** Value before the write. */
  readonly before?: unknown;
  /** Value after the write. */
  readonly after?: unknown;
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
}

/**
 * Props for an adapter `AgentApproval` — no slots on the public API.
 *
 * @public
 */
export interface AgentApprovalProps {
  /** Proposed writes waiting for a decision. Empty or omitted hides the chrome. */
  readonly proposals?: readonly AgentApprovalProposal[];
  /** Labels; falls back to the built-in English. */
  readonly labels?: TableLabels;
  /** Class for the strip. */
  readonly className?: string;
  /** Class for each button. */
  readonly buttonClassName?: string;
  /** Approve the pending proposal. */
  readonly onApprove: () => void;
  /** Reject the pending proposal. */
  readonly onReject: () => void;
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

function displayValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function defaultPending(count: number): string {
  return count === 1
    ? "1 proposed change"
    : `${String(count)} proposed changes`;
}

function defaultChange(change: {
  row: string;
  column?: string;
  before?: string;
  after?: string;
}): string {
  const field = change.column ? `${change.row} · ${change.column}` : change.row;
  if (change.before === undefined && change.after === undefined) return field;
  return `${field}: ${change.before ?? "—"} → ${change.after ?? "—"}`;
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
  proposals,
  labels,
  className,
  buttonClassName,
  onApprove,
  onReject,
  slots,
}: Readonly<AgentApprovalChromeProps>): ReactElement | null {
  const regionRef = useRef<HTMLElement>(null);
  const pending = proposals ?? [];
  const count = pending.length;

  useEffect(() => {
    if (count === 0) return;
    const root = regionRef.current;
    if (!root) return;
    const first = root.querySelector<HTMLElement>(
      '[data-adapttable-part="agent-approval-reject"]'
    );
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onReject();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [count, onReject]);

  if (count === 0) return null;

  const heading = (labels?.pendingProposals ?? defaultPending)(count);
  const describe = labels?.proposalChange ?? defaultChange;
  const Approve = slots.Approve;
  const Reject = slots.Reject;
  const List = slots.List;

  return (
    <section
      ref={regionRef}
      data-adapttable-part="agent-approval"
      className={className}
      aria-label={heading}
      tabIndex={-1}
      style={{ display: "flex", alignItems: "flex-start", gap: "0.5em" }}
    >
      <LiveRegion part="agent-approval-status" statusRole={false}>
        {heading}
      </LiveRegion>
      <List part="agent-approval-list" label={heading}>
        {pending.map((proposal, index) => (
          <div
            key={`${proposal.rowKey}:${proposal.column ?? ""}:${String(index)}`}
            data-adapttable-part="agent-approval-row"
          >
            {describe({
              row: proposal.rowKey,
              column: proposal.column,
              before: displayValue(proposal.before),
              after: displayValue(proposal.after),
            })}
          </div>
        ))}
      </List>
      <Reject
        label={labels?.rejectProposal ?? "Reject"}
        part="agent-approval-reject"
        className={buttonClassName}
        onClick={onReject}
      />
      <Approve
        label={labels?.approveProposal ?? "Approve"}
        part="agent-approval-approve"
        className={buttonClassName}
        onClick={onApprove}
      />
    </section>
  );
}
