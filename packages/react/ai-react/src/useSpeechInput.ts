/**
 * Dictation, as a React hook — `@adapttable/ai-react`.
 *
 * Thin on purpose. The speech session in `@adapttable/ai/voice` owns the
 * browser APIs, the permission states, the language choice and when the
 * microphone is replaced; this subscribes to it, keeps it alive for the life
 * of the composer, and writes what it hears through the caller's `setDraft` —
 * which is the one channel voice is allowed to use, so a spoken sentence
 * becomes a draft the reader can see and fix rather than a request the table
 * has already acted on.
 *
 * It lives here rather than in `@adapttable/react` because it imports
 * `@adapttable/ai`, and that package must stay out of the base graph. The
 * chrome takes `SpeechInputHandle` — the structural shape this returns —
 * from `@adapttable/react/adapter`, which declares it without importing
 * anything.
 */
"use client";

import {
  createSpeechSession,
  type SpeechClip,
  type VoiceOptions,
} from "@adapttable/ai/voice";
import type { SpeechInputHandle } from "@adapttable/react/adapter";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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
  // The latest options, read by the session whenever it needs them, so heard
  // text reaches whatever the latest render passed.
  const latest = useRef(options);
  latest.current = options;
  const [session] = useState(() => createSpeechSession(() => latest.current));
  // Every commit brings the microphone in line with the options; equivalent
  // options keep the one that is listening.
  useEffect(() => {
    session.sync();
  });
  // Strict Mode releases and syncs again, so each setup owns a live controller.
  useEffect(() => () => session.release(), [session]);
  return useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  );
}
