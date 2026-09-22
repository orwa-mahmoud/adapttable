# React table voice input — speak to the table assistant

`@adapttable/ai/voice` lets a reader dictate to the table assistant instead of
typing. `createSpeechInput` is a framework-free dictation controller,
`useSpeechInput` from `@adapttable/ai-react` binds it to a React composer, and
every kit's `TableAssistant` draws a mic from the handle the hook returns.

Dictation produces a draft, never a turn. Heard text lands in the composer,
the reader reads it, corrects a misheard word, and presses Send. A browser
that cannot listen gets no mic button, and typing works the same way.

This page covers voice only. The conversation, transports and approval are in
[adaptive capabilities](./agent-capabilities.md) and
[`@adapttable/ai`](./ai.md); the wire a backend speaks is in
[the HTTP backend guide](./ai-http.md).

## Add a mic to the assistant panel

Pass `voice` to `useSpeechInput`, route heard text into the assistant's draft
with `setDraft`, and hand the result to `TableAssistant` as `speech`:

```tsx
import { useState } from "react";
import type { AgentSession } from "@adapttable/ai";
import {
  tableAgent,
  useSpeechInput,
  useTableAssistant,
} from "@adapttable/ai-react";
import { assistantHttpTransport } from "@adapttable/ai/http";
import { DataTable } from "@adapttable/mantine";
import { TableAssistant } from "@adapttable/mantine/assistant";

interface Order {
  id: string;
  customer: string;
  status: string;
  total: number;
}

const transport = assistantHttpTransport({ endpoint: "/api/agent" });

export function Orders({ rows }: { rows: Order[] }) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const assistant = useTableAssistant({
    session: session ?? undefined,
    transport,
    transportKey: "orders",
  });
  const speech = useSpeechInput({
    voice: { languages: ["en-US", "ar-SA"] },
    setDraft: assistant.setDraft,
  });

  return (
    <>
      <DataTable
        data={rows}
        columns={[{ key: "customer" }, { key: "status" }, { key: "total" }]}
        rowKey={(row) => row.id}
        features={[
          tableAgent({ tableId: "orders", bridge: { attach: setSession } }),
        ]}
      />
      <TableAssistant
        assistant={assistant}
        speech={speech}
        open={assistant.open}
        onOpenChange={assistant.setOpen}
      />
    </>
  );
}
```

The same `speech` prop exists on the panel from `@adapttable/mui/assistant`,
`@adapttable/chakra/assistant`, `@adapttable/antd/assistant`,
`@adapttable/radix/assistant`, `@adapttable/base-ui/assistant`,
`@adapttable/shadcn/assistant` and `@adapttable/unstyled/assistant`. It takes a
`SpeechInputHandle`, a structural type declared in `@adapttable/react/adapter`,
so the panel draws a mic without importing `@adapttable/ai`. A host driving
its own recognizer can pass any object of that shape.

## How it works

1. `useSpeechInput` builds one controller with `createSpeechInput` the first
   time it renders with `voice` set, and disposes it on unmount.
2. The panel draws the mic only when the handle's `available` is `true` —
   `voice` is set and this browser supports the chosen mode.
3. Pressing the mic calls `start()`; pressing it again calls `stop()`.
4. **Browser mode** runs the Web Speech API recognizer with `continuous` and
   `interimResults` on, in the language chosen for this utterance. Each result
   calls `onDraft` with the text heard so far, and the hook writes it through
   `setDraft`, replacing the composer's draft.
5. **Backend mode** records one clip with `MediaRecorder`. On `stop()` the
   microphone tracks are stopped, the status moves to `processing`, and
   `onClip` receives the recording once, base64-encoded.
6. Sending is the reader's action. The controller never calls `send`; the
   draft becomes a turn only through the composer's Enter or Send.

### How a transcript becomes a turn

In browser mode the transcript is the draft. The reader edits it in the
composer like typed text, and Send runs `assistant.send()`, which sends the
draft as an ordinary text turn — the same turn, the same approval and the same
receipts as a typed request. A misheard sentence is therefore a typo to fix,
never an action the table already ran.

In backend mode the clip goes wherever `onClip` sends it. The host decides what
happens to the text that comes back; writing it into the draft keeps the same
review step as browser mode (see [Backend mode](#backend-mode)).

## `useSpeechInput(options)`

From `@adapttable/ai-react`. Returns a `SpeechInputHandle`.

| Option     | Type                         | Default                      | What                                                            |
| ---------- | ---------------------------- | ---------------------------- | --------------------------------------------------------------- |
| `setDraft` | `(text: string) => void`     | required                     | Where heard text goes. Pass the assistant's `setDraft`.         |
| `voice`    | `VoiceOptions`               | none — no controller, no mic | `{ mode?, languages? }`. Setting it turns dictation on.         |
| `locale`   | `string`                     | `"en-US"` when absent        | The language offered when `voice.languages` is empty or absent. |
| `onClip`   | `(clip: SpeechClip) => void` | none                         | Receives the recording in backend mode.                         |

`VoiceOptions`, from `@adapttable/ai/voice`:

| Field       | Type                     | Default               | What                                                                    |
| ----------- | ------------------------ | --------------------- | ----------------------------------------------------------------------- |
| `mode`      | `"browser" \| "backend"` | `"browser"`           | Recognize in the browser, or record a clip for a backend                |
| `languages` | `readonly string[]`      | `[locale ?? "en-US"]` | BCP-47 tags offered. One shows the mic alone; more adds a language chip |

The handle the hook returns:

| Field         | Type                         | What                                                                         |
| ------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `available`   | `boolean`                    | `false` when `voice` is absent or the browser cannot do the mode             |
| `state`       | `SpeechInputState`           | `status`, `language`, `interim`, and `error` when dictation failed           |
| `languages`   | `readonly string[]`          | The languages offered                                                        |
| `start`       | `() => void`                 | Begin listening                                                              |
| `stop`        | `() => void`                 | Stop and deliver what was captured                                           |
| `setLanguage` | `(language: string) => void` | Choose the language for the next utterance and remember it in `localStorage` |

The controller is built once per mount. Changing `voice` after it exists does
not rebuild it; remount the component to apply a different mode or language
list. `setDraft` and `onClip` are read live, so fresh callbacks on every
render are fine.

## `createSpeechInput(options)`

The controller without React, from `@adapttable/ai/voice`. The `@adapttable/ai`
root entry re-exports it together with `readRememberedLanguage`,
`rememberLanguage` and the voice types.

| Option            | Type                         | Default                                        | What                                                          |
| ----------------- | ---------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| `mode`            | `"browser" \| "backend"`     | `"browser"`                                    | Which way the voice reaches the table                         |
| `languages`       | `readonly string[]`          | `[navigator.language]`, or `["en-US"]` without | Languages offered; the first is the default                   |
| `initialLanguage` | `string`                     | `languages[0]`                                 | The language to start in, such as one remembered from a visit |
| `onDraft`         | `(text: string) => void`     | none                                           | Called with the text heard so far, in browser mode            |
| `onClip`          | `(clip: SpeechClip) => void` | none                                           | Called once with the recording, in backend mode               |

It returns a `SpeechInput`:

| Member        | What                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `getState()`  | The current `SpeechState`. The same object is returned until something changes                      |
| `subscribe()` | Listen for changes; returns the unsubscribe                                                         |
| `start()`     | Begin listening. A no-op while already listening or after `dispose()`; clears `interim`             |
| `stop()`      | Stop, and deliver whatever was captured                                                             |
| `setLanguage` | Choose the language for the next utterance. An utterance in progress keeps the language it began in |
| `supported()` | Whether this browser can do this mode at all                                                        |
| `dispose()`   | Idempotent. Aborts the recognizer, releases the microphone, and notifies no listener afterwards     |

`SpeechState.status` is one of:

| Status        | Meaning                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------- |
| `idle`        | Not listening                                                                             |
| `listening`   | The recognizer or the recorder is running                                                 |
| `processing`  | Backend mode: recording stopped, the clip is being read                                   |
| `denied`      | Microphone access was refused; `error` is `"microphone access was refused"`               |
| `unsupported` | `start()` was called in a browser that cannot do this mode                                |
| `error`       | The recognizer reported an error (`error` holds its code) or the recording was unreadable |

The module touches no browser API at import time. `SpeechRecognition` and
`MediaRecorder` are looked up when `start()` or `supported()` runs, so it loads
on a server, in a test runner, and in a browser that has neither.

```ts
import {
  createSpeechInput,
  readRememberedLanguage,
  rememberLanguage,
} from "@adapttable/ai/voice";

const box = document.querySelector<HTMLTextAreaElement>("#ask");
const mic = document.querySelector<HTMLButtonElement>("#mic");

if (box && mic) {
  const remembered = readRememberedLanguage();
  const dictation = createSpeechInput({
    languages: ["en-US", "fr-FR"],
    ...(remembered ? { initialLanguage: remembered } : {}),
    onDraft: (text) => {
      box.value = text;
    },
  });

  // No mic in a browser that cannot listen.
  mic.hidden = !dictation.supported();

  dictation.subscribe(() => {
    const { status } = dictation.getState();
    mic.setAttribute("aria-pressed", String(status === "listening"));
  });

  mic.addEventListener("click", () => {
    if (dictation.getState().status === "listening") dictation.stop();
    else dictation.start();
  });

  document
    .querySelector<HTMLSelectElement>("#language")
    ?.addEventListener("change", (event) => {
      const language = (event.currentTarget as HTMLSelectElement).value;
      dictation.setLanguage(language);
      rememberLanguage(language);
    });
}
```

## Language memory

`rememberLanguage(language, key?)` stores a language choice in `localStorage`;
`readRememberedLanguage(key?)` reads it back, or returns `undefined`. Both
default to the key `"adapttable.voice.language"`. A browser that refuses
storage does not break dictation: the read returns `undefined` and the write
keeps nothing.

`useSpeechInput` uses both: it starts in the remembered language when one is
stored, and its `setLanguage` remembers every choice. The controller's own
`setLanguage` does not write storage; a host calling it directly calls
`rememberLanguage` itself, as in the example above.

## Backend mode

Backend mode records the reader and hands the clip to the host. It covers
languages the browser's recognizer does not, and hosts that transcribe with
their own provider.

```tsx
import type { SpeechClip } from "@adapttable/ai/voice";
import { type TableAssistantState, useSpeechInput } from "@adapttable/ai-react";

async function transcribe(clip: SpeechClip): Promise<string> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(clip),
  });
  if (!response.ok) {
    throw new Error(`transcription failed with ${String(response.status)}`);
  }
  const { text } = (await response.json()) as { text: string };
  return text;
}

function useBackendDictation(assistant: TableAssistantState) {
  return useSpeechInput({
    voice: { mode: "backend", languages: ["ar-SA"] },
    setDraft: assistant.setDraft,
    // The transcript lands in the draft, so the reader still reviews it.
    onClip: (clip) => {
      transcribe(clip).then(assistant.setDraft, (error: unknown) => {
        console.error(error);
      });
    },
  });
}
```

A `SpeechClip` is `{ mimeType, base64, durationMs }`. `mimeType` is the
recorder's media type without codec parameters — `audio/webm`, not
`audio/webm;codecs=opus`. The clip does not carry the language; send
`speech.state.language` alongside it when the transcriber needs one. The
status returns to `idle` as soon as `onClip` has been called, so a host that
wants to show transcription progress tracks it itself.

The [HTTP protocol](./ai-http.md#voice) also defines a voice turn: an `audio`
field on the request, the same shape as `SpeechClip`, and a `transcript` on the
reply. `parseAgentHttpRequest` from `@adapttable/ai/http` refuses a clip that
is not `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg` or `audio/wav`,
that decodes to more than 4,000,000 bytes, or that runs longer than 120,000 ms;
`AGENT_HTTP_LIMITS` publishes the same ceilings as `maxAudioBytes`,
`maxAudioMs` and `audioTypes` for a backend to enforce. The assistant's `send`
takes text, so putting a clip on the wire is the job of the host's own request
or transport.

## Notes

### Browser support and the fallback

Browser mode needs `SpeechRecognition` or the prefixed
`webkitSpeechRecognition`. Backend mode needs `MediaRecorder` and
`navigator.mediaDevices.getUserMedia`. `supported()` checks exactly those, per
mode.

When the check fails, `useSpeechInput` returns `available: false` and the panel
draws no mic and no language chip — an absent control rather than a disabled
one. The composer, Enter and Send are unchanged. On the server the hook's
snapshot is `unsupported`, so server-rendered markup has no mic either.

A refused microphone permission sets the status to `denied`. The panel keeps
the mic and does not print the error; a host that wants to explain the refusal
reads `speech.state.status` and `speech.state.error`.

### Privacy

The voice module makes no network request of its own.

- **Browser mode:** audio goes to the browser's speech recognizer, and only the
  recognized text comes back into the draft. Whether that recognizer runs on
  the device or on the browser vendor's service is decided by the browser, not
  by AdaptTable; check your target browsers if that matters to you. Nothing
  reaches your backend until the reader presses Send, and then only the text.
- **Backend mode:** the clip is held in memory and handed to `onClip`. Where it
  goes next is the host's code. The microphone is released when recording
  stops and when the controller is disposed.
- **Language memory:** the chosen tag is stored in the browser's
  `localStorage` under `adapttable.voice.language` and is not sent anywhere.

### Languages and RTL

Languages are BCP-47 tags such as `"en-US"`, `"ar-SA"` or `"fa-IR"`. With more
than one, the panel shows a language chip beside the mic, labelled with the
tags as given. The chip is disabled while listening, and a change applies to
the next utterance: switching a recognizer's language mid-sentence would lose
what it has heard.

A right-to-left table passes `dir="rtl"` to `TableAssistant` so the portalled
narrow-viewport sheet lays out in the table's direction; see
[i18n and RTL](./i18n-rtl.md).

### Accessibility and labels

The mic is an icon button named **Dictate**, and **Stop dictation** while
listening. The chip is named **Dictation language**. A live region announces
**Listening** once when listening starts and does not read each interim
result aloud. The mic is disabled whenever the assistant cannot take a message.

These strings are the `TableLabels` keys `assistantVoiceStart`,
`assistantVoiceStop`, `assistantVoiceListening` and `assistantVoiceLanguage`,
translated by the `@adapttable/i18n` locales and overridable through the
panel's `labels` prop.

## Related

- [Adaptive capabilities](./agent-capabilities.md) — the headless assistant and
  the optional widget
- [`@adapttable/ai`](./ai.md) — sessions, approval, and
  [undo per turn and per action](./ai.md#approval-undo-and-what-a-reader-agreed-to)
- [Connect a backend](./ai-http.md) — the HTTP protocol, including voice turns
- [Agent integrations](./ai-integrations.md) — OpenAI, MCP and JSON tools over
  the same session
