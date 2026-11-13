/**
 * Dictation for one composer, across the configurations it lives through.
 *
 * Every framework binding needs the same answers: which languages are offered,
 * when the microphone controller has to be replaced, which language to start
 * in, where heard text goes, and what a composer draws. They live here once; a
 * binding only decides when to call `sync` and `release` and how to subscribe.
 */
import {
  createSpeechInput,
  readRememberedLanguage,
  rememberLanguage,
  type SpeechClip,
  type SpeechInput,
  type SpeechState,
  type VoiceOptions,
} from "./speechController";

/**
 * How one composer dictates. Heard text only ever changes the draft.
 *
 * @public
 */
export interface SpeechSessionOptions {
  /** Voice configuration. Omit and no microphone is offered. */
  readonly voice?: VoiceOptions;
  /** The table's locale, offered when no language list was given. */
  readonly locale?: string;
  /** Where heard text goes. Always the draft, never a send. */
  readonly setDraft: (text: string) => void;
  /** Where a recording goes, in backend mode. */
  readonly onClip?: (clip: SpeechClip) => void;
}

/**
 * What a composer draws for dictation.
 *
 * @public
 */
export interface SpeechSessionView {
  /** Whether to draw the control: voice is on and this browser can listen. */
  readonly available: boolean;
  /** Where dictation is: listening, recording, idle, denied or unsupported. */
  readonly state: SpeechState;
  /** Languages offered. One means no chip. */
  readonly languages: readonly string[];
  /** Begin listening. A no-op without a microphone. */
  readonly start: () => void;
  /** Stop, and deliver whatever was captured. */
  readonly stop: () => void;
  /** Choose a language, and remember it for next time. */
  readonly setLanguage: (language: string) => void;
}

/**
 * Dictation for one composer: one microphone controller at a time, replaced
 * only when the mode or the offered languages change.
 *
 * @public
 */
export interface SpeechSession {
  /**
   * Bring the controller in line with the current options. A no-op while the
   * mode and the offered languages stand, so an active recognizer survives a
   * host rebuilding the same configuration.
   */
  readonly sync: () => void;
  /** Release the microphone. A later `sync` starts a fresh controller. */
  readonly release: () => void;
  /** Be told when the view changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** The current view; the same object until something it shows moves. */
  readonly getSnapshot: () => SpeechSessionView;
}

/** The state of a composer with no microphone. @public */
export const SPEECH_UNSUPPORTED: SpeechState = {
  status: "unsupported",
  language: "",
  interim: "",
};

/** The languages a composer offers. @public */
export function speechLanguages(
  options: SpeechSessionOptions
): readonly string[] {
  return options.voice?.languages?.length
    ? options.voice.languages
    : [options.locale ?? "en-US"];
}

/**
 * What identifies the controller these options need, or `undefined` when they
 * need none. Equal keys keep the controller that is listening.
 *
 * @public
 */
export function speechSessionKey(
  options: SpeechSessionOptions
): string | undefined {
  if (!options.voice) return undefined;
  return JSON.stringify([
    options.voice.mode ?? "browser",
    speechLanguages(options),
  ]);
}

/**
 * Create dictation for one composer.
 *
 * @param read - The composer's current options, read whenever they are
 *   needed, so heard text and clips always reach the latest callbacks.
 * @returns A session a binding syncs, releases and subscribes to.
 *
 * @public
 */
export function createSpeechSession(
  read: () => SpeechSessionOptions
): SpeechSession {
  let input: SpeechInput | undefined;
  let key: string | undefined;
  let unsubscribe: (() => void) | undefined;
  let view: SpeechSessionView | undefined;
  let viewLanguages = "";
  const listeners = new Set<() => void>();

  const notify = (): void => {
    view = undefined;
    for (const listener of [...listeners]) listener();
  };

  const release = (): void => {
    // End the subscription before disposing its controller, so the disposed
    // one notifies nobody.
    unsubscribe?.();
    unsubscribe = undefined;
    const previous = input;
    input = undefined;
    key = undefined;
    if (!previous) return;
    previous.dispose();
    notify();
  };

  const sync = (): void => {
    const options = read();
    const next = speechSessionKey(options);
    if (next === key) return;
    release();
    if (next === undefined) return;
    const remembered = readRememberedLanguage();
    const current = createSpeechInput({
      mode: options.voice?.mode ?? "browser",
      languages: speechLanguages(options),
      ...(remembered ? { initialLanguage: remembered } : {}),
      onDraft: (text) => read().setDraft(text),
      onClip: (clip) => read().onClip?.(clip),
    });
    input = current;
    key = next;
    unsubscribe = current.subscribe(notify);
    notify();
  };

  const start = (): void => input?.start();
  const stop = (): void => input?.stop();
  // Voice that is off writes nothing anywhere, storage included.
  const setLanguage = (language: string): void => {
    if (!input) return;
    input.setLanguage(language);
    rememberLanguage(language);
  };

  return {
    sync,
    release,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => {
      const languages = speechLanguages(read());
      const offered = JSON.stringify(languages);
      if (view && offered === viewLanguages) return view;
      viewLanguages = offered;
      view = {
        available: input?.supported() ?? false,
        state: input?.getState() ?? SPEECH_UNSUPPORTED,
        languages,
        start,
        stop,
        setLanguage,
      };
      return view;
    },
  };
}
