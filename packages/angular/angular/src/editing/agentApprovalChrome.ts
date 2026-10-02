/** The table-owned approval strip, using the shared review body. */
import {
  type AgentApprovalPending,
  approvalReview,
  type TableLabels,
} from "@adapttable/core";
import type { AgentApprovalProps } from "@adapttable/core/binding";
import {
  afterEveryRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from "@angular/core";

import { AdaptLiveRegion } from "../a11y/liveRegion";
import {
  AdaptApprovalReviewChrome,
  type ApprovalReviewSlots,
} from "./approvalReviewChrome";

export type { AgentApprovalListProps } from "./approvalReviewChrome";
export type {
  AgentApprovalDecision,
  AgentApprovalOperation,
  AgentApprovalPending,
  AgentApprovalProposal,
  AgentProgress,
} from "@adapttable/core";
export {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  type AgentAlwaysAllowState,
  type AgentApprovalButtonProps,
  type AgentApprovalProps,
  type AgentViewState,
} from "@adapttable/core/binding";

/** Required kit components used by the approval strip. @public */
export type AgentApprovalSlots = ApprovalReviewSlots;

/** Inputs for the table-owned approval strip. @public */
export interface AgentApprovalChromeProps extends AgentApprovalProps {
  /** The kit's own components. */
  readonly slots: AgentApprovalSlots;
}

/**
 * Shows only decisions assigned to the table. On arrival focus goes to
 * Reject; Escape rejects, while Enter never acts as a blanket approval.
 * When the review closes, focus returns to its still-connected opener.
 *
 * @public
 */
@Component({
  selector: "adapt-agent-approval-chrome",
  imports: [AdaptApprovalReviewChrome, AdaptLiveRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (mine(); as pending) {
      @if (review(); as review) {
        <section
          #region
          data-adapttable-part="agent-approval"
          [class]="className()"
          [attr.aria-label]="review.summary"
          tabindex="-1"
          (keydown)="onKeyDown($event)"
        >
          <div
            [adaptLiveRegion]="review.summary"
            part="agent-approval-status"
          ></div>
          <adapt-approval-review-chrome
            [review]="review"
            [labels]="labels()"
            [slots]="slots()"
            [expanded]="expanded()"
            [onExpand]="expand"
            [onBack]="back"
            [onApprove]="pending.approve"
            [onReject]="pending.reject"
            [onDecide]="pending.decideAt"
            [onAlwaysAllow]="pending.alwaysAllow"
            [className]="className()"
            [buttonClassName]="buttonClassName()"
          />
        </section>
      }
    }
  `,
})
export class AdaptAgentApprovalChrome {
  /** Live approval; other presentation modes are owned by other surfaces. */
  readonly pending = input<AgentApprovalPending | null>();
  /** Localized copy. */
  readonly labels = input<TableLabels>();
  /** Required kit controls. */
  readonly slots = input.required<AgentApprovalSlots>();
  /** Class on the strip and review. */
  readonly className = input<string>();
  /** Class on every button. */
  readonly buttonClassName = input<string>();

  protected readonly mine = computed(() => {
    const pending = this.pending();
    return pending?.presentation === "table" ? pending : null;
  });
  protected readonly review = computed(() =>
    approvalReview(this.mine(), this.labels())
  );
  protected readonly expanded = signal(false);
  protected readonly expand = () => this.expanded.set(true);
  protected readonly back = () => this.expanded.set(false);

  private readonly region = viewChild<ElementRef<HTMLElement>>("region");
  private opener: HTMLElement | null = null;
  private activeRegion: HTMLElement | undefined;
  private activeReject: AgentApprovalPending["reject"] | undefined;

  constructor() {
    afterEveryRender(() => {
      const pending = this.mine();
      const region = this.region()?.nativeElement;
      if (!pending || !region) {
        this.restoreFocus();
        this.activeRegion = undefined;
        this.activeReject = undefined;
        this.expanded.set(false);
        return;
      }
      if (
        region === this.activeRegion &&
        pending.reject === this.activeReject
      ) {
        return;
      }
      const active = region.ownerDocument.activeElement;
      if (active instanceof HTMLElement && !region.contains(active)) {
        this.opener = active;
      }
      this.activeRegion = region;
      this.activeReject = pending.reject;
      this.expanded.set(false);
      region
        .querySelector<HTMLElement>(
          '[data-adapttable-part="agent-approval-reject"]'
        )
        ?.focus();
    });
    inject(DestroyRef).onDestroy(() => this.restoreFocus());
  }

  /** Escape belongs to this review, including when a kit button has focus. */
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    this.mine()?.reject();
  }

  private restoreFocus(): void {
    const opener = this.opener;
    if (!opener) return;
    const active = opener.ownerDocument.activeElement;
    if (
      opener.isConnected &&
      (active === opener.ownerDocument.body ||
        (active instanceof Node && this.activeRegion?.contains(active)))
    ) {
      opener.focus();
    }
    this.opener = null;
  }
}
