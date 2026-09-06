# Adaptive table capabilities — what an agent may do

A table can tell an agent what it can do **right now**, without sending every
row or every feature guide up front.

That contract lives in `@adapttable/ai`. It is optional. `@adapttable/core`,
every adapter root, and `@adapttable/server` import none of it. Compose
`tableAgent` from `@adapttable/ai/react` when a table should publish a
manifest; omit the import and the bytes stay out.

## What is wired, not what is installed

Capabilities come from the live table:

- A table with search and pagination advertises `view.setSearch` and
  `view.setPage`.
- Grouping, filters, export, editing and reorder appear only when that
  feature is composed **and** the host callback (where a write needs one)
  is present.
- `view.setSelection` appears when selection is wired (`apply.setSelection`).
- `view.pinColumn` appears when column pinning is wired and at least one
  column is pinnable. `view.pinRow` appears when row pinning is wired. Both
  are view operations, so neither takes the write-approval path.
- `views.apply` appears when `featureIds` includes `saved-views` and
  `apply.applyView` exists.
- `rows.read` / `rows.resolve` appear when the table has columns.
  `rows.read` redacts `readable: false` cells and is bounded by
  `limits.readMax`. `scope: "full"` requires `source.fullDataset === true`.
- `rows.add` / `rows.delete` appear when the host apply methods exist and
  `writePolicy` is `"allow"`. `rows.delete` is destructive.
- Data-layer truth comes from the source's
  [`TableSourceCapabilities`](./data-tiers.md) — the manifest copies those
  fields and never re-infers them from shape.

Package availability never participates. Installing `@adapttable/ai` does
not enable grouping on a table that never imported it.

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
`title`, and the capability keys it `requires`. Suggestions are never derived
from capability keys — a key is not a sentence.
`eligibleSuggestions(suggestions, available)` hides the ones this table
cannot run, and `assertUniqueSuggestions` catches a repeated id. A capability
definition may contribute its own through `presentation`.

Nothing in these contracts imports React or calls a model.

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
capability really can stage.

`AgentCapabilityContext` is what `execute` receives: the `observation` it was
authorized against, the host's `apply` callbacks, a live `observe()`, the bound
`onApprove`, the request's `signal` and `throwIfCancelled()`, and — for a
governed write — the approved `plan` and the resolved `commit` mode.

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
