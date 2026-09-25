/**
 * What the composer needs to draw a mic, described structurally.
 *
 * `@adapttable/ai` is optional and must stay out of this package's graph —
 * that is what `scripts/ai-isolation.mjs` proves — so the chrome names the
 * shape it needs rather than importing the voice controller's types, exactly
 * as `assistantView.ts` does for the conversation.
 *
 * `useSpeechInput` in `@adapttable/ai-react` returns something that satisfies
 * this by construction. A host driving a mic from its own recognizer
 * satisfies it by writing it.
 */

/** How dictation is doing. @public */
export type SpeechInputStatus =
  "idle" | "listening" | "processing" | "denied" | "unsupported" | "error";

/** What the composer renders from. @public */
export interface SpeechInputState {
  readonly status: SpeechInputStatus;
  /** The language in force. */
  readonly language: string;
  /** What has been heard so far this utterance, in browser mode. */
  readonly interim: string;
  /** Why dictation failed, when it did. */
  readonly error?: string;
}

/** What the composer needs to wire a mic. @public */
export interface SpeechInputHandle {
  /**
   * Whether to draw the control at all.
   *
   * False when voice is off *or* this browser cannot listen. A mic that
   * cannot listen is absent rather than disabled: a disabled control raises a
   * question the reader has no way to answer.
   */
  readonly available: boolean;
  readonly state: SpeechInputState;
  /** Languages offered. One means no chip. */
  readonly languages: readonly string[];
  readonly start: () => void;
  readonly stop: () => void;
  /** Choose a language, and remember it for next time. */
  readonly setLanguage: (language: string) => void;
}
