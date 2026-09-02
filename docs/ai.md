# `@adapttable/ai` — catalog, describe, execute

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
`view.setSearch`, `view.setFilters`, `view.setGroupBy`, `view.setSelection`,
`views.apply`, `rows.read`, `rows.resolve`, `export.run`, `edit.cells`,
`rows.add`, `rows.delete`, `rows.reorder`.

`edit.cells` takes `{ edits: Array<{ column, value, rowKey?, position?, scope? }> }`
— each edit needs `rowKey` or a 1-based `position`. Positions resolve
before write. The execute result is

`{ ok, revision, idempotencyKey, result: { proposals, applied, approval, results? } }`.

`createAgentSession({ observe, apply })` is the same contract without React —
hand it the current observation and the apply hooks. See
[adaptive capabilities](./agent-capabilities.md).
