/** Angular signals over the neutral speech session. */
import {
  createSpeechSession,
  type SpeechClip,
  speechLanguages,
  speechSessionKey,
  type VoiceOptions,
} from "@adapttable/ai/voice";
import { fromStore, type MaybeSignal, readMaybe } from "@adapttable/angular";
import type { SpeechInputHandle } from "@adapttable/angular/adapter";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  effect,
  inject,
  type Signal,
  untracked,
} from "@angular/core";

/** Configure dictation for one composer. @public */
export interface SpeechInputOptions {
  readonly voice?: VoiceOptions;
  /** Fallback language when voice.languages is empty or omitted. */
  readonly locale?: string;
  /** Heard text becomes a draft, never an automatically sent message. */
  readonly setDraft: (text: string) => void;
  /** A recorded clip, when voice.mode is backend. */
  readonly onClip?: (clip: SpeechClip) => void;
}

/**
 * Dictation for the lifetime of the calling Angular injection context.
 * Callback updates are live; changing mode or offered languages releases the
 * old microphone before creating the replacement controller.
 * @public
 */
export function injectSpeechInput(
  options: MaybeSignal<SpeechInputOptions>
): Signal<SpeechInputHandle> {
  assertInInjectionContext(injectSpeechInput);
  const session = createSpeechSession(() =>
    untracked(() => readMaybe(options))
  );
  const view = fromStore(session);
  session.sync();
  effect(() => {
    // Tracks the options; the session decides whether the microphone moves.
    speechSessionKey(readMaybe(options));
    untracked(session.sync);
  });
  inject(DestroyRef).onDestroy(session.release);
  return computed(() => ({
    ...view(),
    languages: speechLanguages(readMaybe(options)),
  }));
}
