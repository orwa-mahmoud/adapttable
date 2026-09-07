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
  /** What it acted on, already readable — "Team is Core", "Salary". */
  readonly detail?: string;
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
}

/** One record in the transcript. @public */
export interface TableAssistantMessageView {
  readonly id: string;
  readonly role: "user" | "assistant";
  /** Untrusted text. The chrome renders it as text, never as markup. */
  readonly text: string;
  readonly receipts?: readonly TableAssistantReceiptView[];
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
}

/** Whether a turn is running right now. @public */
export function assistantIsBusy(status: string): boolean {
  return status === "sending";
}

/** Whether the composer can be used at all. @public */
export function assistantIsUsable(status: string): boolean {
  return status !== "disconnected" && status !== "connecting";
}
