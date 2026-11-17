/** Vue refs over the neutral, optional speech session. */
import {
  createSpeechSession,
  type SpeechClip,
  speechLanguages,
  speechSessionKey,
  type SpeechState,
  type VoiceOptions,
} from "@adapttable/ai/voice";
import {
  type SpeechInputHandle,
  useExternalStore,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  proxyRefs,
  type ShallowRef,
  toValue,
  watch,
} from "vue";

/** Configure one composer. Heard text only changes the draft. @public */
export interface UseSpeechInputOptions {
  readonly voice?: VoiceOptions;
  readonly locale?: string;
  readonly setDraft: (text: string) => void;
  readonly onClip?: (clip: SpeechClip) => void;
}
/** Destructurable speech state and stable controls. @public */
export interface SpeechInputState {
  readonly view: ComputedRef<SpeechInputHandle>;
  readonly available: ComputedRef<boolean>;
  readonly state: Readonly<ShallowRef<SpeechState>>;
  readonly languages: ComputedRef<readonly string[]>;
  readonly start: () => void;
  readonly stop: () => void;
  readonly setLanguage: (language: string) => void;
}

/** Microphones and storage remain untouched during SSR. @public */
export function useSpeechInput(
  options: MaybeRefOrGetter<UseSpeechInputOptions>
): SpeechInputState {
  const active = useScopeActivity();
  const session = createSpeechSession(() => toValue(options));
  const snapshot = useExternalStore(session);
  // An inactive scope holds no microphone; the session decides when an
  // active one has to be replaced.
  watch(
    () => (active.value ? speechSessionKey(toValue(options)) : undefined),
    (key) => {
      if (key === undefined) session.release();
      else session.sync();
    },
    { immediate: true, flush: "sync" }
  );
  onScopeDispose(session.release);
  const { start, stop, setLanguage } = session.getSnapshot();
  const handle: Omit<SpeechInputState, "view"> = {
    available: computed(() => snapshot.value.available),
    state: computed(() => snapshot.value.state),
    languages: computed(() => speechLanguages(toValue(options))),
    start,
    stop,
    setLanguage,
  };
  return { ...handle, view: computed(() => ({ ...proxyRefs(handle) })) };
}
