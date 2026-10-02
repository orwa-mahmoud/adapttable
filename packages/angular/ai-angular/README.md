# @adapttable/ai-angular

Unpublished Angular bindings for AdaptTable AI. The neutral `@adapttable/ai`
controllers own capabilities, approvals, conversation execution and dictation;
this package owns Angular signals and lifecycle. No provider SDK or UI kit is
required.

## Observe a table

```ts
import { signal } from "@angular/core";
import { tableAgent } from "@adapttable/ai-angular";
import type { AgentSession } from "@adapttable/ai";

const session = signal<AgentSession | undefined>(undefined);
const features = [
  tableAgent({
    tableId: "staff",
    approval: "writes",
    bridge: { attach: (value) => session.set(value) },
  }),
];
```

Pass `features` to an Angular AdaptTable. The session reads the committed table
and calls the same host callbacks as its controls. Approvals, always-allow
choices, progress and live view inputs are published through feature state and
optional bridge callbacks. A signal of `TableAgentOptions` keeps policy and
callbacks live. Destroying the table closes pending approval and releases
subscriptions and WebMCP registrations.

## Run an assistant

```ts
import { computed } from "@angular/core";
import { injectTableAssistant } from "@adapttable/ai-angular";

// Inside a component or another Angular injection context:
const assistant = injectTableAssistant(
  computed(() => ({
    session: session(),
    transport,
  }))
);

assistant().setDraft("Sort salary highest first");
await assistant().send();
```

`injectTableAssistant` returns a read-only signal. Render its messages, draft,
status, approval, progress, undo offers and resumable work with your own UI or
the Angular kit's assistant. `open`/`onOpenChange` and
`messages`/`onMessagesChange` support controlled state; omitted state is owned
by the controller. Explicit `contextInputs` and `alwaysAllow` connect panels
outside the table. Transports use the unchanged neutral HTTP, JSON, OpenAI,
MCP, WebMCP, AG-UI and AI SDK entrypoints.

## Dictation

`injectSpeechInput({ voice: {}, setDraft })` returns a signal of the structural
`SpeechInputHandle` accepted by Angular assistant controls. Browser dictation
only updates the draft. Backend mode delivers one clip through `onClip`.
Signals keep callbacks, locale, languages and mode current; destruction
releases the microphone. Omit `voice` for an unavailable handle.

See [the project documentation](https://adapttable.orwamahmoud.com/) and
[the Angular integration examples](../../../examples/README.md).
