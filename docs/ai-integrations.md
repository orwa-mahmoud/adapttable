# Agent integrations — JSON, OpenAI, MCP

`@adapttable/ai` does not host a model, chat UI, or AdaptTable service.
A table publishes a manifest. Your runtime maps that contract onto the
tools it already speaks.

```ts
import { createAgentSession } from "@adapttable/ai";
import { executeEnvelope, toJsonTools } from "@adapttable/ai/json";
import { toOpenAITools } from "@adapttable/ai/openai";
import { mcpListChanged, toMcpResources, toMcpTools } from "@adapttable/ai/mcp";
```

The root entry stays React-free. `@adapttable/ai/react` is only for
`tableAgent`. The three integration subpaths never import a model SDK.

See [adaptive capabilities](./agent-capabilities.md) and
[`@adapttable/ai`](./ai.md) for the session itself.

## Manifest → tools

`catalog()` is the enabled key list, in a stable order. Each adapter
calls `describe(key)` for the input JSON Schema and uses the capability
key as the tool `name`. Names are never translated.

Today's keys: `columns.describe`, `view.describe`, `view.setPage`,
`view.setSort`, `view.setSearch`, `view.setFilters`, `view.setGroupBy`,
`export.run`, `edit.cells`, `rows.reorder`.

Keys that land with the write-safety / bounded-read work, advertised
only when wired: `view.setSelection`, `views.apply`, `rows.read`,
`rows.resolve`, `rows.add`, `rows.delete`. Adapters that map
`session.catalog()` pick them up automatically.

## Envelope

Every provider call collapses to one transport-neutral operation:

```ts
interface AgentEnvelope {
  schemaVersion: "adapttable.agent.v1";
  tableId: string;
  key: string;
  args: unknown;
  expectedRevision: number;
  idempotencyKey: string;
}
```

`parseEnvelope(input)` checks that shape. `executeEnvelope(session,
envelope)` checks `schemaVersion` and `tableId ===
session.manifest().tableId`, then calls `session.execute`. There is no
second argument validator.

Host write-safety chrome (not on the envelope) may wrap apply:

- `approval`: `"writes"` | `"destructive"` | `"never"` (default `"writes"`)
- `commit`: `"stage"` | `"immediate"` (default `"stage"`)

Stage records a proposal in the host `apply.editCells` callback.
Immediate persists through that same callback.

## JSON function tools — `@adapttable/ai/json`

```ts
const tools = toJsonTools(session);
const result = await executeJsonTool(session, {
  name: "view.setPage",
  arguments: { page: 2 },
  expectedRevision: session.manifest().viewRevision,
  idempotencyKey: "page-2",
});
```

`executeEnvelope` and `parseEnvelope` are re-exported from this subpath.

## OpenAI function tools — `@adapttable/ai/openai`

```ts
const tools = toOpenAITools(session); // strict: true by default
const deferred = toOpenAITools(session, { deferred: true });
```

`strict: true` sets `additionalProperties: false` when the described
schema does not already declare it. `deferred: true` returns only
`catalog`, `describe` and `execute` — `describe` is how the runtime
learns the rest. `executeOpenAITool` accepts string or object
`function.arguments`.

## MCP tools and resources — `@adapttable/ai/mcp`

```ts
const tools = toMcpTools(session); // catalog order
const resources = toMcpResources(session);
if (mcpListChanged(prev, next)) {
  // notifications/tools/list_changed
}
await executeMcpTool(session, "view.setPage", { page: 2 }, revision, "k");
```

Each enabled capability is also a readable resource at
`adapttable://table/{tableId}/capability/{key}`. The body is
`describe(key)` JSON.

Hosts that cannot refresh a dynamic tool list keep the portable trio on
the session, or use the OpenAI deferred trio.

## Examples

- [ai-server-agent.ts](../examples/ai-server-agent.ts) — Node worker + HTTP envelope
- [ai-mcp-host.ts](../examples/ai-mcp-host.ts) — tools, resources, list-changed
- [ai-browser-agent.tsx](../examples/ai-browser-agent.tsx) — `tableAgent` + JSON tools

Intention fixtures (no live model) live in
`packages/ai/src/__fixtures__/intentions.json`.
