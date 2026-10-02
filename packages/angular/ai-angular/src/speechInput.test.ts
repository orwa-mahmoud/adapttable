import { Blob as NodeBlob } from "node:buffer";

import { readRememberedLanguage, rememberLanguage } from "@adapttable/ai/voice";
import { Injector, runInInjectionContext, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { injectSpeechInput, type SpeechInputOptions } from "./speechInput";

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

const scopes = new Set<ReturnType<typeof Injector.create>>();
beforeEach(() => localStorage.clear());
afterEach(() => {
  for (const scope of scopes) scope.destroy();
  scopes.clear();
  vi.unstubAllGlobals();
});

function mount(options: SpeechInputOptions) {
  const input = signal(options);
  const scope = Injector.create({
    providers: [],
    parent: TestBed.inject(Injector),
  });
  scopes.add(scope);
  const value = runInInjectionContext(scope, () => injectSpeechInput(input));
  TestBed.tick();
  return {
    value,
    update: (next: SpeechInputOptions) => {
      input.set(next);
      TestBed.tick();
    },
    destroy: () => {
      scope.destroy();
      scopes.delete(scope);
    },
  };
}

function recognizer() {
  let current: Recognition | undefined;
  vi.stubGlobal("SpeechRecognition", function RecognitionConstructor() {
    current = {
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
    return current;
  });
  return () => current;
}

const heard = (transcript: string) => ({
  resultIndex: 0,
  results: { length: 1, 0: { isFinal: false, 0: { transcript } } },
});

describe("Angular dictation", () => {
  it("omits an unavailable microphone when voice is off", () => {
    recognizer();
    const input = mount({ setDraft: vi.fn() });
    expect(input.value().available).toBe(false);
    expect(input.value().state.status).toBe("unsupported");
    input.value().start();
    input.value().stop();
    input.value().setLanguage("en-GB");
    expect(readRememberedLanguage()).toBe("en-GB");
  });

  it("reports an unsupported browser without pretending it can listen", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const input = mount({ voice: {}, setDraft: vi.fn() });
    expect(input.value().available).toBe(false);
    input.value().start();
    expect(input.value().state.status).toBe("unsupported");
  });

  it("writes recognized text only through the current draft callback", () => {
    const live = recognizer();
    const before = vi.fn();
    const after = vi.fn();
    const input = mount({ voice: {}, locale: "fr-FR", setDraft: before });
    input.value().start();
    live()?.onresult?.(heard("bonjour"));
    expect(before).toHaveBeenCalledExactlyOnceWith("bonjour");
    expect(input.value().state.interim).toBe("bonjour");
    const first = live();
    input.update({ voice: {}, locale: "fr-FR", setDraft: after });
    expect(live()).toBe(first);
    live()?.onresult?.(heard("salut"));
    expect(after).toHaveBeenCalledExactlyOnceWith("salut");
    expect(before).toHaveBeenCalledTimes(1);
  });

  it("offers the locale when languages are absent or empty", () => {
    const live = recognizer();
    const input = mount({
      voice: { languages: [] },
      locale: "ar-SA",
      setDraft: vi.fn(),
    });
    expect(input.value().languages).toEqual(["ar-SA"]);
    input.value().start();
    expect(live()?.lang).toBe("ar-SA");
  });

  it("uses en-US without a locale and remembers a changed language", () => {
    const live = recognizer();
    const input = mount({ voice: {}, setDraft: vi.fn() });
    expect(input.value().languages).toEqual(["en-US"]);
    input.value().setLanguage("de-DE");
    expect(readRememberedLanguage()).toBe("de-DE");
    input.value().start();
    expect(live()?.lang).toBe("de-DE");
  });

  it("prefers the remembered language over the first offered language", () => {
    recognizer();
    rememberLanguage("en-GB");
    const input = mount({
      voice: { languages: ["fr-FR", "en-GB"] },
      setDraft: vi.fn(),
    });
    expect(input.value().state.language).toBe("en-GB");
    expect(input.value().languages).toEqual(["fr-FR", "en-GB"]);
  });

  it("stops recognition and reports permission refusal", () => {
    const live = recognizer();
    const input = mount({ voice: {}, setDraft: vi.fn() });
    input.value().start();
    input.value().stop();
    expect(live()?.stop).toHaveBeenCalledOnce();
    live()?.onerror?.({ error: "not-allowed" });
    expect(input.value().state.status).toBe("denied");
  });

  it("releases the old microphone when languages or mode change", () => {
    const live = recognizer();
    const setDraft = vi.fn();
    const input = mount({ voice: {}, setDraft });
    input.value().start();
    const first = live();
    input.update({ voice: { languages: ["es-ES"] }, setDraft });
    expect(first?.abort).toHaveBeenCalledOnce();
    first?.onresult?.(heard("retired recognizer"));
    first?.onerror?.({ error: "network" });
    expect(setDraft).not.toHaveBeenCalled();
    expect(input.value().state.status).toBe("idle");
    input.value().start();
    expect(live()?.lang).toBe("es-ES");
    const second = live();
    input.update({ voice: { mode: "backend" }, setDraft });
    expect(second?.abort).toHaveBeenCalledOnce();
    expect(input.value().available).toBe(false);
  });

  it("enables voice after mount and releases it when switched off", () => {
    const live = recognizer();
    const setDraft = vi.fn();
    const input = mount({ setDraft });
    input.update({ voice: {}, setDraft });
    expect(input.value().available).toBe(true);
    input.value().start();
    input.update({ setDraft });
    expect(live()?.abort).toHaveBeenCalledOnce();
    expect(input.value().available).toBe(false);
    expect(input.value().state.status).toBe("unsupported");
  });

  it("disposes on context destruction and ignores late speech", () => {
    const live = recognizer();
    const setDraft = vi.fn();
    const input = mount({ voice: {}, setDraft });
    input.value().start();
    const result = live()?.onresult;
    input.destroy();
    expect(live()?.abort).toHaveBeenCalledOnce();
    result?.(heard("too late"));
    expect(setDraft).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "delivers a backend clip with a latest callback when configured: %s",
    async (withCallback) => {
      vi.stubGlobal("Blob", NodeBlob);
      const track = { stop: vi.fn() };
      vi.stubGlobal("navigator", {
        mediaDevices: {
          getUserMedia: () => Promise.resolve({ getTracks: () => [track] }),
        },
      });
      let live:
        | {
            state: string;
            mimeType: string;
            start: () => void;
            stop: () => void;
            ondataavailable: ((event: { data: Blob }) => void) | null;
            onstop: (() => void) | null;
          }
        | undefined;
      vi.stubGlobal("MediaRecorder", function Recorder() {
        const recorder = {
          state: "recording",
          mimeType: "audio/webm;codecs=opus",
          start: vi.fn(),
          stop: () => {
            recorder.onstop?.();
          },
          ondataavailable: null as ((event: { data: Blob }) => void) | null,
          onstop: null as (() => void) | null,
        };
        live = recorder;
        return recorder;
      });
      const before = vi.fn();
      const after = vi.fn();
      const setDraft = vi.fn();
      const input = mount({
        voice: { mode: "backend" },
        setDraft,
        onClip: before,
      });
      expect(input.value().available).toBe(true);
      input.value().start();
      await vi.waitFor(() => expect(live).toBeDefined());
      input.update({
        voice: { mode: "backend" },
        setDraft,
        ...(withCallback ? { onClip: after } : {}),
      });
      live?.ondataavailable?.({
        data: new Blob(["abc"], { type: "audio/webm" }),
      });
      input.value().stop();
      await vi.waitFor(() => expect(input.value().state.status).toBe("idle"));
      if (withCallback) {
        expect(after).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ mimeType: "audio/webm", base64: "YWJj" })
        );
      } else {
        expect(after).not.toHaveBeenCalled();
      }
      expect(before).not.toHaveBeenCalled();
      expect(setDraft).not.toHaveBeenCalled();
      expect(track.stop).toHaveBeenCalled();
    }
  );

  it("does not offer backend mode when the browser cannot record", () => {
    const track = { stop: vi.fn() };
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: () => Promise.resolve({ getTracks: () => [track] }),
      },
    });
    vi.stubGlobal("MediaRecorder", undefined);
    const input = mount({ voice: { mode: "backend" }, setDraft: vi.fn() });
    input.value().start();
    expect(input.value().state.status).toBe("unsupported");
  });
});
