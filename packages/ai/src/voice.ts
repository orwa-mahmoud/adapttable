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

/** Which way the reader's voice reaches the table. @public */
export type SpeechMode = "browser" | "backend";

/** How dictation is configured on the assistant. @public */
export interface VoiceOptions {
  /**
   * Languages offered, as BCP-47 tags.
   *
   * One shows the mic alone. More than one shows a chip beside it, because a
   * reader who speaks two languages needs to say which, and a mic that asks is
   * a mic that is slower than typing.
   */
  readonly languages?: readonly string[];
  /** Defaults to `browser`. */
  readonly mode?: SpeechMode;
}

/** What the reader recorded, for a backend to transcribe. @public */
export interface SpeechClip {
  readonly mimeType: string;
  /** The clip, base64-encoded, as the turn carries it. */
  readonly base64: string;
  readonly durationMs: number;
}

/** Where dictation has got to. @public */
export type SpeechStatus =
  "idle" | "listening" | "processing" | "denied" | "unsupported" | "error";

/** What a surface renders from. @public */
export interface SpeechState {
  readonly status: SpeechStatus;
  /** The language in force. */
  readonly language: string;
  /** What has been heard so far this utterance, in browser mode. */
  readonly interim: string;
  /** Why dictation failed, when it did. */
  readonly error?: string;
}

/** How the controller reaches the outside. @public */
export interface SpeechInputOptions {
  readonly mode?: SpeechMode;
  /** Languages offered. The first is the default. */
  readonly languages?: readonly string[];
  /** Called with the text so far. A binding writes this to the draft. */
  readonly onDraft?: (text: string) => void;
  /** Called once with the recording, in backend mode. */
  readonly onClip?: (clip: SpeechClip) => void;
  /** Remembered language, when the host kept one. */
  readonly initialLanguage?: string;
}

/** Dictation, without a framework. @public */
export interface SpeechInput {
  readonly getState: () => SpeechState;
  readonly subscribe: (listener: () => void) => () => void;
  /** Begin listening. Safe to call when already listening. */
  readonly start: () => void;
  /** Stop, and deliver whatever was captured. */
  readonly stop: () => void;
  /** Choose the language for the next utterance. */
  readonly setLanguage: (language: string) => void;
  /** Whether this browser can do this mode at all. */
  readonly supported: () => boolean;
  /** Idempotent. Releases the microphone and notifies nobody afterwards. */
  readonly dispose: () => void;
}

/** The shape of the browser's recognizer, named so nothing here needs `any`. */
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechResultEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: {
      readonly isFinal: boolean;
      readonly [alternative: number]: { readonly transcript: string };
    };
  };
}

type RecognitionConstructor = new () => RecognitionLike;

/** The recognizer this browser offers, read at call time. */
function recognitionConstructor(): RecognitionConstructor | undefined {
  const scope = globalThis as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

/** Whether this browser can record at all. */
function canRecord(): boolean {
  const scope = globalThis as {
    MediaRecorder?: unknown;
    navigator?: { mediaDevices?: { getUserMedia?: unknown } };
  };
  return (
    typeof scope.MediaRecorder === "function" &&
    typeof scope.navigator?.mediaDevices?.getUserMedia === "function"
  );
}

/** Base64 without assuming Node's Buffer or a DOM FileReader. */
async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCodePoint(byte);
  return btoa(binary);
}

/**
 * Create a dictation controller.
 *
 * @param options - Mode, languages, and where text and clips should go.
 * @returns A controller a binding subscribes to.
 *
 * @public
 */
export function createSpeechInput(
  options: SpeechInputOptions = {}
): SpeechInput {
  const mode: SpeechMode = options.mode ?? "browser";
  const languages = options.languages?.length
    ? options.languages
    : ([globalThis.navigator?.language ?? "en-US"] as readonly string[]);
  let language = options.initialLanguage ?? languages[0] ?? "en-US";
  let status: SpeechStatus = "idle";
  let interim = "";
  let error: string | undefined;
  let disposed = false;

  let recognition: RecognitionLike | undefined;
  let recorder: { stop: () => void; state: string } | undefined;
  let stopTracks: (() => void) | undefined;
  let startedAt = 0;

  const listeners = new Set<() => void>();
  let snapshot: SpeechState | undefined;

  const publish = (): void => {
    snapshot = undefined;
    if (disposed) return;
    // Copied first: a listener that unsubscribes while it is being notified
    // must not change the set this loop is walking.
    const notifying = [...listeners];
    for (const listener of notifying) listener();
  };

  const fail = (next: SpeechStatus, message?: string): void => {
    status = next;
    error = message;
    publish();
  };

  const supported = (): boolean =>
    mode === "browser" ? recognitionConstructor() !== undefined : canRecord();

  const startBrowser = (): void => {
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      fail("unsupported");
      return;
    }
    const live = new Recognition();
    recognition = live;
    live.lang = language;
    live.continuous = true;
    live.interimResults = true;
    live.onresult = (event) => {
      if (disposed) return;
      let heard = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        heard += event.results[index]?.[0]?.transcript ?? "";
      }
      interim = heard;
      // Straight to the draft. The reader reads it, fixes it if it came out
      // wrong, and decides when to send — dictation never sends by itself.
      options.onDraft?.(heard);
      publish();
    };
    live.onerror = (event) => {
      if (disposed) return;
      const code = event.error ?? "error";
      // A refusal is a thing to say out loud, not a control that does nothing.
      if (code === "not-allowed" || code === "service-not-allowed") {
        fail("denied", "microphone access was refused");
        return;
      }
      fail("error", code);
    };
    live.onend = () => {
      if (disposed) return;
      recognition = undefined;
      if (status === "listening") {
        status = "idle";
        publish();
      }
    };
    status = "listening";
    error = undefined;
    publish();
    live.start();
  };

  /**
   * Read a finished recording and hand it to the host.
   *
   * Lives out here rather than inside the recorder's `onstop` because the
   * codec string a browser reports carries parameters the host did not ask
   * for (`audio/webm;codecs=opus`), and a backend matching on the media type
   * should see the type.
   */
  const deliverClip = (
    blob: Blob,
    recordedType: string,
    durationMs: number
  ): void => {
    void toBase64(blob).then(
      (base64) => {
        if (disposed) return;
        options.onClip?.({
          mimeType: recordedType.split(";")[0] ?? "audio/webm",
          base64,
          durationMs,
        });
        status = "idle";
        publish();
      },
      () => {
        fail("error", "the recording could not be read");
      }
    );
  };

  const startBackend = (): void => {
    if (!canRecord()) {
      fail("unsupported");
      return;
    }
    status = "listening";
    error = undefined;
    publish();
    const scope = globalThis as unknown as {
      MediaRecorder: new (
        stream: MediaStream,
        init?: { mimeType?: string }
      ) => {
        start: () => void;
        stop: () => void;
        state: string;
        ondataavailable: ((event: { data: Blob }) => void) | null;
        onstop: (() => void) | null;
        mimeType: string;
      };
      navigator: {
        mediaDevices: { getUserMedia: (c: unknown) => Promise<MediaStream> };
      };
    };
    void scope.navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (disposed) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        const live = new scope.MediaRecorder(stream);
        const chunks: Blob[] = [];
        startedAt = Date.now();
        stopTracks = () => {
          for (const track of stream.getTracks()) track.stop();
        };
        live.ondataavailable = (event) => chunks.push(event.data);
        live.onstop = () => {
          stopTracks?.();
          stopTracks = undefined;
          recorder = undefined;
          if (disposed) return;
          const durationMs = Date.now() - startedAt;
          const blob = new Blob(chunks, { type: live.mimeType });
          status = "processing";
          publish();
          deliverClip(blob, live.mimeType, durationMs);
        };
        recorder = live;
        live.start();
      })
      .catch(() => {
        if (!disposed) fail("denied", "microphone access was refused");
      });
  };

  return {
    supported,

    getState: () => {
      snapshot ??= {
        status,
        language,
        interim,
        ...(error ? { error } : {}),
      };
      return snapshot;
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setLanguage: (next) => {
      if (disposed || language === next) return;
      language = next;
      // Takes effect on the next utterance rather than mid-sentence: changing
      // a recognizer's language while it is listening loses what it has heard.
      publish();
    },

    start: () => {
      if (disposed || status === "listening") return;
      interim = "";
      if (mode === "browser") startBrowser();
      else startBackend();
    },

    stop: () => {
      if (disposed) return;
      recognition?.stop();
      if (recorder?.state === "recording") recorder.stop();
      if (status === "listening" && mode === "browser") {
        status = "idle";
        publish();
      }
    },

    dispose: () => {
      if (disposed) return;
      disposed = true;
      // Abort rather than stop: a disposed controller must not deliver one
      // last result into a surface that has gone.
      recognition?.abort();
      recognition = undefined;
      if (recorder?.state === "recording") recorder.stop();
      recorder = undefined;
      stopTracks?.();
      stopTracks = undefined;
      listeners.clear();
    },
  };
}

/** Read a remembered language choice, or nothing. @public */
export function readRememberedLanguage(
  key = "adapttable.voice.language"
): string | undefined {
  try {
    return globalThis.localStorage?.getItem(key) ?? undefined;
  } catch {
    // A browser that refuses storage must not break dictation.
    return undefined;
  }
}

/** Remember a language choice, if the browser will let us. @public */
export function rememberLanguage(
  language: string,
  key = "adapttable.voice.language"
): void {
  try {
    globalThis.localStorage?.setItem(key, language);
  } catch {
    // Nothing to do and nothing to report: the choice simply is not kept.
  }
}
