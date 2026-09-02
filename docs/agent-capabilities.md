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
