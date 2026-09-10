# AI table API — sessions, approval and governed execution

`@adapttable/ai` exposes a table's available operations to an agent without
choosing a model provider. Discover capabilities, inspect their schemas and
execute validated actions against the current table. Applications retain
control of permissions, approval and persistence.

For connection examples, read [OpenAI, MCP and JSON integrations](./ai-integrations.md)
or [the HTTP backend guide](./ai-http.md).

```bash
npm install @adapttable/ai
```

The root entry is React-free and SDK-free. Use it from any agent runtime.
The React feature is a separate import.

```ts
import { createAgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai/react";
```

## `tableAgent({ tableId, bridge, writePolicy, approval, commit, columns, readMax })`

Compose it next to the other features:

```tsx
import { tableAgent } from "@adapttable/ai/react";
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
before write. The execute result is

`{ ok, revision, idempotencyKey, result: { proposals, applied, approval, results? } }`.

`createAgentSession({ observe, apply })` is the same contract without React —
hand it the current observation and the apply hooks. See
[adaptive capabilities](./agent-capabilities.md).
