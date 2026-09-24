# React table AI integrations — OpenAI, MCP and JSON tools

`@adapttable/ai` does not host a model, a chat UI, or an AdaptTable service.
A live table publishes a compact catalog. Your runtime maps that contract
onto the tools it already speaks, then calls `session.execute`.

[Try the interactive demo](https://adapttable.orwamahmoud.com/react/demo/mantine/ai/)
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

The root entry stays React-free. `@adapttable/ai-react` holds the React
binding (`tableAgent`, `useTableAssistant`, [`useSpeechInput`](./ai-voice.md)). The JSON,
OpenAI and MCP subpaths never import a model SDK.

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

Stage hands `edit.cells` to the host's `stageCells` callback, the table's
dirty path. Immediate calls `editCells` and the add, delete and reorder
callbacks directly. `rows.add`, `rows.delete` and `rows.reorder` have no
staging path and return `commit-incompatible` under `"stage"`. Approve, then
Save, then Undo — the table never owns the data.

## JSON, OpenAI, MCP

`toJsonTools` returns `JsonFunctionTool[]`. `executeJsonTool` takes a
`JsonToolCall`. `executeEnvelope` and `parseEnvelope` are re-exported
from `@adapttable/ai/json`.

`toOpenAITools(session, { deferred: true })` returns only `catalog`,
`describe` and `execute`. `strict: true` is the default. Eager tools
replace each `.` in a catalog key with `_` (`view.setPage` →
`view_setPage`) because OpenAI function names cannot contain dots.
`executeOpenAITool` maps those names back, and still accepts the dotted
catalog key. Deferred `execute` requires both `key` and `args`, a JSON-encoded string of
the capability arguments. Strict mode lists every property in
`required`, forbids open maps, and treats originally-optional fields as
nullable.

`toMcpTools` / `toMcpResources` list enabled keys. Each capability is
also a resource at
`adapttable://table/{tableId}/capability/{key}`. `mcpListChanged`
decides when to emit `notifications/tools/list_changed`.

`@adapttable/ai/http` is the optional ready-made transport: post the permitted
context to your endpoint and execute the calls that come back through the same
session. Setup, protocol and the runnable example live on
[connect a backend](./ai-http.md).

## Protocol adapters

Each of these speaks a protocol somebody else defined, and each ends in the
same `session.execute` — the same exclusion predicate, the same revision check,
the same approval policy and the same receipts. None adds an SDK dependency:
the event and part types are this package's own, and the one seam a host fills
is "send this, stream that back."

An integration is described as supported here only once its recorded-event
conformance fixture runs against the real adapter code.

### MCP tools, and the table as an MCP App

`toMcpTools` carries annotations derived from what each capability declares:
`readOnlyHint` for view and read keys, `destructiveHint` true only for a
destructive one and explicitly false elsewhere, `idempotentHint` where running
it twice lands where running it once did, and `openWorldHint` always false —
a capability acts on this table and nothing behind it. `toMcpToolList` and
`toMcpResourceList` return the same lists as cacheable responses, stamped with
the contract they describe. `mcpToolResult` maps one `execute` outcome into a
`tools/call` result and keeps the provenance envelope on a row window.

`@adapttable/ai/mcp-apps` publishes the table as a view an MCP host embeds:
`mcpAppResource` for the `ui://adapttable/table/{tableId}` descriptor,
`mcpAppCsp` for a policy built only from the domains you declared, and
`createMcpAppBridge` for the view's side — `ui/initialize`, the tool-input and
tool-result notifications, and `tools/call` for a reader's actions. The bridge
requires the host's exact origin: a handshake posted to `"*"` would announce
the table's contract to whatever else is listening. `approveThroughHost` and
`askThroughHost` use the host's elicitation when it advertises one and return
nothing when it does not, leaving the table's own approval in charge.

```ts
import type { ApprovalSubject } from "@adapttable/ai";
import { toMcpTools } from "@adapttable/ai/mcp";
import {
  approveThroughHost,
  createMcpAppBridge,
  mcpAppResource,
  withMcpAppMeta,
} from "@adapttable/ai/mcp-apps";

// Server: list the view, and point each tool at it.
const resource = mcpAppResource(session, {
  src: "https://view.example/table/",
  security: { connectDomains: ["https://api.example"] },
});
const tools = withMcpAppMeta(toMcpTools(session), session);

// View: talk to the embedding host, and only to it.
const bridge = createMcpAppBridge({ hostOrigin: "https://host.example" });
await bridge.initialize();
// Resolves undefined when the host advertises no elicitation.
const askHost = (subject: ApprovalSubject) =>
  approveThroughHost(bridge, subject);
```

### WebMCP — an agent in the page

```ts
import { registerWebMcpTools } from "@adapttable/ai/webmcp";

const registration = registerWebMcpTools(session, {
  exposedTo: ["view.setPage", "view.setSort", "rows.read"],
  onWarning: (warning) => console.warn(warning.message),
});
// A contract change is a different set of tools: dispose and register again.
onTeardown(() => registration.dispose());
```

Nothing happens at import: `document.modelContext` is read when you call it, so
the module loads on a server and in a browser without the API and registers
nothing in either. In React, `tableAgent({ webmcp: true })` does the same and
re-registers on a contract change for you.

An agent in the page reads the table through one call and changes it through
another, and the reader can move the table in between. Every tool therefore
takes an optional `expectedRevision` — the revision the call was planned
against, from the `revision` an earlier result carried:

```ts
// The agent read the table at revision 5 and acts on what it read.
await tool.execute({ page: 3, expectedRevision: 5 });
// Refused if the reader has since moved it, and the refusal says where it is:
// { error: { code: "revision-mismatch", ... }, revision: 7 }
```

Omit it and the call acts on the table as it is, which is what an agent that
never names a revision has always done. This is the one transport where the
revision travels on the call: HTTP and the AI SDK send the view with each
request, and AG-UI publishes it as state, so those bind it for you.

### AG-UI — the table as a run's frontend tools

```ts
import { aguiTransport } from "@adapttable/ai/ag-ui";

const transport = aguiTransport({
  connection: { run: (input, signal) => yourEndpoint(input, signal) },
  onApprove, // the same seam `session.execute` uses
});
```

The enabled contract becomes the run's tool definitions, the sanitized view
its `STATE_SNAPSHOT` and then RFC 6902 `STATE_DELTA`s, and the conversation its
`MESSAGES_SNAPSHOT`. A `RUN_FINISHED` interrupt with `reason: "confirmation"`
becomes an `ApprovalSubject` and resumes with `resume[{ interruptId, status,
payload }]`; `input_required` becomes a question for the reader. A tool call
this table does not own is left to whoever registered it. `AgUiOptions` also
takes `askUser`, `threadId`, `maxRuns`, `presentation`, `context`,
`contextInputs` and `onEvent`; `aguiTools` returns the tool definitions alone.

### AI SDK — client tools on your own route

```ts
// Your route, your provider, unchanged apart from the spread.
import { aiSdkTools } from "@adapttable/ai/ai-sdk";

streamText({
  model,
  system,
  tools: { ...yourTools, ...aiSdkTools(session) },
});
```

Every entry omits `execute`, which is how the AI SDK decides the client runs
it. In the browser, `aiSdkTransport` answers those calls and returns each
result as the tool output on the next request — the shape `addToolOutput`
sends. `tool-approval-request` becomes an `ApprovalSubject` and answers as an
approval response; `output-denied` carries the reject reason. A stream that
declares a version this adapter does not speak is refused with
`unknown-stream-version` rather than parsed as though it were one it does.

```ts
import { aiSdkTransport } from "@adapttable/ai/ai-sdk";

const transport = aiSdkTransport({
  // POST the request to your route and yield its UI message stream parts.
  connection: { run: (request, signal) => yourRoute(request, signal) },
});
```

`AiSdkOptions` also takes `onApprove`, `presentation`, `context`,
`contextInputs`, `maxRequests` and `onPart`.

## Examples

- [ai-custom-bridge.ts](../examples/ai-custom-bridge.ts) — any agent format → `execute`
- [ai-one-call.ts](../examples/ai-one-call.ts) — text + actions, no model round trip
- [ai-result-return.ts](../examples/ai-result-return.ts) — optional result return
- [ai-server-agent.ts](../examples/ai-server-agent.ts) — Node worker + HTTP envelope
- [ai-mcp-host.ts](../examples/ai-mcp-host.ts) — tools, resources, list-changed
- [ai-browser-agent.tsx](../examples/ai-browser-agent.tsx) — `tableAgent` + JSON tools
- [ai-http-backend.ts](../examples/ai-http-backend.ts) — runnable OpenAI/Anthropic/Gemini/DeepSeek server
- [ai-assistant-custom-ui.tsx](../examples/ai-assistant-custom-ui.tsx) — a complete conversation panel with none of the shipped widget in it
- [ai-assistant-store.ts](../examples/ai-assistant-store.ts) — the conversation with no React, no DOM and no HTTP
- [ai-agui-host.ts](../examples/ai-agui-host.ts) — an AG-UI run driven from recorded events, including a confirmation interrupt
- [ai-sdk-route.ts](../examples/ai-sdk-route.ts) — the route half: client tools declared beside a route tool
- [ai-http-backend.py](../examples/ai-http-backend.py) — the same wire in Python, standard library only, run through `uv`

Intention fixtures (no live model) live in
`packages/ai/src/__fixtures__/intentions.json`.
