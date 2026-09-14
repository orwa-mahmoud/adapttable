/**
 * What the assistant chrome reads, described structurally.
 *
 * `@adapttable/ai` is optional and must stay out of every adapter's graph, so
 * the chrome names the shape it needs rather than importing the controller's
 * types. `useTableAssistant`'s return satisfies this by construction; a host
 * driving the panel from its own state satisfies it by writing it.
 */

/**
 * What one action changed, in the reader's terms.
 *
 * Supplied by whoever executed the action, from the arguments that actually
 * ran — never parsed back out of the model's reply. Absent fields are simply
 * not shown; the panel never invents a value it was not given.
 *
 * @public
 */
export interface TableAssistantReceiptSubject {
  /**
   * The kind of change, for the card's headline: `filter`, `sort`, `group`,
   * `pin`, `edit`, or a kind a host defines. Labels turn it into a sentence.
   */
  readonly kind?: string;
  /**
   * What it acted on, already readable — "Team is Core", "Salary".
   *
   * A host that knows its own wording sets this and the panel shows it as
   * given. The built-in capabilities fill {@link terms} instead, so the
   * sentence is written in the reader's language rather than the runner's.
   */
  readonly detail?: string;
  /** What it acted on, structurally, for the labels to phrase. */
  readonly terms?: readonly {
    readonly column?: string;
    readonly value?: string;
  }[];
  /** Which way a sort went, when the action was one. */
  readonly direction?: "asc" | "desc";
  /** Whether the action took something off rather than put it on. */
  readonly cleared?: boolean;
  /** For an edit: which row and column, when the host may show them. */
  readonly row?: string;
  readonly column?: string;
  /** For an edit: the values either side, already formatted by the table. */
  readonly before?: string;
  readonly after?: string;
}

/** One action's outcome, as the panel shows it. @public */
export interface TableAssistantReceiptView {
  /** Stable technical key of the capability that ran. Developer detail. */
  readonly capabilityKey?: string;
  /** Status token — the labels turn it into the reader's language. */
  readonly status: string;
  /** The failure's own message, when there was one. */
  readonly message?: string;
  /** Replay identity, unique within a turn. */
  readonly idempotencyKey: string;
  /** What changed, for the card's headline and body. */
  readonly subject?: TableAssistantReceiptSubject;
  /** Whether this one action can be put back on its own. */
  readonly undoable?: boolean;
}

/** One record in the transcript. @public */
export interface TableAssistantMessageView {
  readonly id: string;
  readonly role: "user" | "assistant";
  /** Untrusted text. The chrome renders it as text, never as markup. */
  readonly text: string;
  /**
   * What has arrived so far, while a reply is still streaming.
   *
   * Present only on a provisional message; the real one replaces it when the
   * turn settles. Words arriving are never a claim that anything ran, so a
   * message showing this carries no receipts.
   */
  readonly partialText?: string;
  /**
   * The question this message is asking, while it is still unanswered.
   *
   * A question is a thing the assistant said, so it belongs to the message
   * that said it rather than to a slot beside the transcript. Gone once it is
   * answered; the message stays.
   */
  readonly question?: TableAssistantQuestionView;
  readonly receipts?: readonly TableAssistantReceiptView[];
}

/** One choice offered with a question. @public */
export interface TableAssistantQuestionOption {
  readonly id: string;
  readonly label: string;
}

/**
 * A question the backend put to the reader, mid-turn.
 *
 * Structure rather than prose: a question rendered as ordinary assistant text
 * is one the reader answers into the void, because nothing is waiting for
 * what they type.
 *
 * @public
 */
export interface TableAssistantQuestionView {
  readonly id: string;
  readonly question: string;
  readonly options?: readonly TableAssistantQuestionOption[];
  /** Whether a typed answer is accepted as well as, or instead of, a choice. */
  readonly allowFreeText: boolean;
}

/** Whether the last turn that moved the table can be put back. @public */
export interface TableAssistantUndoView {
  /** The message the offer belongs to. */
  readonly messageId: string;
  /** Whether the control is live right now. */
  readonly available: boolean;
  /** Why it is not, when it is not — a token the labels translate. */
  readonly blockedCode?: string;
}

/** A prompt the reader can run without typing it. @public */
export interface TableAssistantSuggestionView {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** Which glyph the card carries: `filter`, `sort`, `group`, `edit`. */
  readonly kind?: string;
}

/**
 * The live conversation the chrome renders.
 *
 * @public
 */
export interface TableAssistantView {
  /** Connection/turn state token, translated by `assistantConnection`. */
  readonly status: string;
  /**
   * Whether a turn is in flight and can still be stopped.
   *
   * A write parked on a human approval reports `awaiting-approval` — it is
   * not "working", but it has not finished either, and Stop still ends it.
   * Omit it and the panel falls back to reading {@link
   * TableAssistantView.status}, which is what a host writing its own view
   * did before this existed.
   */
  readonly busy?: boolean;
  readonly messages: readonly TableAssistantMessageView[];
  readonly draft: string;
  readonly setDraft: (draft: string) => void;
  /** Send the draft, or the given text. */
  readonly send: (text?: string) => void | Promise<void>;
  /** Abort the turn in flight. */
  readonly stop: () => void;
  /** Primary suggestions, already filtered to what this table can run. */
  readonly suggestions: readonly TableAssistantSuggestionView[];
  /** The eligible remainder, shown behind a "more" affordance. */
  readonly moreSuggestions?: readonly TableAssistantSuggestionView[];
  readonly runSuggestion: (id: string) => void | Promise<void>;
  /** The last failure, when there is one. */
  readonly error?: string;
  /**
   * The machine code behind {@link error}, when a turn ended with work
   * pending. The labels turn it into a sentence; without one the message
   * itself is shown.
   */
  readonly errorCode?: string;
  /**
   * A question waiting on the reader, when the backend asked one.
   *
   * The turn is still in flight while this is set: answering resumes it, and
   * Stop still ends it.
   */
  readonly pendingQuestion?: TableAssistantQuestionView | null;
  /** Answer it. Ignored once the turn has moved on. */
  readonly answer?: (answer: { optionId?: string; text?: string }) => void;
  /** Whether the last turn that moved the table can still be put back. */
  readonly undo?: TableAssistantUndoView | null;
  /** Put that turn back. */
  readonly undoTurn?: () => void | Promise<void>;
  /**
   * Put one action back, by the replay identity on its receipt.
   *
   * A card draws its own control only when its receipt says `undoable` — and
   * a turn that did one thing marks none of them, because the turn's own
   * control is already that action's undo.
   */
  readonly undoAction?: (idempotencyKey: string) => void | Promise<void>;
  /** Capability keys the reader said not to ask about again. */
  readonly alwaysAllowed?: readonly string[];
  /**
   * What each of those is called, keyed by capability.
   *
   * A built-in has a translation; a host's own capability has only what its
   * definition said about it, which still beats showing a reader the key.
   */
  readonly alwaysAllowedNames?: Readonly<Record<string, string>>;
  /** Ask about one of them again from now on. */
  readonly revokeAlwaysAllow?: (capability: string) => void;
}

/** Whether a turn is running right now. @public */
export function assistantIsBusy(status: string): boolean {
  return status === "sending";
}

/** Whether the composer can be used at all. @public */
export function assistantIsUsable(status: string): boolean {
  return status !== "disconnected" && status !== "connecting";
}
