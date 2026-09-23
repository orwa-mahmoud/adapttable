# React table AI assistant — native widgets and active capabilities

A table can tell an agent what it can do **right now**, without sending every
row or every feature guide up front.

Use the [optional native assistant](#the-optional-widget) or the headless
`useTableAssistant` controller to build a conversation around that contract.
Your application supplies the transport; table operations still pass through
the same permissions, validation and approval path.

That contract lives in `@adapttable/ai`. It is optional. `@adapttable/core`,
every adapter root, and `@adapttable/server` import none of it. Compose
`tableAgent` from `@adapttable/ai-react` when a table should publish a
manifest; omit the import and the bytes stay out.

## What is wired, not what is installed

Capabilities come from the live table:

- A table with search and pagination advertises `view.setSearch` and
  `view.setPage`.
- Grouping, filters, export, editing and reorder appear only when that
  feature is composed **and** the host callback (where a write needs one)
  is present. `view.setGroupBy` needs the grouping panel (`grouping-panel`),
  because a static `grouping(key)` reimposes its key; `view.setAggregations`
  appears with either grouping feature when a column is eligible.
- `view.setSelection` appears when selection is wired (`apply.setSelection`).
- `view.pinColumn` appears when column pinning is wired and at least one
  column is pinnable. `view.hideColumn` and `view.setColumnOrder` appear
  when a layout-owning feature (the Columns menu) is composed. `view.pinRow`
  appears when row pinning is wired. These are view operations, so none
  takes the write-approval path.
- `views.apply` appears when `featureIds` includes `saved-views` and
  `apply.applyView` exists.
- `rows.read` / `rows.resolve` appear when the table has columns.
  `rows.read` redacts `readable: false` cells and is bounded by
  `limits.readMax`. `scope: "full"` requires `source.fullDataset === true`.
- `rows.add` / `rows.delete` appear when the host apply methods exist and
  `writePolicy` is `"allow"`. `rows.delete` is destructive, and takes the same
  row references `edit.cells` does — a stable `rowKey`, or a 1-based
  `position` in a named `scope` — resolved before any row is removed.
  `rows.add`, `rows.delete` and `rows.reorder` have no staging path: under the
  default `commit: "stage"` they return `commit-incompatible`, so a table that
  offers them sets `commit: "immediate"`.
- `rowAction.<key>` and `bulkAction.<key>` appear for every row and bulk
  action the host composed — see [row and bulk actions](#row-and-bulk-actions).
- Data-layer truth comes from the source's
  [`TableSourceCapabilities`](./data-tiers.md) — the manifest copies those
  fields and never re-infers them from shape.

Package availability never participates. Installing `@adapttable/ai` does
not enable grouping on a table that never imported it.

## Filters

`view.setFilters` is the extra bag the table already applies — the same
keys the filter form writes (`team`, `salaryMin`, `salaryOp`). `describe`
lists each visible filter's type, operators and, when the static list is
short enough, its options. A `{ key, op, value }` array is accepted and
converted to that bag.

`FilterDef.ai` controls what the assistant sees. Omit it and the filter is
visible, with options sent only when there are 50 or fewer static choices.
`ai: false` hides the filter. `{ options: false }` keeps the filter and
omits the values — the usual 10k-customer case. `{ options: 10 }` raises or
lowers that cutoff. A list over the cutoff is omitted, not truncated, so a
sample cannot look like the full set. `"auto"` and async loaders are never
fetched into the prompt.

`view.describe` reports the current extras and the same catalog
(`AgentFilter` / `AgentFilterOption`).

Pagination, sort and search already publish current state and a typed
schema (`page` / `pageMax`, `sortBy` / sortable columns, the search
string). Filters were the gap this catalog closes.

## Pinning

Pinning is addressing, not styling, so both capabilities take identity rather
than a position on screen.

`view.pinColumn` takes a column `key` and a **logical** `side`: `"start"` is
the inline-start edge, which is the right edge under `dir="rtl"`. The same
call is therefore correct in both writing directions. Pass `side: null` to
unpin. A column the host marked `pinnable: false` refuses a pin but still
accepts an unpin, so a column the host pinned itself is never stranded. The
end edge belongs to the table's trailing actions column, which is chrome an
agent never addresses.

`view.pinRow` takes a `side` of `"top"` or `"bottom"` — physical, because a
pinned row sits above or below the scrolled body in every direction — plus a
row reference. Address the row by stable `rowKey`, or by 1-based `position`
with the `scope` and the `expectedRevision` that position was read at; a
position read against a view the table has since left is refused rather than
applied to whatever row now sits there. Summary rows are chrome, not data,
and cannot be pinned this way.

`view.describe` reports the live `pinnedColumns` map and `pinnedRows` lists,
so unpinning is an inverse of what is actually pinned rather than a reset of
the layout.

## Assistant contracts

A conversational assistant is a wrapper around this same executor — there is
no chat-specific dispatcher. `@adapttable/ai` exports the shapes a controller
and a widget are written against: `AssistantRequest`, `AssistantAction`,
`AssistantProposal`, `AssistantOutcome`, `AssistantTurn`,
`AssistantConversation` and the `AssistantPlanner` seam that turns a sentence
into actions.

An `AssistantAction` is exactly the `(capabilityKey, args, expectedRevision,
idempotencyKey)` tuple `execute` already takes, so a planned turn is governed
identically to a scripted call, and an action planned against a stale view
fails instead of applying to a different one.

`AssistantSuggestion` is an authored prompt with a stable `id`, a localizable
`title`, the `prompt` it sends, and the capability keys it `requires`. Suggestions are never derived
from capability keys — a key is not a sentence.
`eligibleSuggestions(suggestions, available)` hides the ones this table
cannot run, and `assertUniqueSuggestions` catches a repeated id. A capability
definition may contribute its own through `presentation`.

Nothing in these contracts imports React or calls a model.

## The headless assistant

`@adapttable/ai-react` turns those contracts into a conversation, and
still renders nothing. `useTableAssistant({ session, transport, suggestions })`
returns `status`, `busy`, `messages`, `draft`/`setDraft`, `send`, `stop`,
`clear`, the live `suggestions`, `runSuggestion`, `open`/`setOpen`, `error` and
`errorCode`, plus the pending `approval`, `alwaysAllowed` /
`revokeAlwaysAllow`, `undo` / `undoTurn` / `undoAction`, `interrupted`,
`resumable` / `resume`, `progress` and `answer` for a structured question. A host renders its own panel from those; the widget each kit
ships is written against the same values, so it is a convenience and never a
requirement. `examples/ai-assistant-custom-ui.tsx` is a complete panel with no
widget in it.

The rules it keeps:

- **One send at a time**, reserved before any await, so two clicks in one tick
  cannot interleave two turns' actions against one table.
- **A draft survives a failed turn.** It is cleared optimistically and put
  back if the turn fails — unless the reader typed something else meanwhile.
- **Stopping is not failing, and nothing is retried.** An action whose outcome
  is unknown stays unknown; the assistant never sends it twice.
- **A late reply is dropped.** A turn belonging to a previous table, or to a
  panel that has unmounted, never writes into the transcript.
- **Closing the panel discards nothing** — not the draft, not the transcript,
  not a submitted action.
- **A new session is a new conversation.** Switching tables aborts the turn in
  flight and starts empty, so history never crosses between tables.

`transport` may be a fresh object every render; the controller reads the
latest one rather than reconnecting on its identity. A host that genuinely
swaps transports — a backend for a scripted one — says so with `transportKey`,
because a backend must never quietly become a simulated one.

Receipts come from results, never from an outer flag. `receiptFromResult` and
`receiptsFromResults` report `executed`, `staged`, `partial`, `rejected`,
`awaiting-approval`, `cancelled`, `stale` or `failed`; `turnStatus` summarizes
a turn as `applied`, `partial`, `none`, `cancelled` or `failed`. An approved
write that has not reached the host is `staged`, not executed — Save is still
the reader's, on the table's own dirty path.

A transport is the only thing that knows about HTTP or a model.
`assistantHttpTransport` on `@adapttable/ai/http` adapts the existing backend
bridge; a host writing its own implements `AssistantTransport` from
`@adapttable/ai` and pulls in neither.

## The optional widget

Every kit ships a panel on `@adapttable/<kit>/assistant`, and it is a separate
entry point on purpose: a table that never imports it carries none of it.

```tsx
import { TableAssistant } from "@adapttable/mantine/assistant";
import { useTableAssistant } from "@adapttable/ai-react";

const assistant = useTableAssistant({ session, transport, suggestions });

<TableAssistant
  assistant={assistant}
  open={assistant.open}
  onOpenChange={assistant.setOpen}
/>;
```

`TableAssistant` takes `TableAssistantProps`: the `assistant` view, `open` and
`onOpenChange`, an optional `presentation` (`TableAssistantPresentation` —
`"panel"` beside the table, `"sheet"` for a modal on a narrow viewport, or
`"floating"`), `labels`, `className`, `launcher` (set `false` when the host
supplies its own trigger — the toolbar button and the floating launcher drive
ONE panel), `onSettings`, `approval`, `receipts`, [`speech`](./ai-voice.md), `greeting`, `note`,
`accent`, `avatars`, `boundary`, `dir` and `messageAction`. `tableAssistant()` binds the same component to the
`TABLE_ASSISTANT` slot for hosts that compose it as a feature.

The panel is a sibling of the table, never a cell inside it, so it can sit
beside the grid without covering the rows a reader is asking about.

### What the panel does, in every kit

Structure, keyboard and announcements live in `TableAssistantChrome`
(`TableAssistantChromeProps`); each kit fills `TableAssistantSlots` with its
own `Panel`, `Sheet`, `Window`, `Button`, `Composer` and `Badge`, and
optionally `Menu` and `LanguageChip` (`TableAssistantPanelProps`, `TableAssistantSheetProps`,
`TableAssistantButtonProps`, `TableAssistantComposerProps`,
`TableAssistantBadgeProps`). Core draws no control, so a Mantine table's
assistant is Mantine and an antd table's is antd —
`createAdapterTableAssistantFeature` is what an adapter calls to bind its own.

- **Empty state** asks what to do, then offers only the suggestions this table
  can actually run.
- **Enter sends, Shift+Enter starts a line**, and Enter mid-IME-composition
  belongs to the IME — sending there would post a half-written word.
- **Send becomes Stop** while a turn runs. A disabled composer always says
  why rather than becoming a dead end.
- **Roles are named, not coloured.** Each message shows its speaker, and each
  receipt says in words what became of the action. A staged write says it
  still needs saving in the table.
- **New messages follow only when the reader is already at the bottom**;
  otherwise the panel offers to take them there, so an earlier result stays
  readable.
- **Escape closes the panel**, unless something inside it already answered —
  one key never dismisses two things. Closing returns focus to the launcher.
- Backend text is rendered as text, never as markup.

The view it reads is `TableAssistantView`, built from
`TableAssistantMessageView`, `TableAssistantReceiptView` and
`TableAssistantSuggestionView`. `useTableAssistant`'s return satisfies it, and
so does a host driving the panel from its own state. `assistantIsBusy` and
`assistantIsUsable` answer the two questions a host's own chrome usually asks
of a status token.

## Six ways to wire it

Every one of these runs through the SAME governed executor. What changes is
how much of the UI you keep.

**1 — The ready widget.** The short path: a panel in your kit's own
components, beside the table.

```tsx
import { useTableAssistant } from "@adapttable/ai-react";
import { assistantHttpTransport } from "@adapttable/ai/http";
import { TableAssistant } from "@adapttable/mantine/assistant";
import { tableAgent } from "@adapttable/ai-react";

const transport = useMemo(
  () => assistantHttpTransport({ endpoint: "/api/table-agent" }),
  []
);
const assistant = useTableAssistant({ session, transport, suggestions });

<DataTable {...props} features={[tableAgent({ tableId: "orders" })]} />
<TableAssistant
  assistant={assistant}
  open={assistant.open}
  onOpenChange={assistant.setOpen}
/>;
```

`session` comes from the table. Either read it inside the table's tree with
`useFeatureState(TABLE_AGENT_STATE)`, or lift it out with
`tableAgent({ tableId, bridge: { attach: setSession } })` when the panel is a
sibling.

**2 — Your own launcher.** The floating launcher and a toolbar button drive
one panel, so turn the built-in one off and open it yourself.

```tsx
<button type="button" onClick={() => { assistant.setOpen(true); }}>
  Ask AI
</button>
<TableAssistant
  assistant={assistant}
  open={assistant.open}
  onOpenChange={assistant.setOpen}
  launcher={false}
/>;
```

**3 — A controlled panel.** Own the open state and the surface. Pass
`presentation="sheet"` on a viewport too narrow for a table and a panel side
by side, and the kit's own modal is used.

```tsx
const [open, setOpen] = useState(false);
const narrow = useMediaQuery("(max-width: 900px)");
const assistant = useTableAssistant({
  session,
  transport,
  open,
  onOpenChange: setOpen,
});

<TableAssistant
  assistant={assistant}
  open={open}
  onOpenChange={setOpen}
  presentation={narrow ? "sheet" : "panel"}
  launcher={narrow}
/>;
```

**4 — Your own UI, our controller.** Keep the lifecycle, render nothing of
ours. `examples/ai-assistant-custom-ui.tsx` is a complete panel built this
way; the widget above uses these same public values, which is what makes it
optional rather than required.

```tsx
const a = useTableAssistant({ session, transport, suggestions });

<ol>
  {a.messages.map((m) => (
    <li key={m.id}>
      <strong>{m.role}</strong> {m.text}
      {m.receipts?.map((r) => (
        <span key={r.idempotencyKey}>
          {r.capabilityKey}: {r.status}
        </span>
      ))}
    </li>
  ))}
</ol>;
```

**5 — Your own transport.** The seam names nothing about HTTP or any model,
so this pulls in neither. Anything that turns a sentence into actions is
valid — a backend, an in-process planner, or a fixed script.

```ts
import type { AssistantTransport } from "@adapttable/ai";

const transport: AssistantTransport = {
  async send({ session, text }) {
    const result = await session.execute(
      "view.setFilters",
      { filters: planFilters(text) },
      session.manifest().viewRevision,
      crypto.randomUUID()
    );
    return { text: "Filtered.", results: [result], keys: ["view.setFilters"] };
  },
};
```

Pass the live revision, not a remembered one: an action planned against a view
the table has left must fail rather than apply to a different one.

**What a transport owes the panel.** `signal` is a request, and a transport is
your code: honour it if you can, by passing it to `fetch` or to whatever does
the waiting. The panel does not depend on that. If a stopped turn answers
anyway, its reply is dropped rather than appended, and Stop frees the composer
immediately rather than waiting for a transport that may never settle.

What a transport must NOT do is retry. Stopping cancels the panel's interest
in an answer; it does not undo a write that already reached the host, and it
cannot cancel work a backend has already started. An action whose outcome is
unknown stays unknown — sending it again is how one stopped edit becomes two.

**6 — The HTTP backend you already run.** `assistantHttpTransport` adapts the
existing bridge; `examples/ai-http-backend.ts` is the runnable server.

```ts
const transport = assistantHttpTransport({
  endpoint: "/api/table-agent",
  headers: { authorization: `Bearer ${yourEndpointToken}` },
});
```

That token is your endpoint's, never a model provider's. Provider credentials
belong on the backend; the browser never holds one, and this library contains
no model client to hold it with.

## What a reader is actually told

- **Eligibility is live.** Suggestions and capabilities are re-checked against
  the current manifest, so a feature the host turns off stops being offered
  rather than failing when pressed.
- **Descriptions are progressive.** `catalog()` is small and stays small;
  `describe(key)` fetches a schema only when something needs it.
- **Approval is not persistence.** Approving a write lets it reach the host.
  Under `commit: "stage"` the host callback is the staging one, so the change
  sits on the table's own dirty path and the panel says it still needs saving.
  Approving and saving are two separate acts by design.
- **Continuation is optional.** A local action receipt needs no second model
  call; nothing forces one turn to become two.
- **Sessions are isolated.** One session per table, one conversation per
  session. Switching tables aborts the turn in flight and starts empty, so a
  reply about one table can never land under another.

## Three portable calls

Any agent runtime can speak this:

1. `catalog()` — keys and one-line summaries, in a stable order.
2. `describe(key)` — the guide plus strict input/output JSON Schemas.
3. `execute(key, arguments, expectedRevision, idempotencyKey)` — validate,
   refuse a stale revision, replay an idempotent key, then dispatch.

Runtimes that support typed tools can wrap each described capability as its
own tool. The three calls stay the fallback.

Protocol identity is the schema version (`adapttable.agent.v1`) and the
capability keys. Labels may be translated for people; execution is
locale-independent.

## The manifest does not send rows

Initialization publishes:

- table id and view revision
- the enabled capability keys
- readable/writable column metadata
- how rows are addressed (`visible` / `page` / `full`)
- limits (`pageMax`, `readMax`) and policy (`write`, `approval`, `commit`)
- the source capability record

It never dumps the dataset or every feature instruction. Bounded
`rows.read` and write approval (`approval` / `commit` / kit chrome) live
in [`@adapttable/ai`](./ai.md). The kit strip uses `agent-approval`,
`agent-approval-list`, `agent-approval-approve`, `agent-approval-reject`,
and `agent-approval-row`. Escape rejects. Enter is not a silent confirm.

## Row and bulk actions

`tableAgent` offers every action the host composed with `rowActions(…)` and
`bulkActions(…)` as its own governed capability. Nothing else needs wiring:

| Capability         | Input         | Runs                                                   |
| ------------------ | ------------- | ------------------------------------------------------ |
| `rowAction.<key>`  | `{ rowKey }`  | The action's `onClick(row)`, as a click would.         |
| `bulkAction.<key>` | `{ rowKeys }` | The action's `onClick(ids, context)` on the selection. |

Each is a write, and `destructive` when its `confirm` is marked `danger`, so
the table's write policy, commit mode and approval apply before the host's
handler runs. An action's `ai.approval` overrides the table's policy for that
capability, field by field, exactly as `capabilityApproval` does; an action
with a `confirm` block asks a person unless its `ai.approval.policy` says
otherwise. `ai: false` keeps an action away from the agent. A host handler
cannot be staged, so the actions run on a `commit: "immediate"` table; a
staged table refuses them with `commit-incompatible`.

A row action refuses a row it is hidden or disabled for (`isHidden`,
`disabledReason`, `isDisabled`) before anything runs. A bulk action runs on
the current selection: the agent selects with `view.setSelection`, then passes
the same keys as `rowKeys`, and a selection that changed in between is
refused. The table's own add, duplicate, delete and pin controls are not
offered this way — they are `rows.add`, `rows.delete` and `view.pinRow`.

The table still never changes the data: the capability calls the host's own
handler, and the host decides what the action does.

Without React, `tableActionCapabilities(declared, source)` from
`@adapttable/ai` builds the same definitions for `createAgentSession`.
`declared` is a `DeclaredTableActions` — the table's `row` and `bulk` actions —
and `source` is a `TableActionSource`: `actions()`, `rowFor(rowKey)` and
`selectedIds()`, read each time a capability plans or runs, so it acts on the
live table. `tableActionSignature(declared)` says when the set changed; rebuild
the definitions then, because a session's capabilities are fixed when it is
built.

## Registering a capability of your own

`createAgentSession({ capabilities })` takes `AgentCapabilityDefinition`s. A
definition carries a namespaced `key`, a one-line `summary` for the catalog, a
`guide` with JSON Schema for its input and output, an `isEnabled(observation)`
that decides whether it is wired right now, and `execute`.

```ts
const archive: AgentCapabilityDefinition = {
  key: "orders.archive",
  summary: "Archive an order.",
  kind: "write",
  guide: { guide: "…", input: archiveInput, output: archiveOutput },
  isEnabled: (observation) => observation.writePolicy === "allow",
  execute: (context, args) => host.archive((args as ArchiveArgs).rowKey),
};
```

`kind` is what makes it governed. A `"write"` or `"destructive"` capability
goes through the same path as a built-in mutation, and the session — not your
handler — enforces it:

1. the table's write policy, then the commit mode;
2. `plan`, if you wrote one, to resolve a side-effect-free `CapabilityPlan`
   the approver can read;
3. approval, when the table's `approval` policy asks for it;
4. the revision and the permissions again, after every await;
5. only then `execute`.

A handler that never calls `onApprove` therefore cannot write unapproved, and a
denied or still-pending approval calls it zero times.

Staging is declared, not assumed. A governed capability defaults to
`staging: "unsupported"`, so a table running `commit: "stage"` rejects the call
with `commit-incompatible` before your handler runs rather than committing
something the host wanted staged. Set `staging: "supported"` when the
capability really can stage. Among the built-ins only `edit.cells` stages.

`AgentCapabilityContext` is what `execute` receives: the `observation` it was
authorized against, the host's `apply` callbacks, a live `observe()`, the bound
`onApprove`, the request's `signal` and `throwIfCancelled()`, an optional
`reportProgress`, and — for a governed write — the approved `plan`, the
resolved `commit` mode and, after a per-row decision, `approvedIndexes`.

### Wiring the review

The ready-made path is two props. The assistant hands you the write; the
panel draws it:

```tsx
import { useTableAssistant } from "@adapttable/ai-react";
import { TableAssistant } from "@adapttable/mantine/assistant";

const assistant = useTableAssistant({ session, transport });

<TableAssistant
  assistant={assistant}
  open={assistant.open}
  onOpenChange={assistant.setOpen}
  approval={assistant.approval}
/>;
```

`approval` is safe to pass always: the panel draws it only when the resolved
presentation names the widget.

A panel mounted outside the table cannot read its feature state, so the bridge
hands the same value over:

```tsx
const [approval, setApproval] = useState<AgentApprovalPending | null>(null);

tableAgent({ tableId: "orders", bridge: { approvals: setApproval } });
```

To draw the review yourself, read the model and render whatever you like. The
counting, the labels and the preview are all in it, so a custom surface says
the same things the built-in ones do:

```tsx
import { approvalReview } from "@adapttable/react/adapter";

function MyApproval({ pending }: { pending: AgentApprovalPending }) {
  const review = approvalReview(pending, labels);
  if (!review) return null;
  return (
    <aside>
      <p>{review.summary}</p>
      {review.items.map((item) => (
        <button
          key={item.id}
          onClick={() => pending.decideAt?.(item.index, true)}
        >
          {item.proposal.rowLabel ?? item.proposal.rowKey}
        </button>
      ))}
      <button onClick={() => pending.approve()}>{review.approveLabel}</button>
      <button onClick={() => pending.reject()}>{review.rejectLabel}</button>
    </aside>
  );
}
```

`decideAt` is absent when the write cannot be split — hide per-row controls
rather than drawing dead ones.

### One write at a time

An approval is one transaction, and a second write while one is open is
refused rather than queued behind it. Every decision control belongs to the
transaction it was made for: a control left over from an approval that has
settled does nothing, so a stale click cannot answer the next write. The
write settles exactly once, whichever comes first — the reader deciding, the
turn being aborted, or the last row being answered.

Approving is not saving. `commit: "stage"` puts an approved change on the
table's own dirty path, where the reader still presses Save; `commit:
"immediate"` calls the host save path and reports what it returned. Rejecting
stops a write that has not run. It does not undo one that already has —
cancellation after the host callback is the host's own concern.

### Where a waiting write is reviewed

Three surfaces can review an approval, and exactly one of them draws the
controls: whichever the resolved `presentation` names.

| `presentation`     | Where                                   |
| ------------------ | --------------------------------------- |
| `widget` (default) | In the conversation, under the messages |
| `table`            | A strip above the rows it changes       |
| `modal`            | The kit's own dialog, over the page     |

The others do not repeat the buttons. The assistant says a change is waiting
when the decision is being made elsewhere; that is all.

Every surface draws the same review, because they all read one model:

```ts
import { approvalReview } from "@adapttable/react/adapter";

const review = approvalReview(pending, labels);
review.changes; // 12
review.rows; //  8 — three edits to one row are three changes and one row
review.preview; // the first three
review.approveLabel; // "Approve all" — "Approve" for one, "Approve remaining"
//                      once any change has been decided
```

A long write opens with a summary — _12 proposed changes across 8 rows_ — and
the first three changes. **Review all 12 changes** opens the rest inside the
same surface: in widget mode the conversation gives way and **Back to
conversation** returns, rather than a second overlay opening over the first.

`Approve all` becomes `Approve remaining` the moment any single change is
decided, because a row already refused stays refused and the first label
would be a promise the control cannot keep. A running tally sits beside it.
A write with one change says `Approve` and offers no per-row pair: "all" of
one names a set that does not exist, and two controls answering the same
question is a decision the reader has to make before they can act.

A write that enumerates no rows — an opaque server operation — is shown by
name and its arguments as pairs, not as the JSON the capability will receive.
It gets no invented row count and no per-row checkboxes, and it is answered
whole.

Closing the assistant does not answer anything. The write stays parked and
the launcher still says so; reopening brings the review back.

### The reader and the model are told different things

A proposal has two before-values, and they are not the same value.

`WriteProposal.before` is what the MODEL is told. It is read at the agent's
own addressing scope, through the same readable-column allowlist as
`rows.read`, because it travels: the session returns it, and an HTTP or MCP
continuation sends it back to the backend. A row outside that scope therefore
has no before-value here, and a column marked `readable: false` never appears
in one.

What the person approving sees is resolved separately, in the React binding,
from the table already on their screen. That value never enters a proposal, a
result, or any transport — so a row the current filter hides still reads
correctly for them without widening what the model was given.

Being able to see the table is not entitlement to every cell in it. A column
the host marked unreadable resolves to nothing on that side too, and nothing
is reported as **Unavailable** rather than drawn as an empty cell:

```
Ada · ssn: Unavailable → redacted     // nobody could look it up
Ada · notes: — → "call back"          // the cell is genuinely empty
```

`beforeUnavailable` on the approval proposal is that distinction. A value is
never invented to fill the gap.

### Whether a human is asked, and where

Two questions, answered separately.

**Policy** is whether an agent has to wait for a person. **Presentation** is
where that person is asked. Turning approval off does not move a surface, and
choosing a surface authorizes nothing.

The table sets both once:

```ts
tableAgent({
  tableId: "orders",
  approval: { policy: "writes", presentation: "widget" },
});
```

`approval: "writes"` still works and means the policy alone. The defaults are
`writes` and `widget`.

A capability overrides either field on its own, through `capabilityApproval`
for a built-in key or `ai` on a custom definition:

```ts
tableAgent({
  tableId: "staff",
  commit: "immediate",
  approval: { policy: "writes", presentation: "widget" },
  capabilityApproval: {
    // Always ask for this one, wherever the table reviews approvals.
    "rows.delete": { approval: { policy: "required" } },
  },
});
```

Inheritance is per FIELD. Overriding the policy leaves the presentation as the
shared one, and vice versa — so a table can say "review in the widget" once and
then mark two sensitive capabilities as always-ask without repeating itself. An
absent entry changes nothing: there is no key whose absence means authorized.

`policy: "automatic"` skips the human confirmation and nothing else.
Permissions, schema validation, and the staging and save rules all still run,
and a column the table marked unwritable is still refused.

An entry carries overrides only. It never enables a capability the table does
not wire or one in `excludeCapabilities`, and `required` drops
`alwaysAllow` for that capability.

### Deciding a bulk write row by row

A reader can approve some of a bulk write and refuse the rest, and the session
then narrows `context.plan`: `proposals` and `payload` both describe exactly
the approved rows, in plan order.

`args` is not narrowed. It is what the model asked for, and rewriting it would
misreport the request. So a handler that works from `args` rather than from
`plan.payload` would apply rows the reader refused — and the session cannot
read your handler to find out which kind it is.

So you say. `partial: "supported"` is a promise that `execute` applies
`plan.payload`:

```ts
{
  key: "staff.raise",
  kind: "write",
  partial: "supported",
  plan: (context, args) => ({
    proposals: rows.map((row) => ({ rowKey: row.id, column: "salary", after: row.next })),
    payload: rows,
    perItem: true,
  }),
  execute: (context) => save(context.plan?.payload as Row[]),
}
```

The default is `"unsupported"`. An undeclared capability is offered to the
reader whole, and a row-by-row answer for it is refused with
`approval-not-decomposable` rather than quietly widened to "approve all" — so
`args` and `plan` always agree for handlers that never opted in.

Three things must all hold before a write is offered per item: the plan sets
`perItem: true`, the capability declares `partial: "supported"`, and `payload`
is an array lined up with `proposals` index for index. `rows.reorder` is the
counter-example among the built-ins — two proposals describe one indivisible
move, so it is always offered whole.

A malformed decision fails the call without writing anything: a position
outside the plan, a repeated position, or a non-integer returns
`approval-invalid`. Nothing is filtered and run anyway.

A `read` or `view` capability skips all of it. Nothing about a view operation
asks for write approval.

## Cancelling

Pass an `AbortSignal` to `execute` and the session stops at every seam it
owns: before your handler runs, after planning, after approval, and before
each row of a bulk write. Cancellation is not an approval question — a table
with `approval: "never"` and no `onApprove` cancels exactly the same way.

A multi-step handler cooperates by calling `context.throwIfCancelled()`
immediately BEFORE each side effect, and by passing `context.signal` to
anything that accepts one:

```ts
execute: async (context, args) => {
  const rows = await fetchArchivable(args, { signal: context.signal });
  context.throwIfCancelled();
  await context.apply.deleteRows?.(rows.map((row) => row.id));
  return { archived: rows.length };
};
```

Nothing here claims to undo a callback the host has already been given. That
is what decides the retry rule:

- **Cancelled before any write.** Nothing ran, so the idempotency key is left
  free and the same key may be sent again.
- **Cancelled part way through a bulk write.** The rows already written stay
  written and are reported in `results`; the rows after them are never
  attempted. The key now belongs to that partial outcome, and sending it again
  replays the outcome rather than writing the first rows twice.
