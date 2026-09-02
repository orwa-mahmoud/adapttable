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

## `tableAgent({ tableId, bridge, writePolicy, columns })`

Compose it next to the other features:

```tsx
import { tableAgent } from "@adapttable/ai/react";
import { DataTable } from "@adapttable/mui";
import { filters } from "@adapttable/mui/filters";

<DataTable
  columns={columns}
  data={rows}
  rowKey="id"
  features={[
    filters(),
    tableAgent({
      tableId: "orders",
      writePolicy: "allow",
      bridge: {
        publish: (manifest) => sendToRuntime(manifest),
        attach: (session) => (runtime.session = session),
      },
    }),
  ]}
/>;
```

`writePolicy` is `"allow"` or `"deny"`. Allow still goes through the host's
existing edit/reorder callbacks — the table never owns the data.
`requireApproval` and staging chrome land with the write-safety work; this
package only records the policy that is in force.

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
  limits: { pageMax: number },
  policy: { write: "deny" | "allow" },
  source: TableSourceCapabilities,
}
```

## Capability keys

Stable catalog order:

`columns.describe`, `view.describe`, `view.setPage`, `view.setSort`,
`view.setSearch`, `view.setFilters`, `view.setGroupBy`, `export.run`,
`edit.cells`, `rows.reorder`.

`createAgentSession({ observe, apply })` is the same contract without React —
hand it the current observation and the apply hooks. See
[adaptive capabilities](./agent-capabilities.md).
