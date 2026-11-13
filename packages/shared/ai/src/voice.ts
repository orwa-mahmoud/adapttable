/**
 * Dictation — `@adapttable/ai/voice`.
 *
 * Two ways a reader can speak to the table, behind one controller.
 *
 * **Browser mode** runs the Web Speech API and writes what it hears into the
 * draft. Nothing leaves the page: the reader watches the words appear, edits
 * them if they came out wrong, and presses Send. That last part is the point —
 * dictation produces a draft, never a turn, so a misheard sentence is a typo
 * the reader fixes rather than a request the table acted on.
 *
 * **Backend mode** records a clip and hands it over for the backend to
 * transcribe, for languages the browser cannot do and for hosts that would
 * rather their own provider heard it. The clip travels once, on the turn that
 * carries it.
 *
 * Nothing here touches a browser API at import. `SpeechRecognition` and
 * `MediaRecorder` are read when `start` is called, so this module loads on a
 * server, in a test, and in a browser that has neither — and `supported()`
 * answers honestly rather than a control being drawn and then failing.
 *
 * @packageDocumentation
 */

export type {
  SpeechClip,
  SpeechInput,
  SpeechInputOptions,
  SpeechMode,
  SpeechState,
  SpeechStatus,
  VoiceOptions,
} from "./speechController";
export {
  createSpeechInput,
  readRememberedLanguage,
  rememberLanguage,
} from "./speechController";
export {
  createSpeechSession,
  SPEECH_UNSUPPORTED,
  speechLanguages,
  type SpeechSession,
  speechSessionKey,
  type SpeechSessionOptions,
  type SpeechSessionView,
} from "./speechSession";
