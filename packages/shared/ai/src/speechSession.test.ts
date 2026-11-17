import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSpeechSession,
  readRememberedLanguage,
  rememberLanguage,
  SPEECH_UNSUPPORTED,
  speechLanguages,
  speechSessionKey,
  type SpeechSessionOptions,
} from "./voice";

interface Recognition {
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

const heard = (transcript: string) => ({
  resultIndex: 0,
  results: { length: 1, 0: { isFinal: true, 0: { transcript } } },
});

/** Every recognizer the browser hands out, newest last. */
function recognizers(): Recognition[] {
  const made: Recognition[] = [];
  vi.stubGlobal("SpeechRecognition", function () {
    const current: Recognition = {
      lang: "",
      continuous: false,
      interimResults: false,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
    };
    made.push(current);
    return current;
  });
  return made;
}

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("speechLanguages and speechSessionKey", () => {
  it("offers the configured languages, else the locale, else en-US", () => {
    const setDraft = vi.fn();
    expect(
      speechLanguages({ voice: { languages: ["fr-FR"] }, setDraft })
    ).toEqual(["fr-FR"]);
    expect(
      speechLanguages({ voice: { languages: [] }, locale: "ar-SA", setDraft })
    ).toEqual(["ar-SA"]);
    expect(speechLanguages({ setDraft })).toEqual(["en-US"]);
  });

  it("needs no controller without voice, and one per mode and language list", () => {
    const setDraft = vi.fn();
    expect(speechSessionKey({ setDraft })).toBeUndefined();
    expect(speechSessionKey({ voice: {}, setDraft })).toBe(
      JSON.stringify(["browser", ["en-US"]])
    );
    expect(
      speechSessionKey({
        voice: { mode: "backend" },
        locale: "de-DE",
        setDraft,
      })
    ).toBe(JSON.stringify(["backend", ["de-DE"]]));
  });
});

describe("createSpeechSession", () => {
  it("draws nothing and starts nothing without voice", () => {
    const made = recognizers();
    const session = createSpeechSession(() => ({ setDraft: vi.fn() }));
    session.sync();
    const view = session.getSnapshot();
    expect(view.available).toBe(false);
    expect(view.state).toBe(SPEECH_UNSUPPORTED);
    expect(view.languages).toEqual(["en-US"]);
    view.start();
    view.stop();
    view.setLanguage("fr-FR");
    expect(made).toHaveLength(0);
    expect(readRememberedLanguage()).toBeUndefined();
  });

  it("keeps a listening controller while equivalent options are rebuilt", () => {
    const made = recognizers();
    let options: SpeechSessionOptions = {
      voice: { languages: ["en-GB"] },
      setDraft: vi.fn(),
    };
    const session = createSpeechSession(() => options);
    const listener = vi.fn();
    session.subscribe(listener);
    session.sync();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().available).toBe(true);
    session.getSnapshot().start();
    expect(made[0]?.lang).toBe("en-GB");
    const first = session.getSnapshot();

    options = { voice: { languages: ["en-GB"] }, setDraft: vi.fn() };
    session.sync();
    expect(session.getSnapshot()).toBe(first);
    expect(made[0]?.abort).not.toHaveBeenCalled();
  });

  it("replaces the controller when the offered languages change", () => {
    const made = recognizers();
    let options: SpeechSessionOptions = {
      voice: { languages: ["en-GB"] },
      setDraft: vi.fn(),
    };
    const session = createSpeechSession(() => options);
    session.sync();
    session.getSnapshot().start();
    options = { voice: { languages: ["fr-FR"] }, setDraft: vi.fn() };
    const view = session.getSnapshot();
    expect(view.languages).toEqual(["fr-FR"]);
    session.sync();
    expect(made[0]?.abort).toHaveBeenCalled();
    session.getSnapshot().start();
    expect(made[1]?.lang).toBe("fr-FR");
  });

  it("starts in the remembered language and remembers a new choice", () => {
    const made = recognizers();
    rememberLanguage("de-DE");
    const session = createSpeechSession(() => ({
      voice: { languages: ["en-US", "de-DE", "fr-FR"] },
      setDraft: vi.fn(),
    }));
    session.sync();
    const view = session.getSnapshot();
    view.start();
    expect(made[0]?.lang).toBe("de-DE");
    view.setLanguage("fr-FR");
    expect(readRememberedLanguage()).toBe("fr-FR");
  });

  it("writes heard text through the latest draft callback", () => {
    const made = recognizers();
    const first = vi.fn();
    const latest = vi.fn();
    let setDraft = first;
    const session = createSpeechSession(() => ({ voice: {}, setDraft }));
    session.sync();
    session.getSnapshot().start();
    setDraft = latest;
    made[0]?.onresult?.(heard("filter by team"));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith("filter by team");
  });

  it("releases the microphone and notifies nobody after unsubscribing", () => {
    const made = recognizers();
    const session = createSpeechSession(() => ({
      voice: {},
      setDraft: vi.fn(),
    }));
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.sync();
    session.getSnapshot().start();
    const heardBefore = listener.mock.calls.length;
    unsubscribe();
    session.release();
    expect(made[0]?.abort).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(heardBefore);
    expect(session.getSnapshot().available).toBe(false);
    session.release();
    session.sync();
    expect(made).toHaveLength(1);
    session.getSnapshot().start();
    expect(made).toHaveLength(2);
  });

  it("hands a backend recording to the latest clip callback", async () => {
    recognizers();
    const chunks: ((event: { data: Blob }) => void)[] = [];
    class Recorder {
      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = "recording";
        chunks.push((event) => this.ondataavailable?.(event));
      }
      stop() {
        this.state = "inactive";
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", Recorder);
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: () => Promise.resolve({ getTracks: () => [] }),
      },
    });
    const onClip = vi.fn();
    const session = createSpeechSession(() => ({
      voice: { mode: "backend" },
      setDraft: vi.fn(),
      onClip,
    }));
    session.sync();
    session.getSnapshot().start();
    await vi.waitFor(() => expect(chunks).toHaveLength(1));
    chunks[0]?.({ data: new Blob(["sound"], { type: "audio/webm" }) });
    session.getSnapshot().stop();
    await vi.waitFor(() => expect(onClip).toHaveBeenCalledTimes(1));
  });
});
