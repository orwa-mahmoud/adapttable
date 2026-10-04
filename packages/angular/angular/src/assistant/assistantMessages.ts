/** Conversation structure and factual receipts, with all actions supplied by a kit. */
import { resolveLabels, type TableLabels } from "@adapttable/core";
import {
  assistantActionsName,
  assistantInitials,
  assistantReceiptDetail,
  assistantReceiptHeadline,
  assistantReceiptNeedsSave,
  assistantReceiptWhere,
  assistantShownReceipts,
  assistantUndoReason,
  assistantUndoTurnLabel,
  assistantVoicePlaceholder,
  assistantWorkingText,
  type TableAssistantAllowanceView,
  type TableAssistantMessageView,
  type TableAssistantProgressView,
  type TableAssistantReceiptView,
  type TableAssistantUndoView,
} from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from "@angular/core";

import { AdaptControl } from "../control";
import { injectPrefersReducedMotion } from "../hooks/prefersReducedMotion";
import { AdaptIcon } from "../icon";
import {
  AdaptAssistantContent,
  ASSISTANT_ACTIONS_ICON,
  ASSISTANT_AVATAR_ICON,
  ASSISTANT_UNDO_ICON,
  assistantReceiptIcon,
  PERSON_AVATAR_ICON,
} from "./assistantIcons";
import type {
  TableAssistantAvatars,
  TableAssistantButtonProps,
  TableAssistantNode,
  TableAssistantSlots,
} from "./assistantSlots";

const ASSISTANT_MARK_PARTS = {
  user: "assistant-user-mark",
  assistant: "assistant-message-mark",
};

/** A speaker's host-provided face or core glyph, never a visible control. @public */
@Component({
  selector: "adapt-speaker-mark",
  imports: [AdaptAssistantContent, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <span
      aria-hidden="true"
      [attr.data-adapttable-part]="part() ?? markPart()"
      [attr.data-hidden]="hidden() ? 'true' : null"
      [style.opacity]="hidden() ? 0 : 1"
      [style.color]="
        mine()
          ? 'currentColor'
          : 'color-mix(in srgb,var(--adapttable-assistant-accent,currentColor) 85%,currentColor)'
      "
      [style.background]="
        mine()
          ? 'color-mix(in srgb,currentColor 10%,transparent)'
          : 'color-mix(in srgb,var(--adapttable-assistant-accent,currentColor) 16%,transparent)'
      "
      style="display:flex;align-items:center;justify-content:center;inline-size:1.9em;block-size:1.9em;flex-shrink:0;border-radius:50%;overflow:hidden"
    >
      @if (initials()) {
        <span
          data-adapttable-part="assistant-initials"
          style="font-size:0.72em;font-weight:650;letter-spacing:0.02em;white-space:nowrap;line-height:1"
          >{{ initials() }}</span
        >
      } @else if (custom()) {
        <adapt-assistant-content [content]="avatar()" />
      } @else {
        <svg [adaptIcon]="defaultIcon()"></svg>
      }
    </span>
  `,
})
export class AdaptSpeakerMark {
  readonly mine = input(false);
  readonly hidden = input(false);
  readonly avatar = input<TableAssistantNode | undefined>();
  readonly part = input<string | undefined>();
  protected readonly markPart = computed(() =>
    this.mine() ? ASSISTANT_MARK_PARTS.user : ASSISTANT_MARK_PARTS.assistant
  );
  protected readonly initials = computed(() => {
    const avatar = this.avatar();
    return typeof avatar === "string" ? assistantInitials(avatar) : "";
  });
  protected readonly custom = computed(
    () => this.avatar() != null && typeof this.avatar() !== "string"
  );
  protected readonly defaultIcon = computed(() =>
    this.mine() ? PERSON_AVATAR_ICON : ASSISTANT_AVATAR_ICON
  );
}

/**
 * An action outcome, never inferred from the assistant's prose.
 * Use `li[adaptAssistantReceipt]` inside a native receipt list.
 *
 * @public
 */
@Component({
  selector: "adapt-assistant-receipt, li[adaptAssistantReceipt]",
  imports: [AdaptControl, AdaptIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[attr.role]": "nativeListItem ? null : 'listitem'",
    "[attr.data-adapttable-part]": "'assistant-receipt'",
    "[attr.data-status]": "receipt().status",
    "[attr.data-kind]": "receipt().subject?.kind",
    "[style]":
      "'display:flex;align-items:center;justify-content:space-between;gap:0.6em;flex-wrap:wrap;padding:0.55em 0.6em;border-radius:0.7em;border:1px solid color-mix(in srgb,currentColor 12%,transparent)'",
  },
  templateUrl: "./assistantReceipt.html",
})
export class AdaptAssistantReceipt {
  protected readonly nativeListItem =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.localName ===
    "li";
  readonly receipt = input.required<TableAssistantReceiptView>();
  readonly slots = input.required<TableAssistantSlots>();
  readonly labels = input<TableLabels | undefined>();
  protected readonly copy = computed(() => resolveLabels(this.labels()));
  readonly onUndo = input<(() => void) | undefined>();
  protected readonly expanded = signal(false);
  protected readonly glyph = computed(() =>
    assistantReceiptIcon(this.receipt().subject?.kind)
  );
  protected readonly headline = computed(() =>
    assistantReceiptHeadline(this.receipt(), this.copy())
  );
  protected readonly detail = computed(() =>
    assistantReceiptDetail(this.receipt(), this.copy())
  );
  protected readonly where = computed(() =>
    assistantReceiptWhere(this.receipt())
  );
  protected readonly needsSave = computed(() =>
    assistantReceiptNeedsSave(this.receipt())
  );
  protected readonly change = computed(() => {
    const receipt = this.receipt();
    const before = receipt.subject?.before;
    const after = receipt.subject?.after;
    if (!before || !after) return null;
    const phrase =
      receipt.status === "executed"
        ? this.copy().assistantReceiptChange
        : this.copy().assistantReceiptProposed;
    return { before, after, spoken: phrase({ before, after }) };
  });
  protected readonly undoButton = computed((): TableAssistantButtonProps => ({
    label: this.copy().assistantUndo,
    part: "assistant-receipt-undo-button",
    variant: "subtle",
    icon: ASSISTANT_UNDO_ICON,
    onClick: () => {
      this.onUndo()?.();
    },
  }));
  protected readonly saveBadge = computed(() => ({
    label: this.copy().assistantSaveInTable,
    part: "assistant-receipt-save-badge",
    tone: "warning" as const,
  }));
  protected readonly detailButton = computed((): TableAssistantButtonProps => ({
    label: this.copy().assistantDetail,
    part: "assistant-receipt-detail",
    variant: "subtle",
    expanded: this.expanded(),
    onClick: () => {
      this.expanded.update((value) => !value);
    },
  }));
}

let nextReceiptHeading = 0;
/**
 * A message and its optional question, receipts, undo, and host action.
 * Use `li[adaptAssistantMessage]` inside a native conversation list.
 *
 * @public
 */
@Component({
  selector: "adapt-assistant-message, li[adaptAssistantMessage]",
  imports: [
    AdaptControl,
    AdaptSpeakerMark,
    AdaptAssistantReceipt,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[attr.role]": "nativeListItem ? null : 'listitem'",
    "[attr.data-adapttable-part]": "'assistant-message'",
    "[attr.data-role]": "message().role",
    "[style.align-items]": "mine() ? 'flex-end' : 'flex-start'",
    "[style]": "'display:flex;flex-direction:column;gap:0.25em'",
  },
  styles: [
    `
      [data-mine]::after {
        content: "";
        position: absolute;
        inset-block-end: 0;
        inline-size: 0.36em;
        block-size: 0.5em;
        background: inherit;
      }
      [data-mine="false"]::after {
        inset-inline-start: -0.34em;
        clip-path: polygon(100% 0, 100% 100%, 0 100%);
      }
      [data-mine="true"]::after {
        inset-inline-end: -0.34em;
        clip-path: polygon(0 0, 100% 100%, 0 100%);
      }
    `,
  ],
  templateUrl: "./assistantMessage.html",
})
export class AdaptAssistantMessage {
  protected readonly nativeListItem =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.localName ===
    "li";
  readonly message = input.required<TableAssistantMessageView>();
  readonly labels = input<TableLabels | undefined>();
  protected readonly copy = computed(() => resolveLabels(this.labels()));
  readonly slots = input.required<TableAssistantSlots>();
  readonly action = input<
    { readonly label: string; readonly onRun: () => void } | undefined
  >();
  readonly undo = input<TableAssistantUndoView | undefined>();
  readonly onUndo = input<(() => void) | undefined>();
  readonly onUndoAction = input<
    ((idempotencyKey: string) => void) | undefined
  >();
  readonly receipts = input(true);
  readonly leads = input(true);
  readonly avatars = input<TableAssistantAvatars | undefined>();
  readonly onAnswer = input<
    ((answer: { optionId?: string; text?: string }) => void) | undefined
  >();
  protected readonly headingId = `assistant-receipts-${String(++nextReceiptHeading)}`;
  protected readonly expanded = signal(false);
  protected readonly tailInset = signal<number | undefined>(undefined);
  protected readonly mine = computed(() => this.message().role === "user");
  protected readonly speaker = computed(() =>
    this.mine() ? this.copy().assistantYou : this.copy().assistantSpeaker
  );
  protected readonly spoken = computed(() =>
    assistantVoicePlaceholder(this.message(), this.copy())
  );
  protected readonly shown = computed(() =>
    assistantShownReceipts(this.message().receipts)
  );
  protected readonly hasActions = computed(
    () => this.receipts() && this.shown().length > 0
  );
  protected readonly perRow = computed(() =>
    this.onUndoAction()
      ? this.shown().filter((receipt) => receipt.undoable).length
      : 0
  );
  protected readonly undoReason = computed(() =>
    assistantUndoReason(this.undo()?.blockedCode, this.copy())
  );
  protected readonly actionsButton = computed(
    (): TableAssistantButtonProps => ({
      label: assistantActionsName(this.shown().length, this.copy()),
      tooltip: assistantActionsName(this.shown().length, this.copy()),
      part: "assistant-receipts-toggle-button",
      variant: "subtle",
      icon: ASSISTANT_ACTIONS_ICON,
      iconOnly: true,
      expanded: this.expanded(),
      onClick: () => {
        this.expanded.update((value) => !value);
      },
    })
  );
  protected readonly wholeUndo = computed((): TableAssistantButtonProps => ({
    label: assistantUndoTurnLabel(this.perRow(), this.copy()),
    part: "assistant-receipts-undo-all-button",
    variant: "subtle",
    icon: ASSISTANT_UNDO_ICON,
    disabled: !this.undo()?.available,
    tooltip: this.undoReason(),
    onClick: () => {
      this.onUndo()?.();
    },
  }));
  protected readonly loneUndo = computed((): TableAssistantButtonProps => ({
    ...this.wholeUndo(),
    label: this.copy().assistantUndo,
    part: "assistant-undo-button",
    variant: "secondary",
  }));
  private readonly card = viewChild<ElementRef<HTMLElement>>("card");
  private readonly mark = viewChild<ElementRef<HTMLElement>>("mark");
  private readonly stillness = injectPrefersReducedMotion();
  constructor() {
    afterRenderEffect((onCleanup) => {
      if (!this.expanded()) return;
      const card = this.card()?.nativeElement;
      const mark = this.mark()?.nativeElement;
      if (!card || !mark) return;
      const a = mark.getBoundingClientRect();
      const b = card.getBoundingClientRect();
      const centre = a.left + a.width / 2;
      this.tailInset.set(
        getComputedStyle(card).direction === "rtl"
          ? centre - b.left
          : b.right - centre
      );
      const behavior = this.stillness() ? "auto" : "smooth";
      const frame = requestAnimationFrame(() => {
        card.scrollIntoView?.({ block: "nearest", behavior });
      });
      onCleanup(() => {
        cancelAnimationFrame(frame);
      });
    });
  }
  /** Per-receipt handlers change only when their source receipt or action changes. */
  protected readonly receiptRows = computed(() => {
    const undo = this.onUndoAction();
    return this.shown().map((receipt) => ({
      receipt,
      onUndo:
        receipt.undoable && undo
          ? () => {
              undo(receipt.idempotencyKey);
            }
          : undefined,
    }));
  });
  /** Choice controls are derived once per question, not allocated by the template. */
  protected readonly answerOptions = computed(() => {
    const answer = this.onAnswer();
    if (!answer) return [];
    return (this.message().question?.options ?? []).map((option) => {
      const button: TableAssistantButtonProps = {
        label: option.label,
        part: "assistant-question-option",
        variant: "secondary",
        onClick: () => {
          answer({ optionId: option.id });
        },
      };
      return { id: option.id, button };
    });
  });
  protected readonly offerButton = computed(
    (): TableAssistantButtonProps | null => {
      const offer = this.action();
      return offer
        ? {
            label: offer.label,
            part: "assistant-message-action-button",
            variant: "secondary",
            onClick: offer.onRun,
          }
        : null;
    }
  );
}

/**
 * A running turn occupies the same place as its eventual answer.
 * Use `li[adaptAssistantWorking]` inside a native conversation list.
 *
 * @public
 */
@Component({
  selector: "adapt-assistant-working, li[adaptAssistantWorking]",
  imports: [AdaptSpeakerMark, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[attr.role]": "nativeListItem ? null : 'listitem'",
    "[attr.data-adapttable-part]": "'assistant-working'",
    "[attr.aria-hidden]": "'true'",
    "[style]":
      "'display:flex;align-items:center;gap:0.5em;opacity:0.75;min-height:1.5em'",
  },
  styles: [
    `
      @keyframes adapttable-assistant-dot {
        0%,
        80%,
        100% {
          opacity: 0.25;
          transform: translateY(0);
        }
        40% {
          opacity: 1;
          transform: translateY(-0.15em);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        [data-adapttable-part="assistant-working-dot"] {
          animation: none !important;
          opacity: 0.55;
        }
      }
    `,
  ],
  template: `
    <ng-template #content>
      <adapt-speaker-mark /><span style="display:inline-flex;gap:0.25em">
        @for (index of [0, 1, 2]; track index) {
          <span
            data-adapttable-part="assistant-working-dot"
            [style.animation]="
              'adapttable-assistant-dot 1.2s ' +
              index * 0.16 +
              's infinite ease-in-out'
            "
            style="width:0.35em;height:0.35em;border-radius:50%;background:currentColor"
          ></span>
        }</span
      ><span data-adapttable-part="assistant-working-text">{{ word() }}</span>
    </ng-template>
    <ng-container [ngTemplateOutlet]="content" />
  `,
})
export class AdaptAssistantWorking {
  protected readonly nativeListItem =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.localName ===
    "li";
  readonly labels = input<TableLabels | undefined>();
  protected readonly copy = computed(() => resolveLabels(this.labels()));
  readonly progress = input<TableAssistantProgressView | null | undefined>();
  protected readonly word = computed(() =>
    assistantWorkingText(this.progress(), this.copy())
  );
}

/** Standing permissions with a kit-owned way to revoke each one. @public */
@Component({
  selector: "adapt-assistant-always-allowed",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `@if (allowed().length) {
    <div
      data-adapttable-part="assistant-always-allowed"
      style="display:flex;flex-direction:column;gap:0.3em"
    >
      <span data-adapttable-part="assistant-always-allowed-title">{{
        copy().assistantAlwaysAllowedTitle
      }}</span>
      <ul
        style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:0.3em"
      >
        @for (allowance of controls(); track allowance.capability) {
          <li data-adapttable-part="assistant-always-allowed-item">
            <ng-container
              [adaptControl]="slots().Button"
              [adaptControlProps]="allowance.button"
            />
          </li>
        }
      </ul>
    </div>
  }`,
})
export class AdaptAssistantAlwaysAllowed {
  readonly allowed = input.required<readonly TableAssistantAllowanceView[]>();
  readonly labels = input<TableLabels | undefined>();
  protected readonly copy = computed(() => resolveLabels(this.labels()));
  readonly slots = input.required<TableAssistantSlots>();
  readonly onRevoke = input.required<(capability: string) => void>();
  /** Stable slot props also keep the native button focused across harmless checks. */
  protected readonly controls = computed(() => {
    const labels = this.copy();
    const revoke = this.onRevoke();
    return this.allowed().map(({ capability, name }) => {
      const button: TableAssistantButtonProps = {
        label: labels.assistantAlwaysAllowedRevoke(capability),
        children:
          labels.assistantCapabilityName(capability) ?? name ?? capability,
        part: "assistant-always-allowed-revoke",
        variant: "subtle",
        onClick: () => {
          revoke(capability);
        },
      };
      return { capability, button };
    });
  });
}
