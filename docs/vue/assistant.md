# Vue assistant and approvals

The Vue packages are experimental. `@adapttable/ai-vue`
connects neutral AI stores to Vue 3.5. `@adapttable/vue/adapter` provides
structural Chrome and required control slots. Every Vue kit — Unstyled,
Element Plus, Vuetify, Naive UI, Reka UI, shadcn-vue, Nuxt UI and Quasar —
supplies the visible controls through its optional `/assistant` entry, built
from that kit's own components. A table can also use the headless agent feature
on its own.

## Choose the integration

A headless agent uses only `tableAgent()` in the table's features. Supply a
`bridge` to receive the live session, approval, progress, context reader, and
revocable session permissions. The table does not own your data: writes go
through the host callbacks and current policy.

A standalone native surface uses `TableAssistant` from the native kit. Pass
`assistant.view.value`, `assistant.open.value`, and `assistant.setOpen` as its
`assistant`, `open`, and `onOpenChange` props. In a Vue template, a computed
presentation object avoids writing `.value` for each nested ref:

```vue
<script setup lang="ts">
import { computed, shallowRef } from "vue";
import {
  tableAgent,
  useTableAssistant,
  type AgentSession,
  type AgentApprovalPending,
  type AgentProgress,
  type AlwaysAllowedState,
  type AgentContextInputs,
} from "@adapttable/ai-vue";
import { DataTable } from "@adapttable/vue-unstyled";
import {
  tableAssistant,
  agentApproval,
} from "@adapttable/vue-unstyled/assistant";
import type { AssistantTransport } from "@adapttable/ai-vue";

const props = defineProps<{ transport: AssistantTransport }>();
const session = shallowRef<AgentSession>();
const approval = shallowRef<AgentApprovalPending | null>(null);
const progress = shallowRef<AgentProgress | null>(null);
const alwaysAllow = shallowRef<AlwaysAllowedState>();
const contextInputs = shallowRef<() => AgentContextInputs>();
const agent = tableAgent({
  tableId: "people",
  approval: "writes",
  bridge: {
    attach: (value) => {
      session.value = value;
    },
    approvals: (value) => {
      approval.value = value;
    },
    progress: (value) => {
      progress.value = value;
    },
    alwaysAllowed: (value) => {
      alwaysAllow.value = value;
    },
    viewInputs: (value) => {
      contextInputs.value = value;
    },
  },
});
const assistant = useTableAssistant(() => ({
  session: session.value,
  transport: props.transport,
  approval: approval.value,
  progress: progress.value,
  alwaysAllow: alwaysAllow.value,
  contextInputs: contextInputs.value,
}));
const presentation = computed(() => ({
  assistant: assistant.view.value,
  open: assistant.open.value,
  onOpenChange: assistant.setOpen,
  approval: approval.value,
}));
const features = [agent, tableAssistant(), agentApproval()];
const rows = [{ id: "ada", name: "Ada" }];
const columns = [{ key: "name", sortable: true }];
const rowKey = (row: { id: string }) => row.id;
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="features"
    :assistant="presentation"
  />
</template>
```

`tableAssistant()` registers the kit's optional surface. The table's
`assistant` prop controls its presentation. Supplying that prop without a
surface feature is an error. `agentApproval()` registers the table review
strip. These kit features import no AI runtime, so a host can also provide its
own structurally compatible conversation state.

## Choose an assistant presentation

The same `TableAssistant`, `AgentApproval`, `tableAssistant()` and
`agentApproval()` API is exported by:

- `@adapttable/vue-unstyled/assistant`, with native HTML controls.
- `@adapttable/reka-ui/assistant`, with Reka primitives.
- `@adapttable/shadcn-vue/assistant`, with shadcn Sheet, input, button and other
  copied kit controls.

Replace both the table and assistant imports when adapting the example above.
Keep `tableAgent`, `useTableAssistant` and optional `useSpeechInput` on
`@adapttable/ai-vue`. A kit's assistant entry does not load that AI binding, select
a model, supply a transport or authorize host writes. The host provides its
conversation state, backend connection and approval decisions.

Kit surfaces consume the same controlled open state, localized labels, approval
ownership and revoked-session guards. Overlay presentation follows the table's
fullscreen container; RTL follows the resolved direction. Compact screens use
the chosen kit's responsive surface. During SSR, keep the initial state stable
and defer browser transport, focus and speech resources until mounting. Removing
or suspending the owning component retires its pending UI work.

The [shadcn-vue action lab](/vue/demo/shadcn-vue/action-surfaces/) uses a local
fixture to exercise the real assistant controls. It is not a live model session
or a statement that browser CI has passed.

## Approval and controlled state

Exactly one surface owns each decision. `widget` places it in the assistant;
`table` uses the table strip; `modal` uses the kit's dialog. Other surfaces can
announce that a change is waiting but do not duplicate its decision buttons.
Reviews use neutral proposal models, preserve formatted values and unavailable
values, show per-item decisions only when allowed, and offer session-wide
permission only when the controller supplies it. That permission remains
revocable from the assistant.

Expanding a widget review opens its full proposal list in the conversation
region. The transcript stays mounted and hidden while the review is open.
Back or Escape returns to the preview and restores focus to its expansion
control. A new approval, a closed panel, or KeepAlive suspension closes the
full review. Table approvals announce their summary through a dedicated
`agent-approval-status` live region that stays mounted before arrival and after
settlement.

Custom surfaces can control `ApprovalReviewChrome` with `expanded`,
`onExpand`, and `onBack`. An explicit `expanded: false` remains collapsed
until the host accepts the request; omitting `expanded` retains the inline,
uncontrolled review. These callbacks follow the same pending-approval and
active-scope checks as decision controls.

`AgentApprovalPending.identity` is an optional opaque token for one approval
transaction. The neutral agent supplies a frozen token that stays the same
when only decisions change. Hosts supplying approval state directly should
retain it across decision snapshots and replace it for a new transaction.
Legacy hosts can omit it, but must provide a new proposal-array or operation
reference for a new approval; reusing those references cannot identify a
replacement transaction reliably.

Reactive configuration getters create one computed snapshot per dependency
change. Read Vue refs or reactive props inside the getter; changing a plain
closed-over variable is not a reactive update. Raw option objects and ref
replacements remain supported.

Queued actions are checked after Vue delivers parent updates. A replacement
session, suspended scope, removed feature, or replacement approval invalidates
old work. A controlled write is successful only when its committed table state
matches the requested result; ignoring the callback is rejection. Applications
that normalize a value receive the neutral settlement outcome, rather than an
invented successful receipt.

Receipts come from actual execution results. Staged writes still ask the user
to save in the table. Foreign table changes can invalidate undo. Streaming text
is rendered as text and never interpreted as HTML or proof that an action ran.

The actions disclosure opens a named receipt group with a native list. Each
undoable receipt can have its own Undo; when multiple receipts can be undone
individually, the heading offers Undo all for the turn. A single receipt does
not duplicate its own Undo in the heading. When receipt display is disabled,
the turn's Undo remains available on its own. Blocked turn undo includes a
visible explanation next to the disabled control.

Receipt and turn undo controls, and host message actions such as a Save offer,
capture the callback they were rendered for. Closing their receipt group,
replacing their owner or callback, suspending KeepAlive, or disposing the
surface permanently retires retained handlers. Fresh controls after activation
remain usable. A receipt's save reminder is informational; persistence still
belongs to the table's normal host-controlled save path.

## Keyboard, presentation, and speech

Enter sends the draft or answers the active question. Shift+Enter creates a
newline, and IME composition is preserved. The composer reflects disconnected,
busy, awaiting-user, approval, detached, and error states. Escape closes the
conversation; focus returns to the launcher. A floating window becomes a modal
sheet below the neutral minimum width, and RTL is forwarded to modal surfaces.
Within a full approval, Escape first returns to the conversation. The native
examples control uses `details`, `summary`, and a `menu` of command buttons.
Arrow keys, Home, and End move through its commands; Escape closes the list
and returns focus to its trigger. Busy and disconnected states disable it.

Speech is separately opt-in through `useSpeechInput`. Pass its computed `view`
to the surface's `speech` prop. Browser dictation only changes the draft.
Backend recording can pass its clip to `assistant.sendClip`. Closing or
suspending the panel stops listening; unsupported browsers draw no microphone.
The native kit uses the browser's `dialog` top layer and its focus behavior for
modal presentation.

Transports, browser tool registration, microphone resources, and language
storage remain inactive during SSR. Each request gets its own stores. KeepAlive
suspends resources and reconnects them with current options on activation.

## Workspace setup and live example

Build the optional package with `pnpm --filter @adapttable/ai-vue... build`, then
link the built Vue binding, native kit and AI package into your application. All
three are public packages prepared for their first experimental `0.1.0` release;
verify registry availability before using an install command. The CLI currently
scaffolds React and Angular, so Vue integration uses explicit application setup.

The [native assistant showcase](/vue/demo/unstyled/assistant/) mounts the actual
Vue native table and assistant. Its local transport can select rows, sort names,
ask a question or request an approved write. Toggle host acceptance to see a
rejected controlled update, and choose widget, table or modal approval presentation.
Speech remains opt-in and depends on browser support.

The assistant binding entry re-exports the canonical `StaticTableFeature` type
from `@adapttable/vue/features`. Its setup and mount callback contracts are
`StaticFeatureHost` and `FeatureMountContext` from that feature entry.

## Adapter feature types

The assistant factories return the full `StaticTableFeature` contract. Adapter
code can name `StaticFeatureHost` for setup and `FeatureMountContext<TRow>` for
mounting while retaining the table's row type. The assistant entry forwards the
member types needed by those callbacks as type-only exports; it adds no table
hooks or controls at runtime.

The canonical definitions remain in the Vue API reference:

- [Custom features and scoped state](./api.md#custom-features-and-scoped-state)
  explains feature setup, mount, teardown and the state channel.
- [Adapter shell and structural Chrome](./api.md#adapter-shell-and-structural-chrome)
  describes resolved table options, row inventory and render projections.
- [Columns and rendering](./api.md#columns-and-rendering) covers typed cell,
  header and footer contexts and host renderers.
- [Summaries and footers](./summary-row.md) defines `SummaryRowFn<TRow>`,
  `TableSummaryModel<TRow>` and `TableSummaryCellModel<TRow>`, forwarded by the
  assistant entry for the mounted table's summary projection.
- [Headless table, layout and selection](./api.md#headless-table-layout-and-selection)
  describes the table result and controlled selection/layout models.
- [Data sources](./api.md#data-sources) and [URL state](./api.md#url-state)
  define the options used by the mounted table.

`useDataTable` is forwarded only as a type, for `typeof useDataTable` inside
`UseDataTableResult`. Import the runtime composable from `@adapttable/vue`.
