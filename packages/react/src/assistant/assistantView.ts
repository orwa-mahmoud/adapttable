/**
 * What the assistant chrome reads, described structurally.
 *
 * `@adapttable/ai` is optional and must stay out of every adapter's graph, so
 * the chrome names the shape it needs rather than importing the controller's
 * types. `useTableAssistant`'s return satisfies this by construction; a host
 * driving the panel from its own state satisfies it by writing it.
 */

/** One action's outcome, as the panel shows it. @public */
export interface TableAssistantReceiptView {
  /** Stable technical key of the capability that ran. */
  readonly capabilityKey?: string;
  /** Status token — the labels turn it into the reader's language. */
  readonly status: string;
  /** The failure's own message, when there was one. */
  readonly message?: string;
  /** Replay identity, unique within a turn. */
  readonly idempotencyKey: string;
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
}

/**
 * The live conversation the chrome renders.
 *
 * @public
 */
export interface TableAssistantView {
  /** Connection/turn state token, translated by `assistantConnection`. */
  readonly status: string;
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
