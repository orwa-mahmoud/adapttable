# Angular assistant and voice input

`injectTableAssistant()` manages a conversation as an Angular signal.
`injectSpeechInput()` adds optional dictation. Recognized speech updates the
draft; the reader still chooses Send. Neither function chooses a model provider
or creates a backend connection by itself.

The AI Angular binding, unstyled Angular kit and NG-ZORRO kit are public npm
packages. The seven additional Angular adapters are prepared for their first
public `0.1.0` release; registry installation requires publication to complete.
See [getting started](./getting-started.md) for installation guidance.
See [Agent capabilities](./agent-capabilities.md) for attaching a live session
to a mounted table.

## A panel that receives its session and transport

```ts
import { Component, computed, input, signal } from "@angular/core";
import type { AgentSession } from "@adapttable/ai";
import {
  injectSpeechInput,
  injectTableAssistant,
  type AssistantTransport,
} from "@adapttable/ai-angular";
import type { TableAssistantProps } from "@adapttable/angular";
import { AdaptTableAssistant } from "@adapttable/angular-unstyled/assistant";

@Component({
  selector: "app-table-conversation",
  imports: [AdaptTableAssistant],
  template: `<adapt-table-assistant [props]="props()" />`,
})
export class TableConversation {
  readonly session = input<AgentSession | undefined>(undefined);
  readonly transport = input<AssistantTransport | undefined>(undefined);
  readonly open = signal(true);
  readonly assistant = injectTableAssistant(
    computed(() => ({
      session: this.session(),
      transport: this.transport(),
      transportKey: "table-backend",
      open: this.open(),
      onOpenChange: (open: boolean) => this.open.set(open),
    }))
  );
  readonly speech = injectSpeechInput({
    voice: { mode: "browser", languages: ["en-US", "ar-JO"] },
    setDraft: (text) => this.assistant().setDraft(text),
  });
  readonly props = computed((): TableAssistantProps => ({
    assistant: this.assistant(),
    speech: this.speech(),
    open: this.open(),
    onOpenChange: (open) => this.open.set(open),
    presentation: "panel",
    greeting: "What would you like to do with this table?",
  }));
}
```

The host passes the session published by `tableAgent` and an actual
`AssistantTransport`. Until they are available, the panel can honestly show
its disconnected state. If switching backend identity or replacing a real
transport with a different implementation, change `transportKey` too.

For NG-ZORRO use `AdaptTableAssistant` from `@adapttable/ng-zorro/assistant`.
To render inside the table's assistant slot, compose `tableAssistant()` from
that same kit entry and bind the shell's `[assistant]` input to the props.
Injection functions belong in an Angular injection context; `assistant()` and
`speech()` read their latest state.

## Dictation and browser permission

Browser mode uses available speech recognition. Voice omitted means no
microphone control; an unsupported browser also omits it. Starting recognition
requires a deliberate reader action and may prompt for microphone permission.
The handle reports `idle`, `listening`, `processing`, `denied`, `unsupported`
or `error`; keep permission refusal and failure visible instead of repeatedly
requesting access.

`languages` controls the offered languages. With none supplied, `locale` is the
fallback, then `en-US`. Choosing a language is remembered by the voice helper.
Recognized text is passed to the current `setDraft` callback as recognition
results arrive; the handle also exposes the interim transcript. It is not
automatically sent as a table command. Let the reader correct names, numbers and negations before
submitting.

Changing the mode or offered language list releases the old microphone before
creating its replacement. Disabling voice or destroying the calling context
also disposes it, and late recognition results are ignored. Keep these
controllers scoped to the active composer rather than in a global singleton.

## Backend recording is a separate flow

`voice: { mode: "backend" }` records an audio clip and supplies it to `onClip`.
It requires recording support. Your host chooses whether to preview, transcribe
or submit that clip. Connecting `onClip` to `assistant().sendClip` explicitly
sends the recording as a turn, so tell the reader that this is the action the
recording control performs; do not describe it as draft-only dictation.
The backend determines transcription and must handle cancellation and errors.

A production service should make the destination and handling of audio clear.
Browser recognition availability does not establish that recognition happens
locally on the device. Keep credentials on the server and apply the same table
permissions to a voice turn as to a typed one.

## Conversation lifecycle and controls

`send()` returns a promise, `busy` identifies an in-flight turn and `stop()`
requests cancellation. Awaiting approval is still busy work that can be
stopped. `error` and `errorCode` describe failed turns; receipts report actual
table outcomes. Suggestions are filtered against capabilities the table
currently offers. `clear()` refuses while a turn is in flight.

For a panel outside the table, wire approval and view bridge values from the
agent integration; also wire revocable always-allow state when that policy is
enabled. Controlled `messages` with `onMessagesChange` let the host persist a
conversation. Durable recovery uses `onDetach` and `resumeHandle`; merely
rendering the panel does not preserve work across a reload.

Use the kit's labeled composer, Send/Stop buttons, language chooser and
approval controls on desktop and mobile. Choose `panel`, `sheet` or `floating`
presentation to suit the layout, and pass `dir` for portal surfaces in RTL.
Keyboard users can enter text, submit and dismiss the relevant surface without
using the microphone. Preserve the typed path when audio is unavailable.

See [Agent capabilities](./agent-capabilities.md),
[i18n and RTL](./i18n-rtl.md), [Accessibility](./accessibility.md) and the
[speech lifecycle tests](../../packages/angular/ai-angular/src/speechInput.test.ts).
