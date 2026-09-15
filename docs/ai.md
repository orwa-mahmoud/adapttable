# AI table API — sessions, approval and governed execution

`@adapttable/ai` exposes a table's available operations to an agent without
choosing a model provider. Discover capabilities, inspect their schemas and
execute validated actions against the current table. Applications retain
control of permissions, approval and persistence.

For connection examples, read [OpenAI, MCP and JSON integrations](./ai-integrations.md)
or [the HTTP backend guide](./ai-http.md).

## Start here

Three levels, in the order most teams want them. Each is complete on its own;
none is a prerequisite for the next.

**1. The ready experience.** A widget, a transport, and the table you already
have. The capabilities come from the table's configuration — you do not copy a
schema into a backend, and there is nothing to keep in step.

```tsx
import { tableAgent, useTableAssistant } from "@adapttable/ai-react";
import { assistantHttpTransport } from "@adapttable/ai/http";
import { TableAssistant } from "@adapttable/mantine/assistant";

const transport = assistantHttpTransport({ endpoint: "/api/agent" });

function Orders({ rows }: { rows: Order[] }) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const assistant = useTableAssistant({
    session: session ?? undefined,
    transport,
    // Only a genuine transport swap re-establishes the conversation.
    transportKey: "orders",
  });

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        features={[
          tableAgent({
            tableId: "orders",
            writePolicy: "allow",
            approval: { policy: "writes", presentation: "widget" },
            bridge: { attach: setSession },
          }),
        ]}
      />
      <TableAssistant
        assistant={assistant}
        open={assistant.open}
        onOpenChange={assistant.setOpen}
      />
    </>
  );
}
```

`assistant.error` carries the last failure and each turn's receipts say what
actually happened — `applied`, `staged`, `awaiting-approval`, `rejected`,
`stale`, `failed` or `cancelled`. A staged write is not a saved one, and the
panel says so rather than reporting success.

**2. Your own agent, our executor.** You already have a model call and a reply
to parse. Map whatever it produced onto a capability key and arguments, and
call the session — the permission predicate, the revision check and the
approval policy all apply, whichever route reaches them.

```ts
const result = await session.execute(
  "view.setFilters",
  { filters: { team: ["Core"] } },
  session.manifest().viewRevision,
  // Your own replay identity. The same key twice never runs twice.
  `turn-${turnId}-1`
);
if (!result.ok) report(result.error); // never a silent retry
```

See [`examples/ai-custom-bridge.ts`](https://github.com/orwa-mahmoud/adapttable/blob/main/examples/ai-custom-bridge.ts).

**3. The conversation, without React.** `@adapttable/ai/assistant` is the whole
lifecycle — one send at a time, a draft that survives a failure, a late reply
dropped rather than appended — with no DOM and no HTTP. A binding for another
framework subscribes to it rather than re-deriving those rules.

```ts
import { createTableAssistant } from "@adapttable/ai/assistant";

const store = createTableAssistant({ session, transport });
const stop = store.subscribe(() => render(store.getState()));
store.connect();
// Always, on unmount or teardown: a disposed store drops its connection and
// cannot write into a surface that has gone.
onTeardown(() => {
  stop();
  store.dispose();
});
```

See [`examples/ai-assistant-store.ts`](https://github.com/orwa-mahmoud/adapttable/blob/main/examples/ai-assistant-store.ts)
and, for a custom panel in React,
[`examples/ai-assistant-custom-ui.tsx`](https://github.com/orwa-mahmoud/adapttable/blob/main/examples/ai-assistant-custom-ui.tsx).

The optional helpers add convenience, not permission. None of them is required
to use an agent you already have, and none of them can reach past what the
table wired.

```bash
npm install @adapttable/ai
```

The root entry is React-free and SDK-free. Use it from any agent runtime.
The React feature is a separate import.

```ts
import { createAgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai-react";
```

## `tableAgent({ tableId, bridge, writePolicy, approval, commit, columns, readMax })`

Compose it next to the other features:

```tsx
import { tableAgent } from "@adapttable/ai-react";
import { DataTable } from "@adapttable/mui";
import { agentApproval } from "@adapttable/mui";
import { filters } from "@adapttable/mui/filters";

<DataTable
  columns={columns}
  data={rows}
  rowKey="id"
  features={[
    filters(),
    agentApproval(),
    tableAgent({
      tableId: "orders",
      writePolicy: "allow",
      approval: "writes",
      commit: "stage",
      bridge: {
        publish: (manifest) => sendToRuntime(manifest),
        attach: (session) => (runtime.session = session),
      },
    }),
  ]}
/>;
```

`writePolicy` is `"allow"` or `"deny"`. Deny strips every write key.
Allow still goes through the host's existing edit/reorder/add/delete
callbacks — the table never owns the data.

`approval` is `"writes"` (default — every mutating key), `"destructive"`
(only `rows.delete`), or `"never"` (skip chrome and `onApprove`; still
validate and honour commit). Host `onApprove?: (proposal) => Promise<boolean>`
replaces the kit strip when it is set.

`commit` is `"stage"` (default — dirty/batch path; Save still belongs to
the reader) or `"immediate"` (invoke the host callback now).

`readMax` bounds `rows.read` (default 50). `scope: "full"` requires
`source.fullDataset === true`. Readable-false columns are redacted.

`columns` overlays readable/writable/type on the published column metadata.

`bridge.publish` receives every new manifest (feature, column, permission or
policy change). `bridge.attach` receives the live
`catalog` / `describe` / `execute` session. Two tables each get their own
session; they do not share revision or idempotency state.

## Manifest shape

```ts
{
  schemaVersion: "adapttable.agent.v1",
  tableId: string,
  viewRevision: number,
  capabilities: CapabilityKey[],
  columns: { id, label, type, readable, writable, sortable }[],
  rowAddressing: { scope: "visible" | "page" | "full", key: "rowKey" },
  limits: { pageMax: number, readMax: number },
  policy: {
    write: "deny" | "allow",
    approval: "writes" | "destructive" | "never",
    commit: "stage" | "immediate",
  },
  source: TableSourceCapabilities,
}
```

## Capability keys

Stable catalog order:

`columns.describe`, `view.describe`, `view.setPage`, `view.setSort`,
`view.setSearch`, `view.setFilters`, `view.setGroupBy`,
`view.setAggregations`, `view.pinColumn`,
`view.pinRow`, `view.setSelection`, `views.apply`, `rows.read`,
`rows.resolve`, `export.run`, `edit.cells`, `rows.add`, `rows.delete`,
`rows.reorder`.

`view.setFilters` takes `{ filters }` — the extra bag the table already
uses (`{ team: ["Core"] }`, `{ salaryMin: 10000, salaryOp: "gt" }`) or an
array of `{ key, op, value }` conditions. `describe` lists the live
filters, operators and (when the static list is short enough) options.
`ai: false` on a `FilterDef` hides that filter; `{ options: false }` or a
number cap omits a large list rather than truncating it. Without
declarative defs the argument stays the host's own object.

`view.setAggregations` takes `{ set?, remove?, restoreDefaults? }` — add or
change specific column operations without replacing the others, remove
specific aggregations with the same suppression semantics as the panel, or
restore developer defaults. The whole request is validated before anything
is applied. It is advertised only when grouping can actually execute
aggregates. `describe` lists eligible columns and operation ids (never a
`calculate` function). A server-side apply reports `pending: true` until the
response that answers the new query arrives.

`view.pinColumn` takes `{ key, side }` where `side` is the logical `"start"`
or `null` to unpin. `view.pinRow` takes `{ side }` — `"top"`, `"bottom"` or
`null` — with a `rowKey`, or a `position` plus the `scope` and
`expectedRevision` it was read at. Both are view operations, so neither takes
the write-approval path. See
[adaptive capabilities](./agent-capabilities.md#pinning).

`edit.cells` takes `{ edits: Array<{ column, value, rowKey?, position?, scope? }> }`
— each edit needs `rowKey` or a 1-based `position`. Positions resolve
before write. `rows.delete` addresses rows the same way:
`{ rows: Array<{ rowKey?, position?, scope? }> }`, resolved before anything
is removed, so a reference that names no row is refused while the deletion is
still a proposal. The execute result is

`{ ok, revision, idempotencyKey, result: { proposals, applied, approval, results? } }`.

`createAgentSession({ observe, apply })` is the same contract without React —
hand it the current observation and the apply hooks. See
[adaptive capabilities](./agent-capabilities.md).

## What the agent is told

`buildAgentContext(session, options?, inputs?)` on `@adapttable/ai/context`
produces the whole of it: the **contract** (what this table permits, which
changes rarely) and the **view** (where it is right now, which changes
constantly). Nothing else reaches a model, and the builder performs no I/O —
it reads no rows and makes no request.

```ts
import { buildAgentContext } from "@adapttable/ai/context";

const { contract, view, selection } = buildAgentContext(
  session,
  { profile: "compact" }, // omit for the unbudgeted default
  { filters: liveFilters, view: { page, limit, search } }
);
```

**Profiles.** `full` is the default: every guide and every column description
travels, bounded only by the hard byte limit. What a model's context window
costs is the backend's business, and trimming on its behalf means guessing —
a guess that drops the sentence saying a column counts thousands is paid for
by the reader who gets the wrong number back.

`compact` is there for a host that has measured its own backend and wants the
smaller payload: it names every capability but attaches the full guide only for
the ones a turn is likely to need, and strips column detail to make room. The
rest are fetched on demand, in one batched discovery round rather than one
request per key. `selection.selected` and `selection.deferred` say which went
which way, and `selection.notes` says why. Pass `tokenBudget` with either
profile to name your own ceiling.

**Budgets and sizes.** `selection.contractBytes` and `selection.viewBytes` are
UTF-8 bytes on the wire. `selection.estimatedTokens` is an estimate of prompt
size and says so: `selection.estimated` is `true` when nobody counted, and you
can pass your own `estimateTokens` to make it a measurement. Neither is a count
of model invocations — a turn is one invocation whatever the context weighs.

**Exclusions.** `createAgentSession({ excludeCapabilities })` and
`tableAgent({ ... })`'s equivalent remove a capability from the contract, the
suggestions and the executor at once. The table's own control is untouched: a
person can still filter a table whose agent may not.

**Versions.** `contract.version` names everything the contract says. Two
requests carrying the same version describe the same table; a backend that
pinned one and sees another knows to ask for the whole thing again.

**Column examples.** `ai.examples` on a column is what the author wrote.
`ai.sample: true` opts that column into live sampling, which is a separate,
deliberate call — `sampleColumnValues(session, key)` reads through `rows.read`
under the session's own permission predicate, caps at five distinct values,
revalidates each against the column's declared type, and never touches an
unreadable column. Hand the result in as `inputs.samples`; the contract marks
those columns `sampled: true`, so nobody confuses an author's example with
somebody's data.

## Saying how far a long call has got

A capability that works through a thousand rows one call at a time has nothing
to say between "started" and its receipt, and a reader watching a spinner
cannot tell a slow write from a stuck one. Its execution context carries a
channel for that:

```ts
capabilities: [
  {
    key: "orders.settle",
    // …
    execute: async (context, args) => {
      const rows = rowsFor(args);
      for (const [index, row] of rows.entries()) {
        context.throwIfCancelled();
        await settle(row);
        context.reportProgress?.({
          done: index + 1,
          total: rows.length,
          label: "orders",
        });
      }
      return { settled: rows.length };
    },
  },
];
```

The conversation shows it where it is waiting, and it goes when the turn
settles. `label` is shown as given — this package has no translation for your
nouns, and inventing one would be worse than leaving it out.

**Progress is not a result.** The receipt still comes from what the handler
returned, a call that reported progress and then failed has failed, and none of
this involves the model: nothing is sent, and no second call is made to say the
work is done.

Wire `bridge.progress` to read it outside the table; a panel inside the table
reads it from the table's own state and needs nothing.

## Stopping, losing the connection, and coming back

Three different things happen to a turn that does not end in a reply, and the
conversation reports which one:

- **Stop** — the reader ended it. The signal is raised, the remaining actions
  never run, and nothing is left running anywhere. `interrupted` is
  `"stopped"`.
- **Disconnect** — the connection was released, by an unmount, a table change
  or `disconnect()`. The backend was never asked to stop, so it may still be
  working. `interrupted` is `"detached"`, and the conversation stops waiting
  for a reply that can no longer reach it.
- **Resume** — rejoin work that is still running. The turn comes back on a
  fresh baseline: the table is read again before anything is applied, because
  it is not the table the turn started against.

A turn can only be detached if the transport named something to come back to.
It does that while the turn runs, through `onResumable`, and implements
`resume` to rejoin:

```ts
const transport: AssistantTransport = {
  send: async ({ text, onResumable, signal }) => {
    const job = await backend.start(text, { signal });
    // Named now, because a connection released later is too late to ask.
    onResumable?.(job.id);
    return toReply(await backend.wait(job.id, { signal }));
  },
  resume: async ({ handle, signal }) => {
    // Same replay identities as the first attempt, so a completed action is
    // answered from the session's record rather than run again.
    return toReply(await backend.wait(handle.token as string, { signal }));
  },
};
```

Without `resume`, releasing the connection ends the turn — which is the honest
outcome for a transport that cannot get back to it.

**What this package guarantees:** within the life of one session, an action
that already ran is not run again when a turn is resumed. The session keeps a
replay record per identity, and a resumed attempt that reuses its identities
gets the recorded result rather than a second execution.

**What the host owns:** everything that has to survive the page. A reload
builds a new session with an empty replay record, a new transcript and no
memory of what ran, so durable recovery is a host decision. Keep the handle
and hand it back:

```ts
useTableAssistant({
  session,
  transport,
  onDetach: (handle) => sessionStorage.setItem("turn", JSON.stringify(handle)),
  resumeHandle: restoredHandle,
});
```

A backend whose work outlives a page must also be idempotent across it — the
replay record that answers a repeated action is in the session that went away.

## Approval, undo and what a reader agreed to

`approval` answers two questions separately: **which** capabilities need a
human (`policy`), and **where** they are asked (`presentation`). An action can
override either for itself.

`alwaysAllow` is a third, and it is off unless you name the keys:

```ts
tableAgent({
  tableId: "orders",
  approval: { policy: "writes", alwaysAllow: ["edit.cells"] },
});
```

The control appears only for a capability on that list. It never appears for a
destructive one, never for a write that enumerates rows, and never for an
action whose own configuration demands a human every time — and a host
`onApprove` bypasses the chrome entirely, so nothing there can reach past it.

A panel mounted beside the table rather than inside it cannot read the table's
feature state, so the standing decision travels through the bridge:
`bridge.alwaysAllowed` is called with an `AlwaysAllowedState` — the capability
keys currently waved through and a `revoke(key)` — and `useTableAssistant`
takes it as `alwaysAllow`. Without it a reader can allow a capability and have
no way to take it back.

```ts
const [allowed, setAllowed] = useState<AlwaysAllowedState | null>(null);

tableAgent({ bridge: { alwaysAllowed: setAllowed } });
useTableAssistant({ session, transport, alwaysAllow: allowed ?? undefined });
```

What a reader waved through is readable from the store as `alwaysAllowed` and
revocable with `revokeAlwaysAllow(key)`; it resets whenever the contract moves,
because "allow this" was said about a table that no longer exists in that
shape. A key that this table does not offer is an error at build time
(`ApprovalAlwaysAllowError`), not a control that silently never appears.

**Undo covers the view, per turn and per action.** The sanitized view is
captured before a turn's calls run and restored through the same capabilities
the agent used. A turn that did more than one thing also offers each action its
own control on its receipt card, because restoring the field that action wrote
is exactly that action and nothing else; a turn that did one thing offers only
the turn's, which is already the same control. The offer stands while the
fields it would put back still hold what the turn left in them — a reader
changing the page, a second agent, a source refresh or a later turn all end it,
and the panel says which. Writes are not part of it: staging, Save and the edit
history own those.

Receipt cards are on by default and `receipts={false}` on the assistant turns
them off for a host that keeps its own account of a turn. The record is
unchanged either way: the receipts stay in the conversation state.

## Protocol adapters

Each is an optional subpath. None is in the root graph, and each routes every
call back through `session.execute`.

| Subpath                    | For                                              |
| -------------------------- | ------------------------------------------------ |
| `@adapttable/ai/http`      | The wire, the client and the assistant transport |
| `@adapttable/ai/assistant` | The framework-free conversation store            |
| `@adapttable/ai/context`   | The permitted context, and column sampling       |
| `@adapttable/ai/voice`     | Dictation, in the browser or through a backend   |
| `@adapttable/ai/json`      | Plain JSON tools and `AgentEnvelope`             |
| `@adapttable/ai/openai`    | Strict function tools with OpenAI-safe names     |
| `@adapttable/ai/mcp`       | MCP tools, resources and annotations             |
| `@adapttable/ai/mcp-apps`  | The table as a view an MCP host embeds           |
| `@adapttable/ai/webmcp`    | The table as browser tools for a page agent      |
| `@adapttable/ai/ag-ui`     | The table as an AG-UI run's frontend tools       |
| `@adapttable/ai/ai-sdk`    | The table as AI SDK client tools                 |

`@adapttable/ai-react` is the React binding: `tableAgent` and
`useTableAssistant`. It is the only one of these that imports React.
