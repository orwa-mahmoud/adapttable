/**
 * Dictation, as a React hook.
 *
 * Thin on purpose. The controller in `@adapttable/ai/voice` owns the browser
 * APIs, the permission states and the language choice; this subscribes to it,
 * keeps it alive for the life of the composer, and writes what it hears
 * through the caller's `setDraft` — which is the one channel voice is allowed
 * to use, so a spoken sentence becomes a draft the reader can see and fix
 * rather than a request the table has already acted on.
 */
"use client";

import {
  createSpeechInput,
  readRememberedLanguage,
  rememberLanguage,
  type SpeechClip,
  type SpeechInput,
  type SpeechState,
  type VoiceOptions,
} from "@adapttable/ai/voice";
import { useEffect, useRef, useSyncExternalStore } from "react";

/** What the composer needs to wire a mic. @public */
export interface SpeechInputHandle {
  /** Whether to draw the control at all. */
  readonly available: boolean;
  readonly state: SpeechState;
  /** Languages offered. One means no chip. */
  readonly languages: readonly string[];
  readonly start: () => void;
  readonly stop: () => void;
  /** Choose a language, and remember it for next time. */
  readonly setLanguage: (language: string) => void;
}

/** How the hook is configured. @public */
export interface UseSpeechInputOptions {
  readonly voice?: VoiceOptions;
  /** The table's locale, used when no language list was given. */
  readonly locale?: string;
  /** Where heard text goes. Always the draft, never a send. */
  readonly setDraft: (text: string) => void;
  /** Where a recording goes, in backend mode. */
  readonly onClip?: (clip: SpeechClip) => void;
}

const IDLE: SpeechState = { status: "unsupported", language: "", interim: "" };

/**
 * Run dictation for one composer.
 *
 * @param options - Voice configuration and where heard text should go.
 * @returns What the composer needs, or an unavailable handle when voice is off.
 *
 * @public
 */
export function useSpeechInput(
  options: UseSpeechInputOptions
): SpeechInputHandle {
  const { voice, locale, setDraft, onClip } = options;
  // Live callbacks, so the controller is built once and still calls whatever
  // the latest render passed rather than what the first one did.
  const draftRef = useRef(setDraft);
  draftRef.current = setDraft;
  const clipRef = useRef(onClip);
  clipRef.current = onClip;

  const languages = voice?.languages?.length
    ? voice.languages
    : [locale ?? "en-US"];
  const inputRef = useRef<SpeechInput | null>(null);
  if (voice && !inputRef.current) {
    inputRef.current = createSpeechInput({
      mode: voice.mode ?? "browser",
      languages,
      // Remembered from a previous visit when the browser kept it, and the
      // first offered language otherwise.
      ...(readRememberedLanguage()
        ? { initialLanguage: readRememberedLanguage() }
        : {}),
      onDraft: (text) => draftRef.current(text),
      onClip: (clip) => clipRef.current?.(clip),
    });
  }
  const input = inputRef.current;

  useEffect(
    () => () => {
      input?.dispose();
      // A disposed controller is never revived: a remount builds a fresh one,
      // the way the assistant store does.
      inputRef.current = null;
    },
    [input]
  );

  const state = useSyncExternalStore(
    (listener) => input?.subscribe(listener) ?? (() => undefined),
    () => input?.getState() ?? IDLE,
    () => IDLE
  );

  return {
    // Absent rather than dead: a mic that cannot listen is not drawn.
    available: Boolean(voice && input?.supported()),
    state,
    languages,
    start: () => input?.start(),
    stop: () => input?.stop(),
    setLanguage: (language) => {
      input?.setLanguage(language);
      rememberLanguage(language);
    },
  };
}
