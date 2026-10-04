import { Blob as NodeBlob } from "node:buffer";

import { readRememberedLanguage } from "@adapttable/ai/voice";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSpeechInput, type UseSpeechInputOptions } from "../src/speechInput";
import { mountComposable } from "./composables.test-utils";
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
  results: { length: 1, 0: { isFinal: false, 0: { transcript } } },
});
function recognizer() {
  let current: Recognition | undefined;
  vi.stubGlobal("SpeechRecognition", function () {
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
const setup = (options: UseSpeechInputOptions) =>
  mountComposable(options, useSpeechInput);
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());
describe("useSpeechInput", () => {
  it("does not activate absent voice or unsupported browser", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    const host = setup({ setDraft: vi.fn() });
    expect(host.result.available.value).toBe(false);
    expect(host.result.view.value.available).toBe(false);
    host.result.start();
    host.result.stop();
    host.result.setLanguage("fr-FR");
    expect(host.result.state.value.status).toBe("unsupported");
    expect(readRememberedLanguage()).toBeUndefined();
    host.input.value = { ...host.input.value, voice: {} };
    host.result.start();
    expect(host.result.available.value).toBe(false);
  });
  it("uses current callbacks without replacing recognition or sending a turn", () => {
    const live = recognizer();
    const before = vi.fn();
    const after = vi.fn();
    const clip = vi.fn();
    const host = setup({
      voice: {},
      locale: "fr-FR",
      setDraft: before,
      onClip: clip,
    });
    host.result.start();
    const first = live();
    live()?.onresult?.(heard("bonjour"));
    expect(before).toHaveBeenCalledExactlyOnceWith("bonjour");
    host.input.value = {
      voice: {},
      locale: "fr-FR",
      setDraft: after,
      onClip: clip,
    };
    live()?.onresult?.(heard("salut"));
    expect(live()).toBe(first);
    expect(after).toHaveBeenCalledExactlyOnceWith("salut");
    expect(clip).not.toHaveBeenCalled();
    expect(host.result.state.value.interim).toBe("salut");
    expect(host.result.view.value.state.interim).toBe("salut");
    expect(host.result.view.value.start).toBe(host.result.start);
  });
  it("stops and reports permission denial", () => {
    const live = recognizer();
    const host = setup({ voice: {}, setDraft: vi.fn() });
    host.result.start();
    host.result.stop();
    expect(live()?.stop).toHaveBeenCalledOnce();
    live()?.onerror?.({ error: "not-allowed" });
    expect(host.result.state.value.status).toBe("denied");
  });
  it("releases previous recognition before language or mode replacement", () => {
    const live = recognizer();
    const setDraft = vi.fn();
    const host = setup({ voice: {}, setDraft });
    host.result.start();
    const first = live();
    const late = first?.onresult;
    host.input.value = { voice: { languages: ["es-ES"] }, setDraft };
    expect(first?.abort).toHaveBeenCalledOnce();
    late?.(heard("late"));
    expect(setDraft).not.toHaveBeenCalled();
    expect(host.result.state.value.language).toBe("es-ES");
    host.result.start();
    const second = live();
    host.input.value = { voice: { mode: "backend" }, setDraft };
    expect(second?.abort).toHaveBeenCalledOnce();
    expect(host.result.available.value).toBe(false);
  });
  it("retains stable actions and uses locale fallback for empty languages", () => {
    const live = recognizer();
    const host = setup({
      voice: { languages: [] },
      locale: "ar-SA",
      setDraft: vi.fn(),
    });
    const start = host.result.start;
    expect(host.result.languages.value).toEqual(["ar-SA"]);
    host.result.setLanguage("en-GB");
    expect(readRememberedLanguage()).toBe("en-GB");
    host.result.start();
    expect(live()?.lang).toBe("en-GB");
    host.input.value = { ...host.input.value, locale: "de-DE" };
    expect(host.result.start).toBe(start);
  });
  it("releases on disable, KeepAlive and final scope disposal", async () => {
    const live = recognizer();
    const host = setup({ voice: {}, setDraft: vi.fn() });
    host.result.start();
    const first = live();
    await host.deactivate();
    expect(first?.abort).toHaveBeenCalledOnce();
    expect(host.result.available.value).toBe(false);
    await host.activate();
    host.result.start();
    const second = live();
    host.input.value = { setDraft: vi.fn() };
    expect(second?.abort).toHaveBeenCalledOnce();
    host.input.value = { voice: {}, setDraft: vi.fn() };
    host.result.start();
    const third = live();
    host.dispose();
    expect(third?.abort).toHaveBeenCalledOnce();
  });
  it("delivers backend clips to current callback and releases media tracks", async () => {
    vi.stubGlobal("Blob", NodeBlob);
    const track = { stop: vi.fn() };
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: () => Promise.resolve({ getTracks: () => [track] }),
      },
    });
    let recorder:
      | {
          state: string;
          mimeType: string;
          ondataavailable: ((event: { data: Blob }) => void) | null;
          onstop: (() => void) | null;
        }
      | undefined;
    vi.stubGlobal("MediaRecorder", function () {
      const input = {
        state: "recording",
        mimeType: "audio/webm",
        start: vi.fn(),
        stop: () => input.onstop?.(),
        ondataavailable: null as ((event: { data: Blob }) => void) | null,
        onstop: null as (() => void) | null,
      };
      recorder = input;
      return input;
    });
    const before = vi.fn();
    const after = vi.fn();
    const setDraft = vi.fn();
    const host = setup({
      voice: { mode: "backend" },
      setDraft,
      onClip: before,
    });
    host.result.start();
    await vi.waitFor(() => expect(recorder).toBeDefined());
    host.input.value = { voice: { mode: "backend" }, setDraft, onClip: after };
    recorder?.ondataavailable?.({
      data: new Blob(["abc"], { type: "audio/webm" }),
    });
    host.result.stop();
    await vi.waitFor(() => expect(after).toHaveBeenCalledOnce());
    expect(before).not.toHaveBeenCalled();
    expect(setDraft).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledWith(
      expect.objectContaining({ base64: "YWJj" })
    );
    expect(track.stop).toHaveBeenCalled();
  });
});
