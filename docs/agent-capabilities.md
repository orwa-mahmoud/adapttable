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
`onApprove`, and — for a governed write — the approved `plan` and the resolved
`commit` mode.

A `read` or `view` capability skips all of it. Nothing about a view operation
asks for write approval.
