/**
 * The shared approval review body. Core owns the review model; this Chrome
 * owns its structure and every control is supplied by the kit.
 */
import {
  type AgentApprovalProposal,
  type ApprovalReview,
  type ApprovalReviewItem,
  resolveLabels,
  type TableLabels,
} from "@adapttable/core";
import type {
  AgentApprovalButtonProps,
  AgentApprovalListProps as NeutralAgentApprovalListProps,
} from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";

import { AdaptControl } from "../control";

/** The controls carry these parts on the kit's actual elements. */
const APPROVAL_REVIEW_PARTS = {
  approve: "agent-approval-approve",
  alwaysAllow: "agent-approval-always-allow",
  expand: "approval-review-expand",
  back: "approval-review-back",
  rowApprove: "approval-review-row-approve",
  rowReject: "approval-review-row-reject",
} as const;

let nextHeadingId = 0;

/** Props for the kit's list, whose children are an Angular template. @public */
export type AgentApprovalListProps = NeutralAgentApprovalListProps<
  TemplateRef<unknown> | undefined
>;

/** Required kit controls, each receiving a single `props` input. @public */
export interface ApprovalReviewSlots {
  /** Approve one change or everything still undecided. */
  readonly Approve: Type<unknown>;
  /** Reject one change or everything still undecided. */
  readonly Reject: Type<unknown>;
  /** A real list that outlets the proposal-row template. */
  readonly List: Type<unknown>;
  /** The quieter expansion, back and optional always-allow control. */
  readonly Action: Type<unknown>;
}

/** The inputs accepted by the shared review body. @public */
export interface ApprovalReviewChromeProps {
  /** The shared, framework-neutral review model. */
  readonly review: ApprovalReview;
  /** Localized copy; omitted labels retain English defaults. */
  readonly labels?: TableLabels;
  /** The kit's own controls. */
  readonly slots: ApprovalReviewSlots;
  /** Show the complete list instead of the preview. */
  readonly expanded?: boolean;
  /** Expand the list; absent means no expansion control. */
  readonly onExpand?: () => void;
  /** Return to the preview; absent means no back control. */
  readonly onBack?: () => void;
  /** Approve everything still undecided. */
  readonly onApprove: () => void;
  /** Reject everything still undecided. */
  readonly onReject: () => void;
  /** Decide one proposal, when the write can be split. */
  readonly onDecide?: (index: number, approved: boolean) => void;
  /** Approve and remember this capability for the current session. */
  readonly onAlwaysAllow?: () => void;
  /** Class on the review and the proposal list. */
  readonly className?: string;
  /** Class on every kit button. */
  readonly buttonClassName?: string;
}

/** A readable value, preserving the difference between absent and empty. */
function display(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/** Prefer the column's own display units and the reader's vocabulary. */
function describeItem(
  proposal: AgentApprovalProposal,
  labels: TableLabels | undefined
): string {
  const copy = resolveLabels(labels);
  const describe = copy.proposalChange;
  return describe({
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

/** The arguments a host receives, read as pairs without inventing row data. */
function argumentPairs(
  args: unknown
): readonly { name: string; value: string }[] {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    const single = display(args);
    return single === undefined ? [] : [{ name: "", value: single }];
  }
  return Object.entries(args as Record<string, unknown>).map(
    ([name, value]) => ({
      name: name
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/^./, (first) => first.toUpperCase()),
      value: display(value) ?? "—",
    })
  );
}

/**
 * The same review body in the table strip, assistant and modal. No visible
 * controls are drawn here: even the list is a required kit slot.
 *
 * @public
 */
@Component({
  selector: "adapt-approval-review-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  templateUrl: "./approvalReviewChrome.html",
})
export class AdaptApprovalReviewChrome {
  /** Shared review model. */
  readonly review = input.required<ApprovalReview>();
  /** Kit controls. */
  readonly slots = input.required<ApprovalReviewSlots>();
  /** Localized labels. */
  readonly labels = input<TableLabels>();
  protected readonly copy = computed(() => resolveLabels(this.labels()));
  /** Whether to show every proposal. */
  readonly expanded = input<boolean | undefined>(false);
  /** Expand the list. */
  readonly onExpand = input<() => void>();
  /** Return to the preview. */
  readonly onBack = input<() => void>();
  /** Approve all undecided proposals. */
  readonly onApprove = input.required<() => void>();
  /** Reject all undecided proposals. */
  readonly onReject = input.required<() => void>();
  /** Optional per-proposal decision callback. */
  readonly onDecide = input<(index: number, approved: boolean) => void>();
  /** Optional session-wide decision callback. */
  readonly onAlwaysAllow = input<() => void>();
  /** Class for the review and list. */
  readonly className = input<string>();
  /** Class for kit controls. */
  readonly buttonClassName = input<string>();

  /** Unique heading, including when two tables are mounted together. */
  protected readonly headingId = `approval-review-${String(++nextHeadingId)}`;
  private readonly rowsTemplate =
    viewChild<TemplateRef<unknown>>("rowsTemplate");

  protected readonly pairs = computed(() =>
    argumentPairs(this.review().operation?.arguments)
  );

  private readonly shown = computed(() =>
    this.expanded() ? this.review().items : this.review().preview
  );

  protected readonly perItem = computed(
    () =>
      this.review().perItem &&
      this.shown().length > 1 &&
      this.onDecide() !== undefined
  );

  protected readonly rows = computed(
    (): readonly {
      readonly item: ApprovalReviewItem;
      readonly text: string;
      readonly approve: AgentApprovalButtonProps;
      readonly reject: AgentApprovalButtonProps;
    }[] => {
      const labels = this.copy();
      const decide = this.onDecide();
      return this.shown().map((item) => ({
        item,
        text: describeItem(item.proposal, labels),
        approve: this.button(
          labels.approveProposal,
          APPROVAL_REVIEW_PARTS.rowApprove,
          () => decide?.(item.index, true)
        ),
        reject: this.button(
          labels.rejectProposal,
          APPROVAL_REVIEW_PARTS.rowReject,
          () => decide?.(item.index, false)
        ),
      }));
    }
  );

  protected readonly listProps = computed((): AgentApprovalListProps => ({
    part: "agent-approval-list",
    label: this.review().summary,
    children: this.rowsTemplate(),
    ...(this.className() ? { className: this.className()! } : {}),
  }));

  protected readonly approveProps = computed(() =>
    this.button(
      this.review().approveLabel,
      APPROVAL_REVIEW_PARTS.approve,
      this.onApprove()
    )
  );

  protected readonly rejectProps = computed(() =>
    this.button(
      this.review().rejectLabel,
      "agent-approval-reject",
      this.onReject()
    )
  );

  protected readonly expandProps = computed(() => {
    const label = this.review().reviewAllLabel;
    const expand = this.onExpand();
    return !this.expanded() && label && expand
      ? this.button(label, APPROVAL_REVIEW_PARTS.expand, expand)
      : undefined;
  });

  protected readonly backProps = computed(() => {
    const back = this.onBack();
    return this.expanded() && back
      ? this.button(
          this.copy().backToConversation,
          APPROVAL_REVIEW_PARTS.back,
          back
        )
      : undefined;
  });

  protected readonly alwaysAllowProps = computed(() => {
    const allow = this.onAlwaysAllow();
    return allow
      ? this.button(
          this.copy().alwaysAllowProposal,
          APPROVAL_REVIEW_PARTS.alwaysAllow,
          allow
        )
      : undefined;
  });

  private button(
    label: string,
    part: string,
    onClick: () => void
  ): AgentApprovalButtonProps {
    const className = this.buttonClassName();
    return { label, part, onClick, ...(className ? { className } : {}) };
  }
}
