/** Vue refs over the neutral, optional dictation controller. */
import {
  createSpeechInput,
  readRememberedLanguage,
  rememberLanguage,
  type SpeechClip,
  type SpeechInput,
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
  shallowRef,
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
const UNSUPPORTED: SpeechState = {
  status: "unsupported",
  language: "",
  interim: "",
};
const EMPTY_STORE = {
  getSnapshot: () => UNSUPPORTED,
  subscribe: () => () => undefined,
};

/** Microphones and storage remain untouched during SSR. @public */
export function useSpeechInput(
  options: MaybeRefOrGetter<UseSpeechInputOptions>
): SpeechInputState {
  const active = useScopeActivity();
  const input = shallowRef<SpeechInput>();
  const languages = computed(() => {
    const current = toValue(options);
    return current.voice?.languages?.length
      ? current.voice.languages
      : [current.locale ?? "en-US"];
  });
  const state = useExternalStore(() => {
    const current = input.value;
    return current
      ? { getSnapshot: current.getState, subscribe: current.subscribe }
      : EMPTY_STORE;
  });
  const release = () => {
    const previous = input.value;
    input.value = undefined;
    previous?.dispose();
  };
  watch(
    () => {
      const current = toValue(options);
      return active.value && current.voice
        ? JSON.stringify([current.voice.mode ?? "browser", languages.value])
        : undefined;
    },
    (key) => {
      release();
      if (key === undefined) return;
      const current = toValue(options);
      const remembered = readRememberedLanguage();
      input.value = createSpeechInput({
        mode: current.voice?.mode ?? "browser",
        languages: languages.value,
        ...(remembered ? { initialLanguage: remembered } : {}),
        onDraft: (text) => toValue(options).setDraft(text),
        onClip: (clip) => toValue(options).onClip?.(clip),
      });
    },
    { immediate: true, flush: "sync" }
  );
  onScopeDispose(release);
  const handle: Omit<SpeechInputState, "view"> = {
    available: computed(() => Boolean(input.value?.supported())),
    state,
    languages,
    start: () => input.value?.start(),
    stop: () => input.value?.stop(),
    setLanguage: (language) => {
      if (!input.value) return;
      input.value.setLanguage(language);
      rememberLanguage(language);
    },
  };
  return { ...handle, view: computed(() => ({ ...proxyRefs(handle) })) };
}
