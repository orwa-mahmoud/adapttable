/** The assistant's structure, keyboard behavior and announcements; controls belong to the kit. */
import type { TableAssistantProps } from "@adapttable/angular";
import {
  type AgentApprovalPending,
  approvalReview,
  resolveLabels,
} from "@adapttable/core";
import {
  type AgentApprovalButtonProps,
  assistantBadgeTone,
  assistantComposerState,
  assistantLauncherName,
  assistantQuestion,
  assistantRejoinable,
  assistantWithGreeting,
} from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  InjectionToken,
  input,
  type Signal,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { AdaptLiveRegion } from "../a11y/liveRegion";
import { AdaptControl } from "../control";
import {
  AdaptApprovalReviewChrome,
  type AgentApprovalListProps,
  type ApprovalReviewSlots,
} from "../editing/approvalReviewChrome";
import {
  AdaptAssistantComposer,
  type AssistantComposerProps,
} from "./assistantComposer";
import {
  ASSISTANT_CLOSE_ICON,
  ASSISTANT_SETTINGS_ICON,
  assistantKindIcon,
} from "./assistantIcons";
import {
  AdaptAssistantAlwaysAllowed,
  AdaptAssistantMessage,
  AdaptAssistantWorking,
  AdaptSpeakerMark,
} from "./assistantMessages";
import {
  floatingStyle,
  injectAssistantFloatingFits,
  launcherStyle,
} from "./assistantPlacement";
import type {
  TableAssistantButtonProps,
  TableAssistantSlots,
} from "./assistantSlots";
import { injectConversationScroll } from "./conversationScroll";

export type { TableAssistantProps } from "@adapttable/angular";
export type { TableAssistantBoundary } from "@adapttable/core/binding";
export { assistantIsBusy } from "@adapttable/core/binding";

const ASSISTANT_SURFACE_PARTS = {
  floating: "assistant-window",
  sheet: "assistant-sheet",
  panel: "assistant-panel",
};

const ASSISTANT_CONTROLS = new InjectionToken<Signal<TableAssistantSlots>>(
  "ASSISTANT_CONTROLS"
);

/** Adapts the review's decision roles to the assistant kit's button vocabulary. */
@Component({
  selector: "adapt-assistant-approval-button",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<ng-container
    [adaptControl]="slots().Button"
    [adaptControlProps]="button()"
  />`,
})
export class AdaptAssistantApprovalButton {
  readonly props = input.required<AgentApprovalButtonProps>();
  protected readonly slots = inject(ASSISTANT_CONTROLS);
  protected readonly button = computed((): TableAssistantButtonProps => {
    const props = this.props();
    let variant: TableAssistantButtonProps["variant"] = "subtle";
    if (props.part.endsWith("-approve")) variant = "primary";
    else if (props.part.endsWith("-reject")) variant = "secondary";
    return { ...props, variant };
  });
}

/** Structural list only: the assistant's kit buttons own all decisions. */
@Component({
  selector: "adapt-assistant-approval-list",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ul
    [attr.data-adapttable-part]="props().part"
    [attr.aria-label]="props().label"
    [class]="props().className"
    style="list-style:none;margin:0;padding:0"
  >
    @if (props().children; as children) {
      <ng-container [ngTemplateOutlet]="children" />
    }
  </ul>`,
})
export class AdaptAssistantApprovalList {
  readonly props = input.required<AgentApprovalListProps>();
}

/** Structural assistant props plus the kit controls. @public */
export interface TableAssistantChromeProps extends TableAssistantProps {
  readonly slots: TableAssistantSlots;
}

/** A complete conversation, presented beside the table or in the kit's own overlay. @public */
@Component({
  selector: "adapt-table-assistant-chrome",
  providers: [
    {
      provide: ASSISTANT_CONTROLS,
      useFactory: () => inject(AdaptTableAssistantChrome).slots,
    },
  ],
  imports: [
    AdaptControl,
    AdaptLiveRegion,
    AdaptAssistantComposer,
    AdaptAssistantMessage,
    AdaptAssistantAlwaysAllowed,
    AdaptAssistantWorking,
    AdaptSpeakerMark,
    AdaptApprovalReviewChrome,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  templateUrl: "./tableAssistantChrome.html",
})
export class AdaptTableAssistantChrome {
  /** Framework-neutral conversation and presentation options. */
  readonly props = input.required<TableAssistantProps>();
  /** Kit controls; none have a native fallback in this binding. */
  readonly slots = input.required<TableAssistantSlots>();
  private readonly fits = injectAssistantFloatingFits();
  private readonly contents = viewChild<TemplateRef<unknown>>("contents");
  private readonly launcherContent =
    viewChild<TemplateRef<unknown>>("launcherContent");
  private readonly modalContent =
    viewChild<TemplateRef<unknown>>("modalContent");
  private readonly surface = viewChild<ElementRef<HTMLElement>>("surface");
  private readonly launcherAnchor =
    viewChild<ElementRef<HTMLElement>>("launcherAnchor");
  private readonly conversation =
    viewChild<ElementRef<HTMLElement>>("conversation");
  protected readonly expanded = signal(false);
  protected readonly scroll = injectConversationScroll(
    computed(() => this.props().assistant.messages.length),
    computed(() => this.conversation()?.nativeElement)
  );
  protected readonly copy = computed(() => resolveLabels(this.props().labels));
  protected readonly title = computed(() => this.copy().assistantTitle);
  protected readonly resolved = computed(() => {
    const mode = this.props().presentation ?? "panel";
    return mode === "floating" && !this.fits() ? "sheet" : mode;
  });
  protected readonly status = computed(() =>
    this.copy().assistantConnection(this.props().assistant.status)
  );
  protected readonly badge = computed(() => ({
    label: this.copy().assistantConnection(this.props().assistant.status),
    part: "assistant-connection",
    tone: assistantBadgeTone(this.props().assistant.status),
  }));
  protected readonly messages = computed(() =>
    assistantWithGreeting(
      this.props().assistant.messages,
      this.props().greeting,
      this.props().labels
    )
  );
  /** Hosts may return fresh action objects; resolve them only when source props change. */
  protected readonly messageRows = computed(() => {
    const props = this.props();
    const messages = this.messages();
    const undo = props.assistant.undo;
    return messages.map((message, index) => ({
      message,
      leads: messages[index - 1]?.role !== message.role,
      action: props.messageAction?.(message),
      undo: undo?.messageId === message.id ? undo : undefined,
      onAnswer: message.question ? props.assistant.answer : undefined,
    }));
  });
  protected readonly working = computed(
    () =>
      Boolean(this.props().assistant.busy) &&
      !assistantQuestion(this.messages()) &&
      !this.props().approval
  );
  protected readonly widgetApproval = computed(
    (): AgentApprovalPending | null =>
      this.props().approval?.presentation === "widget"
        ? (this.props().approval ?? null)
        : null
  );
  protected readonly review = computed(() =>
    approvalReview(this.widgetApproval(), this.props().labels)
  );
  protected readonly modalReview = computed(() =>
    approvalReview(
      this.props().approval?.presentation === "modal"
        ? (this.props().approval ?? null)
        : null,
      this.props().labels
    )
  );
  protected readonly reviewSlots = computed((): ApprovalReviewSlots => ({
    Approve: AdaptAssistantApprovalButton,
    Reject: AdaptAssistantApprovalButton,
    Action: AdaptAssistantApprovalButton,
    List: AdaptAssistantApprovalList,
  }));
  protected readonly modalSheet = computed(() => {
    const review = this.modalReview();
    const children = this.modalContent();
    const approval = this.props().approval;
    return review && children && approval
      ? {
          label: review.summary,
          part: "assistant-approval-modal",
          open: true,
          onClose: approval.reject,
          children,
          ...(this.props().dir ? { dir: this.props().dir } : {}),
        }
      : null;
  });
  protected readonly launcherPlacement = computed(() =>
    this.resolved() === "panel"
      ? { display: "contents" }
      : launcherStyle(this.props().boundary ?? "viewport")
  );
  protected readonly launcherButton = computed(
    (): TableAssistantButtonProps => ({
      label: assistantLauncherName(
        this.props().labels,
        !!this.props().approval
      ),
      part: "assistant-launcher",
      variant: "subtle",
      iconOnly: true,
      tooltip: this.copy().assistantOpen,
      icon: this.launcherContent() ?? null,
      onClick: () => {
        this.props().onOpenChange(true);
      },
    })
  );
  protected readonly surfaceComponent = computed(() => {
    if (this.resolved() === "floating") return this.slots().Window;
    if (this.resolved() === "sheet") return this.slots().Sheet;
    return this.slots().Panel;
  });
  protected readonly surfaceProps = computed(() => {
    const children = this.contents();
    if (!children) return null;
    const common = {
      label: this.title(),
      part: ASSISTANT_SURFACE_PARTS[this.resolved()],
      children,
      ...(this.props().className ? { className: this.props().className } : {}),
    };
    if (this.resolved() === "floating")
      return {
        ...common,
        style: floatingStyle(this.props().boundary ?? "viewport"),
      };
    if (this.resolved() === "sheet")
      return {
        ...common,
        open: true,
        onClose: this.close,
        ...(this.props().dir ? { dir: this.props().dir } : {}),
      };
    return common;
  });
  protected readonly close = () => {
    this.props().onOpenChange(false);
  };
  protected readonly expand = () => {
    this.expanded.set(true);
  };
  protected readonly back = () => {
    this.expanded.set(false);
  };
  protected readonly undoTurn = () => {
    void this.props().assistant.undoTurn?.();
  };
  protected readonly undoAction = (key: string) => {
    void this.props().assistant.undoAction?.(key);
  };
  protected readonly closeButton = computed((): TableAssistantButtonProps => ({
    label: this.copy().assistantClose,
    tooltip: this.copy().assistantClose,
    part: "assistant-close",
    variant: "subtle",
    icon: ASSISTANT_CLOSE_ICON,
    iconOnly: true,
    onClick: this.close,
  }));
  protected readonly settingsButton = computed(
    (): TableAssistantButtonProps => ({
      label: this.copy().assistantSettings,
      tooltip: this.copy().assistantSettings,
      part: "assistant-settings",
      variant: "subtle",
      icon: ASSISTANT_SETTINGS_ICON,
      iconOnly: true,
      onClick: () => {
        this.props().onSettings?.();
      },
    })
  );
  protected readonly jumpButton = computed((): TableAssistantButtonProps => ({
    label: this.copy().assistantNewMessages,
    part: "assistant-jump-latest",
    variant: "secondary",
    onClick: this.scroll.jumpToLatest,
  }));
  protected readonly backButton = computed((): TableAssistantButtonProps => ({
    label: this.copy().assistantBackToTable,
    part: "assistant-back",
    variant: "subtle",
    onClick: this.close,
  }));
  protected readonly rejoinButton = computed((): TableAssistantButtonProps => ({
    label: this.copy().assistantRejoin,
    part: "assistant-rejoin",
    variant: "secondary",
    onClick: () => {
      void this.props().assistant.resume?.();
    },
  }));
  protected readonly rejoinable = computed(() =>
    assistantRejoinable(this.props().assistant)
  );
  protected readonly error = computed(() => {
    const assistant = this.props().assistant;
    return (
      (assistant.errorCode === undefined
        ? undefined
        : this.copy().assistantUnresolved(assistant.errorCode)) ??
      assistant.error
    );
  });
  protected readonly composer = computed((): AssistantComposerProps => {
    const props = this.props();
    const assistant = props.assistant;
    const state = assistantComposerState(assistant);
    return {
      labels: this.copy(),
      status: assistant.status,
      ...(state.busy === undefined ? {} : { busy: state.busy }),
      draft: assistant.draft,
      setDraft: assistant.setDraft,
      onSend: state.send,
      onStop: assistant.stop,
      ...(state.answering
        ? {
            placeholder: this.copy().assistantAnswerPlaceholder,
          }
        : {}),
      ...(props.speech ? { speech: props.speech } : {}),
      examples: {
        label: this.copy().assistantExamples,
        items: assistant.suggestions.map((item) => ({
          id: item.id,
          title: item.title,
          ...(item.description ? { description: item.description } : {}),
          icon: assistantKindIcon(item.kind) ?? null,
          part: "assistant-examples-item",
        })),
        onSelect: (id) => {
          void assistant.runSuggestion(id);
        },
      },
    };
  });
  constructor() {
    effect(() => {
      if (!this.review()) this.expanded.set(false);
    });
    let wasOpen: boolean | undefined;
    let previousSurface: HTMLElement | undefined;
    afterRenderEffect(() => {
      const open = this.props().open;
      const surface = this.surface()?.nativeElement;
      const anchor = this.launcherAnchor()?.nativeElement;
      if (open && surface && (wasOpen !== true || previousSurface !== surface))
        surface
          .querySelector<HTMLElement>(
            '[data-adapttable-part="assistant-input"]'
          )
          ?.focus();
      if (!open && wasOpen !== false)
        anchor
          ?.querySelector<HTMLElement>(
            '[data-adapttable-part="assistant-launcher"]'
          )
          ?.focus();
      wasOpen = open;
      previousSurface = surface;
    });
  }
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    this.close();
  }
}
