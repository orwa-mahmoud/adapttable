/** Angular signals over the neutral dictation controller. */
import {
  createSpeechInput,
  readRememberedLanguage,
  rememberLanguage,
  type SpeechClip,
  type SpeechInput,
  type SpeechState,
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
  Injector,
  type Signal,
  signal,
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

const IDLE: SpeechState = { status: "unsupported", language: "", interim: "" };

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
  const destroyRef = inject(DestroyRef);
  const parentInjector = inject(Injector);
  const snapshot = signal<Signal<SpeechState> | undefined>(undefined);
  const available = signal(false);
  const languages = computed(() => {
    const current = readMaybe(options);
    return current.voice?.languages?.length
      ? current.voice.languages
      : [current.locale ?? "en-US"];
  });
  let input: SpeechInput | undefined;
  let scope: ReturnType<typeof Injector.create> | undefined;
  let key: string | undefined;
  const release = () => {
    // End the subscription before disposing its controller. A replacement
    // gets a fresh scoped subscription rather than retaining the old store.
    scope?.destroy();
    scope = undefined;
    input?.dispose();
    input = undefined;
    snapshot.set(undefined);
  };
  const configure = () => {
    const current = readMaybe(options);
    const offered = languages();
    const nextKey = current.voice
      ? JSON.stringify([current.voice.mode ?? "browser", offered])
      : undefined;
    untracked(() => {
      if (key === nextKey) return;
      key = nextKey;
      release();
      if (current.voice) {
        const remembered = readRememberedLanguage();
        input = createSpeechInput({
          mode: current.voice.mode ?? "browser",
          languages: offered,
          ...(remembered ? { initialLanguage: remembered } : {}),
          onDraft: (text) => readMaybe(options).setDraft(text),
          onClip: (clip) => readMaybe(options).onClip?.(clip),
        });
        scope = Injector.create({ providers: [], parent: parentInjector });
        snapshot.set(
          fromStore(
            { getSnapshot: input.getState, subscribe: input.subscribe },
            { injector: scope }
          )
        );
      }
      available.set(Boolean(input?.supported()));
    });
  };
  configure();
  effect(configure);
  destroyRef.onDestroy(release);
  return computed(() => ({
    available: available(),
    state: snapshot()?.() ?? IDLE,
    languages: languages(),
    start: () => input?.start(),
    stop: () => input?.stop(),
    setLanguage: (language: string) => {
      input?.setLanguage(language);
      rememberLanguage(language);
    },
  }));
}
