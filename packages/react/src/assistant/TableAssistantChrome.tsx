/**
 * The assistant panel: structure, keyboard, part names, announcements.
 *
 * Nothing a reader can click is drawn here — every control is a kit slot, so
 * a Mantine table's assistant is Mantine and an antd table's is antd. What
 * this file owns is the behaviour that must be identical everywhere: which
 * surface a viewport gets, where focus goes, what Escape does, and what a
 * screen reader is told.
 *
 * The panel is deliberately NOT inside the table. It sits beside it, so it
 * never covers the cells the reader is asking about; on a viewport too narrow
 * for both, it becomes the kit's own modal sheet instead of a panel squeezed
 * to nothing.
 */
import type { TableLabels } from "@adapttable/core";
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import type { AgentApprovalPending } from "../editing/AgentApprovalChrome";
import { type ApprovalReview, approvalReview } from "../editing/approvalReview";
import {
  ApprovalReviewChrome,
  type ApprovalReviewSlots,
} from "../editing/ApprovalReviewChrome";
import { AssistantComposer } from "./AssistantComposer";
import { CloseIcon, SettingsIcon, SuggestionIcon } from "./assistantIcons";
import {
  AssistantAlwaysAllowed,
  AssistantMessage,
  AssistantWorking,
  BUBBLE_CSS,
  SpeakerMark,
} from "./AssistantMessages";
import {
  FLOATING_MIN_WIDTH,
  floatingFits,
  floatingStyle,
  launcherStyle,
  type TableAssistantBoundary,
} from "./assistantPlacement";
import type {
  TableAssistantAvatars,
  TableAssistantSlots,
} from "./assistantSlots";
import {
  assistantIsBusy,
  type TableAssistantMessageView,
  type TableAssistantQuestionView,
  type TableAssistantView,
} from "./assistantView";
import type { SpeechInputHandle } from "./speechView";

export type { TableAssistantBoundary } from "./assistantPlacement";

/** Whether the panel is mid-turn — re-exported for a host's own chrome. */
export { assistantIsBusy };
import { useConversationScroll } from "./useConversationScroll";

/**
 * Which surface the conversation takes.
 *
 * - `floating` — a nonmodal window over the page, anchored bottom
 *   inline-end. The table keeps its full width and stays operable. Below the
 *   width where that stops being true it becomes the kit's own modal sheet.
 * - `panel` — an in-flow surface the host places itself.
 * - `sheet` — the kit's modal sheet at every width.
 *
 * @public
 */
export type TableAssistantPresentation = "panel" | "sheet" | "floating";

/**
 * Props for an adapter `TableAssistant` — no slots on the public API.
 *
 * @public
 */
export interface TableAssistantProps {
  /**
   * Writing direction for surfaces this chrome draws through a portal.
   *
   * The panel and the launcher inherit direction from wherever the host put
   * them; the narrow-viewport sheet does not, because every kit portals it to
   * the document root. A right-to-left table passes `"rtl"` here so the sheet
   * is laid out the way the table it belongs to is.
   */
  readonly dir?: "ltr" | "rtl";
  /** The live conversation. */
  readonly assistant: TableAssistantView;
  /**
   * Dictation, when the host turned it on.
   *
   * Built by `useSpeechInput` and passed through, so the chrome draws a mic
   * without knowing anything about recognizers or recorders — and draws none
   * at all when this browser cannot listen.
   */
  readonly speech?: SpeechInputHandle;
  /** Whether the panel is showing. */
  readonly open: boolean;
  /** Asked to open or close. */
  readonly onOpenChange: (open: boolean) => void;
  /**
   * Nonmodal panel beside the table, or a modal sheet over it.
   *
   * A host that knows its own layout sets this; the default is a panel,
   * because a modal that was not asked for is worse than a narrow one.
   */
  readonly presentation?: TableAssistantPresentation;
  /** Labels; falls back to the built-in English. */
  readonly labels?: TableLabels;
  /**
   * The colour the conversation is drawn in.
   *
   * Any CSS colour, usually one of the kit's own tokens — each adapter passes
   * its primary. Everything mixes against it rather than using it flat, so a
   * strong brand colour tints the surfaces without shouting. Without one the
   * panel borrows the text colour, which is legible everywhere and belongs to
   * no brand.
   */
  readonly accent?: string;
  /**
   * Whether each action draws a card under the reply.
   *
   * On by default, and the reason is that a receipt is the only thing in the
   * conversation the reader can trust: the words above it are the model's,
   * and the card is read from what the table actually did. A host that has
   * its own account of a turn — an audit trail, a toast, a status line —
   * turns them off here rather than being given two.
   *
   * Turning them off hides the cards, not the record: the receipts stay in
   * the conversation state for a host that reads them.
   */
  readonly receipts?: boolean;
  /** Class for the surface. */
  readonly className?: string;
  /** Hide the floating launcher when the host supplies its own trigger. */
  readonly launcher?: boolean;
  /** Opens the host's own settings. Omit and no settings control is drawn. */
  readonly onSettings?: () => void;
  /**
   * Where a floating window is placed: the viewport, or a container of the
   * host's own. Ignored by the other presentations.
   */
  readonly boundary?: TableAssistantBoundary;
  /**
   * One sentence under the empty conversation's heading, for what the host
   * alone knows — that the examples are scripted until a backend is
   * connected, say.
   */
  readonly note?: string;
  /**
   * The assistant's opening line, before anyone has typed.
   *
   * Omit it and the panel opens with the built-in question. Pass your own to
   * say what this assistant is for — it is the first thing a reader reads,
   * and a table's own words beat a generic one. Pass an empty string and the
   * panel opens silent: an empty conversation with nothing standing in for a
   * message nobody wrote.
   */
  readonly greeting?: string;
  /**
   * The marks beside what each speaker said.
   *
   * A photograph, initials, the kit's own Avatar — anything React can render.
   * The panel draws the circle and the size, so a host supplies the face and
   * nothing else, and either side left out keeps its glyph.
   */
  readonly avatars?: TableAssistantAvatars;
  /**
   * An offer to put at the end of one reply.
   *
   * The panel knows a message arrived; only the host knows whether it was an
   * answer or a wall. A scripted demo that cannot understand a question can
   * hand back the way past it — "connect a backend" — instead of leaving the
   * reader to find it. Return nothing for messages that need no offer.
   */
  readonly messageAction?: (
    message: TableAssistantMessageView
  ) => { readonly label: string; readonly onRun: () => void } | undefined;
  /**
   * A write waiting on the reader.
   *
   * The panel reviews it here when the approval's presentation names the
   * widget — which is the default, because the conversation is where the
   * write was asked for. Any other presentation reviews it elsewhere and the
   * panel only says so, rather than growing a second set of controls for one
   * decision.
   */
  readonly approval?: AgentApprovalPending | null;
}

/** Props for {@link TableAssistantChrome}. @public */
export interface TableAssistantChromeProps extends TableAssistantProps {
  /** The kit's components for each part. */
  readonly slots: TableAssistantSlots;
}

/**
 * Whether a floating window still fits.
 *
 * Subscribed rather than measured once: a reader who rotates a tablet or
 * drags a window narrower gets the sheet, and the conversation carries over
 * because only the surface changes — the controller above it never remounts.
 */
function useFloatingFits(): boolean {
  const subscribe = useCallback((notify: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    // `matchMedia` is absent in jsdom, and the minimal stubs test setups and
    // embedded webviews install often return nothing usable. Resize is the
    // coarser signal but it is always there, so the window still becomes a
    // sheet on a narrow viewport rather than throwing on the way.
    const query =
      typeof window.matchMedia === "function"
        ? window.matchMedia(`(min-width: ${String(FLOATING_MIN_WIDTH)}px)`)
        : undefined;
    if (typeof query?.addEventListener !== "function") {
      window.addEventListener("resize", notify);
      return () => {
        window.removeEventListener("resize", notify);
      };
    }
    query.addEventListener("change", notify);
    return () => {
      query.removeEventListener("change", notify);
    };
  }, []);
  return useSyncExternalStore(
    subscribe,
    () =>
      typeof window === "undefined" ? true : floatingFits(window.innerWidth),
    () => true
  );
}

function badgeTone(status: string): "neutral" | "busy" | "warning" | "danger" {
  if (status === "sending" || status === "connecting") return "busy";
  if (status === "awaiting-approval") return "warning";
  if (status === "error" || status === "disconnected") return "danger";
  return "neutral";
}

function Header({
  slots,
  labels,
  status,
  onClose,
  onSettings,
  avatars,
}: {
  readonly slots: TableAssistantSlots;
  readonly labels: TableLabels | undefined;
  readonly status: string;
  readonly onClose: () => void;
  readonly onSettings?: () => void;
  readonly avatars?: TableAssistantAvatars;
}): ReactElement {
  const face =
    avatars?.assistant === undefined ? {} : { avatar: avatars.assistant };
  const Badge = slots.Badge;
  const Button = slots.Button;
  const connection =
    labels?.assistantConnection?.(status) ?? status.replace("-", " ");
  return (
    <header
      data-adapttable-part="assistant-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5em",
        minHeight: "3.5em",
        paddingInline: "0.25em",
        flexShrink: 0,
      }}
    >
      {/* The same face it speaks with. A host that gave the assistant a
          picture gave it one assistant, and a header wearing something else
          is a second one. */}
      <SpeakerMark
        mine={false}
        hidden={false}
        part="assistant-mark"
        {...face}
      />
      <span
        data-adapttable-part="assistant-title"
        style={{
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {labels?.assistantTitle ?? "Table assistant"}
      </span>
      <Badge
        label={connection}
        part="assistant-connection"
        tone={badgeTone(status)}
      />
      {/* The controls sit together at the trailing edge, as icons: the header
          is one row at 400px wide, and a spelled-out "Assistant settings"
          across it is what pushed the title onto a second line. */}
      <span
        style={{
          marginInlineStart: "auto",
          display: "flex",
          alignItems: "center",
          gap: "0.15em",
        }}
      >
        {onSettings ? (
          <Button
            label={labels?.assistantSettings ?? "Assistant settings"}
            tooltip={labels?.assistantSettings ?? "Assistant settings"}
            part="assistant-settings"
            variant="subtle"
            icon={<SettingsIcon />}
            iconOnly
            onClick={onSettings}
          />
        ) : null}
        <Button
          label={labels?.assistantClose ?? "Close"}
          tooltip={labels?.assistantClose ?? "Close"}
          part="assistant-close"
          variant="subtle"
          icon={<CloseIcon />}
          iconOnly
          onClick={onClose}
        />
      </span>
    </header>
  );
}

/**
 * The assistant's own button, wearing the approval chrome's shape.
 *
 * The review needs four controls and the panel already has a button slot
 * with a variant vocabulary, so no adapter grows four more slots to review a
 * write in the window it already draws.
 */
function approvalSlots(slots: TableAssistantSlots): ApprovalReviewSlots {
  const Button = slots.Button;
  return {
    Approve: (props) => <Button {...props} variant="primary" />,
    Reject: (props) => <Button {...props} variant="secondary" />,
    Action: (props) => <Button {...props} variant="subtle" />,
    // A real <ul>, not a div wearing role="list": the element carries the
    // semantics everywhere, including where ARIA support is patchy.
    List: ({ part, label, className, children }) => (
      <ul
        data-adapttable-part={part}
        className={className}
        aria-label={label}
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {children}
      </ul>
    ),
  };
}

/** The control that opens the conversation, and says when one is parked. */
function Launcher({
  labels,
  waiting,
  slots,
  onOpen,
  avatars,
}: {
  readonly labels: TableLabels | undefined;
  readonly waiting: boolean;
  readonly slots: TableAssistantSlots;
  readonly onOpen: () => void;
  readonly avatars?: TableAssistantAvatars;
}): ReactElement {
  const face =
    avatars?.assistant === undefined ? {} : { avatar: avatars.assistant };
  const Button = slots.Button;
  return (
    // The face, and nothing else. A corner button carrying a glyph plus the
    // words "Ask AI" spends a whole line saying what the face already says,
    // and the face is the one thing a reader recognises from across a page.
    // Its name stays on the control for anyone who cannot see it.
    <Button
      label={launcherName(labels, waiting)}
      part="assistant-launcher"
      // Subtle, because the mark inside already carries its own ground. A
      // solid button would paint the kit's primary behind it and give the
      // reader a white robot here and a coloured one everywhere else.
      variant="subtle"
      iconOnly
      tooltip={labels?.assistantOpen ?? "Ask AI"}
      icon={
        <span
          data-adapttable-part="assistant-launcher-mark"
          // 56px, which is the size a corner launcher has settled on: big
          // enough to hit without aiming, small enough not to sit on the
          // page like a second window.
          style={{ display: "flex", fontSize: "1.85em" }}
        >
          <SpeakerMark mine={false} hidden={false} {...face} />
          {waiting ? (
            <span
              data-adapttable-part="assistant-launcher-waiting"
              aria-hidden="true"
            >
              {" •"}
            </span>
          ) : null}
        </span>
      }
      onClick={onOpen}
    />
  );
}

/**
 * What the launcher is called, and whether it says a write is parked.
 *
 * The dot beside it is decoration; this is the part a screen reader gets,
 * so the waiting write has to be in the name rather than only in the glyph.
 */
function launcherName(
  labels: TableLabels | undefined,
  waiting: boolean
): string {
  const open = labels?.assistantOpen ?? "Ask AI";
  if (!waiting) return open;
  const note =
    labels?.approvalWaitingElsewhere ??
    "A change is waiting for your decision.";
  return `${open} — ${note}`;
}

/**
 * Modal mode: the review in the kit's own dialog.
 *
 * Every kit already supplies one for the narrow-viewport sheet, so no
 * adapter grows a second modal to review a write. It is drawn whether or not
 * the conversation is open — the decision is what is waiting — and it is the
 * only place the controls appear in this mode.
 */
function ApprovalModal({
  approval,
  labels,
  slots,
}: {
  readonly approval: AgentApprovalPending | null;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
}): ReactElement | null {
  const mine = approval?.presentation === "modal" ? approval : null;
  const review = approvalReview(mine, labels);
  if (!review || !mine) return null;
  const Sheet = slots.Sheet;
  return (
    <Sheet
      label={review.summary}
      part="assistant-approval-modal"
      open
      onClose={mine.reject}
    >
      <AssistantApproval
        review={review}
        pending={mine}
        labels={labels}
        slots={slots}
        expanded
      />
    </Sheet>
  );
}

/**
 * The review, wired to the panel's own controls.
 *
 * A component rather than a bundle of props assembled in the middle of the
 * conversation's markup: the panel then only decides WHERE the review goes,
 * not what it is given.
 */
function AssistantApproval({
  review,
  pending,
  labels,
  slots,
  expanded,
  onExpand,
  onBack,
}: {
  readonly review: ApprovalReview;
  readonly pending: AgentApprovalPending;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly expanded?: boolean;
  readonly onExpand?: () => void;
  readonly onBack?: () => void;
}): ReactElement {
  return (
    <ApprovalReviewChrome
      review={review}
      {...(labels ? { labels } : {})}
      slots={approvalSlots(slots)}
      {...(expanded ? { expanded } : {})}
      {...(onExpand ? { onExpand } : {})}
      {...(onBack ? { onBack } : {})}
      onApprove={pending.approve}
      onReject={pending.reject}
      {...(pending.decideAt ? { onDecide: pending.decideAt } : {})}
      {...(pending.alwaysAllow ? { onAlwaysAllow: pending.alwaysAllow } : {})}
    />
  );
}

/**
 * The conversation so far, and the turn still running at the end of it.
 *
 * @internal
 */
function Transcript({
  assistant,
  messages,
  labels,
  slots,
  messageAction,
  receipts,
  parked,
  avatars,
}: {
  readonly assistant: TableAssistantView;
  /** Every message to draw, the opening line included. */
  readonly messages: readonly TableAssistantMessageView[];
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly messageAction: TableAssistantProps["messageAction"];
  readonly receipts?: boolean;
  readonly avatars?: TableAssistantAvatars;
  /** Whether a write is waiting on the reader's approval. */
  readonly parked?: boolean;
}): ReactElement {
  const marks = avatars ? { avatars } : {};
  return (
    <ul
      data-adapttable-part="assistant-messages"
      style={{
        listStyle: "none",
        margin: 0,
        // Half an em each side, which is what a tail needs to sit beside its
        // bubble rather than under the panel's edge.
        padding: "0 0.5em",
        display: "flex",
        flexDirection: "column",
        // Turns are further apart than the lines within one, so the eye finds
        // the boundary between them without a rule drawn across the panel.
        gap: "1.15em",
      }}
    >
      {messages.map((message, index) => (
        <AssistantMessage
          key={message.id}
          message={message}
          // The mark stops repeating down a run from the same speaker. One
          // conversation, not a column of name tags.
          leads={messages[index - 1]?.role !== message.role}
          labels={labels}
          slots={slots}
          {...marks}
          action={messageAction?.(message)}
          undo={
            assistant.undo?.messageId === message.id
              ? assistant.undo
              : undefined
          }
          onUndo={() => {
            void assistant.undoTurn?.();
          }}
          onUndoAction={(idempotencyKey) => {
            void assistant.undoAction?.(idempotencyKey);
          }}
          receipts={receipts}
          {...(message.question && assistant.answer
            ? { onAnswer: assistant.answer }
            : {})}
        />
      ))}
      {/* At the end of the transcript, where the reply will land — but not
          while a question is parked on the reader. Nothing is working then:
          the turn is waiting on them, and saying otherwise is why a question
          gets read as progress. */}
      {assistant.busy && !asking(messages) && !parked ? (
        <AssistantWorking labels={labels} progress={assistant.progress} />
      ) : null}
    </ul>
  );
}

/**
 * Every change in a write, on a screen of its own.
 *
 * The conversation is hidden rather than scrolled past while this is up: a
 * reader deciding on forty rows is doing one thing, and the transcript under
 * it is forty rows of distance from the controls.
 */
function FullApproval({
  review,
  pending,
  labels,
  slots,
  onBack,
}: {
  readonly review: ApprovalReview;
  readonly pending: AgentApprovalPending;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly onBack: () => void;
}): ReactElement {
  return (
    <div
      data-adapttable-part="assistant-approval-full"
      style={{ height: "100%", overflowY: "auto" }}
    >
      <AssistantApproval
        review={review}
        pending={pending}
        labels={labels}
        slots={slots}
        expanded
        onBack={onBack}
      />
    </div>
  );
}

/**
 * The question still waiting on the reader, if one is.
 *
 * Read off the conversation rather than from a field beside it: the question
 * belongs to the message that asked it, and a second copy is a second thing
 * to keep in step.
 */
function asking(
  messages: readonly TableAssistantMessageView[]
): TableAssistantQuestionView | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const question = messages[i]?.question;
    if (question) return question;
  }
  return undefined;
}

/**
 * What the panel says under the transcript, when it has something to say.
 *
 * Three different sentences that never appear together: a turn that failed, a
 * connection that went while the work carried on, and a conversation with no
 * connection at all. One component so a reader is never told two of them, and
 * so each keeps its own part name.
 */
function PanelNotice({
  assistant,
  labels,
  slots,
  rejoin,
}: {
  readonly assistant: TableAssistantView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  /** Whether there is work to rejoin and nothing running. */
  readonly rejoin: boolean;
}): ReactElement | null {
  const Button = slots.Button;
  if (assistant.error !== undefined) {
    // The runtime's own message names continuations and backends; a reader
    // gets the sentence for what it means to them, and only falls back to
    // that message when nobody wrote one.
    const said =
      assistant.errorCode === undefined
        ? undefined
        : labels?.assistantUnresolved?.(assistant.errorCode);
    return (
      <p data-adapttable-part="assistant-error" role="alert">
        {said ?? assistant.error}
      </p>
    );
  }
  if (rejoin) {
    return (
      <p data-adapttable-part="assistant-detached">
        {labels?.assistantDetached ??
          "The connection went. The work may still be running."}{" "}
        <Button
          label={labels?.assistantRejoin ?? "Rejoin"}
          part="assistant-rejoin"
          variant="secondary"
          onClick={() => void assistant.resume?.()}
        />
      </p>
    );
  }
  if (assistant.status === "disconnected") {
    return (
      <p data-adapttable-part="assistant-unavailable">
        {labels?.assistantUnavailable ?? "The assistant is not connected."}
      </p>
    );
  }
  return null;
}

/**
 * Whether to offer a way back to work a released connection left running.
 *
 * Offered whenever there is some and no turn is in flight, which covers a
 * connection released a moment ago and a handle a host kept across a reload.
 * A turn the reader stopped leaves nothing to rejoin, so the control's absence
 * is itself the difference between the two.
 */
function rejoinable(assistant: TableAssistantView): boolean {
  if (assistant.resumable === undefined) return false;
  if (assistant.resume === undefined) return false;
  return !(assistant.busy ?? assistantIsBusy(assistant.status));
}

/**
 * What the one box at the bottom does right now.
 *
 * A turn parked on a question is waiting on the reader, not working — so the
 * box answers it, and reports itself idle. Reported busy it drew Stop where
 * Send belongs and swallowed the Enter that would have answered.
 */
function composerState(assistant: TableAssistantView): {
  readonly send: () => void;
  /** Undefined leaves the composer to read the status itself. */
  readonly busy: boolean | undefined;
  readonly answering: boolean;
} {
  const answering = composerAnswers(assistant);
  if (answering) {
    return { send: answering.send, busy: false, answering: true };
  }
  return {
    send: () => void assistant.send(),
    busy: assistant.busy,
    answering: false,
  };
}

/**
 * Whether the composer is answering a question rather than starting a turn.
 *
 * Returns nothing when there is no question on screen, or nothing to answer
 * it with — and the composer goes back to being the composer.
 */
function composerAnswers(
  assistant: TableAssistantView
): { readonly send: () => void } | undefined {
  const question = asking(assistant.messages);
  const answer = assistant.answer;
  if (!question || !answer) return undefined;
  return {
    send: () => {
      const said = assistant.draft.trim();
      if (!said) return;
      assistant.setDraft("");
      answer({ text: said });
    },
  };
}

/**
 * Only what the host actually gave.
 *
 * An optional prop has to be absent rather than `undefined` to fall back to
 * a default, and a component that decides that per prop grows a conditional
 * per prop. `greeting` is kept when it is an empty string: silence is a value
 * a host chose, not a prop it left out.
 */
function present<T extends object>(given: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(given).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

/**
 * The conversation, opening line included.
 *
 * The greeting is a message like any other, so it goes through the same
 * renderer and stays where it was said. An empty string is a host asking for
 * silence; omitted leaves the built-in question.
 */
function withGreeting(
  messages: readonly TableAssistantMessageView[],
  greeting: string | undefined,
  labels: TableLabels | undefined
): readonly TableAssistantMessageView[] {
  const said =
    greeting ?? labels?.assistantEmpty ?? "What would you like to do?";
  if (!said.trim()) return messages;
  return [
    { id: "assistant-greeting", role: "assistant", text: said },
    ...messages,
  ];
}

function Body({
  assistant,
  labels,
  slots,
  note,
  greeting,
  avatars,
  messageAction,
  approval,
  receipts,
}: {
  readonly assistant: TableAssistantView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly note?: string;
  readonly greeting?: string;
  readonly avatars?: TableAssistantAvatars;
  readonly messageAction: TableAssistantProps["messageAction"];
  readonly approval?: AgentApprovalPending | null;
  readonly receipts?: boolean;
}): ReactElement {
  const scroll = useConversationScroll(assistant.messages.length);
  const [expanded, setExpanded] = useState(false);
  // Omitted leaves the built-in greeting; an empty string is a host asking
  // for silence, which is a value and has to travel as one.
  // Optional, so it travels as a spread rather than an undefined prop.
  const marks = avatars ? { avatars } : {};
  // Only writes this surface owns. A write reviewed above the table or in a
  // modal is named here, never given a second set of controls.
  const mine = approval?.presentation === "widget" ? approval : null;
  const review = approvalReview(mine, labels);
  useEffect(() => {
    if (!review) setExpanded(false);
  }, [review]);
  const Button = slots.Button;
  // A write waiting on the reader parks the transcript's own indicators; the
  // approval is what is happening, and two things claiming to be are one too
  // many.
  const parked = Boolean(approval);
  // The opening line, ahead of whatever has been said since. An empty string
  // is a host asking for silence; omitted leaves the built-in question.
  const shown = withGreeting(assistant.messages, greeting, labels);
  const showingFullList = Boolean(review && expanded);
  return (
    <div
      data-adapttable-part="assistant-conversation-region"
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {review && expanded && mine ? (
        <FullApproval
          review={review}
          pending={mine}
          labels={labels}
          slots={slots}
          onBack={() => setExpanded(false)}
        />
      ) : null}
      <div
        ref={scroll.ref}
        onScroll={scroll.onScroll}
        data-adapttable-part="assistant-conversation"
        hidden={showingFullList}
        // Never sideways. A bubble's tail sits outside the bubble, and a
        // panel that scrolls to reveal half an em of it is a panel the reader
        // has to drag straight before they can read the conversation.
        style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}
      >
        {/* One list, one renderer. The opening line is the assistant's first
            message, not a screen shown instead of the conversation — held
            apart it was replaced the moment the reader said anything. */}
        <Transcript
          assistant={assistant}
          messages={shown}
          labels={labels}
          slots={slots}
          messageAction={messageAction}
          receipts={receipts}
          {...marks}
          parked={parked}
        />
        {note && assistant.messages.length === 0 ? (
          <p
            data-adapttable-part="assistant-empty-note"
            style={{
              margin: "0.5em 0 0 2.6em",
              opacity: 0.7,
              fontSize: "0.9em",
              maxInlineSize: "26em",
            }}
          >
            {note}
          </p>
        ) : null}
        {/* A standing decision, not something this turn did — so it sits with
            the examples rather than in the transcript. */}
        {assistant.revokeAlwaysAllow ? (
          <AssistantAlwaysAllowed
            allowed={assistant.alwaysAllowed ?? []}
            labels={labels}
            slots={slots}
            onRevoke={assistant.revokeAlwaysAllow}
          />
        ) : null}
      </div>
      {review && !expanded && mine ? (
        <div
          data-adapttable-part="assistant-approval"
          style={{
            flex: "0 0 auto",
            borderBlockStart: "1px solid",
            borderColor: "inherit",
            padding: "0.5em 0",
          }}
        >
          <AssistantApproval
            review={review}
            pending={mine}
            labels={labels}
            slots={slots}
            onExpand={() => setExpanded(true)}
          />
        </div>
      ) : null}
      {approval && !mine ? (
        // Reviewed somewhere else. Say so; do not offer the decision twice.
        <p
          data-adapttable-part="assistant-approval-elsewhere"
          style={{ margin: 0 }}
        >
          {labels?.approvalWaitingElsewhere ??
            "A change is waiting for your decision."}
        </p>
      ) : null}
      {scroll.hasUnseen ? (
        <span
          style={{
            position: "absolute",
            insetBlockEnd: "0.5em",
            insetInlineStart: "50%",
          }}
        >
          <Button
            label={labels?.assistantNewMessages ?? "New messages"}
            part="assistant-jump-latest"
            variant="secondary"
            onClick={scroll.jumpToLatest}
          />
        </span>
      ) : null}
    </div>
  );
}

/** What the assistant is drawn in, once the presentation has been resolved. */
function openSurface({
  open,
  resolved,
  title,
  className,
  boundary,
  close,
  dir,
  contents,
  slots,
}: {
  readonly open: boolean;
  readonly resolved: string;
  readonly title: string;
  readonly className?: string;
  readonly boundary: NonNullable<TableAssistantProps["boundary"]>;
  readonly close: () => void;
  readonly dir?: "ltr" | "rtl";
  readonly contents: ReactNode;
  readonly slots: TableAssistantSlots;
}): ReactNode {
  if (!open) return null;
  if (resolved === "floating") {
    return (
      <slots.Window
        label={title}
        part="assistant-window"
        className={className}
        style={floatingStyle(boundary)}
      >
        {contents}
      </slots.Window>
    );
  }
  if (resolved === "sheet") {
    return (
      // The one surface every kit draws through a portal, which lands at the
      // document root and never sees the direction of the subtree it came
      // from. That is why this is the slot that takes a `dir`.
      <slots.Sheet
        label={title}
        part="assistant-sheet"
        className={className}
        open
        onClose={close}
        {...(dir ? { dir } : {})}
      >
        {contents}
      </slots.Sheet>
    );
  }
  return (
    <slots.Panel label={title} part="assistant-panel" className={className}>
      {contents}
    </slots.Panel>
  );
}

/**
 * The assistant panel.
 *
 * @param props - See {@link TableAssistantChromeProps}.
 * @returns The launcher, the panel, or both.
 *
 * @public
 */
export function TableAssistantChrome({
  assistant,
  open,
  onOpenChange,
  presentation = "panel",
  labels,
  className,
  launcher = true,
  onSettings,
  boundary = "viewport",
  note,
  greeting,
  avatars,
  messageAction,
  approval,
  slots,
  speech,
  dir,
  receipts = true,
  accent,
}: Readonly<TableAssistantChromeProps>): ReactElement {
  const wide = useFloatingFits();
  const launcherRef = useRef<HTMLElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  // Both optional, so both travel as spreads rather than undefined props.
  const given = present({ greeting, avatars });
  // The header and the transcript wear the same face, so the question of
  // whether the host gave one is asked once.
  const marks = present({ avatars });
  // The launcher lives outside the panel, so the accent cannot be set on the
  // panel alone: a closed assistant would wear the page's text colour and an
  // open one the kit's, which is the same mark in two colours.
  const accentStyle: CSSProperties = accent
    ? ({ "--adapttable-assistant-accent": accent } as CSSProperties)
    : {};
  const Button = slots.Button;

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Opening puts the reader where they were going. The launcher leaves the
  // document when the panel takes its place, so without this a keyboard
  // reader who pressed it is left on `body` and has to tab the whole page to
  // reach the thing they just opened. The composer is what they came for.
  useEffect(() => {
    if (!open) return;
    const composer = surfaceRef.current?.querySelector<HTMLElement>(
      '[data-adapttable-part="assistant-input"]'
    );
    composer?.focus();
  }, [open]);

  // Closing returns the reader where they were. Without this, focus falls to
  // the document and the next Tab starts from the top of the page.
  useEffect(() => {
    if (open) return;
    const trigger = launcherRef.current?.querySelector<HTMLElement>(
      '[data-adapttable-part="assistant-launcher"]'
    );
    trigger?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = surfaceRef.current;
    if (!root) return;
    const onKey = (event: KeyboardEvent): void => {
      // Only the innermost overlay answers Escape: a kit popover open inside
      // the panel handles its own and stops this from seeing it.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // A floating request that cannot fit becomes the kit's own modal sheet.
  // The switch is deliberate and only ever applies to `floating`: an explicit
  // `panel` stays a panel, because silently modalizing what a host asked to
  // place itself is worse than a narrow one.
  const resolved =
    presentation === "floating" && !wide ? "sheet" : presentation;
  const title = labels?.assistantTitle ?? "Table assistant";
  // Everything eligible, primary and overflow alike: a menu has room for the
  // lot, which is the whole reason it replaced a list that had to be split.
  const examples = {
    label: labels?.assistantExamples ?? "Examples",
    items: assistant.suggestions.map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      ...(suggestion.description
        ? { description: suggestion.description }
        : {}),
      icon: <SuggestionIcon kind={suggestion.kind} />,
      part: "assistant-examples-item",
    })),
    onSelect: (id: string): void => {
      void assistant.runSuggestion(id);
    },
  };

  // The one box the panel has. A question the assistant asked is answered
  // here rather than in a second box drawn beside it: two text inputs on one
  // screen is a form, and a reader has to work out which one is theirs.
  const composer = composerState(assistant);
  // Offered whenever there is work to rejoin and no turn in flight — which
  // covers a connection released a moment ago and a handle a host kept across
  // a reload. A stopped turn leaves nothing here, so the control's absence is
  // itself the difference between the two.
  const rejoin = rejoinable(assistant);

  const contents = (
    <div
      ref={surfaceRef}
      data-adapttable-part="assistant-surface"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5em",
        height: "100%",
        minHeight: 0,
        // Set on every surface the assistant owns, so each is drawn in the
        // kit's colour without any of its parts naming one.
        ...accentStyle,
      }}
    >
      {/* The bubble tails, which need a pseudo-element and so cannot be
          inline with the rest of the bubble. */}
      <style>{BUBBLE_CSS}</style>
      <Header
        slots={slots}
        labels={labels}
        status={assistant.status}
        onClose={close}
        onSettings={onSettings}
        {...marks}
      />
      {/* Status only — re-reading the transcript on every token is what makes
          a chat unusable with a screen reader. */}
      <LiveRegion part="assistant-status" statusRole>
        {labels?.assistantConnection?.(assistant.status) ?? assistant.status}
      </LiveRegion>
      <Body
        assistant={assistant}
        labels={labels}
        slots={slots}
        note={note}
        {...given}
        messageAction={messageAction}
        approval={approval}
        receipts={receipts}
      />
      <PanelNotice
        assistant={assistant}
        labels={labels}
        slots={slots}
        rejoin={rejoin}
      />
      <AssistantComposer
        slots={slots}
        labels={labels}
        status={assistant.status}
        busy={composer.busy}
        draft={assistant.draft}
        setDraft={assistant.setDraft}
        onSend={composer.send}
        onStop={assistant.stop}
        {...(composer.answering
          ? {
              placeholder:
                labels?.assistantAnswerPlaceholder ?? "Type an answer",
            }
          : {})}
        {...(speech ? { speech } : {})}
        {...(examples.items.length > 0 ? { examples } : {})}
      />
      {resolved === "sheet" ? (
        <Button
          label={labels?.assistantBackToTable ?? "Back to table"}
          part="assistant-back"
          variant="subtle"
          onClick={close}
        />
      ) : null}
    </div>
  );

  const surface = openSurface({
    open,
    resolved,
    title,
    className,
    boundary,
    close,
    dir,
    contents,
    slots,
  });

  // Something is parked on this reader, wherever it is being reviewed.
  const waiting = approval !== null && approval !== undefined;

  return (
    <>
      <ApprovalModal
        approval={approval ?? null}
        labels={labels}
        slots={slots}
      />
      <span
        ref={launcherRef}
        data-adapttable-part="assistant-launcher-anchor"
        style={
          resolved === "floating" || resolved === "sheet"
            ? { ...launcherStyle(boundary), ...accentStyle }
            : { display: "contents", ...accentStyle }
        }
      >
        {launcher && !open ? (
          // A write parked behind a closed panel is invisible otherwise: the
          // reader closed the conversation and the turn is still waiting on
          // them. The launcher says so rather than letting it sit.
          <Launcher
            labels={labels}
            waiting={waiting}
            slots={slots}
            onOpen={() => {
              onOpenChange(true);
            }}
            {...marks}
          />
        ) : null}
      </span>
      {surface}
    </>
  );
}
