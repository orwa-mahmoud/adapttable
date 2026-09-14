/**
 * The transcript: what was asked, what came back, and what it did.
 *
 * Roles are distinguished by alignment, a tinted ground and an identity mark
 * rather than by a speaker's name repeated above every paragraph — the name
 * is still there for assistive technology, where repetition costs nothing and
 * absence costs everything.
 *
 * A receipt is the one thing here that must never be taken from the model's
 * reply. Its status comes from what the session returned, and its subject
 * from the arguments that actually ran; anything the host did not supply is
 * left out rather than guessed.
 */
import type { TableLabels } from "@adapttable/core";
import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  ActionsIcon,
  AssistantAvatar,
  PersonAvatar,
  ReceiptIcon,
  UndoIcon,
} from "./assistantIcons";
import type {
  TableAssistantAvatars,
  TableAssistantSlots,
} from "./assistantSlots";
import type {
  TableAssistantAllowanceView,
  TableAssistantMessageView,
  TableAssistantQuestionView,
  TableAssistantReceiptView,
  TableAssistantUndoView,
} from "./assistantView";

/** A staged write is not finished, and the panel has to say so. */
/**
 * The assistant's own colour.
 *
 * A kit sets `--adapttable-assistant-accent` on its surface to give the
 * conversation its palette; without one the panel borrows the text colour,
 * which is legible everywhere and belongs to no brand. Everything here mixes
 * against it rather than naming a colour, so a dark theme and a light one
 * both land somewhere sensible.
 */
const ACCENT = "var(--adapttable-assistant-accent, currentColor)";

const NEEDS_SAVE = "staged";

/**
 * The card's headline.
 *
 * `assistantReceiptAction` turns the pair (what changed, what became of it)
 * into one sentence in the reader's language — "Filter applied", "Edit
 * awaiting approval". Without a kind there is still an honest fallback: the
 * status alone, never the capability key.
 */
function headline(
  receipt: TableAssistantReceiptView,
  labels: TableLabels | undefined
): string {
  const subject = receipt.subject;
  const fromLabels = labels?.assistantReceiptAction?.({
    kind: subject?.kind,
    status: receipt.status,
    ...(subject?.cleared === undefined ? {} : { cleared: subject.cleared }),
  });
  if (fromLabels) return fromLabels;
  return labels?.assistantReceiptStatus?.(receipt.status) ?? receipt.status;
}

/**
 * What the action acted on, as one line.
 *
 * A host's own `detail` wins: it was written by whoever knows the wording of
 * the surface it is shown on. Otherwise the labels join the terms, which is
 * where the reader's language lives.
 */
function detailOf(
  receipt: TableAssistantReceiptView,
  labels: TableLabels | undefined
): string | undefined {
  const subject = receipt.subject;
  if (!subject) return undefined;
  if (subject.detail) return subject.detail;
  return labels?.assistantReceiptTerms?.({
    kind: subject.kind,
    terms: subject.terms,
    ...(subject.direction ? { direction: subject.direction } : {}),
  });
}

/** The before/after pair, only when the host supplied both. */
function ChangedValue({
  receipt,
  labels,
}: {
  readonly receipt: TableAssistantReceiptView;
  readonly labels: TableLabels | undefined;
}): ReactElement | null {
  const subject = receipt.subject;
  if (!subject?.before || !subject.after) return null;
  // Shown either way, because the reader wants to see what was asked for —
  // but only an applied edit is spoken as a change. Saying a refused or
  // still-pending one "changed" claims something the table never did, and a
  // reader who cannot see the strikethrough has only this sentence.
  const spoken =
    receipt.status === "executed"
      ? labels?.assistantReceiptChange
      : labels?.assistantReceiptProposed;
  return (
    <span
      data-adapttable-part="assistant-receipt-change"
      style={{ display: "flex", alignItems: "center", gap: "0.4em" }}
    >
      <s data-adapttable-part="assistant-receipt-before">{subject.before}</s>
      <span aria-hidden="true">→</span>
      <strong data-adapttable-part="assistant-receipt-after">
        {subject.after}
      </strong>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
        }}
      >
        {spoken?.({ before: subject.before, after: subject.after }) ?? ""}
      </span>
    </span>
  );
}

function Receipt({
  receipt,
  labels,
  slots,
  onUndo,
}: {
  readonly receipt: TableAssistantReceiptView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  /** Put this one action back. Absent when only the whole turn can be. */
  readonly onUndo?: () => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const Button = slots.Button;
  const Badge = slots.Badge;
  const subject = receipt.subject;
  const detail = detailOf(receipt, labels);
  const where = [subject?.row, subject?.column].filter(Boolean).join(" · ");
  return (
    <li
      data-adapttable-part="assistant-receipt"
      data-status={receipt.status}
      data-kind={subject?.kind}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.6em",
        flexWrap: "wrap",
        // Each action on its own card: a column of rows separated by nothing
        // reads as one block of text, and the eye cannot find where one
        // action ends and the next starts.
        padding: "0.55em 0.6em",
        borderRadius: "0.7em",
        border: "1px solid",
        borderColor: "color-mix(in srgb, currentColor 12%, transparent)",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.65em",
          // Takes the row and gives it back: the undo control keeps its own
          // width, and a long detail wraps under the name rather than pushing
          // the control off the end.
          flex: "1 1 10em",
          minWidth: 0,
        }}
        data-adapttable-part="assistant-receipt-summary"
      >
        <ReceiptIcon {...(subject?.kind ? { kind: subject.kind } : {})} />
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            lineHeight: 1.35,
          }}
        >
          <strong style={{ fontWeight: 700, fontSize: "1.05em" }}>
            {headline(receipt, labels)}
          </strong>
          {/* One line under the name, not three. What it did, where it
              landed and what it became are one sentence about one action —
              stacked, they made every row three deep and the names stopped
              lining up down the column. */}
          <span
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: "0 0.45em",
              opacity: 0.6,
              fontSize: "0.9em",
              overflowWrap: "anywhere",
            }}
          >
            {detail ? (
              <span data-adapttable-part="assistant-receipt-detail-text">
                {detail}
              </span>
            ) : null}
            {where ? (
              <span data-adapttable-part="assistant-receipt-where">
                {where}
              </span>
            ) : null}
            <ChangedValue receipt={receipt} labels={labels} />
          </span>
        </span>
      </span>
      {/* Where it landed, what it became, and the way back — one group at the
          row's end. Loose siblings each claimed their own line as soon as the
          panel narrowed, which broke a row into three. */}
      <span
        data-adapttable-part="assistant-receipt-outcome"
        style={{
          display: "flex",
          alignItems: "center",
          alignSelf: "center",
          gap: "0.5em",
          marginInlineStart: "auto",
          flexShrink: 0,
        }}
      >
        {onUndo ? (
          // At the end of the row it belongs to, small and quiet: putting one
          // action back is worth offering, not worth competing with the action
          // it would put back.
          <span data-adapttable-part="assistant-receipt-undo">
            <Button
              label={labels?.assistantUndo ?? "Undo"}
              part="assistant-receipt-undo-button"
              variant="subtle"
              icon={<UndoIcon />}
              onClick={onUndo}
            />
          </span>
        ) : null}
      </span>
      {receipt.status === NEEDS_SAVE ? (
        <span data-adapttable-part="assistant-receipt-save">
          <Badge
            label={
              labels?.assistantSaveInTable ??
              "Save in the table to keep this change."
            }
            part="assistant-receipt-save-badge"
            // The only status that draws this badge is the one that needs
            // saving, and a change the reader still has to keep is a warning
            // whatever else is true of it.
            tone="warning"
          />
        </span>
      ) : null}
      {receipt.message ? (
        <>
          <Button
            label={labels?.assistantDetail ?? "Details"}
            part="assistant-receipt-detail"
            variant="subtle"
            expanded={open}
            onClick={() => {
              setOpen((current) => !current);
            }}
          />
          {open ? (
            <span
              data-adapttable-part="assistant-receipt-message"
              style={{
                // The key names which capability failed and the message says
                // what went wrong. Run inline they read as one broken
                // sentence — "page 2 exceeds pageMax 1view.setPage".
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.3em",
                overflowWrap: "anywhere",
              }}
            >
              {receipt.message}
              {receipt.capabilityKey ? (
                <code data-adapttable-part="assistant-receipt-capability">
                  {receipt.capabilityKey}
                </code>
              ) : null}
            </span>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

/** One exchange. @internal */
export function AssistantMessage({
  message,
  labels,
  slots,
  action,
  undo,
  onUndo,
  onUndoAction,
  receipts = true,
  leads = true,
  avatars,
  onAnswer,
}: {
  readonly message: TableAssistantMessageView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  /** An offer the host attached to this reply. */
  readonly action?: { readonly label: string; readonly onRun: () => void };
  /** Whether this turn can be put back, when the offer belongs to it. */
  readonly undo?: TableAssistantUndoView;
  readonly onUndo?: () => void;
  /** Put one action back, by its replay identity. */
  readonly onUndoAction?: (idempotencyKey: string) => void;
  /** Whether each action draws a card. The record is kept either way. */
  readonly receipts?: boolean;
  /** Whether this message opens a run from its speaker, and so gets the mark. */
  readonly leads?: boolean;
  /** The host's own marks, when it has them. */
  readonly avatars?: TableAssistantAvatars;
  /** Answer this message's question. Absent when it is not asking one. */
  readonly onAnswer?: (answer: { optionId?: string; text?: string }) => void;
}): ReactElement {
  // A receipt says what CHANGED. Reading rows, resolving one, asking what a
  // column means — none of that changed anything the reader can see, and the
  // refusals they carry are written for the caller that has to recover from
  // them: "read the rows to get their keys" is advice to a model, and a reader
  // shown it beside a turn that then worked is being told it failed when it
  // did not. They stay in the conversation state for a host that reads them.
  const shown = (message.receipts ?? []).filter(
    (receipt) => receipt.subject?.kind !== "read"
  );
  // Closed until asked for: the reply is the answer, and what it took to get
  // there is evidence a reader opens when they want it.
  const [openActions, setOpenActions] = useState(false);
  const perAction = onUndoAction ? { onUndoAction } : {};
  const hasActions = receipts && shown.length > 0;
  // Said once, and used wherever a blocked undo has to explain itself.
  const marks = avatars ? { avatars } : {};
  const undoReason =
    labels?.assistantUndoBlocked?.(undo?.blockedCode ?? "") ??
    "The table has changed since this ran.";
  // The whole-turn offer, assembled once: the group heads its list with it,
  // and a turn that changed nothing visible carries it on its own below.
  const blockedReason = undo?.available ? {} : { reason: undoReason };
  const turnUndo =
    undo && onUndo
      ? { undoTurn: { available: undo.available, ...blockedReason, onUndo } }
      : {};
  // The mark that opens it and the list it opens, both inside the bubble the
  // reply is in.
  const markRef = useRef<HTMLSpanElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const tailInset = useTailInset(markRef, cardRef, openActions);
  const disclosure = actionsDisclosure({
    receipts: shown,
    labels,
    slots,
    open: openActions,
    onToggle: () => {
      setOpenActions(!openActions);
    },
    ...turnUndo,
    ...perAction,
    cardRef,
    tailInset,
  });
  const openable = hasActions
    ? {
        trailing: (
          <span ref={markRef} style={{ display: "flex" }}>
            {disclosure.trigger}
          </span>
        ),
      }
    : {};
  const mine = message.role === "user";
  const speaker = mine
    ? (labels?.assistantYou ?? "You")
    : (labels?.assistantSpeaker ?? "Assistant");
  return (
    <li
      data-adapttable-part="assistant-message"
      data-role={message.role}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25em",
        alignItems: mine ? "flex-end" : "flex-start",
      }}
    >
      {/* Named for assistive technology only: on screen the side, the ground
          and the mark already say who is speaking, and a label above every
          paragraph is what makes a transcript unreadable. */}
      <span
        data-adapttable-part="assistant-message-speaker"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        {speaker}
      </span>
      <Spoken
        message={message}
        mine={mine}
        leads={leads}
        {...marks}
        {...openable}
      />
      {hasActions ? disclosure.below : null}
      {/* The choices this message is offering, while it is still asking. They
          hang from the message rather than from a slot beside the transcript,
          so there is one thing to keep in step and not two. */}
      {message.question && onAnswer ? (
        <QuestionOptions
          question={message.question}
          slots={slots}
          onAnswer={onAnswer}
        />
      ) : null}

      {/* An offer, not a reply: it sits clear of the bubble above it and
          centred across the panel, so it reads as a way forward rather than
          as something the assistant said. */}
      {action ? (
        <span
          data-adapttable-part="assistant-message-action"
          style={{
            display: "flex",
            justifyContent: "center",
            alignSelf: "stretch",
            marginBlockStart: "0.75em",
          }}
        >
          <slots.Button
            label={action.label}
            part="assistant-message-action-button"
            variant="secondary"
            onClick={action.onRun}
          />
        </span>
      ) : null}
      {undo && shown.length === 0 ? (
        <LoneUndo
          labels={labels}
          slots={slots}
          available={undo.available}
          reason={undoReason}
          onUndo={() => onUndo?.()}
        />
      ) : null}
    </li>
  );
}

/**
 * A name, as the two letters every product falls back to.
 *
 * The first letter of each of the first two words. One word gives one letter;
 * a name of nothing gives none, and the built-in face stands instead.
 */
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("")
    .toUpperCase();
}

/** The face this speaker falls back to when the host named none. */
function DefaultFace({ mine }: { readonly mine: boolean }): ReactElement {
  return mine ? <PersonAvatar /> : <AssistantAvatar />;
}

/** A name drawn in a speaker's circle, or their face when it yields none. */
function Initials({
  name,
  mine,
}: {
  readonly name: string;
  readonly mine: boolean;
}): ReactElement {
  const letters = initialsOf(name);
  if (!letters) return <DefaultFace mine={mine} />;
  return (
    <span
      data-adapttable-part="assistant-initials"
      style={{
        fontSize: "0.72em",
        fontWeight: 650,
        letterSpacing: "0.02em",
        // Never wrapped or clipped: two letters in a circle is the whole of
        // what this draws.
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      {letters}
    </span>
  );
}

/**
 * One thing said, by whoever said it.
 *
 * Every bubble in the panel comes through here — a reply, the opening line,
 * a question the backend asked. They were three copies of the same markup,
 * and the copies drifted: one grew an absolutely-placed mark that sat under
 * its own bubble and overlapped the message above it. The tag varies because
 * a heading and a question name their region; the shape never does.
 */
function Said({
  mine = false,
  leads = true,
  avatar,
  part,
  id,
  as: Tag = "span",
  trailing,
  streaming,
  children,
}: {
  readonly mine?: boolean;
  readonly leads?: boolean;
  readonly avatar?: ReactNode;
  readonly part: string;
  readonly id?: string;
  readonly as?: "span" | "h2";
  readonly trailing?: ReactNode;
  readonly streaming?: boolean;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <span
      style={{
        display: "flex",
        // Wider than the tail that sits in it: the tail hangs outside its
        // bubble, and a gap narrower than the tail draws it over the mark.
        gap: "0.7em",
        // The mark sits at the foot of the bubble, where the tail points at
        // it. Level with the first line it reads as a bullet beside a
        // paragraph; level with the tail it reads as who said it.
        alignItems: "flex-end",
        maxWidth: "88%",
        alignSelf: mine ? "flex-end" : "flex-start",
        flexDirection: mine ? "row-reverse" : "row",
      }}
    >
      <SpeakerMark
        mine={mine}
        hidden={!leads}
        {...(avatar === undefined ? {} : { avatar })}
      />
      {/* Backend text is untrusted: rendered as text, never as markup. */}
      <Tag
        data-adapttable-part={part}
        data-mine={mine ? "true" : "false"}
        {...(id ? { id } : {})}
        {...(streaming ? { "data-streaming": "true" } : {})}
        style={{
          margin: 0,
          padding: "0.6em 0.8em",
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
          display: "flex",
          alignItems: "flex-end",
          gap: "0.4em",
          minWidth: 0,
          position: "relative",
          fontWeight: 400,
          // Both sides get a surface. The reply used to be bare text on the
          // panel's own ground, which made the one thing the reader asked for
          // the only thing that did not look like a message.
          ...(mine
            ? {
                background: "color-mix(in srgb, currentColor 10%, transparent)",
                borderRadius: "1.1em 1.1em 0.35em 1.1em",
              }
            : {
                background: `color-mix(in srgb, ${ACCENT} 14%, transparent)`,
                borderRadius: "1.1em 1.1em 1.1em 0.35em",
                fontSize: "1.05em",
                lineHeight: 1.5,
              }),
        }}
      >
        <span style={{ minWidth: 0 }}>{children}</span>
        {/* The control that opens what this reply did, on the reply's own
            corner. On the panel's margin a reader could not tell which reply
            it would open. */}
        {trailing ? (
          <span
            data-adapttable-part="assistant-message-trailing"
            style={{
              display: "flex",
              alignSelf: "flex-end",
              flexShrink: 0,
              marginInlineEnd: "-0.35em",
              marginBlockEnd: "-0.25em",
            }}
          >
            {trailing}
          </span>
        ) : null}
      </Tag>
    </span>
  );
}

/**
 * Who is speaking, drawn beside what they said.
 *
 * @internal
 *
 * The host's own avatar when it has one — a photograph, initials, anything it
 * renders — and a glyph otherwise. The ground and the size belong to the
 * panel either way, so a kit's accent carries an image the host knows nothing
 * about and every mark down the transcript is the same size.
 */
export function SpeakerMark({
  mine,
  avatar,
  hidden,
  part,
}: {
  readonly mine: boolean;
  readonly avatar?: ReactNode;
  /** Kept in place but unseen, inside a run from one speaker. */
  readonly hidden: boolean;
  /** Overrides the part name, where the surface publishes its own. */
  readonly part?: string;
}): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-adapttable-part={
        part ?? (mine ? "assistant-user-mark" : "assistant-message-mark")
      }
      data-hidden={hidden ? "true" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        inlineSize: "1.9em",
        blockSize: "1.9em",
        flexShrink: 0,
        borderRadius: "50%",
        // A host's image fills the circle rather than sitting in it, and
        // nothing it brings can spill past the edge. The built-in faces are
        // drawn to fill it too — a glyph floating in the middle of a circle
        // reads as a button that lost its label.
        overflow: "hidden",
        background: mine
          ? "color-mix(in srgb, currentColor 10%, transparent)"
          : `color-mix(in srgb, ${ACCENT} 16%, transparent)`,
        color: mine
          ? "currentColor"
          : `color-mix(in srgb, ${ACCENT} 85%, currentColor)`,
        // Kept in place, not removed: the bubbles in a run stay on one line
        // as the mark stops repeating down it.
        opacity: hidden ? 0 : 1,
      }}
    >
      {/* A string is a name and becomes initials; anything else is the
          host's own element; nothing is the built-in face. */}
      {typeof avatar === "string" ? (
        <Initials name={avatar} mine={mine} />
      ) : (
        (avatar ?? <DefaultFace mine={mine} />)
      )}
    </span>
  );
}

/**
 * The choices a message is offering, while it is still asking.
 *
 * Chips, not a form: a shortcut for the few answers worth one press, never
 * the only way through. The question itself is the message above them, and
 * the panel's one composer takes anything else the reader would rather say —
 * which is what keeps this a conversation instead of a menu.
 */
function QuestionOptions({
  question,
  slots,
  onAnswer,
}: {
  readonly question: TableAssistantQuestionView;
  readonly slots: TableAssistantSlots;
  readonly onAnswer: (answer: { optionId?: string; text?: string }) => void;
}): ReactElement | null {
  const Button = slots.Button;
  const options = question.options ?? [];
  if (options.length === 0) return null;
  return (
    <div
      data-adapttable-part="assistant-question-options"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: "0.35em",
        // To the line the bubble starts on, past the mark.
        marginInlineStart: "2.6em",
      }}
    >
      {/* The kit's own button, small and inline — a chip. The suggestion card
          is a card: a title, a description and room for both, which beside a
          question turns four words into four slabs down the panel. */}
      {options.map((option) => (
        <Button
          key={option.id}
          label={option.label}
          part="assistant-question-option"
          variant="secondary"
          onClick={() => {
            onAnswer({ optionId: option.id });
          }}
        />
      ))}
    </div>
  );
}

/** One exchange's words, in the bubble its speaker gets. */
function Spoken({
  message,
  mine,
  leads,
  trailing,
  avatars,
}: {
  readonly message: TableAssistantMessageView;
  readonly mine: boolean;
  readonly leads: boolean;
  /** Hung on the bubble's own bottom corner. */
  readonly trailing?: ReactNode;
  /** The host's own marks, when it has them. */
  readonly avatars?: TableAssistantAvatars;
}): ReactElement {
  const chosen = mine ? avatars?.user : avatars?.assistant;
  return (
    <Said
      mine={mine}
      leads={leads}
      part="assistant-message-text"
      {...(chosen === undefined ? {} : { avatar: chosen })}
      {...(trailing ? { trailing } : {})}
      {...(message.streaming ? { streaming: true } : {})}
    >
      {/* While a reply is still arriving, what has landed is shown in its
          place — marked as provisional, because words are not a receipt. */}
      {message.text}
    </Said>
  );
}

/**
 * Where to draw the card's tail, so it points at the mark that opened it.
 *
 * The mark rides the bubble's trailing corner, and that corner moves with
 * every reply's length — a fixed inset points at the right place for one
 * message and past the edge for the next. Measured after layout, and only
 * while the card is open, because a closed card has nothing to point with.
 */
function useTailInset(
  mark: RefObject<HTMLElement | null>,
  card: RefObject<HTMLElement | null>,
  open: boolean
): number | undefined {
  const [inset, setInset] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (!open) return;
    const from = mark.current;
    const to = card.current;
    if (!from || !to) return;
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    // From the card's trailing edge, which is the edge the tail is offset
    // from — and the writing direction decides which edge that is.
    const rtl = getComputedStyle(to).direction === "rtl";
    const centre = a.left + a.width / 2;
    setInset(rtl ? centre - b.left : b.right - centre);
  }, [mark, card, open]);
  return inset;
}

/**
 * How a turn's evidence is offered: a mark, and where the list lands.
 *
 * A kit with a popover gets its own surface — its placement, its dismiss, its
 * focus. A kit without one keeps the list under the reply, because core draws
 * no surface of its own.
 */
function actionsDisclosure({
  receipts,
  labels,
  slots,
  open,
  onToggle,
  onUndoAction,
  undoTurn,
  cardRef,
  tailInset,
}: {
  readonly receipts: readonly TableAssistantReceiptView[];
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onUndoAction?: (idempotencyKey: string) => void;
  readonly undoTurn?: {
    readonly available: boolean;
    readonly reason?: string;
    readonly onUndo: () => void;
  };
  readonly cardRef: RefObject<HTMLElement | null>;
  readonly tailInset: number | undefined;
}): { readonly trigger: ReactNode; readonly below: ReactNode } {
  const list = (
    <Receipts
      receipts={receipts}
      labels={labels}
      slots={slots}
      cardRef={cardRef}
      tailInset={tailInset}
      {...(undoTurn ? { undoTurn } : {})}
      {...(onUndoAction ? { onUndoAction } : {})}
    />
  );
  return {
    trigger: (
      <ActionsToggle
        count={receipts.length}
        labels={labels}
        slots={slots}
        open={open}
        onToggle={onToggle}
      />
    ),
    below: open ? list : null,
  };
}

/**
 * Putting a turn back when there is no list to head.
 *
 * A turn can change the table and draw no card a reader would want shown — a
 * host capability the panel has no receipt for, a change the reader turned
 * card display off for. The offer still stands, so it stands on its own.
 */
function LoneUndo({
  labels,
  slots,
  available,
  reason,
  onUndo,
}: {
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly available: boolean;
  readonly reason: string;
  readonly onUndo: () => void;
}): ReactElement {
  return (
    <span data-adapttable-part="assistant-undo">
      <slots.Button
        label={labels?.assistantUndo ?? "Undo"}
        part="assistant-undo-button"
        variant="secondary"
        icon={<UndoIcon />}
        disabled={!available}
        {...(available ? {} : { tooltip: reason })}
        onClick={onUndo}
      />
      {available ? null : (
        <span
          data-adapttable-part="assistant-undo-reason"
          style={{ opacity: 0.8 }}
        >
          {reason}
        </span>
      )}
    </span>
  );
}

/**
 * What the turn did, on request.
 *
 * Evidence is worth having to hand rather than in the way: the reply leads,
 * and one control under it opens the actions and closes them again.
 */
/**
 * The mark that opens what a reply did.
 *
 * It rides the reply's own corner rather than sitting on the panel's margin:
 * a count on its own line reads as a second message, and a reader who does
 * not want the evidence should see one small mark, not another paragraph.
 */
function ActionsToggle({
  count,
  labels,
  slots,
  open,
  onToggle,
}: {
  readonly count: number;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly open: boolean;
  readonly onToggle: () => void;
}): ReactElement {
  const said =
    labels?.assistantActions?.(count) ??
    `${String(count)} action${count === 1 ? "" : "s"}`;
  return (
    <span
      data-adapttable-part="assistant-receipts-toggle"
      style={{ display: "flex" }}
    >
      <slots.Button
        label={said}
        part="assistant-receipts-toggle-button"
        variant="subtle"
        icon={<ActionsIcon />}
        iconOnly
        tooltip={said}
        expanded={open}
        onClick={onToggle}
      />
    </span>
  );
}

/** What one turn did, as a group under the reply it is evidence for. */
function Receipts({
  receipts,
  labels,
  slots,
  onUndoAction,
  undoTurn,
  cardRef,
  tailInset,
}: {
  readonly receipts: readonly TableAssistantReceiptView[];
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly onUndoAction?: (idempotencyKey: string) => void;
  readonly cardRef?: RefObject<HTMLElement | null>;
  /** Distance from the card's trailing edge to the mark's centre, in px. */
  readonly tailInset?: number;
  readonly undoTurn?: {
    readonly available: boolean;
    readonly reason?: string;
    readonly onUndo: () => void;
  };
}): ReactElement {
  const headingId = useId();
  // How many rows can be put back on their own. Nothing above the list is
  // needed when exactly one can: that row's own control is the whole answer.
  const perRow = onUndoAction
    ? receipts.filter((receipt) => receipt.undoable).length
    : 0;
  // "Undo all" only when there is more than one to be all of; otherwise the
  // heading's control is simply the undo.
  const wholeLabel =
    perRow > 1
      ? (labels?.assistantUndoAll ?? "Undo all")
      : (labels?.assistantUndo ?? "Undo");
  const wholeTooltip =
    undoTurn && !undoTurn.available && undoTurn.reason
      ? { tooltip: undoTurn.reason }
      : {};
  return (
    <section
      ref={cardRef}
      data-adapttable-part="assistant-receipts-group"
      aria-labelledby={headingId}
      style={{
        // The panel's own width. A card at half of it wastes the room the
        // panel was sized to give it.
        alignSelf: "stretch",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "0.3em",
        fontSize: "0.92em",
        minInlineSize: 0,
        marginBlockStart: "0.55em",
        padding: "0.6em 0.7em",
        borderRadius: "0.85em",
        border: "1px solid",
        borderColor: `color-mix(in srgb, ${ACCENT} 22%, transparent)`,
        background: `color-mix(in srgb, ${ACCENT} 5%, transparent)`,
      }}
    >
      {/* Pointing up at the mark that opened it. Without it the card is a
          second thing on the panel and nothing says which reply it is
          evidence for. */}
      <span
        aria-hidden="true"
        data-adapttable-part="assistant-receipts-tail"
        style={{
          position: "absolute",
          insetBlockStart: "-0.42em",
          // Under the mark, whose place moves with the length of the reply
          // it rides. Until it has been measured the tail waits rather than
          // pointing somewhere it was guessed to be.
          insetInlineEnd:
            tailInset === undefined
              ? "1.15em"
              : `calc(${String(tailInset)}px - 0.4em)`,
          visibility: tailInset === undefined ? "hidden" : "visible",
          inlineSize: "0.8em",
          blockSize: "0.42em",
          background: "inherit",
          borderInlineStart: "1px solid",
          borderBlockStart: "1px solid",
          borderColor: "inherit",
          clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
        }}
      />
      {/* Two scopes, said once each: the heading undoes the turn, a row
          undoes itself. Without the heading they were the same word twice
          with nothing to say which was which. */}
      <div
        data-adapttable-part="assistant-receipts-heading"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5em",
          flexWrap: "wrap",
        }}
      >
        <strong
          id={headingId}
          style={{ fontSize: "0.85em", opacity: 0.75, fontWeight: 600 }}
        >
          {labels?.assistantActionsTitle ?? "What this turn changed"}
        </strong>
        {undoTurn && perRow !== 1 ? (
          <span data-adapttable-part="assistant-receipts-undo-all">
            <slots.Button
              // One change needs one control. "Undo all" beside a single row
              // that already carries its own Undo is two buttons doing the
              // same thing — the rule the approval review follows too.
              label={wholeLabel}
              part="assistant-receipts-undo-all-button"
              variant="subtle"
              icon={<UndoIcon />}
              disabled={!undoTurn.available}
              {...wholeTooltip}
              onClick={undoTurn.onUndo}
            />
          </span>
        ) : null}
      </div>
      <ul
        data-adapttable-part="assistant-receipts"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.15em",
        }}
      >
        {receipts.map((receipt) => (
          <Receipt
            key={receipt.idempotencyKey}
            receipt={receipt}
            labels={labels}
            slots={slots}
            {...(receipt.undoable && onUndoAction
              ? {
                  onUndo: () => {
                    onUndoAction(receipt.idempotencyKey);
                  },
                }
              : {})}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * The turn, while it is still running.
 *
 * A reader who has just pressed send has no way to tell "thinking" from
 * "nothing happened" — the badge changes a word in the header, which is not
 * where they are looking. This sits at the end of the transcript, where the
 * reply itself will appear, so the answer lands in the space the waiting
 * occupied rather than shifting it.
 *
 * The dots animate only where motion is welcome; under `prefers-reduced-motion`
 * they hold still and the word alone carries it. The live region above the
 * composer already announces the status, so this is `aria-hidden` — a screen
 * reader hearing "working" twice learns nothing the second time.
 *
 * @internal
 */
export function AssistantWorking({
  labels,
}: {
  readonly labels: TableLabels | undefined;
}): ReactElement {
  const word = labels?.assistantConnection?.("sending") ?? "Working…";
  return (
    <li
      data-adapttable-part="assistant-working"
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5em",
        opacity: 0.75,
        // The reply replaces this in place, so the transcript does not jump
        // when the words arrive.
        minHeight: "1.5em",
      }}
    >
      <style>{WORKING_KEYFRAMES}</style>
      {/* The same face that is about to reply, so the wait and the answer
          are visibly the same speaker. */}
      <SpeakerMark mine={false} hidden={false} />
      <span style={{ display: "inline-flex", gap: "0.25em" }}>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            data-adapttable-part="assistant-working-dot"
            style={{
              width: "0.35em",
              height: "0.35em",
              borderRadius: "50%",
              background: "currentColor",
              animation: `adapttable-assistant-dot 1.2s ${String(index * 0.16)}s infinite ease-in-out`,
            }}
          />
        ))}
      </span>
      <span data-adapttable-part="assistant-working-text">{word}</span>
    </li>
  );
}

/**
 * Held still where motion is unwelcome, rather than turned off entirely: the
 * dots keep their place in the row so the layout does not move either way.
 */
/**
 * What makes a bubble a bubble: a tail.
 *
 * Rounded corners alone read as a rounded box, which is what a reader sees
 * when nothing points from the words back to whoever said them. The tail has
 * to be a pseudo-element — there is no element to hang it on — so it lives
 * here rather than inline with the rest of the bubble.
 *
 * It inherits the bubble's own ground, so a kit's accent carries it without
 * naming a second colour, and it flips with the writing direction because it
 * is anchored to the inline start and end rather than to left and right.
 *
 * One rule, keyed on which side spoke, because there is one bubble component
 * — a reply, the opening line and a question all come through it.
 *
 * @internal
 */
export const BUBBLE_CSS = `
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
`;

const WORKING_KEYFRAMES = `
@keyframes adapttable-assistant-dot {
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-0.15em); }
}
@media (prefers-reduced-motion: reduce) {
  [data-adapttable-part="assistant-working-dot"] { animation: none; opacity: 0.55; }
}
`;

/**
 * What the reader has waved through, and the way back.
 *
 * Drawn wherever the panel keeps its settings rather than in the transcript:
 * it is a standing decision, not something that happened in this turn.
 */
export function AssistantAlwaysAllowed({
  allowed,
  labels,
  slots,
  onRevoke,
}: {
  readonly allowed: readonly TableAssistantAllowanceView[];
  /** What each is called, where the table could say. */
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly onRevoke: (capability: string) => void;
}): ReactElement | null {
  if (allowed.length === 0) return null;
  return (
    <div
      data-adapttable-part="assistant-always-allowed"
      style={{ display: "flex", flexDirection: "column", gap: "0.3em" }}
    >
      <span data-adapttable-part="assistant-always-allowed-title">
        {labels?.assistantAlwaysAllowedTitle ?? "Not asking about"}
      </span>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: "0.3em",
        }}
      >
        {allowed.map(({ capability, name }) => (
          <li
            key={capability}
            data-adapttable-part="assistant-always-allowed-item"
          >
            <slots.Button
              label={
                labels?.assistantAlwaysAllowedRevoke?.(capability) ??
                `Ask about ${capability} again`
              }
              part="assistant-always-allowed-revoke"
              variant="subtle"
              onClick={() => {
                onRevoke(capability);
              }}
            >
              {/* A translation for the built-ins, the definition's own words
                  for a host's own capability, and the key only when neither
                  exists — which is a developer's identifier and reads like
                  one. */}
              {labels?.assistantCapabilityName?.(capability) ??
                name ??
                capability}
            </slots.Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
