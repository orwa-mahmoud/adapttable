# React table AI integrations — OpenAI, MCP and JSON tools

`@adapttable/ai` does not host a model, a chat UI, or an AdaptTable service.
A live table publishes a compact catalog. Your runtime maps that contract
onto the tools it already speaks, then calls `session.execute`.

[Try the interactive demo](https://orwa-mahmoud.github.io/adapttable/demo/mantine/ai/)
— a real Mantine table you talk to. The demo answers a fixed set of example
requests with no model behind them; connect your own backend from the
assistant's settings for free-form conversation.

Nothing on this page is required to put a conversation in front of a reader.
If that is what you want, start with
[the optional widget](./agent-capabilities.md#the-optional-widget) — one panel
per kit — or
[the headless controller](./agent-capabilities.md#the-headless-assistant) if
you would rather draw it yourself.
[Six ways to wire it](./agent-capabilities.md#six-ways-to-wire-it) lays them
side by side, from the ready widget to a transport of your own.

This page is the layer underneath: how any agent runtime reaches the same
governed executor. See [adaptive capabilities](./agent-capabilities.md) and
[`@adapttable/ai`](./ai.md) for the session itself.

```ts
import { createAgentSession } from "@adapttable/ai";
import { executeEnvelope, toJsonTools } from "@adapttable/ai/json";
import { toOpenAITools } from "@adapttable/ai/openai";
import { mcpListChanged, toMcpResources, toMcpTools } from "@adapttable/ai/mcp";
```

The root entry stays React-free. `@adapttable/ai/react` is only for
`tableAgent`. The three integration subpaths never import a model SDK.

## Three integration levels

### 1. Custom frontend bridge

Transform any agent's action format, then call `session.execute`.

```ts
import {
  runCustomBridge,
  createBridgeSession,
} from "../examples/ai-custom-bridge";

const session = createBridgeSession({
  setFilters: (filters) => applyHostFilters(filters),
});

await runCustomBridge(
  session,
  { tool: "view.setFilters", input: { filters: { team: ["Core"] } } },
  "bridge-filter-core"
);
```

Compiling source: [ai-custom-bridge.ts](../examples/ai-custom-bridge.ts).

### 2. `AgentEnvelope` on your transport

Carry a versioned envelope over HTTP, a websocket, or postMessage. Parse
it in the browser or worker, then execute. There is no second argument
validator — `session.execute` owns that.

```ts
import { executeEnvelope, parseEnvelope } from "@adapttable/ai/json";

const envelope = parseEnvelope(body);
const result = await executeEnvelope(session, envelope);
```

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

Compiling source: [ai-server-agent.ts](../examples/ai-server-agent.ts).

### 3. Optional JSON / OpenAI / MCP helpers

Use these from **your** agent runtime. LangChain or any other framework
may consume the JSON tools. None of them become an AdaptTable dependency.

```ts
const tools = toJsonTools(session);
const openai = toOpenAITools(session, { deferred: true });
const mcp = toMcpTools(session);
```

Compiling source: [ai-mcp-host.ts](../examples/ai-mcp-host.ts).

## One-call response — result stays in the app

A model may return text and structured actions in one response. Execute
the actions, then show success or error in application or table UI.
Sending `ExecuteResult` back to the model is optional.

```ts
import { applyTurnWithoutRoundTrip } from "../examples/ai-one-call";

const { text, results } = await applyTurnWithoutRoundTrip(session, turn);
showInApp(text, results);
```

Compiling source: [ai-one-call.ts](../examples/ai-one-call.ts).

## Optional result-return loop

```ts
import { applyTurnAndReply } from "../examples/ai-result-return";

await applyTurnAndReply(session, turn, (text, results) => {
  sendBackToYourRuntime(text, results);
});
```

Compiling source: [ai-result-return.ts](../examples/ai-result-return.ts).

Do not add a chat-response wrapper to AdaptTable. The turn envelope is
application-owned.

## Catalog is live-table-derived

`catalog()` lists only capabilities enabled by mounted features, column
permissions, source support and host callbacks. A table with filtering
and pagination must not advertise editing, grouping or pivoting.

Two equally valid ways to learn schemas:

1. Compact `catalog → describe → execute` — describe one key when needed.
2. Eager helpers (`toJsonTools`, `toOpenAITools`) that call `describe`
   for every enabled key.

```ts
for (const entry of session.catalog()) {
  const guide = session.describe(entry.key);
  await session.execute(entry.key, args, revision, idempotencyKey);
}
```

Host write-safety chrome (not on the envelope):

- `approval`: `"writes"` | `"destructive"` | `"never"` (default `"writes"`)
- `commit`: `"stage"` | `"immediate"` (default `"stage"`)

Stage records a proposal in the host edit callback. Immediate persists
through that same callback. Approve, then Save, then Undo — the table
never owns the data.

## JSON, OpenAI, MCP

`toJsonTools` returns `JsonFunctionTool[]`. `executeJsonTool` takes a
`JsonToolCall`. `executeEnvelope` and `parseEnvelope` are re-exported
from `@adapttable/ai/json`.

`toOpenAITools(session, { deferred: true })` returns only `catalog`,
`describe` and `execute`. `strict: true` is the default. Eager tools
replace each `.` in a catalog key with `_` (`view.setPage` →
`view_setPage`) because OpenAI function names cannot contain dots.
`executeOpenAITool` maps those names back, and still accepts the dotted
catalog key. Deferred `execute` requires both `key` and `args` (`args` is
a JSON string under `strict`). Strict mode lists every property in
`required`, forbids open maps, and treats originally-optional fields as
nullable.

`toMcpTools` / `toMcpResources` list enabled keys. Each capability is
also a resource at
`adapttable://table/{tableId}/capability/{key}`. `mcpListChanged`
decides when to emit `notifications/tools/list_changed`.

`@adapttable/ai/http` is the optional ready-made transport: post the
compact manifest to your endpoint and execute returned actions through
the same session. Setup, protocol and the runnable example live on
[connect a backend](./ai-http.md).

## Examples

- [ai-custom-bridge.ts](../examples/ai-custom-bridge.ts) — any agent format → `execute`
- [ai-one-call.ts](../examples/ai-one-call.ts) — text + actions, no model round trip
- [ai-result-return.ts](../examples/ai-result-return.ts) — optional result return
- [ai-server-agent.ts](../examples/ai-server-agent.ts) — Node worker + HTTP envelope
- [ai-mcp-host.ts](../examples/ai-mcp-host.ts) — tools, resources, list-changed
- [ai-browser-agent.tsx](../examples/ai-browser-agent.tsx) — `tableAgent` + JSON tools
- [ai-http-backend.ts](../examples/ai-http-backend.ts) — runnable OpenAI/Anthropic/Gemini/DeepSeek server
- [ai-assistant-custom-ui.tsx](../examples/ai-assistant-custom-ui.tsx) — a complete conversation panel with none of the shipped widget in it

Intention fixtures (no live model) live in
`packages/ai/src/__fixtures__/intentions.json`.
