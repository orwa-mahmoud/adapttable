# @adapttable/ai-vue

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

Optional Vue 3.5 bindings for AdaptTable agents, conversations, and speech.
This package is an experimental public `0.1.0` release.

The framework-neutral `@adapttable/ai` owns policy, approval transactions,
capability execution, conversation state, and speech. This package connects
those stores to Vue scopes and readonly refs. The Vue binding and native kit
remain usable without any AI dependency.

## A table agent

```ts
import { shallowRef } from "vue";
import { tableAgent, type AgentSession } from "@adapttable/ai-vue";

const session = shallowRef<AgentSession>();
const agent = tableAgent({
  tableId: "people",
  approval: "writes",
  bridge: {
    attach: (value) => {
      session.value = value;
    },
  },
});
// Pass agent in the DataTable features array.
```

Use a getter or ref when configuration can change. Getters use Vue computed
semantics: read the changing refs or reactive props inside the getter. Replacing
a plain, nonreactive variable does not invalidate that snapshot. Async admission waits for
Vue to deliver pending props before checking the current policy and table.
Controlled selection and column layout writes settle against the state the
host actually supplied. A callback alone does not prove acceptance: rejected
or normalized controlled updates are reported through the neutral execution
result. Delayed persistence is separate from Vue model acceptance.

## A conversation

```ts
import { useTableAssistant } from "@adapttable/ai-vue";

const assistant = useTableAssistant(() => ({
  session: session.value,
  transport: myTransport,
}));
```

The returned state has readonly refs and stable actions such as `send`, `stop`,
`answer`, `resume`, `undoTurn`, and `revokeAlwaysAllow`. Its computed `view` is
the plain presentation contract accepted by a kit's `TableAssistant`.
`open` and `onOpenChange` support controlled presentation; omit `open` to keep
it inside the composable.

A panel inside a table reads approval, progress, context, and standing
permissions from feature state. A panel outside the table can receive the same
values through `tableAgent({ bridge })` and the composable's `approval`,
`progress`, `contextInputs`, and `alwaysAllow` options. Pass the approval to the
kit surface so it can render the requested widget, table, or modal review.

Use `TableAssistant` and `AgentApproval`, or the `tableAssistant()` and
`agentApproval()` table features, from `@adapttable/vue-unstyled/assistant` for
native controls. A different Vue kit fills the same required slots from
`@adapttable/vue/adapter` with its own controls.

## Optional speech

```ts
import { useSpeechInput } from "@adapttable/ai-vue";

const speech = useSpeechInput(() => ({
  voice: { languages: ["en-US", "fr-FR"] },
  setDraft: assistant.setDraft,
}));
// Pass speech.view.value to the kit's speech prop.
```

Omitting `voice` creates no recognizer. Dictation begins only after `start()`;
browser recognition updates the draft and never sends it. Backend recording
uses the optional `onClip` callback, which the host can connect to
`assistant.sendClip`. Unsupported browsers omit the microphone control.

All composables require component setup or an active effect scope. SSR does
not connect transports, register browser tools, access language storage, or
start microphones. KeepAlive deactivation releases resources; activation
reconnects with current inputs. Unmounting or stopping an effect scope disposes
the stores and ignores late work. Switching sessions or transport keys
invalidates queued actions and ends the old connection.

See [the Vue assistant guide](https://adapttable.orwamahmoud.com/vue/assistant/)
for the presentation and approval contract.
