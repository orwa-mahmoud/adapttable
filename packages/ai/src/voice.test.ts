import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSpeechInput,
  readRememberedLanguage,
  rememberLanguage,
} from "./voice";

interface FakeRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

const scope = globalThis as Record<string, unknown>;

const PATCHED = [
  "SpeechRecognition",
  "webkitSpeechRecognition",
  "MediaRecorder",
  "navigator",
  "localStorage",
] as const;

const saved = new Map<string, PropertyDescriptor | undefined>(
  PATCHED.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
);

/**
 * Install a global the browser owns.
 *
 * `navigator` is a getter-only property on the real global, so a plain
 * assignment throws. Defining it is how a test stands in for one, and how it
 * puts the real one back afterwards.
 */
function setGlobal(key: string, value: unknown): void {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  for (const key of PATCHED) {
    const descriptor = saved.get(key);
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete scope[key];
  }
});

/** A recognizer the test drives by hand. */
function installRecognizer(): { live: () => FakeRecognition | undefined } {
  let made: FakeRecognition | undefined;
  setGlobal("SpeechRecognition", function Recognition(this: FakeRecognition) {
    this.lang = "";
    this.continuous = false;
    this.interimResults = false;
    this.start = vi.fn();
    this.stop = vi.fn();
    this.abort = vi.fn();
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    made = this;
  } as unknown as new () => FakeRecognition);
  return { live: () => made };
}

/** What the browser hands an `onresult` listener. */
function heard(transcript: string): unknown {
  return {
    resultIndex: 0,
    results: {
      length: 1,
      0: { isFinal: false, 0: { transcript } },
    },
  };
}

describe("dictating into the draft", () => {
  it("writes what it hears to the draft, and never sends", () => {
    const recognizer = installRecognizer();
    const onDraft = vi.fn();
    const input = createSpeechInput({ languages: ["en-GB"], onDraft });
    input.start();

    recognizer.live()?.onresult?.(heard("show active rows"));

    // A draft, not a turn: a misheard sentence is a typo the reader fixes.
    expect(onDraft).toHaveBeenCalledWith("show active rows");
    expect(input.getState().status).toBe("listening");
  });

  it("listens in the language it was given", () => {
    const recognizer = installRecognizer();
    const input = createSpeechInput({ languages: ["fr-FR", "en-GB"] });
    input.start();

    expect(recognizer.live()?.lang).toBe("fr-FR");
    expect(input.getState().language).toBe("fr-FR");
  });

  it("takes a remembered language over the first one offered", () => {
    installRecognizer();
    const input = createSpeechInput({
      languages: ["fr-FR", "en-GB"],
      initialLanguage: "en-GB",
    });

    expect(input.getState().language).toBe("en-GB");
  });

  it("changes language for the next utterance, not mid-sentence", () => {
    const recognizer = installRecognizer();
    const input = createSpeechInput({ languages: ["fr-FR", "en-GB"] });
    input.start();
    input.setLanguage("en-GB");

    // The live recognizer keeps what it was started with; changing it now
    // would throw away what it has already heard.
    expect(recognizer.live()?.lang).toBe("fr-FR");
    expect(input.getState().language).toBe("en-GB");
    input.stop();
    input.start();
    expect(recognizer.live()?.lang).toBe("en-GB");
  });

  it("goes back to idle when the recognizer ends", () => {
    const recognizer = installRecognizer();
    const input = createSpeechInput();
    input.start();
    recognizer.live()?.onend?.();

    expect(input.getState().status).toBe("idle");
  });
});

describe("when it cannot listen", () => {
  it("says so rather than being drawn and failing", () => {
    delete scope.SpeechRecognition;
    delete scope.webkitSpeechRecognition;
    const input = createSpeechInput();

    expect(input.supported()).toBe(false);
    input.start();
    expect(input.getState().status).toBe("unsupported");
  });

  it("reports a refusal out loud", () => {
    const recognizer = installRecognizer();
    const input = createSpeechInput();
    input.start();
    recognizer.live()?.onerror?.({ error: "not-allowed" });

    // A silent no-op leaves the reader pressing a button that does nothing.
    expect(input.getState().status).toBe("denied");
    expect(input.getState().error).toMatch(/refused/);
  });

  it("keeps any other failure distinguishable from a refusal", () => {
    const recognizer = installRecognizer();
    const input = createSpeechInput();
    input.start();
    recognizer.live()?.onerror?.({ error: "network" });

    expect(input.getState().status).toBe("error");
    expect(input.getState().error).toBe("network");
  });
});

describe("recording for a backend", () => {
  it("reports unsupported where nothing can record", () => {
    delete scope.MediaRecorder;
    const input = createSpeechInput({ mode: "backend" });

    expect(input.supported()).toBe(false);
    input.start();
    expect(input.getState().status).toBe("unsupported");
  });

  it("hands the clip over once, with its duration", async () => {
    const track = { stop: vi.fn() };
    setGlobal("navigator", {
      mediaDevices: {
        getUserMedia: () => Promise.resolve({ getTracks: () => [track] }),
      },
    });
    let live: Record<string, unknown> | undefined;
    setGlobal("MediaRecorder", function Recorder(
      this: Record<string, unknown>
    ) {
      this.state = "recording";
      this.mimeType = "audio/webm;codecs=opus";
      this.start = vi.fn();
      this.stop = vi.fn(() => {
        (this.onstop as (() => void) | null)?.();
      });
      this.ondataavailable = null;
      this.onstop = null;
      live = this;
    } as unknown as new () => unknown);

    const onClip = vi.fn();
    const input = createSpeechInput({ mode: "backend", onClip });
    input.start();
    await new Promise((resolve) => setTimeout(resolve, 0));

    (live?.ondataavailable as ((e: { data: Blob }) => void) | null)?.({
      data: new Blob(["abc"], { type: "audio/webm" }),
    });
    input.stop();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onClip).toHaveBeenCalledTimes(1);
    const clip = onClip.mock.calls[0]?.[0] as {
      mimeType: string;
      base64: string;
      durationMs: number;
    };
    // The codec parameter is dropped: the wire enumerates media types.
    expect(clip.mimeType).toBe("audio/webm");
    expect(clip.base64.length).toBeGreaterThan(0);
    expect(clip.durationMs).toBeGreaterThanOrEqual(0);
    // The microphone is released, not left running.
    expect(track.stop).toHaveBeenCalled();
  });

  it("reports a refused microphone", async () => {
    setGlobal("navigator", {
      mediaDevices: { getUserMedia: () => Promise.reject(new Error("no")) },
    });
    setGlobal("MediaRecorder", function Recorder() {
      /* never reached */
    } as unknown as new () => unknown);

    const input = createSpeechInput({ mode: "backend" });
    input.start();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(input.getState().status).toBe("denied");
  });
});

describe("disposal", () => {
  it("aborts rather than delivering one last result", () => {
    const recognizer = installRecognizer();
    const onDraft = vi.fn();
    const input = createSpeechInput({ onDraft });
    input.start();
    const live = recognizer.live();
    input.dispose();

    expect(live?.abort).toHaveBeenCalled();
    live?.onresult?.(heard("too late"));
    expect(onDraft).not.toHaveBeenCalled();
  });

  it("is idempotent and notifies nobody afterwards", () => {
    installRecognizer();
    const input = createSpeechInput();
    const listener = vi.fn();
    input.subscribe(listener);
    input.dispose();
    listener.mockClear();

    expect(() => {
      input.dispose();
    }).not.toThrow();
    input.start();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("remembering a language", () => {
  it("keeps and reads a choice", () => {
    const store = new Map<string, string>();
    setGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });

    rememberLanguage("de-DE");
    expect(readRememberedLanguage()).toBe("de-DE");
  });

  it("survives a browser that refuses storage", () => {
    setGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });

    // Refusing to store a preference must not break dictation.
    expect(() => {
      rememberLanguage("de-DE");
    }).not.toThrow();
    expect(readRememberedLanguage()).toBeUndefined();
  });
});
